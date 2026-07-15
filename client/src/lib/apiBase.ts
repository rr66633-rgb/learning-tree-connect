/**
 * API Base URL Configuration
 * 
 * With server.url set in capacitor.config.ts, the native app loads directly
 * from the production server. All requests are same-origin for both web and native.
 * 
 * This file is kept for backward compatibility with existing imports.
 */

/**
 * Returns the base URL for API calls.
 * Always returns '' (relative, same-origin) since both web and native
 * load from the same server origin.
 */
export function getApiBase(): string {
  return '';
}

/**
 * Returns the full URL for a given API path.
 * Example: apiUrl('/api/trpc') → '/api/trpc'
 */
export function apiUrl(path: string): string {
  return path;
}
