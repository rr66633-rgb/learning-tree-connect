import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { BrandingProvider } from "./contexts/BrandingContext";
import { NativeSessionGateProvider } from "./contexts/NativeSessionGate";
import { LOGIN_PATH } from "./const";
import { apiUrl } from "./lib/apiBase";
import { getCsrfToken, invalidateCsrfToken } from "./lib/csrf";
import { initExternalResources } from './lib/externalResources';
import "./index.css";
import "./lib/i18n";

// Load external resources (Meta Pixel, Fonts, Analytics) dynamically
// On native: minimal loading (only fonts after delay)
// On web: full loading (pixel, fonts, analytics)
initExternalResources();

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
        const MAX_RETRIES = 4;
        const TIMEOUT_MS = 30000;
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
              await new Promise(r => setTimeout(r, 2000 * attempt));
            }
          }
        }
        if (lastError) {
          throw lastError;
        }
        response = response!;

        // If we get a 403, the CSRF token might be stale - invalidate it
        if (response.status === 403) {
          const cloned = response.clone();
          try {
            const body = await cloned.json();
            if (body?.code === 'EBADCSRFTOKEN' || body?.error === 'invalid csrf token') {
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
      <NativeSessionGateProvider>
        <BrandingProvider>
          <App />
        </BrandingProvider>
      </NativeSessionGateProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
