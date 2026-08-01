import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';

type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported' | 'prompt';

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const registerTokenMutation = trpc.push.registerToken.useMutation();
  const removeTokenMutation = trpc.push.removeToken.useMutation();

  // Check if push is supported
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;

  // Check current permission state on mount
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }

    const currentPermission = Notification.permission as PushPermissionState;
    setPermission(currentPermission);

    // Check if we have a stored token (already subscribed)
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken && currentPermission === 'granted') {
      setIsSubscribed(true);
      tokenRef.current = storedToken;
    }
  }, [isSupported]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return;

    const unsubscribe = onForegroundMessage((payload) => {
      // Show notification via browser Notification API when app is in foreground
      if (payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title || '', {
          body: body || '',
          icon: '/favicon.ico',
          dir: 'rtl',
          lang: 'ar',
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isSupported, permission]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      // Request permission and get FCM token
      const token = await requestNotificationPermission();
      
      if (!token) {
        setPermission(Notification.permission as PushPermissionState);
        setIsLoading(false);
        return false;
      }

      // Register token with server
      await registerTokenMutation.mutateAsync({
        token,
        platform: 'web',
        device: navigator.userAgent.slice(0, 100),
      });

      // Store token locally
      localStorage.setItem('fcm_token', token);
      tokenRef.current = token;
      setIsSubscribed(true);
      setPermission('granted');
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[FCM] Subscribe failed:', err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, registerTokenMutation]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = tokenRef.current || localStorage.getItem('fcm_token');
      if (token) {
        await removeTokenMutation.mutateAsync({ token });
        localStorage.removeItem('fcm_token');
        tokenRef.current = null;
      }
      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[FCM] Unsubscribe failed:', err);
      setIsLoading(false);
      return false;
    }
  }, [removeTokenMutation]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
  };
}
