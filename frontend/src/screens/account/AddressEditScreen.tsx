import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { checkPincode, type AddressLabel } from '../../services/address.service';
import { LocationPermissionError, locationService } from '../../services/location.service';
import { LocationPermissionCard } from '../../components/location/LocationPermissionCard';
import { MapPinPicker } from '../../components/location/MapPinPicker';
import { useAddress } from '../../hooks/useAddress';
import { validatePincode, validateRequired } from '../../utils/validation';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  addressId?: string;
  onSaved?: () => void;
};

export function AddressEditScreen({ addressId, onSaved }: Props) {
  const { addresses, upsertAddress } = useAddress();
  const existing = addresses.find((a) => a.id === addressId);

  const [label, setLabel] = useState<AddressLabel>(existing?.label ?? 'Site');
  const [fullAddress, setFullAddress] = useState(existing?.fullAddress ?? '');
  const [pincode, setPincode] = useState(existing?.pincode ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number; accuracy?: number }>({
    latitude: existing?.latitude,
    longitude: existing?.longitude,
  });
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState('');
  const [askLocation, setAskLocation] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [errors, setErrors] = useState<{ address?: string; pincode?: string }>({});

  const status = useMemo(() => checkPincode(pincode), [pincode]);

  const applyResolved = (loc: Awaited<ReturnType<typeof locationService.detectUserLocation>>) => {
    setCoords({ latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy });
    setFullAddress(loc.label);
    if (loc.city) setCity(loc.city);
    if (loc.suggestedPincode) setPincode(loc.suggestedPincode);
    setErrors({});
    setAskLocation(false);
    setLocationBlocked(false);
    setLocateNote(locationService.describeLocation(loc));
  };

  const movePin = async (latitude: number, longitude: number) => {
    setCoords((prev) => ({ ...prev, latitude, longitude }));
    try {
      const loc = await locationService.reverseGeocode(latitude, longitude);
      applyResolved({ ...loc, latitude, longitude, accuracy: coords.accuracy });
    } catch {
      setLocateNote(`Pinned ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
  };

  const useMyLocation = async () => {
    setLocating(true);
    setLocateNote('Allow location in the popup…');
    setAskLocation(false);
    setLocationBlocked(false);
    try {
      applyResolved(await locationService.detectUserLocation());
    } catch (e) {
      const denied =
        e instanceof LocationPermissionError &&
        (e.status === 'denied' || e.status === 'unavailable');
      const message = e instanceof Error ? e.message : 'Could not get location';
      setLocationBlocked(denied);
      setAskLocation(true);
      setLocateNote(message);
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    const nextErrors: typeof errors = {};
    const addrErr = validateRequired(fullAddress, 'Address', 5);
    const pinErr = validatePincode(pincode);
    if (addrErr) nextErrors.address = addrErr;
    if (pinErr) nextErrors.pincode = pinErr;
    setErrors(nextErrors);
    if (addrErr || pinErr) return;

    if (!status.serviceable) {
      Alert.alert(
        'Not deliverable',
        'This pincode is not currently serviceable. You can still save it, but checkout will be blocked.',
      );
    }
    await upsertAddress({
      id: existing?.id,
      label,
      fullAddress: fullAddress.trim(),
      pincode: pincode.replace(/\D/g, '').slice(0, 6),
      city: status.city ?? city.trim() ?? 'Your city',
      latitude: coords.latitude,
      longitude: coords.longitude,
      isDefault,
    });
    onSaved?.();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {Platform.OS === 'web' ? (
        <button
          type="button"
          disabled={locating}
          onClick={() => void useMyLocation()}
          style={{
            display: 'flex',
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: colors.primary,
            border: 0,
            borderRadius: 12,
            padding: '12px 0',
            marginBottom: 8,
            fontWeight: 800,
            fontSize: 13,
            color: colors.primaryInk,
            cursor: locating ? 'wait' : 'pointer',
          }}
        >
          {locating ? 'Waiting for permission…' : 'Use my current location'}
        </button>
      ) : (
        <Pressable
          style={styles.locateBtn}
          onPress={() => void useMyLocation()}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel="Use my current location"
        >
          {locating ? (
            <ActivityIndicator color={colors.primaryInk} />
          ) : (
            <MapPin size={16} color={colors.primaryInk} />
          )}
          <Text style={styles.locateText}>
            {locating ? 'Waiting for permission…' : 'Use my current location'}
          </Text>
        </Pressable>
      )}
      <LocationPermissionCard
        visible={askLocation}
        waiting={locating}
        blocked={locationBlocked}
        onRetry={() => void useMyLocation()}
      />
      {locateNote && !askLocation ? <Text style={styles.hint}>{locateNote}</Text> : null}
      {coords.latitude != null && coords.longitude != null ? (
        <MapPinPicker
          latitude={coords.latitude}
          longitude={coords.longitude}
          accuracy={coords.accuracy}
          onChange={(lat, lng) => void movePin(lat, lng)}
        />
      ) : null}

      <Text style={styles.label}>Label</Text>
      <View style={styles.row}>
        {(['Home', 'Site', 'Office'] as AddressLabel[]).map((l) => (
          <Pressable
            key={l}
            onPress={() => setLabel(l)}
            style={[styles.chip, label === l && styles.chipOn]}
          >
            <Text style={[styles.chipText, label === l && styles.chipTextOn]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Full address</Text>
      <TextInput
        value={fullAddress}
        onChangeText={(t) => {
          setFullAddress(t);
          setErrors((e) => ({ ...e, address: undefined }));
        }}
        placeholder="Plot / street / landmark"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.multiline, errors.address ? styles.inputBad : null]}
        multiline
      />
      {errors.address ? <Text style={styles.err}>{errors.address}</Text> : null}

      <Text style={styles.label}>Pincode</Text>
      <TextInput
        value={pincode}
        onChangeText={(t) => {
          setPincode(t.replace(/\D/g, '').slice(0, 6));
          setErrors((e) => ({ ...e, pincode: undefined }));
        }}
        keyboardType="number-pad"
        placeholder="500032"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, errors.pincode ? styles.inputBad : null]}
      />
      {errors.pincode ? <Text style={styles.err}>{errors.pincode}</Text> : null}
      {pincode.length === 6 && !errors.pincode ? (
        <Text style={[styles.hint, status.serviceable ? styles.ok : styles.bad]}>
          {status.message}
        </Text>
      ) : !errors.pincode ? (
        <Text style={styles.hint}>Try 500032 (Hyderabad) or 122001 (Gurugram)</Text>
      ) : null}

      <Text style={styles.label}>City</Text>
      <TextInput
        value={status.city ?? city}
        onChangeText={setCity}
        placeholder="City"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Pressable style={styles.defaultRow} onPress={() => setIsDefault((v) => !v)}>
        <View style={[styles.checkbox, isDefault && styles.checkboxOn]} />

        <Text style={styles.defaultText}>Set as default delivery address</Text>
      </Pressable>

      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Save address</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginBottom: 8,
  },
  locateText: { fontWeight: '800', color: colors.primaryInk, fontSize: 13 },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextOn: { color: colors.primary, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 13,
  },
  inputBad: { borderColor: colors.danger },
  err: { ...typography.micro, color: colors.danger, marginTop: 4 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  hint: { ...typography.micro, marginTop: 6 },
  ok: { color: colors.success },
  bad: { color: colors.danger },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  defaultText: { ...typography.body, color: colors.text },
  save: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { fontWeight: '700', color: colors.primaryInk },
});
