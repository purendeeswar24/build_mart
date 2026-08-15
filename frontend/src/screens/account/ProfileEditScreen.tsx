import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_OPTIONS, type UserRole } from '../../services/auth.service';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  onSaved?: () => void;
};

export function ProfileEditScreen({ onSaved }: Props) {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'homeowner');
  const [gstin, setGstin] = useState(user?.gstin ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Enter your full name.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        role,
        gstin: gstin.trim() || undefined,
      });
      onSaved?.();
      Alert.alert('Saved', 'Profile updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Role</Text>
      <View style={styles.roles}>
        {ROLE_OPTIONS.map((r) => (
          <Pressable
            key={r.value}
            style={[styles.roleChip, role === r.value && styles.roleActive]}
            onPress={() => setRole(r.value)}
          >
            <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {(role === 'contractor' || role === 'civil_engineer' || role === 'vendor') && (
        <>
          <Text style={styles.label}>GSTIN (optional)</Text>
          <TextInput
            style={styles.input}
            value={gstin}
            onChangeText={setGstin}
            autoCapitalize="characters"
            placeholder="22AAAAA0000A1Z5"
            placeholderTextColor={colors.textMuted}
          />
        </>
      )}

      <Pressable style={[styles.save, saving && { opacity: 0.7 }]} onPress={() => void save()}>
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save profile'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  roleText: { fontSize: 12, color: colors.text },
  roleTextActive: { color: colors.textInverse, fontWeight: '600' },
  save: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { fontWeight: '700', color: colors.primaryInk },
});
