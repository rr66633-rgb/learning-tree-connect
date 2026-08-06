import { useCallback, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported' | 'prompt';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSupported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  const vapidQuery = trpc.push.getVapidPublicKey.useQuery(undefined, {
    enabled: false,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermissionState);
    void navigator.serviceWorker.getRegistration('/sw.js')
      .then(registration => registration?.pushManager.getSubscription())
      .then(subscription => setIsSubscribed(Boolean(subscription)))
      .catch(() => setIsSubscribed(false));
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission as PushPermissionState);
      if (nextPermission !== 'granted') return false;

      const keyResult = await vapidQuery.refetch();
      const publicKey = keyResult.data?.publicKey;
      if (!publicKey) throw new Error('VAPID public key is not configured');

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) {
        throw new Error('Browser returned an incomplete push subscription');
      }
      await subscribeMutation.mutateAsync({
        endpoint: serialized.endpoint,
        p256dh: serialized.keys.p256dh,
        auth: serialized.keys.auth,
        userAgent: navigator.userAgent.slice(0, 255),
      });
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('[Push] Subscribe failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, subscribeMutation, vapidQuery]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, unsubscribeMutation]);

  return { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe };
}
