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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hammer, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_OPTIONS, type UserRole } from '../../services/auth.service';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateUsername,
} from '../../utils/validation';
import { colors, typography } from '../../theme';

type Mode = 'welcome' | 'register' | 'verify' | 'login' | 'phone';

type Props = {
  asModal?: boolean;
  onClose?: () => void;
  onDone?: () => void;
};

export function AuthFlowScreen({ asModal, onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { sendOtp, verifyOtp, verifyEmailOtp, register, loginPassword } = useAuth();

  const [mode, setMode] = useState<Mode>(asModal ? 'login' : 'welcome');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('homeowner');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loginId, setLoginId] = useState('');
  const [otpHint, setOtpHint] = useState('');
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <Text style={styles.brandSub}>Secure account · verified email · fast checkout</Text>
        </View>

        {mode === 'welcome' ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>Welcome</Text>
            <Text style={styles.heroTitle}>Materials, priced right. Delivered fast.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => setMode('register')}>
              <Text style={styles.primaryBtnText}>Create account</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setMode('login')}>
              <Text style={styles.secondaryBtnText}>Sign in with user ID</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'login' ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <LockKeyhole size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Sign in</Text>
            </View>
            <Text style={styles.label}>User ID or email</Text>
            <TextInput
              value={loginId}
              onChangeText={setLoginId}
              autoCapitalize="none"
              placeholder="rajesh_k or you@gmail.com"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  if (!loginId.trim()) throw new Error('Enter your user ID or email');
                  if (!password) throw new Error('Enter your password');
                  await loginPassword(loginId, password);
                }, { finish: true })
              }
            >
              {loading ? <ActivityIndicator color={colors.primaryInk} /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => setMode('phone')}>
              <Text style={styles.switchAccent}>Use phone OTP instead</Text>
            </Pressable>
            <Pressable onPress={() => setMode('register')} style={styles.switchRow}>
              <Text style={styles.switchMuted}>
                New here? <Text style={styles.switchAccent}>Create an account</Text>
              </Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'register' ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <UserRound size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Create account</Text>
            </View>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Rajesh Kumar"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Text style={styles.label}>User ID</Text>
            <TextInput
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              placeholder="rajesh_k"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Text style={styles.label}>Email — we will verify this</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@gmail.com"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min 8 chars, letter + number"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Repeat password"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Text style={styles.label}>I am a</Text>
            <View style={styles.roles}>
              {ROLE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setRole(opt.value)}
                  style={[styles.roleChip, role === opt.value && styles.roleChipOn]}
                >
                  <Text style={[styles.roleText, role === opt.value && styles.roleTextOn]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  const nameErr = validateRequired(fullName, 'Full name', 2);
                  if (nameErr) throw new Error(nameErr);
                  const userErr = validateUsername(username);
                  if (userErr) throw new Error(userErr);
                  const emailErr = validateEmail(email);
                  if (emailErr) throw new Error(emailErr);
                  const passErr = validatePassword(password);
                  if (passErr) throw new Error(passErr);
                  if (password !== confirm) throw new Error('Passwords do not match');
                  const created = await register({ username, email, password, fullName, role });
                  setOtpHint(created.hint ?? 'We emailed a verification code.');
                  setOtp('');
                  setMode('verify');
                })
              }
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryInk} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify email & create</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.switchRow}>
              <Text style={styles.switchMuted}>
                Already have an account? <Text style={styles.switchAccent}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'verify' && email ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <ShieldCheck size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Verify email</Text>
            </View>
            <Text style={styles.hint}>{otpHint || `Enter the 6-digit code sent to ${email}`}</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit code"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  if (!/^\d{6}$/.test(otp.trim())) throw new Error('Enter the 6-digit code');
                  await verifyEmailOtp({ email, otp, fullName, role });
                }, { finish: true })
              }
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryInk} />
              ) : (
                <Text style={styles.primaryBtnText}>Confirm & sign in</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode('register')} style={styles.switchRow}>
              <Text style={styles.switchAccent}>Change details</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'phone' ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Mail size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Phone OTP</Text>
            </View>
            <Text style={styles.label}>Mobile number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.cc}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="98765 43210"
                placeholderTextColor="#5C596A"
                style={styles.phoneInput}
              />
            </View>
            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  const phoneErr = validatePhone(phone);
                  if (phoneErr) throw new Error(phoneErr);
                  const sent = await sendOtp(phone);
                  setOtpHint(sent.hint ?? 'Enter the code sent to your phone.');
                  setOtp('');
                  setMode('verify');
                  setEmail('');
                })
              }
            >
              {loading ? <ActivityIndicator color={colors.primaryInk} /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
            </Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.switchRow}>
              <Text style={styles.switchAccent}>Back to user ID login</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'verify' && !email && phone ? (
          <View style={styles.card}>
            <Text style={styles.label}>Enter OTP for +91 {phone}</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit code"
              placeholderTextColor="#5C596A"
              style={styles.input}
            />
            <Pressable
              style={styles.primaryBtn}
              disabled={loading}
              onPress={() =>
                run(async () => {
                  if (!/^\d{6}$/.test(otp.trim())) throw new Error('Enter the 6-digit code');
                  await verifyOtp({ phone, otp, fullName, role });
                }, { finish: true })
              }
            >
              {loading ? <ActivityIndicator color={colors.primaryInk} /> : <Text style={styles.primaryBtnText}>Verify & continue</Text>}
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.secondary },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  closeRow: { alignSelf: 'flex-end', marginBottom: 8 },
  closeText: { color: colors.textMuted, fontSize: 13 },
  brand: { alignItems: 'center', paddingTop: 20, marginBottom: 22 },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: { fontSize: 22, fontWeight: '800', color: colors.textInverse, letterSpacing: -0.4 },
  brandSub: { fontSize: 12, color: '#8B889B', marginTop: 4, textAlign: 'center' },
  heroCard: {
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  heroKicker: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { color: colors.textInverse, fontSize: 22, fontWeight: '800', marginVertical: 12, lineHeight: 28 },
  card: {
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
  label: { fontSize: 11, color: '#8B889B', marginBottom: 6, marginTop: 2 },
  input: {
    backgroundColor: colors.secondaryMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textInverse,
    fontSize: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  cc: { color: colors.textInverse, fontSize: 13 },
  phoneInput: { flex: 1, paddingVertical: 12, color: colors.textInverse, fontSize: 13 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  roleChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3D4A',
  },
  roleChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { fontSize: 11, color: '#C9C6D4' },
  roleTextOn: { color: colors.primaryInk, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: colors.primaryInk, fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#3A3D4A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: { color: '#C9C6D4', fontSize: 13, fontWeight: '600' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  switchRow: { marginTop: 18, alignItems: 'center' },
  switchMuted: { fontSize: 12, color: '#5C596A' },
  switchAccent: { color: colors.primary, fontWeight: '600' },
  hint: { ...typography.micro, color: '#8B889B', marginBottom: 12 },
  error: { marginTop: 16, color: '#E57373', fontSize: 12, textAlign: 'center' },
});
