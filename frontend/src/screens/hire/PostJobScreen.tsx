import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { HIRE_CATEGORIES, hireService } from '../../services/hire.service';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  onPosted: (jobId: string) => void;
};

export function PostJobScreen({ onPosted }: Props) {
  const { requireAuth } = useAuth();
  const [category, setCategory] = useState<(typeof HIRE_CATEGORIES)[number]['value']>('electrician');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('');
  const [daysOpen, setDaysOpen] = useState('5');
  const [estimate, setEstimate] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = () => {
    requireAuth(async () => {
      setSaving(true);
      try {
        const days = Number(daysOpen);
        const ownerEstimate = Number(estimate);
        const { job } = await hireService.create({
          category,
          title: title.trim(),
          description: description.trim(),
          city: city.trim() || undefined,
          pincode: pincode.trim() || undefined,
          daysOpen: Number.isFinite(days) ? days : 5,
          ownerEstimate: Number.isFinite(ownerEstimate) && ownerEstimate > 0 ? ownerEstimate : undefined,
        });
        onPosted(job.id);
      } catch (err) {
        Alert.alert('Could not post', err instanceof Error ? err.message : 'Try again.');
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lede}>
        Describe the work and how long bidding stays open. Your estimate stays private. After you accept a company, you talk only through BuildMart.
      </Text>

      <Text style={styles.label}>Trade</Text>
      <View style={styles.chips}>
        {HIRE_CATEGORIES.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => setCategory(c.value)}
            style={[styles.chip, category === c.value && styles.chipOn]}
          >
            <Text style={[styles.chipText, category === c.value && styles.chipTextOn]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Need electrician for new 3BHK wiring"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Requirements</Text>
      <TextInput
        style={[styles.input, styles.area]}
        value={description}
        onChangeText={setDescription}
        placeholder="Building a house in Kondapur. Need full electrical work: points, DB, earthing. Mention scope so people can bid."
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={styles.input}
            value={pincode}
            onChangeText={setPincode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Bid window (days)</Text>
          <TextInput
            style={styles.input}
            value={daysOpen}
            onChangeText={setDaysOpen}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Your estimate (hidden)</Text>
          <TextInput
            style={styles.input}
            value={estimate}
            onChangeText={setEstimate}
            keyboardType="number-pad"
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <Text style={styles.note}>
        After you accept a company, you talk only inside BuildMart. We do not share phone or WhatsApp. An 8%
        commission is held on the winning bid.
      </Text>
      <Button title="Open this work" loading={saving} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 48 },
  lede: { ...typography.body, color: colors.textSecondary, marginBottom: 16 },
  label: { ...typography.label, color: colors.text, marginTop: 14, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextOn: { color: colors.primaryInk, fontWeight: '800' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    ...typography.body,
  },
  area: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  note: { ...typography.caption, color: colors.textMuted, marginTop: 16, marginBottom: 12, lineHeight: 18 },
});
