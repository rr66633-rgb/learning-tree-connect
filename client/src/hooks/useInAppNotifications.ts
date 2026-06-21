import { useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useNotificationSound } from './useNotificationSound';
import { useAuth } from '@/_core/hooks/useAuth';

/**
 * In-app notification system that works independently of push notifications.
 * Uses polling + service worker messages to play sounds and show alerts
 * even when the user hasn't enabled push notifications.
 * 
 * This ensures teachers and reception staff ALWAYS hear pickup alerts.
 */
export function useInAppNotifications() {
  const { user } = useAuth();
  const { playOnce, vibrate, settings } = useNotificationSound();
  const lastNotificationIdRef = useRef<number>(0);
  const isStaffRef = useRef(false);

  // Check if user is staff (teacher, admin, receptionist, etc.)
  useEffect(() => {
    if (user) {
      isStaffRef.current = ['super_admin', 'admin', 'principal', 'teacher', 'assistant', 'receptionist'].includes(user.role);
    }
  }, [user]);

  // Listen for service worker messages (when push arrives while app is open)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      
      if (type === 'PUSH_RECEIVED' || type === 'PARENT_ARRIVAL_ALERT') {
        // Play in-app sound immediately
        playOnce();
        vibrate();
        
        // Log the event
        logNotificationEvent('in_app_sound_played', {
          title: payload?.title,
          timestamp: Date.now(),
        });
      }

      if (type === 'NOTIFICATION_CLICK') {
        // Handle navigation from notification click
        const url = event.data.url;
        if (url && window.location.pathname !== url) {
          window.location.href = url;
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [playOnce, vibrate]);

  // Poll for new unread notifications (fallback for when push is not enabled)
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: isStaffRef.current ? 10000 : 30000, // Staff: every 10s, Parents: every 30s
    staleTime: 5000,
  });

  // Play sound when new notifications arrive via polling
  useEffect(() => {
    if (!unreadCount || !user) return;
    
    const count = typeof unreadCount === 'number' ? unreadCount : (unreadCount as any)?.count || 0;
    
    if (count > lastNotificationIdRef.current && lastNotificationIdRef.current > 0) {
      // New notification detected via polling
      playOnce();
      vibrate();
    }
    
    lastNotificationIdRef.current = count;
  }, [unreadCount, user, playOnce, vibrate]);

  return { settings };
}

/**
 * Log notification events to IndexedDB for troubleshooting
 */
function logNotificationEvent(type: string, data: Record<string, any>) {
  try {
    const request = indexedDB.open('NotificationLogs', 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      store.add({ type, ...data, timestamp: Date.now() });
    };
  } catch {
    // Silent fail
  }
}
