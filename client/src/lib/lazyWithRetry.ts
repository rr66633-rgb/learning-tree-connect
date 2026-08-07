import { lazy, type ComponentType } from "react";

/**
 * `lazy()` that survives a transient chunk fetch failure.
 *
 * Every page in this app is code-split, so navigating fetches a JS chunk over
 * the network. A single dropped request -- a flaky mobile connection, a captive
 * portal, a server restart mid-navigation -- makes the import reject, React
 * unmounts to the error boundary, and the user is thrown out of whatever they
 * were doing. Retrying is almost always enough, because the file is genuinely
 * there.
 *
 * The one case retrying cannot fix is a redeploy: the chunk URL the running
 * page remembers no longer exists. That is detected and handled by a one-shot
 * reload in ErrorBoundary, which picks up the new build.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  delayMs = 400,
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (attempt === retries) break;
        // Back off a little; a momentary network blip usually clears at once.
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
    throw lastError;
  });
}
