import { PaymentStage, ApexPaymentStatus } from '../types';
import { apiFetch, jsonHeaders } from './client';

export async function verifyApexPaymentApi(reference: string, stage: PaymentStage) {
  const res = await apiFetch('/apex/paystack/verify', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ reference, stage })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment verification failed');
  return data;
}

export async function getApexPaymentStatusApi(): Promise<ApexPaymentStatus> {
  const res = await apiFetch('/apex/paystack/my-status');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load payment status');
  return data;
}