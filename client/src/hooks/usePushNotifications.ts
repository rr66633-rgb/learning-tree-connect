import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported' | 'prompt';

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const vapidQuery = trpc.push.getVapidPublicKey.useQuery(undefined, {
    staleTime: Infinity,
  });
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // Check if push is supported
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  // Register service worker and check current state
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }

    // Check current permission
    setPermission(Notification.permission as PushPermissionState);

    // Register service worker
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setRegistration(reg);
      // Check if already subscribed
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }).catch((err) => {
      console.error('[Push] Service worker registration failed:', err);
    });
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !registration || !vapidQuery.data?.publicKey) return false;

    setIsLoading(true);
    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);

      if (perm !== 'granted') {
        setIsLoading(false);
        return false;
      }

      // Convert VAPID key to Uint8Array
      const vapidPublicKey = vapidQuery.data.publicKey;
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });

      // Extract keys
      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
      const auth = arrayBufferToBase64(subscription.getKey('auth')!);

      // Save to server
      await subscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, registration, vapidQuery.data, subscribeMutation]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!registration) return false;

    setIsLoading(true);
    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
      }
      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
      setIsLoading(false);
      return false;
    }
  }, [registration, unsubscribeMutation]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
  };
}

// Helper: Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper: Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
