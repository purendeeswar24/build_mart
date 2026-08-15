import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, Plus, Trash2 } from 'lucide-react-native';
import { useAddress } from '../../hooks/useAddress';
import { checkPincode } from '../../services/address.service';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  onAdd?: () => void;
  onEdit?: (id: string) => void;
  selectable?: boolean;
};

export function AddressListScreen({ onAdd, onEdit, selectable }: Props) {
  const { addresses, selected, selectAddress, removeAddress, setDefault } = useAddress();

  return (
    <View style={styles.screen}>
      <FlatList
        data={addresses}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Pressable style={styles.addBtn} onPress={onAdd}>
            <Plus size={16} color={colors.primaryInk} />
            <Text style={styles.addText}>Add new address</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No saved addresses yet. Add your site or home.</Text>
        }
        renderItem={({ item }) => {
          const status = checkPincode(item.pincode);
          const active = selected?.id === item.id;
          return (
            <Pressable
              style={[styles.card, active && selectable && styles.cardActive]}
              onPress={() => {
                if (selectable) selectAddress(item.id);
                else onEdit?.(item.id);
              }}
            >
              <View style={styles.cardTop}>
                <MapPin size={16} color={colors.primaryDark} />
                <Text style={styles.label}>
                  {item.label}
                  {item.isDefault ? ' · Default' : ''}
                </Text>
              </View>
              <Text style={styles.addr}>{item.fullAddress}</Text>
              <Text style={styles.meta}>
                {item.city} {item.pincode}
              </Text>
              <Text style={[styles.eta, status.serviceable ? styles.ok : styles.bad]}>
                {status.message}
              </Text>
              <View style={styles.actions}>
                {!item.isDefault ? (
                  <Pressable onPress={() => setDefault(item.id)}>
                    <Text style={styles.link}>Set default</Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable
                  onPress={() =>
                    Alert.alert('Delete address?', undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => removeAddress(item.id),
                      },
                    ])
                  }
                >
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: 10, paddingBottom: 40 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  addText: { fontWeight: '700', color: colors.primaryInk },
  empty: { ...typography.body, color: colors.textSecondary, marginTop: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  cardActive: { borderColor: colors.primary, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  addr: { ...typography.body, color: colors.text },
  meta: { ...typography.micro, color: colors.textSecondary, marginTop: 2 },
  eta: { ...typography.micro, marginTop: 6, fontWeight: '600' },
  ok: { color: colors.success },
  bad: { color: colors.danger },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  link: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
});
