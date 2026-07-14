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
// On NATIVE: Do NOT fire warm-up ping - it can trigger iOS native "Load failed" banner
// if the server is cold (3-4s response time). The login button handles retries instead.
// On WEB: Fire warm-up to reduce perceived latency for the user.
if (!IS_NATIVE) {
  fetch(apiUrl('/api/csrf-token'), { credentials: 'include' }).catch(() => {});
}

// ============================================================
// CSRF Token management
// On native iOS, CSRF is bypassed server-side,
// so we skip CSRF token fetching entirely.
// ============================================================
let csrfToken: string | null = null;
let csrfTokenFetching: Promise<string> | null = null;

async function fetchCsrfToken(retries = 3): Promise<string> {
  // On native platform, CSRF is bypassed server-side - return empty string
  if (IS_NATIVE) {
    return '';
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(
        apiUrl('/api/csrf-token'),
        { credentials: 'include', signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
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
        // With CapacitorHttp DISABLED, standard WKWebView fetch is used on iOS.
        // Standard fetch supports AbortController.signal properly.
        const MAX_RETRIES = 4;
        const TIMEOUT_MS = IS_NATIVE ? 45000 : 30000; // Longer timeout for native (cold start)
        let response: Response;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
            
            response = await fetch(
              input as string,
              {
                ...(init ?? {}),
                credentials: "include",
                signal: controller.signal,
              }
            );
            clearTimeout(timeoutId);
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[tRPC] Fetch failed (attempt ${attempt}/${MAX_RETRIES}):`, err.message);
            if (attempt < MAX_RETRIES) {
              // Exponential backoff: 2s, 4s, 6s (gives server time to wake up from cold start)
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
                ...(init ?? {}),
                credentials: "include" as RequestCredentials,
                headers: {
                  ...(init?.headers || {}),
                  'x-csrf-token': freshToken,
                },
              };
              return fetch(input as string, retryInit);
            }
          } catch {
            invalidateCsrfToken();
            const freshToken = await getCsrfToken();
            const retryInit = {
              ...(init ?? {}),
              credentials: "include" as RequestCredentials,
              headers: {
                ...(init?.headers || {}),
                'x-csrf-token': freshToken,
              },
            };
            return fetch(input as string, retryInit);
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
