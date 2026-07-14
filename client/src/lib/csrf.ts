// CSRF Token helper for non-tRPC API calls (file uploads, etc.)
// On native iOS (CapacitorHttp), CSRF is bypassed server-side.
import { apiUrl } from './apiBase';
import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();

let csrfToken: string | null = null;
let csrfTokenFetching: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  // Native apps don't need CSRF tokens
  if (IS_NATIVE) return '';
  
  try {
    const res = await fetch(apiUrl('/api/csrf-token'), { credentials: 'include' });
    if (!res.ok) return '';
    const data = await res.json();
    return data.csrfToken || '';
  } catch {
    return '';
  }
}

export async function getCsrfToken(): Promise<string> {
  if (IS_NATIVE) return '';
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
