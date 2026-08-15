import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Headset, Mail, MapPin, Phone } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  mode?: 'support' | 'bulk';
};

export function SupportScreen({ mode = 'support' }: Props) {
  const { user, updateProfile } = useAuth();
  const isBulk = mode === 'bulk';
  const [gstin, setGstin] = useState(user?.gstin ?? '');
  const [message, setMessage] = useState('');
  const [qtyHint, setQtyHint] = useState('');

  const submitBulk = async () => {
    if (!message.trim()) {
      Alert.alert('Details needed', 'Describe what you need quoted.');
      return;
    }
    if (gstin.trim()) {
      await updateProfile({ gstin: gstin.trim().toUpperCase() });
    }
    Alert.alert(
      'Request received',
      'Our B2B desk will call you within 1 business day. (Demo — not emailed yet.)',
    );
    setMessage('');
    setQtyHint('');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Headset size={28} color={colors.primaryInk} />
        <Text style={styles.title}>{isBulk ? 'Request bulk quote' : 'Help & support'}</Text>
        <Text style={styles.sub}>
          {isBulk
            ? 'For contractors, engineers & vendors — GST invoice ready.'
            : 'We’re here 8am–8pm IST for delivery & product help.'}
        </Text>
      </View>

      {!isBulk ? (
        <View style={styles.block}>
          <Pressable
            style={styles.row}
            onPress={() => void Linking.openURL('tel:+918001234567')}
          >
            <Phone size={16} color={colors.primaryDark} />
            <Text style={styles.rowText}>+91 80012 34567</Text>
          </Pressable>
          <Pressable
            style={styles.row}
            onPress={() => void Linking.openURL('mailto:support@buildmart.app')}
          >
            <Mail size={16} color={colors.primaryDark} />
            <Text style={styles.rowText}>support@buildmart.app</Text>
          </Pressable>
          <View style={styles.row}>
            <MapPin size={16} color={colors.primaryDark} />
            <Text style={styles.rowText}>
              BuildMart Hub, Plot 12, HITEC City, Hyderabad 500081
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>GSTIN</Text>
          <TextInput
            style={styles.input}
            value={gstin}
            onChangeText={setGstin}
            autoCapitalize="characters"
            placeholder="22AAAAA0000A1Z5"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Approx. quantity / SKUs</Text>
          <TextInput
            style={styles.input}
            value={qtyHint}
            onChangeText={setQtyHint}
            placeholder="e.g. 200 bags PPC + 10 tanks"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Project notes</Text>
          <TextInput
            style={[styles.input, styles.area]}
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Site location, delivery window, brands…"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.cta} onPress={() => void submitBulk()}>
            <Text style={styles.ctaText}>Submit request</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  hero: { alignItems: 'flex-start', gap: 8, marginBottom: 16 },
  title: { ...typography.heading, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, fontSize: 13, color: colors.text },
  form: { gap: 4 },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 10, marginBottom: 6 },
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
  area: { minHeight: 100, textAlignVertical: 'top' },
  cta: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontWeight: '700', color: colors.primaryInk },
});
