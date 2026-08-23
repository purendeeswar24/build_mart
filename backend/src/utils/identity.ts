import { AppError } from '../middleware/errorHandler.middleware';

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

export function assertIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    throw new AppError('BAD_PHONE', 'Enter a valid 10-digit Indian mobile number.', 400);
  }
  if (!/^[6-9]/.test(digits)) {
    throw new AppError('BAD_PHONE', 'Indian mobile numbers start with 6, 7, 8, or 9.', 400);
  }
  if (/^(\d)\1{9}$/.test(digits)) {
    throw new AppError('BAD_PHONE', 'That number looks fake. Enter your real mobile number.', 400);
  }
  if (digits === '1234567890' || digits === '9876543210' || FAKE_PHONES.has(digits)) {
    throw new AppError('BAD_PHONE', 'That number looks fake. Enter your real mobile number.', 400);
  }
  if ('0123456789'.includes(digits) || '9876543210'.includes(digits)) {
    throw new AppError('BAD_PHONE', 'That number looks fake. Enter your real mobile number.', 400);
  }
  return `+91${digits}`;
}

export function assertRealEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
    throw new AppError('BAD_EMAIL', 'Enter a valid email address.', 400);
  }
  if (email.includes('..') || email.startsWith('.') || email.includes('@.') || email.includes('.@')) {
    throw new AppError('BAD_EMAIL', 'Enter a valid email address.', 400);
  }
  const [local, domain] = email.split('@');
  if (!local || local.length < 2) {
    throw new AppError('BAD_EMAIL', 'Enter a valid email address.', 400);
  }
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain) || FAKE_EMAIL_DOMAINS.has(domain)) {
    throw new AppError('BAD_EMAIL', 'Use a real inbox (Gmail, Outlook, or your work email).', 400);
  }
  return email;
}
