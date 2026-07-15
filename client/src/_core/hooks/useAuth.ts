import { LOGIN_PATH } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();

/**
 * On native iOS, we need to avoid firing network requests before the user
 * explicitly logs in. The auth.me query fires automatically on app load and
 * causes WKWebView to show a "Load failed" native banner if the server is
 * cold (3-10s response time) or the network is slow.
 * 
 * Solution: On native, only enable the auth.me query if we have evidence
 * that the user previously logged in (stored in localStorage).
 * After a successful login, we set a flag so subsequent app opens will
 * check auth.me normally.
 */
function shouldEnableAuthQuery(): boolean {
  if (!IS_NATIVE) return true; // Always enable on web
  
  // On native: only query if user has previously logged in
  const hasSession = localStorage.getItem('naashah-has-session');
  return hasSession === 'true';
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};
  const utils = trpc.useUtils();

  const enabled = shouldEnableAuthQuery();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled, // Skip on native if no session evidence
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      // Clear session flag on logout
      if (IS_NATIVE) {
        localStorage.removeItem('naashah-has-session');
      }
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      if (IS_NATIVE) {
        localStorage.removeItem('naashah-has-session');
      }
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "naashah-user-info",
      JSON.stringify(meQuery.data)
    );
    // When auth.me succeeds with user data, mark session as active for native
    if (IS_NATIVE && meQuery.data) {
      localStorage.setItem('naashah-has-session', 'true');
    }
    return {
      user: meQuery.data ?? null,
      // On native with disabled query, treat as "not loading" (user is null = show login)
      loading: enabled ? (meQuery.isLoading || logoutMutation.isPending) : false,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    enabled,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
