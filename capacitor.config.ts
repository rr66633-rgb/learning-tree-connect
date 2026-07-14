import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.naashah.app',
  appName: 'نشأة',
  webDir: 'dist/public',
  server: {
    // NO server.url - app loads from local webDir (instant, no network dependency)
    // API calls use absolute URLs via apiBase.ts when in native context
    // This eliminates "Load failed" errors on iOS completely
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow navigation to our domain for OAuth callbacks etc.
    allowNavigation: ['naashah.com', '*.naashah.com'],
  },
  plugins: {
    CapacitorHttp: {
      // Enable CapacitorHttp to use native HTTP for cross-origin API calls
      // This bypasses WKWebView CORS restrictions and provides reliable networking
      enabled: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      // Keep native splash visible until JS explicitly hides it
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
