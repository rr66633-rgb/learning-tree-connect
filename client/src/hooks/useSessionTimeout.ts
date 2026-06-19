import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

/**
 * Hook that automatically logs out inactive users after SESSION_TIMEOUT_MS.
 * Tracks user activity (mouse, keyboard, scroll, touch) and resets the timer on each event.
 */
export function useSessionTimeout() {
  const { user, logout } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const checkInactivity = useCallback(() => {
    if (!user) return;
    
    const elapsed = Date.now() - lastActivityRef.current;
    if (elapsed >= SESSION_TIMEOUT_MS) {
      // User has been inactive for too long
      logout();
      // Show a notification (will be caught by the login redirect)
      if (typeof window !== "undefined") {
        // Store a flag so login page can show "session expired" message
        sessionStorage.setItem("session_expired", "true");
      }
    }
  }, [user, logout]);

  useEffect(() => {
    if (!user) return;

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, resetActivity, { passive: true });
    });

    // Start periodic check
    timeoutRef.current = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, resetActivity);
      });
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [user, resetActivity, checkInactivity]);
}
