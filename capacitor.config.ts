import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.naashah.app',
  appName: 'نشأة',
  webDir: 'dist/public',
  server: {
    // Load the app directly from the production server
    // This ensures all API calls work correctly without hostname conflicts
    url: 'https://naashah.com',
    // Allow navigation to our domain
    allowNavigation: ['naashah.com', '*.naashah.com'],
  },
  plugins: {
    CapacitorHttp: {
      // Disabled - not needed when using server.url (app loads from remote server directly)
      enabled: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      // Keep native splash visible until JS explicitly hides it
      // This prevents "Load failed" flash during server cold start
      launchShowDuration: 15000, // Safety fallback: auto-hide after 15s if JS never calls hide
      launchAutoHide: false, // JS controls when to hide via SplashScreen.hide()
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'light',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#2E7D32',
      sound: 'notification.wav',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#FFFFFF',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'recommended',
    scheme: 'naashah',
    backgroundColor: '#FFFFFF',
    allowsLinkPreview: true,
  },
  android: {
    backgroundColor: '#FFFFFF',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
