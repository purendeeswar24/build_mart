import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hammer } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_OPTIONS, type UserRole } from '../../services/auth.service';
import { validateEmail, validatePhone, validateRequired } from '../../utils/validation';
import { colors, radii, spacing, typography } from '../../theme';

type Mode = 'welcome' | 'register' | 'otp' | 'login' | 'email';

type Props = {
  asModal?: boolean;
  onClose?: () => void;
  onDone?: () => void;
};

export function AuthFlowScreen({ asModal, onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hPad = width < 600 ? 16 : 36;
  const { sendOtp, verifyOtp, loginEmail } = useAuth();

  const [mode, setMode] = useState<Mode>(asModal ? 'login' : 'welcome');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('homeowner');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, { finish = false } = {}) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
      if (finish) onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: asModal ? 12 : insets.top + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: hPad, paddingBottom: 40 + (asModal ? 12 : insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
        {asModal ? (
          <Pressable onPress={onClose} style={styles.closeRow}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        ) : null}

        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Hammer size={26} color={colors.primaryInk} />
          </View>
          <Text style={styles.brandTitle}>BuildMart</Text>
          <Text style={styles.brandSub}>Materials & skilled help, delivered fast</Text>
        </View>

        {mode === 'welcome' ? (
          <View style={styles.block}>
            <Pressable style={styles.primaryBtn} onPress={() => setMode('register')}>
              <Text style={styles.primaryBtnText}>Create Account</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setMode('login')}>
              <Text style={styles.secondaryBtnText}>Login</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'register' || mode === 'login' ? (
          <View style={styles.block}>
            {mode === 'register' ? (
              <>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Rajesh Kumar"
                  placeholderTextColor={PLACEHOLDER}
                  selectionColor={colors.primary}
                  cursorColor={INPUT_TEXT}
                  style={styles.input}
                />
              </>
            ) : null}

            <Text style={styles.label}>Phone number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.cc}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="98765 43210"
                placeholderTextColor={PLACEHOLDER}
                selectionColor={colors.primary}
                cursorColor={INPUT_TEXT}
                style={styles.phoneInput}
              />
            </View>

            {mode === 'register' ? (
              <>
                <Text style={styles.label}>I am a</Text>
                <View style={styles.roles}>
                  {ROLE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setRole(opt.value)}
                      style={[styles.roleChip, role === opt.value && styles.roleChipOn]}
                    >
                      <Text style={[styles.roleText, role === opt.value && styles.roleTextOn]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  const phoneErr = validatePhone(phone);
                  if (phoneErr) throw new Error(phoneErr);
                  if (mode === 'register') {
                    const nameErr = validateRequired(fullName, 'Full name', 2);
                    if (nameErr) throw new Error(nameErr);
                  }
                  await sendOtp(phone);
                  setMode('otp');
                })
              }
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryInk} />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              )}
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <Pressable style={styles.secondaryBtn} onPress={() => setMode('email')}>
              <Text style={styles.secondaryBtnText}>Continue with email</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={styles.switchRow}
            >
              <Text style={styles.switchMuted}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchAccent}>{mode === 'login' ? 'Create one' : 'Log in'}</Text>
              </Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'otp' ? (
          <View style={styles.block}>
            <Text style={styles.label}>Enter OTP sent to +91 {phone}</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor={PLACEHOLDER}
              selectionColor={colors.primary}
              cursorColor={INPUT_TEXT}
              style={styles.input}
            />
            <Text style={styles.hint}>Demo OTP: 123456</Text>
            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  await verifyOtp({ phone, otp, fullName, role });
                }, { finish: true })
              }
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryInk} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & continue</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.switchRow}>
              <Text style={styles.switchAccent}>Change number</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'email' ? (
          <View style={styles.block}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={PLACEHOLDER}
              selectionColor={colors.primary}
              cursorColor={INPUT_TEXT}
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={PLACEHOLDER}
              selectionColor={colors.primary}
              cursorColor={INPUT_TEXT}
              style={styles.input}
            />
            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  const emailErr = validateEmail(email);
                  if (emailErr) throw new Error(emailErr);
                  if (password.length < 4) throw new Error('Password must be at least 4 characters');
                  await loginEmail(email, password);
                }, { finish: true })
              }
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryInk} />
              ) : (
                <Text style={styles.primaryBtnText}>Log in</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.switchRow}>
              <Text style={styles.switchAccent}>Use phone instead</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PLACEHOLDER = 'rgba(255,255,255,0.55)';
const INPUT_TEXT = '#FFFFFF';

const inputWeb =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none' as const,
        outlineWidth: 0,
        color: INPUT_TEXT,
        caretColor: INPUT_TEXT,
      } as const)
    : null;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 340,
  },
  closeRow: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textInverse,
  },
  brandSub: {
    fontSize: 12,
    color: '#A8A5B5',
    marginTop: 6,
    textAlign: 'center',
  },
  block: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: '#C4C0CE',
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: INPUT_TEXT,
    fontSize: 15,
    marginBottom: 14,
    width: '100%',
    ...inputWeb,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
    width: '100%',
  },
  cc: {
    color: INPUT_TEXT,
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    color: INPUT_TEXT,
    fontSize: 15,
    ...inputWeb,
  },
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 20,
  },
  roleChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3D4A',
  },
  roleChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleText: {
    fontSize: 11,
    color: '#C9C6D4',
  },
  roleTextOn: {
    color: colors.primaryInk,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: {
    color: colors.primaryInk,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#4A4A52',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    width: '100%',
  },
  secondaryBtnText: {
    color: '#F2F0F7',
    fontSize: 14,
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#3A3D4A',
  },
  orText: {
    fontSize: 11,
    color: '#A8A5B5',
  },
  switchRow: {
    marginTop: 22,
    alignItems: 'center',
  },
  switchMuted: {
    fontSize: 13,
    color: '#A8A5B5',
  },
  switchAccent: {
    color: colors.primary,
    fontWeight: '700',
  },
  hint: {
    ...typography.micro,
    color: '#A8A5B5',
    marginBottom: 12,
  },
  error: {
    marginTop: 16,
    color: '#E57373',
    fontSize: 12,
    textAlign: 'center',
  },
});
