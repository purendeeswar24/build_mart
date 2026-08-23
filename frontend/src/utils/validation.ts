/** Shared validation helpers for forms */

const FAKE_PHONES = new Set([
  '1234567890',
  '0123456789',
  '9876543210',
  '9000000000',
  '8000000000',
  '7000000000',
  '6000000000',
  '9999999999',
  '8888888888',
  '7777777777',
  '6666666666',
  '9898989898',
  '9090909090',
  '9123456789',
]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'getnada.com',
  'discard.email',
]);

const FAKE_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'test.com',
  'test.in',
  'localhost',
  'email.com',
  'mail.com',
  'invalid.com',
]);

export function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, '').slice(-10);
}

export function validatePhone(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length !== 10) return 'Enter a valid 10-digit Indian mobile number';
  if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers start with 6, 7, 8, or 9';
  if (/^(\d)\1{9}$/.test(digits) || FAKE_PHONES.has(digits)) {
    return 'That number looks fake. Enter your real mobile number';
  }
  if ('0123456789'.includes(digits) || '9876543210'.includes(digits)) {
    return 'That number looks fake. Enter your real mobile number';
  }
  return null;
}

export function validateRequired(value: string, label: string, min = 1): string | null {
  if (value.trim().length < min) return `${label} is required`;
  return null;
}

export function validatePincode(pincode: string): string | null {
  const digits = pincode.replace(/\D/g, '');
  if (digits.length !== 6) return 'Enter a 6-digit pincode';
  return null;
}

export function validateUsername(username: string): string | null {
  const value = username.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{3,19}$/.test(value)) {
    return 'User ID must be 4–20 characters, start with a letter, and use only letters, numbers, or _';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include a letter and a number';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (!value) return 'Email is required';
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
    return 'Enter a valid email address';
  }
  if (value.includes('..') || value.startsWith('.') || value.includes('@.') || value.includes('.@')) {
    return 'Enter a valid email address';
  }
  const [local, domain] = value.split('@');
  if (!local || local.length < 2) return 'Enter a valid email address';
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain) || FAKE_EMAIL_DOMAINS.has(domain)) {
    return 'Use a real inbox (Gmail, Outlook, or your work email)';
  }
  return null;
}
