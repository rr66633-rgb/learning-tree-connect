import React, { createContext, useContext, useState, useCallback } from 'react';

interface NativeSessionGateContextType {
  /** Whether network queries (auth.me, branding) are allowed */
  isNetworkAllowed: boolean;
  /** Call this after successful login to enable network queries */
  enableNetwork: () => void;
  /** Call this on logout to disable network queries */
  disableNetwork: () => void;
}

const NativeSessionGateContext = createContext<NativeSessionGateContextType>({
  isNetworkAllowed: true, // Always allowed now (same-origin with server.url)
  enableNetwork: () => {},
  disableNetwork: () => {},
});

/**
 * NativeSessionGate - Simplified for server.url approach
 * 
 * With server.url set in capacitor.config.ts, the native app loads directly
 * from https://naashah.com. All requests are same-origin, so there's no need
 * to block network requests. The app behaves exactly like the web version.
 * 
 * This gate is kept as a no-op wrapper for backward compatibility with
 * components that import useNativeSessionGate.
 */
export function NativeSessionGateProvider({ children }: { children: React.ReactNode }) {
  const [isNetworkAllowed, setIsNetworkAllowed] = useState(true);

  const enableNetwork = useCallback(() => {
    setIsNetworkAllowed(true);
  }, []);

  const disableNetwork = useCallback(() => {
    // No-op: with server.url, we don't need to block network
    // The normal web auth flow handles everything
  }, []);

  return (
    <NativeSessionGateContext.Provider value={{ isNetworkAllowed, enableNetwork, disableNetwork }}>
      {children}
    </NativeSessionGateContext.Provider>
  );
}

export function useNativeSessionGate() {
  return useContext(NativeSessionGateContext);
}
