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
        const requestUrl = typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input);
        const requestMethod = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        const decodedUrl = decodeURIComponent(requestUrl);
        const isAiGeneration = ["/ai.", "/aiMarketing.", "/weeklyPlan."].some(prefix => decodedUrl.includes(prefix));

        // Never replay mutations at the transport layer: the first request may
        // have reached the server even when its response was interrupted. The
        // old four-attempt loop generated duplicate plans and multiplied OpenAI
        // work. Queries may retry once; the legacy long route gets a generous
        // timeout while the UI now uses the background-job route instead.
        const maxAttempts = requestMethod === "GET" ? 2 : 1;
        const timeoutMs = isAiGeneration ? 10 * 60_000 : 30_000;
        let response: Response;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => {
            controller.abort(new DOMException("انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى", "TimeoutError"));
          }, timeoutMs);
          try {
            response = await fetch(
              input as string,
              {
                ...(init ?? {}),
                credentials: "include",
                signal: controller.signal,
              }
            );
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[tRPC] Fetch failed (attempt ${attempt}/${maxAttempts}):`, err.message);
            if (attempt < maxAttempts) {
              await new Promise(r => setTimeout(r, 1000 * attempt));
            }
          } finally {
            window.clearTimeout(timeoutId);
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
