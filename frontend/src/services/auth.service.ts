import { isSupabaseConfigured, supabase } from './supabaseClient';
import { setAccessToken } from './apiClient';

export type UserRole = 'homeowner' | 'contractor' | 'civil_engineer' | 'vendor' | 'admin';

export type AuthUser = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRole;
  gstin?: string;
  /** Bearer token for API calls */
  token?: string;
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'homeowner', label: 'Homeowner' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'civil_engineer', label: 'Engineer / Designer' },
  { value: 'vendor', label: 'Vendor' },
];

const DEMO_OTP = '123456';

function issueLocalToken(user: AuthUser): string {
  const claims = {
    sub: user.id,
    role: user.role,
    phone: user.phone,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const json = JSON.stringify(claims);
  if (typeof btoa === 'function') {
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return json;
}

function last10Digits(phone: string) {
  return phone.replace(/\D/g, '').slice(-10);
}

function toE164(phone: string) {
  const digits = last10Digits(phone);
  return `+91${digits}`;
}

function normalizePhone(phone: string) {
  const digits = last10Digits(phone);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Auth service:
 * - Supabase configured → real phone OTP / email password
 * - Otherwise → local demo OTP 123456
 */
export const authService = {
  demoOtp: DEMO_OTP,
  isLive: isSupabaseConfigured,

  async restoreSession(): Promise<AuthUser | null> {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) return null;
      await setAccessToken(session.access_token);
      const meta = session.user.user_metadata ?? {};
      return {
        id: session.user.id,
        fullName: (meta.full_name as string) || session.user.email?.split('@')[0] || 'BuildMart User',
        phone: session.user.phone
          ? normalizePhone(session.user.phone)
          : '',
        email: session.user.email,
        role: (meta.role as UserRole) || 'homeowner',
        token: session.access_token,
      };
    }
    return null;
  },

  async sendOtp(phone: string): Promise<{ ok: true; mode: 'live' | 'demo' }> {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        phone: toE164(phone),
      });
      if (error) throw new Error(error.message);
      return { ok: true, mode: 'live' };
    }
    await delay(400);
    return { ok: true, mode: 'demo' };
  },

  async verifyOtp(input: {
    phone: string;
    otp: string;
    fullName?: string;
    role?: UserRole;
  }): Promise<AuthUser> {
    if (supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: toE164(input.phone),
        token: input.otp,
        type: 'sms',
      });
      if (error) throw new Error(error.message);
      const session = data.session;
      const user = data.user;
      if (!session || !user) throw new Error('Verification failed. Try again.');

      if (input.fullName || input.role) {
        await supabase.auth.updateUser({
          data: {
            full_name: input.fullName,
            role: input.role ?? 'homeowner',
          },
        });
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: input.fullName?.trim() || 'BuildMart User',
          phone: toE164(input.phone),
          role: input.role ?? 'homeowner',
        });
      }

      await setAccessToken(session.access_token);
      return {
        id: user.id,
        fullName: input.fullName?.trim() || 'BuildMart User',
        phone: normalizePhone(input.phone),
        role: input.role ?? 'homeowner',
        token: session.access_token,
      };
    }

    // Demo path
    await delay(400);
    if (input.otp !== DEMO_OTP) {
      throw new Error('Invalid OTP. Use 123456 in demo mode.');
    }
    const user: AuthUser = {
      id: `demo-${last10Digits(input.phone)}`,
      fullName: input.fullName?.trim() || 'BuildMart User',
      phone: normalizePhone(input.phone),
      role: input.role ?? 'homeowner',
    };
    user.token = issueLocalToken(user);
    await setAccessToken(user.token);
    return user;
  },

  async loginEmail(email: string, password: string): Promise<AuthUser> {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const session = data.session;
      const user = data.user;
      if (!session || !user) throw new Error('Login failed.');
      await setAccessToken(session.access_token);
      const meta = user.user_metadata ?? {};
      return {
        id: user.id,
        fullName: (meta.full_name as string) || email.split('@')[0],
        phone: user.phone ? normalizePhone(user.phone) : '',
        email,
        role: (meta.role as UserRole) || 'homeowner',
        token: session.access_token,
      };
    }

    await delay(400);
    if (!email.includes('@') || password.length < 4) {
      throw new Error('Enter a valid email and password (min 4 chars).');
    }
    const user: AuthUser = {
      id: `demo-email-${email}`,
      fullName: email.split('@')[0],
      phone: '',
      email,
      role: 'homeowner',
    };
    user.token = issueLocalToken(user);
    await setAccessToken(user.token);
    return user;
  },

  async signOut(): Promise<void> {
    if (supabase) await supabase.auth.signOut();
    await setAccessToken(null);
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
