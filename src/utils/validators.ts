// Shared validation helpers for form fields across ApexFrontend.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export const EMAIL_ERROR_MESSAGE = 'Please enter a real, complete email address (e.g. name@example.com).';

const NATIONAL_ID_REGEX = /^\d{8,}$/;

export function isValidNationalId(nationalId: string): boolean {
  return NATIONAL_ID_REGEX.test(nationalId.trim());
}

export const NATIONAL_ID_ERROR_MESSAGE = 'Please enter a valid National ID number (at least 8 digits, numbers only).';