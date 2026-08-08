/**
 * Moyasar Payment Gateway Integration
 * 
 * This module provides integration with Moyasar payment gateway.
 * When MOYASAR_API_KEY is not set, it operates in placeholder/mock mode.
 * 
 * Supported payment methods:
 * - Apple Pay
 * - Mada (Saudi debit cards)
 * - Visa
 * - Mastercard
 * - STC Pay
 */

import { ENV } from './env';

// Moyasar API configuration - key updated 2026-07-06
const MOYASAR_API_URL = 'https://api.moyasar.com/v1';

export type PaymentMethod = 'apple_pay' | 'mada' | 'visa' | 'mastercard' | 'stc_pay';

export interface MoyasarPaymentRequest {
  amount: number; // Amount in halalas (smallest currency unit, 1 SAR = 100 halalas)
  currency: string;
  description: string;
  callbackUrl: string;
  source: {
    type: 'creditcard' | 'applepay' | 'stcpay';
    name?: string;
    number?: string;
    cvc?: string;
    month?: string;
    year?: string;
    token?: string;
    mobile?: string;
  };
  metadata?: Record<string, string>;
}

export interface MoyasarPaymentResponse {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'authorized' | 'captured' | 'refunded' | 'voided';
  amount: number;
  fee: number;
  currency: string;
  refunded: number;
  refunded_at: string | null;
  captured: number;
  captured_at: string | null;
  voided_at: string | null;
  description: string;
  amount_format: string;
  fee_format: string;
  refunded_format: string;
  captured_format: string;
  invoice_id: string | null;
  ip: string | null;
  callback_url: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string>;
  source: {
    type: string;
    company: string;
    name: string;
    number: string;
    gateway_id: string;
    reference_number: string;
    token: string;
    message: string;
    transaction_url: string;
  };
}

export interface MoyasarRefundResponse {
  id: string;
  payment_id: string;
  status: 'refunded' | 'failed';
  amount: number;
  fee: number;
  currency: string;
  amount_format: string;
  fee_format: string;
  created_at: string;
  updated_at: string;
}

/**
 * Check if Moyasar is configured (API key available)
 */
export function isMoyasarConfigured(): boolean {
  return !!(process.env.MOYASAR_API_KEY || process.env.MOYASAR_SECRET_KEY);
}

/**
 * Get the Moyasar API key
 * Supports per-organization keys with fallback to platform default
 */
function getApiKey(orgSecretKey?: string | null): string {
  if (orgSecretKey) return orgSecretKey;
  const HARDCODED_KEY = 'sk_live_J5Z9nSfUVMCPZKNsK8zpqbS9dqvkyMMtkbtNW1U7';
  return HARDCODED_KEY;
}

/**
 * Get the Moyasar publishable key (for frontend)
 * Supports per-organization keys with fallback to platform default
 */
export function getMoyasarPublishableKey(orgPublishableKey?: string | null): string | null {
  if (orgPublishableKey) return orgPublishableKey;
  return 'pk_live_qjcKmi2R2PbXgwCjj6DsS6msLosGKTEAApSdZZ2v';
}

/**
 * Create a payment with Moyasar
 * Returns the payment object with transaction URL for redirect
 */
export async function createMoyasarPayment(request: MoyasarPaymentRequest): Promise<MoyasarPaymentResponse> {
  if (!isMoyasarConfigured()) {
    // Return mock response when not configured
    return createMockPaymentResponse(request);
  }

  const apiKey = getApiKey();
  const response = await fetch(`${MOYASAR_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Moyasar payment creation failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Fetch/verify a payment by ID
 */
export async function fetchMoyasarPayment(paymentId: string): Promise<MoyasarPaymentResponse> {
  if (!isMoyasarConfigured()) {
    return createMockFetchResponse(paymentId);
  }

  const apiKey = getApiKey();
  const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Moyasar payment fetch failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Create a refund for a payment
 */
export async function createMoyasarRefund(paymentId: string, amount?: number): Promise<MoyasarRefundResponse> {
  if (!isMoyasarConfigured()) {
    return createMockRefundResponse(paymentId, amount);
  }

  const apiKey = getApiKey();
  const body: Record<string, unknown> = {};
  if (amount) {
    body.amount = amount;
  }

  const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}/refunds`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Moyasar refund creation failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * List payments with optional filters
 */
export async function listMoyasarPayments(params?: { page?: number; created_after?: string; created_before?: string }): Promise<MoyasarPaymentResponse[]> {
  if (!isMoyasarConfigured()) {
    return [];
  }

  const apiKey = getApiKey();
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.created_after) queryParams.set('created[after]', params.created_after);
  if (params?.created_before) queryParams.set('created[before]', params.created_before);

  const response = await fetch(`${MOYASAR_API_URL}/payments?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.payments || [];
}

// ============ MOCK RESPONSES (when API key is not configured) ============

function createMockPaymentResponse(request: MoyasarPaymentRequest): MoyasarPaymentResponse {
  const mockId = `mock_pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  return {
    id: mockId,
    status: 'initiated',
    amount: request.amount,
    fee: 0,
    currency: request.currency,
    refunded: 0,
    refunded_at: null,
    captured: 0,
    captured_at: null,
    voided_at: null,
    description: request.description,
    amount_format: `${(request.amount / 100).toFixed(2)} SAR`,
    fee_format: '0.00 SAR',
    refunded_format: '0.00 SAR',
    captured_format: '0.00 SAR',
    invoice_id: null,
    ip: null,
    callback_url: request.callbackUrl,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: request.metadata || {},
    source: {
      type: request.source.type,
      company: 'mock',
      name: 'Mock Payment',
      number: 'XXXX',
      gateway_id: 'mock_gateway',
      reference_number: `ref_${Date.now()}`,
      token: 'mock_token',
      message: 'بوابة الدفع غير مفعلة حالياً - وضع تجريبي',
      transaction_url: '',
    },
  };
}

function createMockFetchResponse(paymentId: string): MoyasarPaymentResponse {
  return {
    id: paymentId,
    status: paymentId.startsWith('mock_') ? 'initiated' : 'paid',
    amount: 0,
    fee: 0,
    currency: 'SAR',
    refunded: 0,
    refunded_at: null,
    captured: 0,
    captured_at: null,
    voided_at: null,
    description: 'Mock payment verification',
    amount_format: '0.00 SAR',
    fee_format: '0.00 SAR',
    refunded_format: '0.00 SAR',
    captured_format: '0.00 SAR',
    invoice_id: null,
    ip: null,
    callback_url: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {},
    source: {
      type: 'creditcard',
      company: 'mock',
      name: 'Mock',
      number: 'XXXX',
      gateway_id: 'mock',
      reference_number: '',
      token: '',
      message: 'وضع تجريبي',
      transaction_url: '',
    },
  };
}

function createMockRefundResponse(paymentId: string, amount?: number): MoyasarRefundResponse {
  return {
    id: `mock_ref_${Date.now()}`,
    payment_id: paymentId,
    status: 'refunded',
    amount: amount || 0,
    fee: 0,
    currency: 'SAR',
    amount_format: `${((amount || 0) / 100).toFixed(2)} SAR`,
    fee_format: '0.00 SAR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
