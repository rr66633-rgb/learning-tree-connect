/**
 * Native Platform Integration Layer
 * Provides unified access to Capacitor native plugins with web fallbacks.
 * This ensures the app works both as a PWA and as a native iOS app.
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';

// ============================================================
// Platform Detection
// ============================================================

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
export const isIOS = () => getPlatform() === 'ios';

// ============================================================
// Push Notifications (APNs)
// ============================================================

export interface PushNotificationToken {
  value: string;
}

export const nativePush = {
  /**
   * Request permission and register for push notifications
   * Returns the APNs device token
   */
  async register(): Promise<PushNotificationToken | null> {
    if (!isNativePlatform()) return null;

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          resolve(token);
        });
        PushNotifications.addListener('registrationError', () => {
          resolve(null);
        });
        // Timeout after 10 seconds
        setTimeout(() => resolve(null), 10000);
      });
    }
    return null;
  },

  /**
   * Listen for incoming push notifications
   */
  onNotificationReceived(callback: (notification: any) => void) {
    if (!isNativePlatform()) return;
    PushNotifications.addListener('pushNotificationReceived', callback);
  },

  /**
   * Listen for notification tap actions
   */
  onNotificationAction(callback: (action: any) => void) {
    if (!isNativePlatform()) return;
    PushNotifications.addListener('pushNotificationActionPerformed', callback);
  },

  /**
   * Get delivered notifications list
   */
  async getDelivered() {
    if (!isNativePlatform()) return { notifications: [] };
    return PushNotifications.getDeliveredNotifications();
  },

  /**
   * Remove all delivered notifications
   */
  async removeAll() {
    if (!isNativePlatform()) return;
    await PushNotifications.removeAllDeliveredNotifications();
  },
};

// ============================================================
// Biometric Authentication (Face ID / Touch ID)
// ============================================================

export const biometrics = {
  /**
   * Check if biometric authentication is available
   * Uses the native-biometric plugin via registerPlugin
   */
  async isAvailable(): Promise<boolean> {
    if (!isNativePlatform()) return false;
    try {
      const { NativeBiometric } = await import('./biometric-bridge');
      const result = await NativeBiometric.isAvailable();
      return result?.isAvailable ?? false;
    } catch {
      return false;
    }
  },

  /**
   * Authenticate using Face ID or Touch ID
   * Returns true if authentication succeeded
   */
  async authenticate(reason?: string): Promise<boolean> {
    if (!isNativePlatform()) return true; // Skip on web

    try {
      const { NativeBiometric } = await import('./biometric-bridge');
      await NativeBiometric.authenticate({
        reason: reason || 'التحقق من هويتك',
        useFallback: true,
      });
      return true;
    } catch {
      return false;
    }
  },
};

// ============================================================
// Haptic Feedback
// ============================================================

export const haptics = {
  /** Light impact - for button taps */
  async light() {
    if (!isNativePlatform()) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  },

  /** Medium impact - for confirmations */
  async medium() {
    if (!isNativePlatform()) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  },

  /** Heavy impact - for important actions */
  async heavy() {
    if (!isNativePlatform()) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
  },

  /** Success notification */
  async success() {
    if (!isNativePlatform()) return;
    await Haptics.notification({ type: NotificationType.Success });
  },

  /** Warning notification */
  async warning() {
    if (!isNativePlatform()) return;
    await Haptics.notification({ type: NotificationType.Warning });
  },

  /** Error notification */
  async error() {
    if (!isNativePlatform()) return;
    await Haptics.notification({ type: NotificationType.Error });
  },

  /** Selection changed */
  async selection() {
    if (!isNativePlatform()) return;
    await Haptics.selectionChanged();
  },
};

// ============================================================
// Native Share
// ============================================================

export const nativeShare = {
  /**
   * Share text, URL, or files using the native share sheet
   */
  async share(options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }) {
    if (!isNativePlatform()) {
      // Fallback to Web Share API
      if (navigator.share) {
        await navigator.share(options);
        return;
      }
      // Fallback: copy to clipboard
      const text = options.url || options.text || '';
      await navigator.clipboard.writeText(text);
      return;
    }
    await Share.share(options);
  },

  /**
   * Check if native share is available
   */
  canShare(): boolean {
    return isNativePlatform() || !!navigator.share;
  },
};

