import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { env } from '../config/env';

export type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type LocationSource = 'gps' | 'ip' | 'fallback';

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  label: string;
  suggestedPincode?: string;
  city?: string;
  source?: LocationSource;
  accuracy?: number;
};

export class LocationPermissionError extends Error {
  constructor(
    message: string,
    public readonly status: 'denied' | 'unavailable' | 'timeout',
  ) {
    super(message);
    this.name = 'LocationPermissionError';
  }
}

const CITY_PIN: Record<string, { pincode: string; city: string }> = {
  hyderabad: { pincode: '500032', city: 'Hyderabad' },
  gurgaon: { pincode: '122001', city: 'Gurugram' },
  gurugram: { pincode: '122001', city: 'Gurugram' },
  bengaluru: { pincode: '560001', city: 'Bengaluru' },
  bangalore: { pincode: '560001', city: 'Bengaluru' },
  mumbai: { pincode: '400001', city: 'Mumbai' },
};

function apiBase() {
  return env.apiBaseUrl.replace(/\/$/, '');
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new LocationPermissionError(message, 'timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fetchJson<T>(url: string, ms = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function withCityPin(loc: ResolvedLocation): ResolvedLocation {
  const cityKey = (loc.city ?? '').toLowerCase();
  const mapped = CITY_PIN[cityKey];
  return {
    ...loc,
    city: loc.city || mapped?.city,
    suggestedPincode: loc.suggestedPincode || mapped?.pincode,
  };
}

function browserGeo() {
  if (typeof window !== 'undefined' && window.navigator?.geolocation) {
    return window.navigator.geolocation;
  }
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return navigator.geolocation;
  }
  return null;
}

export async function getBrowserPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    const permissions = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
    if (!permissions?.query) return 'unknown';
    const result = await permissions.query({ name: 'geolocation' });
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state;
    }
  } catch {
    /* Permissions API not available */
  }
  return 'unknown';
}

function requestBrowserPosition(): Promise<GeoPosition> {
  const geo = browserGeo();
  if (!geo) {
    return Promise.reject(new LocationPermissionError('Location is not available in this browser.', 'unavailable'));
  }

  return new Promise((resolve, reject) => {
    let best: GeoPosition | null = null;
    const finish = (pos: GeoPosition) => {
      geo.clearWatch(watchId);
      clearTimeout(timer);
      resolve(pos);
    };
    const fail = (err: GeolocationPositionError) => {
      geo.clearWatch(watchId);
      clearTimeout(timer);
      if (best) {
        resolve(best);
        return;
      }
      if (err.code === 1) {
        reject(
          new LocationPermissionError(
            'Location is blocked. Click the lock icon in the address bar → Site settings → Location → Allow, then tap Use current location again.',
            'denied',
          ),
        );
      } else if (err.code === 3) {
        reject(new LocationPermissionError('Location timed out. Tap again and Allow when asked.', 'timeout'));
      } else {
        reject(new LocationPermissionError('Could not read GPS. Turn on location services and try again.', 'unavailable'));
      }
    };

    const watchId = geo.watchPosition(
      (pos) => {
        const next = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (!best || (next.accuracy ?? 9999) < (best.accuracy ?? 9999)) best = next;
        if ((next.accuracy ?? 9999) <= 25) finish(next);
      },
      fail,
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      },
    );

    const timer = setTimeout(() => {
      geo.clearWatch(watchId);
      if (best) resolve(best);
      else reject(new LocationPermissionError('Location timed out. Tap again and Allow when asked.', 'timeout'));
    }, 5000);
  });
}

export async function requestLocationPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (Platform.OS === 'web') {
    const state = await getBrowserPermissionState();
    if (state === 'granted') return { granted: true, canAskAgain: true };
    if (state === 'denied') return { granted: false, canAskAgain: false };
    return { granted: false, canAskAgain: true };
  }

  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return { granted: true, canAskAgain: current.canAskAgain };

  const asked = await Location.requestForegroundPermissionsAsync();
  return { granted: asked.granted, canAskAgain: asked.canAskAgain };
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  if (Platform.OS === 'web') {
    return withTimeout(requestBrowserPosition(), 65_000, 'Location timed out. Tap again and Allow when asked.');
  }

  const perm = await requestLocationPermission();
  if (!perm.granted) {
    throw new LocationPermissionError(
      perm.canAskAgain
        ? 'Allow location when asked, then tap Use current location again.'
        : 'Location permission is off. Enable it in Settings, then tap again.',
      'denied',
    );
  }

  const pos = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
    30_000,
    'Location timed out. Turn on GPS and try again.',
  );
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation> {
  try {
    const data = await fetchJson<{
      latitude: number;
      longitude: number;
      label: string;
      city?: string | null;
      postcode?: string | null;
      road?: string | null;
      neighbourhood?: string | null;
      house?: string | null;
      landmark?: string | null;
    }>(
      `${apiBase()}/api/v1/geo/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
    return withCityPin({
      latitude: data.latitude,
      longitude: data.longitude,
      label: data.label,
      city: data.city ?? undefined,
      suggestedPincode: data.postcode ?? undefined,
      source: 'gps',
    });
  } catch {
    return withCityPin({
      latitude: lat,
      longitude: lng,
      label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      source: 'gps',
    });
  }
}

export async function detectUserLocation(): Promise<ResolvedLocation> {
  const pos = await getCurrentPosition();
  const loc = await reverseGeocode(pos.latitude, pos.longitude);
  return { ...loc, accuracy: pos.accuracy };
}

export function describeLocation(loc: ResolvedLocation) {
  const pin = loc.suggestedPincode ? ` · ${loc.suggestedPincode}` : '';
  const short = loc.label.split(',').slice(0, 2).join(',').trim();
  if (loc.source === 'gps') return `Pinned ${short || loc.city || 'your place'}${pin}`;
  if (loc.source === 'ip') return `Approximate area ${loc.city ?? ''}${pin}`;
  return `Using ${loc.city ?? 'Hyderabad'} pin${pin}`;
}

export function shopPageUrl() {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return 'http://localhost:8081';
}

export function isEmbeddedPreview() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.top !== window.self) return true;
  } catch {
    return true;
  }
  const ua = window.navigator?.userAgent ?? '';
  return /VSCode|Cursor|Electron/i.test(ua) && !/Edg\//.test(ua);
}

export async function openShopInChrome() {
  const url = shopPageUrl();
  if (typeof window !== 'undefined') {
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      /* ignore */
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}

export const locationService = {
  getCurrentPosition,
  reverseGeocode,
  detectUserLocation,
  describeLocation,
  requestLocationPermission,
  getBrowserPermissionState,
  shopPageUrl,
  isEmbeddedPreview,
  openShopInChrome,
};
