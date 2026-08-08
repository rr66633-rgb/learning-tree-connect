// Upload helper with real progress reporting.
//
// Why this exists: every upload in the app goes through `fetch`, and fetch
// cannot report how much of a REQUEST body has been sent -- so the UI could
// only ever show an indeterminate spinner, no matter how large the file. The
// existing "جاري الرفع" text stays exactly as it is; this simply makes a real
// percentage available to sit alongside it.
//
// XMLHttpRequest is used solely because it exposes `upload.onprogress`, which
// fetch still does not. Everything else (credentials, CSRF token and its
// one-shot retry) mirrors fetchWithCsrf so behaviour is unchanged.
import { getCsrfToken, invalidateCsrfToken } from './csrf';
import { apiUrl } from './apiBase';

export type UploadProgress = {
  /** 0-100, or null while the total size is still unknown. */
  percent: number | null;
  loadedBytes: number;
  totalBytes: number;
  /** True once the bytes are sent and we're waiting on the server's reply. */
  processing: boolean;
};

export type UploadOptions = {
  onProgress?: (p: UploadProgress) => void;
  /** Lets a caller cancel an in-flight upload (e.g. the user hit cancel). */
  signal?: AbortSignal;
};

export class UploadError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

function send(
  url: string,
  body: FormData | string,
  contentType: string | null,
  csrf: string,
  opts: UploadOptions,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.withCredentials = true;
    if (csrf) xhr.setRequestHeader('x-csrf-token', csrf);
    // For FormData the browser must set Content-Type itself so the multipart
    // boundary is correct -- same rule as fetchWithCsrf.
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (e) => {
      opts.onProgress?.({
        percent: e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : null,
        loadedBytes: e.loaded,
        totalBytes: e.lengthComputable ? e.total : 0,
        processing: false,
      });
    };

    // Bytes are all sent; the server is still resizing/storing. Reporting this
    // separately is what stops a progress bar sitting frozen at 100%.
    xhr.upload.onload = () => {
      opts.onProgress?.({ percent: 100, loadedBytes: 0, totalBytes: 0, processing: true });
    };

    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new UploadError('تعذّر الاتصال، تحقق من الإنترنت وحاول مرة أخرى', 0));
    xhr.ontimeout = () => reject(new UploadError('استغرق الرفع وقتاً طويلاً، حاول مرة أخرى', 0));
    xhr.onabort = () => reject(new UploadError('تم إلغاء الرفع', 0));

    if (opts.signal) {
      if (opts.signal.aborted) { xhr.abort(); return; }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(body);
  });
}

/**
 * POSTs to an upload endpoint with live progress, returning the parsed JSON body.
 * Mirrors fetchWithCsrf's CSRF handling, including the single retry on a stale token.
 */
export async function uploadWithProgress<T = any>(
  url: string,
  body: FormData | string,
  opts: UploadOptions = {},
): Promise<T> {
  const direct = getDirectUploadInput(url, body);
  if (direct) {
    return await uploadFileDirectly<T>(direct.file, direct.purpose, opts);
  }

  const contentType = typeof body === 'string' ? 'application/json' : null;

  let csrf = await getCsrfToken();
  let res = await send(url, body, contentType, csrf, opts);

  // Stale CSRF token -> refresh once and retry, same as fetchWithCsrf.
  if (res.status === 403) {
    let isCsrf = false;
    try {
      const parsed = JSON.parse(res.text);
      isCsrf = parsed?.code === 'EBADCSRFTOKEN' || parsed?.error === 'invalid csrf token';
    } catch { /* non-JSON body: treat as a normal failure */ }
    if (isCsrf) {
      invalidateCsrfToken();
      csrf = await getCsrfToken();
      res = await send(url, body, contentType, csrf, opts);
    }
  }

  let parsed: any = null;
  try { parsed = JSON.parse(res.text); } catch { /* leave null */ }

  if (res.status < 200 || res.status >= 300) {
    // Prefer the server's own Arabic message; never surface raw status text.
    throw new UploadError(parsed?.error || 'تعذّر رفع الملف، حاول مرة أخرى', res.status);
  }
  return parsed as T;
}

