/** Shared validation helpers for forms */

export function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, '').slice(-10);
}

export function validatePhone(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length !== 10) return 'Enter a valid 10-digit mobile number';
  if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers start with 6–9';
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

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
  return null;
}
