/**
 * API Base URL Configuration
 * 
 * When running as a native iOS/Android app (Capacitor), the UI loads from local files.
 * API calls must use the absolute server URL.
 * 
 * When running as a web app, relative URLs work fine (same origin).
 */
import { Capacitor } from '@capacitor/core';

const PRODUCTION_API_URL = 'https://naashah.com';

/**
 * Returns the base URL for API calls.
 * - Native app: 'https://naashah.com' (absolute, cross-origin)
 * - Web app: '' (relative, same-origin)
 */
export function getApiBase(): string {
  if (Capacitor.isNativePlatform()) {
    return PRODUCTION_API_URL;
  }
  return '';
}

/**
 * Returns the full URL for a given API path.
 * Example: apiUrl('/api/trpc') → 'https://naashah.com/api/trpc' (native) or '/api/trpc' (web)
 */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}
