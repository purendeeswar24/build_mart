import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, type AuthUser, type OtpSendResult, type UserRole } from '../services/auth.service';
import { setAccessToken } from '../services/apiClient';

const STORAGE_KEY = '@buildmart/session';

type AuthContextValue = {
  user: AuthUser | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLiveAuth: boolean;
  loginModalVisible: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  requireAuth: (onAuthed?: () => void) => boolean;
  sendOtp: (phone: string) => Promise<OtpSendResult>;
  sendEmailOtp: (email: string) => Promise<OtpSendResult>;
  verifyOtp: (input: {
    phone: string;
    otp: string;
    fullName?: string;
    role?: UserRole;
  }) => Promise<void>;
  verifyEmailOtp: (input: { email: string; otp: string; fullName?: string; role?: UserRole }) => Promise<void>;
  register: (input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
  }) => Promise<{ username: string; email: string; hint?: string }>;
  loginPassword: (userId: string, password: string) => Promise<void>;
  updateProfile: (patch: Partial<Omit<AuthUser, 'id'>>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const live = await authService.restoreSession();
        if (live) {
          setUser(live);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(live));
          return;
        }
        await AsyncStorage.removeItem(STORAGE_KEY);
        await setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: AuthUser | null) => {
    setUser(next);
    if (next) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (next.token) await setAccessToken(next.token);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await setAccessToken(null);
    }
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    return authService.sendOtp(phone);
  }, []);

  const sendEmailOtp = useCallback(async (email: string) => {
    return authService.sendEmailOtp(email);
  }, []);

  const verifyOtp = useCallback(
    async (input: { phone: string; otp: string; fullName?: string; role?: UserRole }) => {
      const next = await authService.verifyOtp(input);
      await persist(next);
      setLoginModalVisible(false);
      pendingAction?.();
      setPendingAction(null);
    },
    [persist, pendingAction],
  );

  const register = useCallback(
    async (input: {
      username: string;
      email: string;
      password: string;
      fullName: string;
      role?: UserRole;
    }) => authService.register(input),
    [],
  );

  const loginPassword = useCallback(
    async (userId: string, password: string) => {
      const next = await authService.loginPassword(userId, password);
      await persist(next);
      setLoginModalVisible(false);
      pendingAction?.();
      setPendingAction(null);
    },
    [persist, pendingAction],
  );

  const verifyEmailOtp = useCallback(
    async (input: { email: string; otp: string; fullName?: string; role?: UserRole }) => {
      const next = await authService.verifyEmailOtp(input);
      await persist(next);
      setLoginModalVisible(false);
      pendingAction?.();
      setPendingAction(null);
    },
    [persist, pendingAction],
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    await persist(null);
  }, [persist]);

  const updateProfile = useCallback(
    async (patch: Partial<Omit<AuthUser, 'id'>>) => {
      if (!user) return;
      const next = { ...user, ...patch };
      if (next.role === 'admin' && user.role !== 'admin') next.role = user.role;
      await persist(next);
    },
    [persist, user],
  );

  const requireAuth = useCallback(
    (onAuthed?: () => void) => {
      if (user) {
        onAuthed?.();
        return true;
      }
      if (onAuthed) setPendingAction(() => onAuthed);
      setLoginModalVisible(true);
      return false;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      isAuthenticated: !!user,
      isLiveAuth: true,
      loginModalVisible,
      openLoginModal: () => setLoginModalVisible(true),
      closeLoginModal: () => {
        setLoginModalVisible(false);
        setPendingAction(null);
      },
      requireAuth,
      sendOtp,
      sendEmailOtp,
      verifyOtp,
      verifyEmailOtp,
      register,
      loginPassword,
      updateProfile,
      signOut,
    }),
    [
      user,
      isLoading,
      loginModalVisible,
      requireAuth,
      sendOtp,
      sendEmailOtp,
      verifyOtp,
      verifyEmailOtp,
      register,
      loginPassword,
      updateProfile,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
