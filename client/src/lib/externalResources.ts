/**
 * External Resources Loader
 * 
 * Loads external CDN resources (Meta Pixel, Moyasar, Google Fonts, Analytics)
 * ONLY on web platform. On native iOS/Android, these are NOT loaded to prevent
 * WKWebView "Load failed" banner when any CDN is unreachable.
 * 
 * This replaces the static <script>/<link> tags that were previously in index.html.
 */

import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();

/**
 * Load Google Fonts dynamically
 */
function loadGoogleFonts(): void {
  // Preconnect
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);

  // Font stylesheet
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;600;700&family=Poppins:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(fontLink);
}

/**
 * Load Meta Pixel (Facebook Pixel) dynamically
 */
function loadMetaPixel(): void {
  // Initialize fbq function
  const w = window as any;
  if (w.fbq) return;
  
  const n: any = (w.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  // Load the script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  // Don't let failure propagate - silently fail
  script.onerror = () => {
    console.warn('[MetaPixel] Failed to load - likely blocked by ad blocker or network');
  };
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  // Initialize pixel
  w.fbq('init', '1314391127472452');
  w.fbq('track', 'PageView');
}

/**
 * Load Moyasar payment form CSS and JS dynamically
 * Called only when payment page is about to be shown
 */
export function loadMoyasar(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already loaded
    if ((window as any).Moyasar) {
      resolve();
      return;
    }

    // Load CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/moyasar.css';
    document.head.appendChild(css);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/moyasar.umd.min.js';
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn('[Moyasar] Failed to load payment form SDK');
      resolve(); // Resolve anyway to not block the app
    };
    document.head.appendChild(script);
  });
}

/**
 * Load Umami analytics dynamically
 */
function loadAnalytics(): void {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  
  if (!endpoint || !websiteId) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = `${endpoint}/umami`;
  script.dataset.websiteId = websiteId;
  script.onerror = () => {
    console.warn('[Analytics] Failed to load - likely blocked');
  };
  document.body.appendChild(script);
}

/**
 * Initialize all external resources.
 * Call this once from main.tsx.
 * On native platform, only loads Google Fonts (needed for UI).
 * On web platform, loads everything.
 */
export function initExternalResources(): void {
  if (IS_NATIVE) {
    // On native: Load NOTHING from external CDNs.
    // Any failed network request triggers iOS WKWebView "Load failed" banner.
    // The app uses system fonts (Cairo is commonly available on Arabic iOS devices,
    // and the CSS font-family stack falls back gracefully to system fonts).
    return;
  }

  // On web: load everything
  loadGoogleFonts();
  loadMetaPixel();
  loadAnalytics();
  
  // Moyasar is loaded on-demand when payment page opens (see loadMoyasar export)
}
