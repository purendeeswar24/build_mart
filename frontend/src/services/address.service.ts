import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, getAccessToken } from './apiClient';

export type AddressLabel = 'Home' | 'Site' | 'Office';

export type Address = {
  id: string;
  label: AddressLabel;
  fullAddress: string;
  pincode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
};

export type ServiceablePincode = {
  pincode: string;
  isActive: boolean;
  etaMinutes: number;
  city: string;
  /** Cash on delivery allowed for this pincode */
  codEligible: boolean;
};

const ADDRESS_KEY = '@buildmart/addresses';

/** Seed serviceable pincodes — stub for Phase 5–6 */
export const SERVICEABLE_PINCODES: ServiceablePincode[] = [
  { pincode: '500001', isActive: true, etaMinutes: 28, city: 'Hyderabad', codEligible: true },
  { pincode: '500008', isActive: true, etaMinutes: 30, city: 'Hyderabad', codEligible: true },
  { pincode: '500032', isActive: true, etaMinutes: 30, city: 'Hyderabad', codEligible: true },
  { pincode: '500033', isActive: true, etaMinutes: 32, city: 'Hyderabad', codEligible: true },
  { pincode: '500034', isActive: true, etaMinutes: 30, city: 'Hyderabad', codEligible: true },
  { pincode: '500081', isActive: true, etaMinutes: 25, city: 'Hyderabad', codEligible: true },
  { pincode: '500084', isActive: true, etaMinutes: 28, city: 'Hyderabad', codEligible: true },
  { pincode: '500089', isActive: true, etaMinutes: 32, city: 'Hyderabad', codEligible: true },
  { pincode: '500090', isActive: true, etaMinutes: 32, city: 'Hyderabad', codEligible: true },
  { pincode: '500104', isActive: true, etaMinutes: 30, city: 'Hyderabad', codEligible: true },
  { pincode: '122001', isActive: true, etaMinutes: 30, city: 'Gurugram', codEligible: true },
  { pincode: '122002', isActive: true, etaMinutes: 35, city: 'Gurugram', codEligible: false },
  { pincode: '560001', isActive: true, etaMinutes: 30, city: 'Bengaluru', codEligible: true },
  { pincode: '400001', isActive: false, etaMinutes: 0, city: 'Mumbai', codEligible: false },
];

const DEFAULT_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    label: 'Site',
    fullAddress: 'Plot 42, Sector 54, near metro',
    pincode: '500032',
    city: 'Hyderabad',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Home',
    fullAddress: '12-3-45, Banjara Hills Road No. 2',
    pincode: '500034',
    city: 'Hyderabad',
    isDefault: false,
  },
];

export function checkPincode(pincode: string): {
  serviceable: boolean;
  etaMinutes: number;
  city?: string;
  message: string;
} {
  const digits = pincode.replace(/\D/g, '').slice(0, 6);
  if (digits.length !== 6) {
    return { serviceable: false, etaMinutes: 0, message: 'Enter a valid 6-digit pincode' };
  }
  const row = SERVICEABLE_PINCODES.find((p) => p.pincode === digits);
  if (!row || !row.isActive) {
    return {
      serviceable: false,
      etaMinutes: 0,
      message: 'Not currently deliverable to this area',
    };
  }
  return {
    serviceable: true,
    etaMinutes: row.etaMinutes,
    city: row.city,
    message: `Delivery in ${row.etaMinutes} mins`,
  };
}

export function isCodEligible(pincode: string): boolean {
  const digits = pincode.replace(/\D/g, '').slice(0, 6);
  const row = SERVICEABLE_PINCODES.find((p) => p.pincode === digits);
  return !!(row && row.isActive && row.codEligible);
}

export function deliveryFeeFor(subtotal: number): number {
  // Flat / free-above-threshold stub
  if (subtotal >= 999) return 0;
  return 49;
}

function mapApiAddress(row: {
  id: string;
  label: string;
  full_address: string;
  pincode: string;
  city: string;
  is_default: boolean;
  latitude?: number | string | null;
  longitude?: number | string | null;
}): Address {
  return {
    id: row.id,
    label: (row.label as Address['label']) || 'Home',
    fullAddress: row.full_address,
    pincode: row.pincode,
    city: row.city,
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    isDefault: row.is_default,
  };
}

export const addressService = {
  async list(): Promise<Address[]> {
    if (await getAccessToken()) {
      try {
        const res = await apiClient.get<{
          addresses: Array<Parameters<typeof mapApiAddress>[0]>;
        }>('/api/v1/addresses');
        if (res.addresses?.length) return res.addresses.map(mapApiAddress);
      } catch {
        /* local fallback */
      }
    }
    const raw = await AsyncStorage.getItem(ADDRESS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(DEFAULT_ADDRESSES));
      return DEFAULT_ADDRESSES;
    }
    return JSON.parse(raw) as Address[];
  },

  async saveAll(addresses: Address[]) {
    await AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses));
  },

  async upsert(input: Omit<Address, 'id'> & { id?: string }): Promise<Address[]> {
    if (await getAccessToken()) {
      try {
        const res = await apiClient.post<{
          addresses: Array<Parameters<typeof mapApiAddress>[0]>;
        }>('/api/v1/addresses', {
          id: input.id,
          label: input.label,
          fullAddress: input.fullAddress,
          pincode: input.pincode,
          city: input.city,
          isDefault: input.isDefault,
          latitude: input.latitude,
          longitude: input.longitude,
        });
        if (res.addresses?.length) return res.addresses.map(mapApiAddress);
      } catch {
        /* local fallback */
      }
    }
    const list = await this.list();
    const id = input.id ?? `addr-${Date.now()}`;
    let next = list.filter((a) => a.id !== id);
    const row: Address = { ...input, id };
    if (row.isDefault) next = next.map((a) => ({ ...a, isDefault: false }));
    next = [row, ...next];
    if (!next.some((a) => a.isDefault) && next[0]) next[0].isDefault = true;
    await this.saveAll(next);
    return next;
  },

  async remove(id: string): Promise<Address[]> {
    let next = (await this.list()).filter((a) => a.id !== id);
    if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;
    await this.saveAll(next);
    return next;
  },

  async setDefault(id: string): Promise<Address[]> {
    const next = (await this.list()).map((a) => ({ ...a, isDefault: a.id === id }));
    await this.saveAll(next);
    return next;
  },

  getDefault(addresses: Address[]) {
    return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  },
};