// ============================================================
// Network Status (Offline Support)
// ============================================================

export const network = {
  /**
   * Get current network status
   */
  async getStatus() {
    if (!isNativePlatform()) {
      return { connected: navigator.onLine, connectionType: 'unknown' };
    }
    return Network.getStatus();
  },

  /**
   * Listen for network status changes
   */
  onStatusChange(callback: (status: { connected: boolean; connectionType: string }) => void) {
    if (!isNativePlatform()) {
      window.addEventListener('online', () => callback({ connected: true, connectionType: 'wifi' }));
      window.addEventListener('offline', () => callback({ connected: false, connectionType: 'none' }));
      return;
    }
    Network.addListener('networkStatusChange', callback);
  },
};

// ============================================================
// Offline Storage (Preferences)
// ============================================================

export const storage = {
  async set(key: string, value: string) {
    if (!isNativePlatform()) {
      localStorage.setItem(key, value);
      return;
    }
    await Preferences.set({ key, value });
  },

  async get(key: string): Promise<string | null> {
    if (!isNativePlatform()) {
      return localStorage.getItem(key);
    }
    const { value } = await Preferences.get({ key });
    return value;
  },

  async remove(key: string) {
    if (!isNativePlatform()) {
      localStorage.removeItem(key);
      return;
    }
    await Preferences.remove({ key });
  },

  async clear() {
    if (!isNativePlatform()) {
      localStorage.clear();
      return;
    }
    await Preferences.clear();
  },
};

// ============================================================
// Status Bar
// ============================================================

export const statusBar = {
  async setDark() {
    if (!isNativePlatform()) return;
    await StatusBar.setStyle({ style: Style.Dark });
  },

  async setLight() {
    if (!isNativePlatform()) return;
    await StatusBar.setStyle({ style: Style.Light });
  },

  async hide() {
    if (!isNativePlatform()) return;
    await StatusBar.hide();
  },

  async show() {
    if (!isNativePlatform()) return;
    await StatusBar.show();
  },
};

// ============================================================
// App Lifecycle
// ============================================================

export const appLifecycle = {
  /**
   * Listen for app state changes (foreground/background)
   */
  onStateChange(callback: (state: { isActive: boolean }) => void) {
    if (!isNativePlatform()) {
      document.addEventListener('visibilitychange', () => {
        callback({ isActive: !document.hidden });
      });
      return;
    }
    App.addListener('appStateChange', callback);
  },

  /**
   * Listen for back button (Android) or swipe back gesture
   */
  onBackButton(callback: () => void) {
    if (!isNativePlatform()) return;
    App.addListener('backButton', callback);
  },

  /**
   * Listen for deep links / URL opens
   */
  onUrlOpen(callback: (url: string) => void) {
    if (!isNativePlatform()) return;
    App.addListener('appUrlOpen', (data) => {
      callback(data.url);
    });
  },
};

// ============================================================
// Keyboard
// ============================================================

export const keyboard = {
  onShow(callback: (info: { keyboardHeight: number }) => void) {
    if (!isNativePlatform()) return;
    Keyboard.addListener('keyboardWillShow', callback);
  },

  onHide(callback: () => void) {
    if (!isNativePlatform()) return;
    Keyboard.addListener('keyboardWillHide', callback);
  },

  async hide() {
    if (!isNativePlatform()) return;
    await Keyboard.hide();
  },
};

// ============================================================
// Splash Screen
// ============================================================

export const splash = {
  async hide() {
    if (!isNativePlatform()) return;
    await SplashScreen.hide();
  },

  async show() {
    if (!isNativePlatform()) return;
    await SplashScreen.show({ autoHide: false });
  },
};

// ============================================================
// External Browser
// ============================================================

export const browser = {
  async open(url: string) {
    if (!isNativePlatform()) {
      window.open(url, '_blank');
      return;
    }
    await Browser.open({ url });
  },
};

// ============================================================
// Initialize Native Features
// ============================================================

export async function initializeNativeFeatures() {
  if (!isNativePlatform()) return;

  // Set status bar style
  await statusBar.setDark();

  // Hide splash screen after app is ready
  await splash.hide();

  // Setup keyboard behavior
  keyboard.onShow((info) => {
    document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
  });
  keyboard.onHide(() => {
    document.body.style.setProperty('--keyboard-height', '0px');
  });
}
