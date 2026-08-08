/**
 * Creates standards-compliant CSV and saves it in a way that also works in
 * iOS/Capacitor. WebKit can cancel a normal `<a download>` when its object URL
 * is revoked immediately, so Apple mobile devices get the native share/save
 * sheet first and the browser fallback revokes the URL after a safe delay.
 */

import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export type ExportResult = "shared" | "downloaded" | "cancelled";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function createCsv(headers: unknown[], rows: unknown[][]): string {
  return "\uFEFF" + [headers, ...rows]
    .map(row => row.map(csvCell).join(","))
    .join("\r\n");
}

function shouldPreferShareSheet(): boolean {
  return Capacitor.isNativePlatform() ||
    /Android|iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    // iPadOS can identify itself as macOS while using a touch screen.
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

async function shareNativeFile(blob: Blob, fileName: string, title: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const safeName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]+/g, "-");
  const path = `exports/${Date.now()}-${safeName}`;
  let fileCreated = false;
  try {
    const result = await Filesystem.writeFile({
      path,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });
    fileCreated = true;
    await Share.share({ title, files: [result.uri] });
    // Keep the cached file alive while the receiving application opens it.
    // The OS owns the Cache directory; this delayed cleanup avoids Android
    // recipients seeing a file that was deleted immediately after selection.
    window.setTimeout(() => {
      void Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
    }, 5 * 60_000);
    return true;
  } catch {
    // Older installed builds may not contain the Filesystem native plugin yet.
    // The Web Share API below remains available on current mobile WebViews.
    if (fileCreated) {
      try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); }
      catch { /* best-effort cache cleanup */ }
    }
    return false;
  }
}

export async function saveOrShareFile(
  contents: BlobPart | Blob,
  fileName: string,
  mimeType: string,
  title: string,
): Promise<ExportResult> {
  const blob = contents instanceof Blob
    ? contents
    : new Blob([contents], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  const shareData: ShareData = { files: [file], title };

  if (
    shouldPreferShareSheet() &&
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(shareData))
  ) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Continue to the browser download fallback when file sharing is not
      // implemented by the current WebView version.
    }
  }

  if (await shareNativeFile(blob, fileName, title)) {
    return "shared";
  }

  // A mobile WebView without native or Web Share file support cannot confirm
  // that an `<a download>` was saved. Fail visibly instead of claiming success.
  if (shouldPreferShareSheet()) {
    throw new Error("MOBILE_FILE_EXPORT_UNAVAILABLE");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  // Safari/WebKit may still be reading the object URL after click returns.
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 10_000);

  return "downloaded";
}
