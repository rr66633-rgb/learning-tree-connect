// CSRF Token helper for non-tRPC API calls (file uploads, etc.)
// With server.url in capacitor.config.ts, both web and native are same-origin.
import { apiUrl } from './apiBase';

let csrfToken: string | null = null;
let csrfTokenFetching: Promise<string> | null = null;

async function fetchCsrfToken(retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(apiUrl('/api/csrf-token'), {
        credentials: 'include',
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        return data.csrfToken || '';
      }
    } catch {
      // A cold deployment may need one retry while the server wakes up.
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (attempt < retries) {
      await new Promise(resolve => window.setTimeout(resolve, attempt * 1_000));
    }
  }
  return '';
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfTokenFetching) {
    csrfTokenFetching = fetchCsrfToken().then(token => {
      csrfToken = token;
      csrfTokenFetching = null;
      return token;
    });
  }
  return csrfTokenFetching;
}

export function invalidateCsrfToken() {
  csrfToken = null;
  csrfTokenFetching = null;
}

/**
 * Wrapper around fetch that automatically adds credentials and CSRF token.
 * Use this for all non-tRPC API calls (file uploads, etc.)
 * If CSRF fails (403), it will retry once with a fresh token.
 */
export async function fetchWithCsrf(url: string, init?: RequestInit): Promise<Response> {
  const token = await getCsrfToken();
  
  // Use Headers object to preserve browser auto-detection of Content-Type for FormData
  // IMPORTANT: When body is FormData, we must NOT manually set Content-Type.
  // The browser sets it automatically with the correct multipart boundary.
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  
  // Add CSRF token
  if (token) {
    headers.set('x-csrf-token', token);
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  // If CSRF token is invalid, retry with a fresh one
  if (response.status === 403) {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body?.code === 'EBADCSRFTOKEN' || body?.error === 'invalid csrf token') {
        invalidateCsrfToken();
        const freshToken = await getCsrfToken();
        const retryHeaders = new Headers(init?.headers as HeadersInit | undefined);
        if (freshToken) {
          retryHeaders.set('x-csrf-token', freshToken);
        }
        return fetch(url, {
          ...init,
          credentials: 'include',
          headers: retryHeaders,
        });
      }
    } catch {
      // If we can't parse the response, just return the original
    }
  }

  return response;
}
