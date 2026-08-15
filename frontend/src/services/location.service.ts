import { Platform } from 'react-native';
import { checkPincode } from './address.service';

export type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  /** Best-effort city / area label */
  label: string;
  /** Suggested serviceable pincode when we can map city */
  suggestedPincode?: string;
  city?: string;
};

const CITY_PIN: Record<string, { pincode: string; city: string }> = {
  hyderabad: { pincode: '500032', city: 'Hyderabad' },
  gurgaon: { pincode: '122001', city: 'Gurugram' },
  gurugram: { pincode: '122001', city: 'Gurugram' },
  bengaluru: { pincode: '560001', city: 'Bengaluru' },
  bangalore: { pincode: '560001', city: 'Bengaluru' },
  mumbai: { pincode: '400001', city: 'Mumbai' },
};

/** Request device / browser location (web + native via Geolocation API). */
export async function getCurrentPosition(): Promise<GeoPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Location is not available on this device. Enter your pincode instead.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === 1) {
          reject(new Error('Location permission denied. Enable it in browser/settings or enter pincode.'));
        } else if (err.code === 3) {
          reject(new Error('Location timed out. Try again or enter pincode.'));
        } else {
          reject(new Error('Could not fetch location. Enter your pincode instead.'));
        }
      },
      {
        enableHighAccuracy: Platform.OS !== 'web',
        timeout: 12000,
        maximumAge: 60_000,
      },
    );
  });
}

/** Reverse-geocode via OpenStreetMap Nominatim (no API key; rate-limited). */
export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      // Nominatim usage policy — identify the app
      'User-Agent': 'BuildMart/1.0 (construction marketplace demo)',
    },
  });
  if (!res.ok) {
    return {
      latitude: lat,
      longitude: lng,
      label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  }
  const data = (await res.json()) as {
    display_name?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state_district?: string;
      suburb?: string;
      postcode?: string;
    };
  };
  const addr = data.address ?? {};
  const cityRaw =
    addr.city || addr.town || addr.village || addr.state_district || addr.suburb || '';
  const cityKey = cityRaw.toLowerCase();
  const mapped = CITY_PIN[cityKey];
  const postcode = addr.postcode?.replace(/\D/g, '').slice(0, 6);
  const pinCheck = postcode ? checkPincode(postcode) : null;

  return {
    latitude: lat,
    longitude: lng,
    label: data.display_name?.split(',').slice(0, 3).join(',') ?? cityRaw ?? 'Current location',
    city: mapped?.city ?? (cityRaw || undefined),
    suggestedPincode:
      (pinCheck?.serviceable ? postcode : undefined) ?? mapped?.pincode,
  };
}

export async function detectUserLocation(): Promise<ResolvedLocation> {
  const pos = await getCurrentPosition();
  try {
    return await reverseGeocode(pos.latitude, pos.longitude);
  } catch {
    return {
      latitude: pos.latitude,
      longitude: pos.longitude,
      label: `${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`,
    };
  }
}

export const locationService = {
  getCurrentPosition,
  reverseGeocode,
  detectUserLocation,
};
