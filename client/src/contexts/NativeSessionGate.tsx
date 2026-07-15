import React, { createContext, useContext, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();

interface NativeSessionGateContextType {
  /** Whether network queries (auth.me, branding) are allowed */
  isNetworkAllowed: boolean;
  /** Call this after successful login to enable network queries */
  enableNetwork: () => void;
  /** Call this on logout to disable network queries */
  disableNetwork: () => void;
}

const NativeSessionGateContext = createContext<NativeSessionGateContextType>({
  isNetworkAllowed: !IS_NATIVE, // Web always allowed, native starts blocked
  enableNetwork: () => {},
  disableNetwork: () => {},
});

/**
 * NativeSessionGate prevents ALL network requests on native iOS
 * until the user explicitly logs in.
 * 
 * On web: isNetworkAllowed is always true (no restriction).
 * On native: isNetworkAllowed starts as false and only becomes true
 * after a successful login (enableNetwork() is called).
 * 
 * This is a React state-based approach (not localStorage) which means:
 * - On fresh install: no network requests fire (state starts false)
 * - After login: enableNetwork() → state becomes true → queries fire
 * - On app restart after login: state resets to false → no queries fire
 *   until user logs in again (this is intentional for Apple review safety)
 * 
 * The key insight: On native, we ALWAYS show the login page first.
 * After successful login, we reload the app (window.location.reload()),
 * and on reload the login page detects the session cookie and redirects.
 * But we DON'T fire auth.me on that reload - instead, the login success
 * handler sets a sessionStorage flag that persists across reload (but not
 * across app close), which allows auth.me to fire on the reload.
 */
export function NativeSessionGateProvider({ children }: { children: React.ReactNode }) {
  // On web: always allow network
  // On native: check sessionStorage (survives reload but not app close)
  const [isNetworkAllowed, setIsNetworkAllowed] = useState(() => {
    if (!IS_NATIVE) return true;
    // sessionStorage persists across page reload but clears on app close
    // This handles the login → reload flow correctly
    return sessionStorage.getItem('naashah-network-gate') === 'open';
  });

  const enableNetwork = useCallback(() => {
    setIsNetworkAllowed(true);
    if (IS_NATIVE) {
      sessionStorage.setItem('naashah-network-gate', 'open');
    }
  }, []);

  const disableNetwork = useCallback(() => {
    setIsNetworkAllowed(false);
    if (IS_NATIVE) {
      sessionStorage.removeItem('naashah-network-gate');
    }
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
