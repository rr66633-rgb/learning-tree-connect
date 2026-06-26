/**
 * Meta Pixel (Facebook Pixel) Event Tracking Utility
 * Pixel ID: 1314391127472452
 *
 * Implements Event Deduplication:
 * - Each event gets a unique eventID (UUID)
 * - The same eventID is sent to both browser pixel AND server-side CAPI
 * - Meta deduplicates events with the same event_name + event_id
 *
 * Standard Events:
 * - PageView: Tracked automatically on route changes
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
 * Generate a unique event ID for deduplication
 */
function generateEventId(): string {
  // Use crypto.randomUUID if available, fallback to manual UUID generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get Facebook cookies for user matching
 */
function getFbCookies(): { fbc?: string; fbp?: string } {
  const cookies: { fbc?: string; fbp?: string } = {};
  try {
    const cookieStr = document.cookie;
    const fbcMatch = cookieStr.match(/_fbc=([^;]+)/);
    const fbpMatch = cookieStr.match(/_fbp=([^;]+)/);
    if (fbcMatch) cookies.fbc = fbcMatch[1];
    if (fbpMatch) cookies.fbp = fbpMatch[1];
  } catch {
    // Cookies not accessible
  }
  return cookies;
}

/**
 * Send event to server-side CAPI endpoint
 * Fire-and-forget: doesn't block the UI
 */
function sendToServer(
  eventName: string,
  eventId: string,
  customData?: Record<string, unknown>
): void {
  const fbCookies = getFbCookies();
  const url = window.location.href;

  // Use tRPC endpoint via fetch (fire and forget)
  const payload = {
    eventName,
    eventId,
    eventSourceUrl: url,
    userData: {
      ...(fbCookies.fbc && { fbc: fbCookies.fbc }),
      ...(fbCookies.fbp && { fbp: fbCookies.fbp }),
    },
    ...(customData && { customData }),
  };

  // Call the tRPC mutation via HTTP POST
  fetch('/api/trpc/capi.trackEvent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: payload }),
    keepalive: true, // Ensures request completes even if page navigates
  }).catch(() => {
    // Silently fail - server-side tracking is supplementary
  });
}

/**
 * Check if fbq is available
 */
function isFbqAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Track a standard Meta Pixel event with deduplication
 * Sends to both browser pixel AND server-side CAPI
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
  serverCustomData?: Record<string, unknown>
): string {
  const eventId = generateEventId();

  // Send to browser pixel with eventID for deduplication
  if (isFbqAvailable()) {
    const pixelParams = { ...params, eventID: eventId };
    window.fbq('track', eventName, pixelParams);
  }

  // Send to server-side CAPI with same eventID
  sendToServer(eventName, eventId, serverCustomData);

  return eventId;
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
    window.fbq('trackCustom', eventName, params);
  } else {
    window.fbq('trackCustom', eventName);
  }
}

/**
 * Track PageView - called on route changes (SPA navigation)
 */
export function trackPageView(): string {
  return trackEvent('PageView');
}

/**
 * Track ViewContent - when user views important content
 * @param contentName - Name of the content being viewed
 * @param contentCategory - Category of the content
 */
export function trackViewContent(
  contentName?: string,
  contentCategory?: string
): string {
  return trackEvent(
    'ViewContent',
    {
      content_name: contentName,
      content_category: contentCategory,
    },
    {
      contentName,
      contentCategory,
    }
  );
}

/**
 * Track CompleteRegistration - when a user successfully registers
 * @param method - Registration method (e.g., 'email', 'phone')
 */
export function trackCompleteRegistration(method?: string): string {
  return trackEvent(
    'CompleteRegistration',
    {
      content_name: 'User Registration',
      status: 'complete',
      ...(method && { method }),
    },
    {
      contentName: 'User Registration',
      status: 'complete',
    }
  );
}

/**
 * Track Lead - when a nursery submits registration/inquiry
 * @param contentName - Name/type of the lead
 */
export function trackLead(contentName?: string): string {
  return trackEvent(
    'Lead',
    {
      content_name: contentName || 'Nursery Registration',
      content_category: 'nursery_inquiry',
    },
    {
      contentName: contentName || 'Nursery Registration',
    }
  );
}

/**
 * Track Contact - when a user sends a message or initiates contact
 */
export function trackContact(): string {
  return trackEvent('Contact');
}

/**
 * Track Purchase - when a payment is completed
 * @param value - Payment amount
 * @param currency - Currency code (default: SAR)
 */
export function trackPurchase(value: number, currency: string = 'SAR'): string {
  return trackEvent(
    'Purchase',
    {
      value,
      currency,
    },
    {
      value,
      currency,
    }
  );
}
