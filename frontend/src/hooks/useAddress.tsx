import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  addressService,
  checkPincode,
  type Address,
} from '../services/address.service';

type AddressContextValue = {
  addresses: Address[];
  selected: Address | null;
  isLoading: boolean;
  deliveryStatus: ReturnType<typeof checkPincode> | null;
  refresh: () => Promise<void>;
  selectAddress: (id: string) => void;
  upsertAddress: (input: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
};

const AddressContext = createContext<AddressContextValue | null>(null);

export function AddressProvider({ children }: PropsWithChildren) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await addressService.list();
    setAddresses(list);
    setSelectedId((prev) => {
      if (prev && list.some((a) => a.id === prev)) return prev;
      return addressService.getDefault(list)?.id ?? null;
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = useMemo(
    () => addresses.find((a) => a.id === selectedId) ?? null,
    [addresses, selectedId],
  );

  const deliveryStatus = useMemo(
    () => (selected ? checkPincode(selected.pincode) : null),
    [selected],
  );

  const upsertAddress = useCallback(async (input: Omit<Address, 'id'> & { id?: string }) => {
    const list = await addressService.upsert(input);
    setAddresses(list);
    if (input.isDefault || !selectedId) {
      setSelectedId(addressService.getDefault(list)?.id ?? null);
    }
  }, [selectedId]);

  const removeAddress = useCallback(async (id: string) => {
    const list = await addressService.remove(id);
    setAddresses(list);
    setSelectedId(addressService.getDefault(list)?.id ?? null);
  }, []);

  const setDefault = useCallback(async (id: string) => {
    const list = await addressService.setDefault(id);
    setAddresses(list);
    setSelectedId(id);
  }, []);

  const value = useMemo(
    () => ({
      addresses,
      selected,
      isLoading,
      deliveryStatus,
      refresh,
      selectAddress: setSelectedId,
      upsertAddress,
      removeAddress,
      setDefault,
    }),
    [
      addresses,
      selected,
      isLoading,
      deliveryStatus,
      refresh,
      upsertAddress,
      removeAddress,
      setDefault,
    ],
  );

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddress must be used within AddressProvider');
  return ctx;
}
