import { describe, it, expect } from 'vitest';

describe('Moyasar Secret Key Validation', () => {
  it('should have MOYASAR_SECRET_KEY environment variable set', () => {
    const key = process.env.MOYASAR_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe('');
  });

  it('should authenticate successfully with Moyasar API', async () => {
    const key = process.env.MOYASAR_SECRET_KEY;
    if (!key) {
      console.warn('MOYASAR_SECRET_KEY not set, skipping API test');
      return;
    }

    const response = await fetch('https://api.moyasar.com/v1/payments?per_page=1', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('payments');
    expect(data).toHaveProperty('meta');
  });

  it('should have VITE_MOYASAR_PUBLISHABLE_KEY set', () => {
    const key = process.env.VITE_MOYASAR_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe('');
    expect(key).toMatch(/^pk_live_/);
  });
});
