import { ApexCandidate, ApexApplicationRef } from '../types';
import { apiFetch, jsonHeaders } from './client';

export async function apexLoginApi(nationalId: string, email: string, password: string): Promise<{ candidate: ApexCandidate; token: string }> {
  const res = await apiFetch('/apex/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ nationalId, email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || 'Login failed');
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function apexRequestNationalIdRecoveryApi(payload: {
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/apex/auth/request-national-id-recovery', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to process this request');
  return data;
}

export async function apexConfirmNationalIdRecoveryApi(payload: {
  email: string;
  token: string;
  nationalId: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/apex/auth/confirm-national-id-recovery', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update your National ID');
  return data;
}

export async function apexSignUpApi(payload: {
  applicationId?: string | null;
  name: string;
  email: string;
  nationalId: string;
  password: string;
}): Promise<{ candidate: ApexCandidate; message: string }> {
  const res = await apiFetch('/apex/auth/signup', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sign up failed');
  return data;
}

export async function apexActivateAccountApi(email: string, token: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/apex/auth/activate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, token })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to activate account');
  return data;
}

export async function apexResendActivationApi(email: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/apex/auth/resend-activation', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to resend activation link');
  return data;
}

export async function apexForgotPasswordApi(email: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/apex/auth/forgot-password', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to request password reset');
  return data;
}

export async function apexResetPasswordApi(payload: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/apex/auth/reset-password', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reset password');
  return data;
}

export async function apexMeApi(): Promise<{ candidate: ApexCandidate; application: ApexApplicationRef | null }> {
  const res = await apiFetch('/apex/auth/me');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load your Apex profile');
  return data;
}

export async function apexAcceptTermsApi(): Promise<{ candidate: ApexCandidate }> {
  const res = await apiFetch('/apex/auth/accept-terms', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record terms acceptance');
  return data;
}