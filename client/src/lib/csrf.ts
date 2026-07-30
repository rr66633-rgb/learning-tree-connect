// CSRF Token helper for non-tRPC API calls (file uploads, etc.)
// With server.url in capacitor.config.ts, both web and native are same-origin.
import { apiUrl } from './apiBase';

let csrfToken: string | null = null;
let csrfTokenFetching: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
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
  const headers: Record<string, string> = {};
  
  // Copy existing headers
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => { headers[key] = value; });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => { headers[key] = value; });
    } else {
      Object.assign(headers, init.headers);
    }
  }
  
  // Add CSRF token
  if (token) {
    headers['x-csrf-token'] = token;
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
        const retryHeaders = { ...headers };
        if (freshToken) {
          retryHeaders['x-csrf-token'] = freshToken;
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