type DirectAssetPurpose = 'photo' | 'document' | 'logo' | 'media' | 'curriculum';

function getDirectUploadInput(
  url: string,
  body: FormData | string,
): { file: File; purpose: DirectAssetPurpose } | null {
  if (!(body instanceof FormData) || typeof File === 'undefined') return null;
  let pathname = url;
  try {
    pathname = new URL(url, window.location.origin).pathname;
  } catch { /* relative path is sufficient */ }

  const purposeByPath: Record<string, DirectAssetPurpose> = {
    '/api/upload': 'photo',
    '/api/upload-photo': 'photo',
    '/api/upload-document': 'document',
    '/api/upload-logo': 'logo',
    '/api/upload-media': 'media',
    '/api/upload-curriculum': 'curriculum',
  };
  const purpose = purposeByPath[pathname];
  if (!purpose) return null;
  const candidate = body.get('file') ?? body.get('files');
  return candidate instanceof File ? { file: candidate, purpose } : null;
}

function inferContentType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return extension ? byExtension[extension] || '' : '';
}

async function uploadFileDirectly<T>(
  originalFile: File,
  purpose: DirectAssetPurpose,
  opts: UploadOptions,
): Promise<T> {
  const shouldCompress =
    purpose !== 'logo' &&
    originalFile.type.startsWith('image/') &&
    originalFile.type !== 'image/gif';
  let file = shouldCompress ? await compressImage(originalFile) : originalFile;
  const contentType = inferContentType(file);
  if (!file.type && contentType) {
    file = new File([file], file.name, { type: contentType, lastModified: file.lastModified });
  }

  const signed = await uploadWithProgress<{
    uploadUrl: string;
    fileKey: string;
  }>(
    apiUrl('/api/direct-asset-upload/create'),
    JSON.stringify({ purpose, contentType, fileSize: file.size }),
    { signal: opts.signal },
  );

  await uploadDirectToSignedUrl(signed.uploadUrl, file, opts);
  opts.onProgress?.({
    percent: 100,
    loadedBytes: file.size,
    totalBytes: file.size,
    processing: true,
  });

  return await uploadWithProgress<T>(
    apiUrl('/api/direct-asset-upload/finalize'),
    JSON.stringify({ purpose, fileKey: signed.fileKey, fileName: originalFile.name }),
    { signal: opts.signal },
  );
}

/**
 * Uploads file bytes straight from the browser to a short-lived R2 presigned
 * PUT URL. The application server never receives or buffers the payload.
 */
export function uploadDirectToSignedUrl(
  uploadUrl: string,
  file: File,
  opts: UploadOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = event => {
      opts.onProgress?.({
        percent: event.lengthComputable
          ? Math.round((event.loaded / event.total) * 100)
          : null,
        loadedBytes: event.loaded,
        totalBytes: event.lengthComputable ? event.total : file.size,
        processing: false,
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.({
          percent: 100,
          loadedBytes: file.size,
          totalBytes: file.size,
          processing: false,
        });
        resolve();
        return;
      }
      reject(new UploadError('رفض مخزن الملفات عملية الرفع؛ أعد المحاولة', xhr.status));
    };
    xhr.onerror = () => reject(new UploadError(
      'تعذّر الرفع المباشر. تحقق من اتصال الإنترنت وإعداد CORS في R2',
      0,
    ));
    xhr.ontimeout = () => reject(new UploadError('استغرق الرفع وقتاً طويلاً، حاول مرة أخرى', 0));
    xhr.onabort = () => reject(new UploadError('تم إلغاء الرفع', 0));

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

/**
 * Shrinks an oversized image in the browser before it is uploaded.
 *
 * The server already resizes to 800px, but it only gets to do that AFTER the
 * full original has crossed the network -- a 6 MB phone photo is 6 MB of the
 * parent's mobile data and a long wait on a slow connection, to produce a file
 * the server immediately throws away. Doing it here makes the upload itself
 * small, which is the part the user actually waits for.
 *
 * Falls back to the untouched file whenever anything is unsupported, so this
 * can never block an upload that would otherwise have worked.
 */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  // Small enough already -- re-encoding would only lose quality for no gain.
  if (file.size <= 512 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) { bitmap.close?.(); return file; }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
