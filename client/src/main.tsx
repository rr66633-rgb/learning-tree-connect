import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { BrandingProvider } from "./contexts/BrandingContext";
import { LOGIN_PATH } from "./const";
import "./index.css";

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
// This fires before React renders, giving the server time to wake from cold start
fetch('/api/csrf-token', { credentials: 'include' }).catch(() => {});

// CSRF Token management with retry and invalidation
let csrfToken: string | null = null;
let csrfTokenFetching: Promise<string> | null = null;

async function fetchCsrfToken(retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/csrf-token', { 
        credentials: 'include',
        signal: controller.signal,
      });
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
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const token = await getCsrfToken();
        return { 'x-csrf-token': token };
      },
      async fetch(input, init) {
        // Retry logic for network failures (handles cold start / slow connections)
        // iOS Safari throws "Load failed" TypeError on network errors
        const MAX_RETRIES = 4;
        let response: Response;
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            response = await globalThis.fetch(input, {
              ...(init ?? {}),
              credentials: "include",
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[tRPC] Fetch failed (attempt ${attempt}/${MAX_RETRIES}):`, err.message);
            if (attempt < MAX_RETRIES) {
              // Exponential backoff: 2s, 4s, 6s (gives server time to wake from cold start)
              await new Promise(r => setTimeout(r, 2000 * attempt));
            }
          }
        }
        if (lastError) {
          throw lastError;
        }
        response = response!;

        // If we get a 403, the CSRF token might be stale - invalidate it
        // so the next request will fetch a fresh token
        if (response.status === 403) {
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
              return globalThis.fetch(input, retryInit);
            }
          } catch {
            // If we can't parse the 403 response as JSON, it might be the HTML error page
            // Invalidate token and retry
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
            return globalThis.fetch(input, retryInit);
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
