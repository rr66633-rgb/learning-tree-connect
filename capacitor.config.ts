import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.naashah.app',
  appName: 'نشأة',
  webDir: 'dist/public',
  server: {
    // Load the app directly from the production server.
    // This makes ALL requests same-origin (no CORS, no cross-origin cookie issues).
    // WKWebView treats the app as if it's running on naashah.com itself.
    // This eliminates the "Load failed" error caused by cross-origin fetch from localhost.
    url: 'https://naashah.com',
    // Allow navigation to our domain for OAuth callbacks etc.
    allowNavigation: ['naashah.com', '*.naashah.com'],
  },
  plugins: {
    CapacitorHttp: {
      // DISABLED: Not needed when using server.url (same-origin).
      enabled: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      // Keep native splash visible until the web page loads
      launchShowDuration: 20000, // Safety fallback: auto-hide after 20s
      launchAutoHide: true, // Auto-hide when webview finishes loading
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
