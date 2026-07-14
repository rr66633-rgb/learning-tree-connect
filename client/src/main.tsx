import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { BrandingProvider } from "./contexts/BrandingContext";
import { LOGIN_PATH } from "./const";
import { apiUrl } from "./lib/apiBase";
import { Capacitor } from '@capacitor/core';
import "./index.css";

const IS_NATIVE = Capacitor.isNativePlatform();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = LOGIN_PATH;
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Warm-up ping: wake up the server immediately when JS loads
// This fires before React renders, giving the server time to respond
// On native: use window.fetch (patched by CapacitorHttp) without signal
window.fetch(apiUrl('/api/csrf-token'), { credentials: 'include' }).catch(() => {});

// ============================================================
// CSRF Token management
// On native iOS (CapacitorHttp), CSRF is bypassed server-side,
// so we skip CSRF token fetching entirely to avoid fetch issues.
// ============================================================
let csrfToken: string | null = null;
let csrfTokenFetching: Promise<string> | null = null;

/**
 * Timeout helper using Promise.race (works with CapacitorHttp native patch)
 * AbortController.signal is NOT supported by CapacitorHttp on iOS native.
 */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return Promise.race([
    window.fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function fetchCsrfToken(retries = 3): Promise<string> {
  // On native platform, CSRF is bypassed server-side - return empty string
  if (IS_NATIVE) {
    return '';
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(
        apiUrl('/api/csrf-token'),
        { credentials: 'include' },
        15000
      );
      if (!res.ok) {
        console.warn(`[CSRF] Token fetch failed (attempt ${attempt}/${retries}):`, res.status);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return '';
      }
      const data = await res.json();
      return data.csrfToken || '';
    } catch (err) {
      console.warn(`[CSRF] Token fetch error (attempt ${attempt}/${retries}):`, err);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      return '';
    }
  }
  return '';
}

async function getCsrfToken(): Promise<string> {
  // Native apps don't need CSRF tokens (server bypasses CSRF for native requests)
  if (IS_NATIVE) return '';
  
  if (csrfToken) return csrfToken;

  // Prevent concurrent fetches
  if (!csrfTokenFetching) {
    csrfTokenFetching = fetchCsrfToken().then(token => {
      csrfToken = token;
      csrfTokenFetching = null;
      return token;
    });
  }
  return csrfTokenFetching;
}

// Invalidate CSRF token so next request fetches a fresh one
function invalidateCsrfToken() {
  csrfToken = null;
  csrfTokenFetching = null;
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiUrl("/api/trpc"),
      transformer: superjson,
      async headers() {
        const token = await getCsrfToken();
        // Only send CSRF header on web (native doesn't need it)
        if (token) {
          return { 'x-csrf-token': token };
        }
        return {};
      },
      async fetch(input, init) {
        // Retry logic for network failures (handles cold start / slow connections)
        // IMPORTANT: Uses window.fetch (patched by CapacitorHttp on native iOS)
        // IMPORTANT: Strips AbortController.signal on native (not supported by CapacitorHttp)
        const MAX_RETRIES = 4;
        const TIMEOUT_MS = IS_NATIVE ? 45000 : 30000; // Longer timeout for native (cold start)
        let response: Response;
        let lastError: Error | null = null;
        
        // On native, strip signal from init (CapacitorHttp doesn't support AbortController)
        const cleanInit = IS_NATIVE
          ? (() => { const { signal, ...rest } = (init ?? {}) as any; return rest; })()
          : (init ?? {});
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            response = await fetchWithTimeout(
              input as string,
              {
                ...cleanInit,
                credentials: "include",
              },
              TIMEOUT_MS
            );
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[tRPC] Fetch failed (attempt ${attempt}/${MAX_RETRIES}):`, err.message);
            if (attempt < MAX_RETRIES) {
              // Exponential backoff: 2s, 4s, 6s (gives server time to respond)
              await new Promise(r => setTimeout(r, 2000 * attempt));
            }
          }
        }
        if (lastError) {
          throw lastError;
        }
        response = response!;

        // If we get a 403 on web, the CSRF token might be stale - invalidate it
        if (!IS_NATIVE && response.status === 403) {
          const cloned = response.clone();
          try {
            const body = await cloned.json();
            if (body?.code === 'EBADCSRFTOKEN' || body?.error === 'invalid csrf token') {
              invalidateCsrfToken();
              // Retry the request once with a fresh token
              const freshToken = await getCsrfToken();
              const retryInit = {
                ...cleanInit,
                credentials: "include" as RequestCredentials,
                headers: {
                  ...(init?.headers || {}),
                  'x-csrf-token': freshToken,
                },
              };
              return window.fetch(input as string, retryInit);
            }
          } catch {
            invalidateCsrfToken();
            const freshToken = await getCsrfToken();
            const retryInit = {
              ...cleanInit,
              credentials: "include" as RequestCredentials,
              headers: {
                ...(init?.headers || {}),
                'x-csrf-token': freshToken,
              },
            };
            return window.fetch(input as string, retryInit);
          }
        }

        return response;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
