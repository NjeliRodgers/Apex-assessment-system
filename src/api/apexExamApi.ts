import { apiFetch } from './client';

export interface ApexExamProduct {
  id: string;
  name: string;
  description?: string | null;
  costKsh: number;
  jobTitle: string;
}

export async function getMyExamApi(): Promise<ApexExamProduct> {
  const res = await apiFetch('/apex/my-exam');
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to load your assessment details');
  }

  return data.exam;
}

export async function getMyInterviewProductApi(): Promise<ApexExamProduct> {
  const res = await apiFetch('/apex/my-interview-product');
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to load your interview package details');
  }

  return data.product;
}