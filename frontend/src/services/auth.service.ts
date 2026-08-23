import { apiClient, setAccessToken } from './apiClient';

export type UserRole = 'homeowner' | 'contractor' | 'civil_engineer' | 'vendor' | 'admin';

export type AuthUser = {
  id: string;
  username?: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRole;
  gstin?: string;
  emailVerified?: boolean;
  token?: string;
};

export type OtpSendResult = {
  ok: true;
  channel: 'phone' | 'email';
  destination: string;
  expiresInSec: number;
  delivery: 'sms' | 'email' | 'dev';
  hint?: string;
  devCode?: string;
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'homeowner', label: 'Homeowner' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'civil_engineer', label: 'Engineer / Designer' },
  { value: 'vendor', label: 'Vendor' },
];

function toE164(phone: string) {
  const digits = last10Digits(phone);
  return `+91${digits}`;
}

export const authService = {
  async restoreSession(): Promise<AuthUser | null> {
    try {
      const res = await apiClient.get<{ user: AuthUser }>('/api/v1/auth/me');
      return res.user ?? null;
    } catch {
      return null;
    }
  },

  async sendOtp(phone: string): Promise<OtpSendResult> {
    return apiClient.post<OtpSendResult>(
      '/api/v1/auth/otp/send',
      { channel: 'phone', phone: toE164(phone) },
      { auth: false },
    );
  },

  async sendEmailOtp(email: string): Promise<OtpSendResult> {
    return apiClient.post<OtpSendResult>(
      '/api/v1/auth/otp/send',
      { channel: 'email', email: email.trim() },
      { auth: false },
    );
  },

  async verifyOtp(input: {
    phone: string;
    otp: string;
    fullName?: string;
    role?: UserRole;
  }): Promise<AuthUser> {
    const res = await apiClient.post<{ token: string; user: AuthUser }>(
      '/api/v1/auth/otp/verify',
      {
        channel: 'phone',
        phone: input.phone,
        otp: input.otp,
        fullName: input.fullName,
        role: input.role ?? 'homeowner',
      },
      { auth: false },
    );
    await setAccessToken(res.token);
    return { ...res.user, token: res.token };
  },

  async verifyEmailOtp(input: {
    email: string;
    otp: string;
    fullName?: string;
    role?: UserRole;
  }): Promise<AuthUser> {
    const res = await apiClient.post<{ token: string; user: AuthUser }>(
      '/api/v1/auth/otp/verify',
      {
        channel: 'email',
        email: input.email,
        otp: input.otp,
        fullName: input.fullName,
        role: input.role ?? 'homeowner',
      },
      { auth: false },
    );
    await setAccessToken(res.token);
    return { ...res.user, token: res.token };
  },

  async register(input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
  }): Promise<{ username: string; email: string; hint?: string }> {
    const res = await apiClient.post<{ username: string; email: string; hint?: string }>(
      '/api/v1/auth/register',
      {
        username: input.username.trim().toLowerCase(),
        email: input.email.trim(),
        password: input.password,
        fullName: input.fullName.trim(),
        role: input.role ?? 'homeowner',
      },
      { auth: false },
    );
    return res;
  },

  async loginPassword(userId: string, password: string): Promise<AuthUser> {
    const res = await apiClient.post<{ token: string; user: AuthUser }>(
      '/api/v1/auth/login',
      { userId: userId.trim(), password },
      { auth: false },
    );
    await setAccessToken(res.token);
    return { ...res.user, token: res.token };
  },

  async signOut(): Promise<void> {
    await setAccessToken(null);
  },
};
