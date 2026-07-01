/**
 * Meta Conversions API (CAPI) Server-Side Integration
 * Sends events directly to Meta's servers for improved tracking accuracy.
 * Works alongside the browser pixel with event deduplication via event_id.
 *
 * Pixel ID: 1314391127472452
 * API Version: v21.0
 */

const META_PIXEL_ID = '1314391127472452';
const META_API_VERSION = 'v21.0';
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;

interface UserData {
  em?: string[]; // Hashed email(s)
  ph?: string[]; // Hashed phone(s)
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string; // Facebook click ID cookie
  fbp?: string; // Facebook browser ID cookie
  fn?: string[]; // Hashed first name(s)
  ln?: string[]; // Hashed last name(s)
  external_id?: string[]; // External user ID
  country?: string[]; // Hashed country code
}

interface CustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  status?: string;
}

interface CAPIEvent {
  event_name: string;
  event_time: number;
  event_id: string; // For deduplication with browser pixel
  event_source_url: string;
  action_source: 'website';
  user_data: UserData;
  custom_data?: CustomData;
  opt_out?: boolean;
}

interface SendEventParams {
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData: UserData;
  customData?: CustomData;
  testEventCode?: string;
}

/**
 * Hash a value using SHA-256 for Meta's requirements.
 * Meta requires certain user data fields to be hashed.
 */
export async function hashValue(value: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Send an event to Meta Conversions API
 */
export async function sendCAPIEvent(params: SendEventParams): Promise<{
  success: boolean;
  events_received?: number;
  messages?: string[];
  error?: string;
}> {
  // CAPI temporarily disabled - Meta access token blocked
  return { success: false, error: 'CAPI disabled' };

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('[Meta CAPI] Missing META_CAPI_ACCESS_TOKEN');
    return { success: false, error: 'Missing access token' };
  }

  const event: CAPIEvent = {
    event_name: params.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    action_source: 'website',
    user_data: params.userData,
    ...(params.customData && { custom_data: params.customData }),
  };

  const body: Record<string, unknown> = {
    data: [event],
  };

  // Add test event code if provided (for testing in Events Manager)
  if (params.testEventCode) {
    body.test_event_code = params.testEventCode;
  }

  try {
    const response = await fetch(`${META_API_URL}?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      console.error('[Meta CAPI] API Error:', JSON.stringify(result));
      return {
        success: false,
        error: (result.error as Record<string, unknown>)?.message as string || 'Unknown API error',
      };
    }

    return {
      success: true,
      events_received: result.events_received as number,
      messages: result.messages as string[],
    };
  } catch (e) {
    const errMsg = (e as Error)?.message || 'Network error';
    console.error('[Meta CAPI] Network Error:', errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
}

/**
 * Send a PageView event
 */
export async function trackPageView(params: {
  eventId: string;
  url: string;
  userData: UserData;
}) {
  return sendCAPIEvent({
    eventName: 'PageView',
    eventId: params.eventId,
    eventSourceUrl: params.url,
    userData: params.userData,
  });
}

/**
 * Send a ViewContent event
 */
export async function trackViewContent(params: {
  eventId: string;
  url: string;
  userData: UserData;
  contentName?: string;
  contentCategory?: string;
}) {
  return sendCAPIEvent({
    eventName: 'ViewContent',
    eventId: params.eventId,
    eventSourceUrl: params.url,
    userData: params.userData,
    customData: {
      content_name: params.contentName,
      content_category: params.contentCategory,
    },
  });
}

/**
 * Send a Lead event
 */
export async function trackLead(params: {
  eventId: string;
  url: string;
  userData: UserData;
  contentName?: string;
}) {
  return sendCAPIEvent({
    eventName: 'Lead',
    eventId: params.eventId,
    eventSourceUrl: params.url,
    userData: params.userData,
    customData: {
      content_name: params.contentName,
    },
  });
}

/**
 * Send a CompleteRegistration event
 */
export async function trackCompleteRegistration(params: {
  eventId: string;
  url: string;
  userData: UserData;
  contentName?: string;
  status?: string;
}) {
  return sendCAPIEvent({
    eventName: 'CompleteRegistration',
    eventId: params.eventId,
    eventSourceUrl: params.url,
    userData: params.userData,
    customData: {
      content_name: params.contentName,
      status: params.status,
    },
  });
}

/**
 * Send a Contact event
 */
export async function trackContact(params: {
  eventId: string;
  url: string;
  userData: UserData;
}) {
  return sendCAPIEvent({
    eventName: 'Contact',
    eventId: params.eventId,
    eventSourceUrl: params.url,
    userData: params.userData,
  });
}

/**
 * Send a Purchase event
 */
export async function trackPurchase(params: {
  eventId: string;
  url: string;
  userData: UserData;
  value?: number;
  currency?: string;
  contentIds?: string[];
}) {
  return sendCAPIEvent({
    eventName: 'Purchase',
    eventId: params.eventId,
    eventSourceUrl: params.url,
    userData: params.userData,
    customData: {
      value: params.value,
      currency: params.currency || 'SAR',
      content_ids: params.contentIds,
    },
  });
}
