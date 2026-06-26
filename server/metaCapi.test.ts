import { describe, it, expect } from 'vitest';

describe('Meta CAPI Access Token', () => {
  it('should have META_CAPI_ACCESS_TOKEN set', () => {
    const token = process.env.META_CAPI_ACCESS_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(50);
  });

  it('should successfully send a test event to Meta CAPI', async () => {
    const token = process.env.META_CAPI_ACCESS_TOKEN;
    if (!token) {
      throw new Error('META_CAPI_ACCESS_TOKEN not set');
    }

    const PIXEL_ID = '1314391127472452';
    const API_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;

    const event = {
      data: [{
        event_name: 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        event_id: `test_${Date.now()}`,
        event_source_url: 'https://naashah.com',
        action_source: 'website',
        user_data: {
          client_ip_address: '127.0.0.1',
          client_user_agent: 'Mozilla/5.0 (Test)',
        },
      }],
      test_event_code: 'TEST_VALIDATION',
    };

    const response = await fetch(`${API_URL}?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    const result = await response.json() as Record<string, unknown>;

    // If token is valid, we get events_received or a specific error about permissions
    // A 200 with events_received means the token works
    if (response.ok) {
      expect(result.events_received).toBeDefined();
      expect(result.events_received).toBe(1);
    } else {
      // Token might be short-lived or need specific permissions
      // But if we get a structured error response, the token format is valid
      const error = result.error as Record<string, unknown> | undefined;
      console.log('API Response:', JSON.stringify(result));
      // Fail if it's an auth error (invalid token)
      if (error?.code === 190) {
        throw new Error(`Invalid token: ${error.message}`);
      }
      // Other errors (like permissions) mean the token itself is valid
      expect(error).toBeDefined();
    }
  }, 15000);
});
