/**
 * Native Initialization Hook
 * Sets up all native Capacitor features when the app starts.
 * Handles push notification registration, biometric setup, and app lifecycle.
 */
import { useEffect, useRef } from 'react';
import {
  isNativePlatform,
  nativePush,
  appLifecycle,
  initializeNativeFeatures,
  haptics,
} from '../lib/native';

export function useNativeInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      if (!isNativePlatform()) return;

      // Initialize native features (status bar, splash screen, keyboard)
      await initializeNativeFeatures();

      // Register for push notifications
      const token = await nativePush.register();
      if (token) {
        // Store the APNs token - will be sent to server on login
        localStorage.setItem('apns_device_token', token.value);
      }

      // Handle incoming push notifications while app is open
      nativePush.onNotificationReceived((notification) => {
        // Trigger haptic feedback for notifications
        haptics.medium();

        // Dispatch custom event for the app to handle
        window.dispatchEvent(
          new CustomEvent('native-push-received', {
            detail: notification,
          })
        );
      });

      // Handle notification tap (opens specific page)
      nativePush.onNotificationAction((action) => {
        const data = action.notification?.data;
        if (data?.url) {
          window.location.href = data.url;
        } else if (data?.type === 'parent_arrival') {
          window.location.href = '/staff/pickup';
        } else if (data?.type === 'new_message') {
          window.location.href = '/staff/messages';
        } else if (data?.type === 'daily_report') {
          window.location.href = '/parent/reports';
        }
      });

      // Handle app returning to foreground
      appLifecycle.onStateChange(({ isActive }) => {
        if (isActive) {
          // Clear notification badges
          nativePush.removeAll();
          // Trigger data refresh
          window.dispatchEvent(new Event('app-foreground'));
        }
      });

      // Handle deep links
      appLifecycle.onUrlOpen((url) => {
        const path = new URL(url).pathname;
        if (path) {
          window.location.href = path;
        }
      });
    }

    init().catch(console.error);
  }, []);
}
