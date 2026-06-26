/**
 * Meta Pixel (Facebook Pixel) Event Tracking Utility
 * Pixel ID: 1314391127472452
 *
 * Standard Events:
 * - PageView: Tracked automatically on initial load via index.html
 * - ViewContent: When a user views a key page/content
 * - CompleteRegistration: When a user completes registration
 * - Lead: When a nursery submits registration/inquiry
 * - Contact: When a user sends a message or contacts
 * - Purchase: When a payment/invoice is completed
 */

// Extend Window interface for fbq
declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
  }
}

/**
 * Check if fbq is available
 */
function isFbqAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/**
 * Track a standard Meta Pixel event
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!isFbqAvailable()) return;
  if (params) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}

/**
 * Track a custom Meta Pixel event
 */
export function trackCustomEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!isFbqAvailable()) return;
  if (params) {
    window.fbq("trackCustom", eventName, params);
  } else {
    window.fbq("trackCustom", eventName);
  }
}

/**
 * Track PageView - called on route changes (SPA navigation)
 */
export function trackPageView(): void {
  trackEvent("PageView");
}

/**
 * Track ViewContent - when user views important content
 * @param contentName - Name of the content being viewed
 * @param contentCategory - Category of the content
 */
export function trackViewContent(
  contentName?: string,
  contentCategory?: string
): void {
  trackEvent("ViewContent", {
    content_name: contentName,
    content_category: contentCategory,
  });
}

/**
 * Track CompleteRegistration - when a user successfully registers
 * @param method - Registration method (e.g., 'email', 'oauth')
 */
export function trackCompleteRegistration(method?: string): void {
  trackEvent("CompleteRegistration", {
    content_name: "User Registration",
    status: "complete",
    ...(method && { method }),
  });
}

/**
 * Track Lead - when a nursery submits registration/inquiry
 * @param contentName - Name/type of the lead
 */
export function trackLead(contentName?: string): void {
  trackEvent("Lead", {
    content_name: contentName || "Nursery Registration",
    content_category: "nursery_inquiry",
  });
}

/**
 * Track Contact - when a user sends a message or initiates contact
 */
export function trackContact(): void {
  trackEvent("Contact");
}

/**
 * Track Purchase - when a payment is completed
 * @param value - Payment amount
 * @param currency - Currency code (default: SAR)
 */
export function trackPurchase(value: number, currency: string = "SAR"): void {
  trackEvent("Purchase", {
    value,
    currency,
  });
}
