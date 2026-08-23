import { env } from '../config/env';

export type PreciseAddress = {
  latitude: number;
  longitude: number;
  label: string;
  city: string | null;
  postcode: string | null;
  road: string | null;
  neighbourhood: string | null;
  house: string | null;
  landmark: string | null;
  source: string;
};

type PartialPlace = Partial<PreciseAddress> & {
  matchLat?: number;
  matchLng?: number;
  distanceM?: number;
};

const NEAR_M = 80;

function clean(value?: string | null) {
  const text = value?.replace(/\s+/g, ' ').trim() ?? '';
  return text.length ? text : null;
}

function digitsPin(value?: string | null) {
  const pin = value?.replace(/\D/g, '').slice(0, 6) ?? '';
  return pin.length === 6 ? pin : null;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function withDistance(place: PartialPlace, lat: number, lng: number): PartialPlace {
  if (place.matchLat == null || place.matchLng == null) return { ...place, distanceM: 0 };
  return {
    ...place,
    distanceM: metersBetween(lat, lng, place.matchLat, place.matchLng),
  };
}

function closeEnough(place: PartialPlace | null) {
  if (!place) return false;
  return (place.distanceM ?? 0) <= NEAR_M;
}

function formatLabel(place: PartialPlace) {
  const street = [place.house, place.road].filter(Boolean).join(' ');
  const near =
    place.landmark && (place.distanceM ?? 0) <= NEAR_M
      ? `Near ${place.landmark}`
      : null;
  const parts = [street || near, street && near ? near : null, place.neighbourhood, place.city, place.postcode].filter(
    (part, index, all) => part && all.indexOf(part) === index,
  );
  if (parts.length) return parts.join(', ');
  return place.label?.split(',').slice(0, 3).join(',').trim() || null;
}

async function fetchJson<T>(url: string, init?: RequestInit, ms = 8000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mapsKey() {
  const key = env.GOOGLE_MAPS_API_KEY || env.GOOGLE_PLACES_API_KEY;
  if (!key || key.includes('your-') || key.includes('xxxxx')) return null;
  return key;
}

async function fromGoogle(lat: number, lng: number): Promise<PartialPlace | null> {
  const key = mapsKey();
  if (!key) return null;

  const geo = await fetchJson<{
    status?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      address_components?: Array<{ long_name: string; types: string[] }>;
    }>;
  }>(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=street_address|premise|subpremise|route&key=${encodeURIComponent(key)}`,
  );

  const result = geo?.status === 'OK' ? geo.results?.[0] : null;
  const component = (type: string) =>
    result?.address_components?.find((row) => row.types.includes(type))?.long_name ?? null;

  const nearby = await fetchJson<{
    results?: Array<{
      name?: string;
      geometry?: { location?: { lat: number; lng: number } };
      types?: string[];
    }>;
  }>(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&key=${encodeURIComponent(key)}`,
  );
  const poi = nearby?.results?.find((row) => {
    const types = row.types ?? [];
    const loc = row.geometry?.location;
    if (!row.name || !loc || types.includes('political') || types.includes('route')) return false;
    return metersBetween(lat, lng, loc.lat, loc.lng) <= NEAR_M;
  });

  if (!result && !poi) return null;
  const loc = result?.geometry?.location ?? poi?.geometry?.location;
  return withDistance(
    {
      label: result?.formatted_address ?? null,
      house: component('street_number'),
      road: component('route'),
      neighbourhood: component('neighborhood') || component('sublocality_level_1') || component('sublocality'),
      city: component('locality') || component('administrative_area_level_2'),
      postcode: digitsPin(component('postal_code')),
      landmark: clean(poi?.name),
      matchLat: loc?.lat,
      matchLng: loc?.lng,
      source: 'google',
    },
    lat,
    lng,
  );
}

async function fromNominatim(lat: number, lng: number): Promise<PartialPlace | null> {
  const data = await fetchJson<{
    name?: string;
    display_name?: string;
    lat?: string;
    lon?: string;
    address?: Record<string, string>;
  }>(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&layer=address`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BuildMart/1.0 (local marketplace reverse-geocode)',
      },
    },
  );
  if (!data) return null;
  const addr = data.address ?? {};
  const matchLat = Number(data.lat);
  const matchLng = Number(data.lon);
  const place = withDistance(
    {
      label: data.display_name ?? null,
      house: clean(addr.house_number),
      road: clean(addr.road || addr.pedestrian || addr.residential || addr.footway),
      neighbourhood: clean(addr.neighbourhood || addr.suburb || addr.quarter),
      city: clean(addr.city || addr.town || addr.village),
      postcode: digitsPin(addr.postcode),
      landmark: clean(data.name),
      matchLat: Number.isFinite(matchLat) ? matchLat : undefined,
      matchLng: Number.isFinite(matchLng) ? matchLng : undefined,
      source: 'nominatim',
    },
    lat,
    lng,
  );
  if (place.distanceM != null && place.distanceM > 250) {
    return {
      city: place.city,
      postcode: place.postcode,
      neighbourhood: place.neighbourhood,
      source: 'nominatim',
      distanceM: place.distanceM,
    };
  }
  if (place.distanceM != null && place.distanceM > NEAR_M) {
    return { ...place, landmark: null, label: null };
  }
  return place;
}

async function fromPhoton(lat: number, lng: number): Promise<PartialPlace | null> {
  const data = await fetchJson<{
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        name?: string;
        street?: string;
        housenumber?: string;
        district?: string;
        city?: string;
        postcode?: string;
        locality?: string;
      };
    }>;
  }>(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
  const feature = data?.features?.[0];
  const props = feature?.properties;
  if (!props) return null;
  const [matchLng, matchLat] = feature.geometry?.coordinates ?? [];
  const place = withDistance(
    {
      house: clean(props.housenumber),
      road: clean(props.street),
      neighbourhood: clean(props.district || props.locality),
      city: clean(props.city),
      postcode: digitsPin(props.postcode),
      landmark: clean(props.name),
      matchLat,
      matchLng,
      source: 'photon',
    },
    lat,
    lng,
  );
  if (place.distanceM != null && place.distanceM > NEAR_M) {
    return { ...place, landmark: null };
  }
  return place;
}

async function fromOverpass(lat: number, lng: number): Promise<PartialPlace | null> {
  const body = `[out:json][timeout:12];
(
  node(around:60,${lat},${lng})["addr:housenumber"];
  way(around:60,${lat},${lng})["addr:housenumber"];
  way(around:45,${lat},${lng})["building"];
);
out center tags 20;`;
  const data = await fetchJson<{
    elements?: Array<{
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  }>('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `data=${encodeURIComponent(body)}`,
  }, 12000);
  const elements = data?.elements ?? [];
  if (!elements.length) return null;

  const ranked = elements
    .map((el) => {
      const matchLat = el.lat ?? el.center?.lat;
      const matchLng = el.lon ?? el.center?.lon;
      if (matchLat == null || matchLng == null) return null;
      const tags = el.tags ?? {};
      return withDistance(
        {
          house: clean(tags['addr:housenumber']),
          road: clean(tags['addr:street'] || tags['addr:place']),
          neighbourhood: clean(tags['addr:suburb'] || tags['addr:neighbourhood']),
          city: clean(tags['addr:city']),
          postcode: digitsPin(tags['addr:postcode']),
          landmark: clean(tags.name),
          matchLat,
          matchLng,
          source: 'overpass',
        },
        lat,
        lng,
      );
    })
    .filter((row): row is PartialPlace => !!row && (row.distanceM ?? 999) <= 60)
    .sort((a, b) => {
      const houseBoost = (x: PartialPlace) => (x.house ? 0 : 40);
      return (a.distanceM ?? 0) + houseBoost(a) - ((b.distanceM ?? 0) + houseBoost(b));
    });

  return ranked[0] ?? null;
}

async function fromBigDataCloud(lat: number, lng: number): Promise<PartialPlace | null> {
  const data = await fetchJson<{
    city?: string;
    locality?: string;
    postcode?: string;
    principalSubdivision?: string;
    localityInfo?: { informative?: Array<{ name?: string; description?: string }> };
  }>(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
  );
  if (!data) return null;
  const informative = data.localityInfo?.informative ?? [];
  const place = informative.find((row) => /neighbourhood|neighborhood|suburb|locality/i.test(row.description ?? ''));
  return {
    neighbourhood: clean(place?.name || data.locality),
    city: clean(data.city || data.principalSubdivision),
    postcode: digitsPin(data.postcode),
    source: 'bigdatacloud',
    distanceM: 0,
  };
}

function firstClose(parts: PartialPlace[], pick: (p: PartialPlace) => string | null | undefined) {
  return parts.find((p) => closeEnough(p) && pick(p)) ?? parts.find((p) => pick(p));
}

function mergePlaces(lat: number, lng: number, parts: Array<PartialPlace | null>): PreciseAddress {
  const filled = parts.filter((part): part is PartialPlace => !!part);
  const nearby = filled.filter((p) => closeEnough(p) || p.source === 'bigdatacloud');
  const pool = nearby.length ? nearby : filled;
  const house = firstClose(pool, (p) => p.house)?.house ?? null;
  const road = firstClose(pool, (p) => p.road)?.road ?? null;
  const landmarkRow = pool.find((p) => p.landmark && closeEnough(p));
  const merged: PartialPlace = {
    house,
    road,
    neighbourhood: firstClose(filled, (p) => p.neighbourhood)?.neighbourhood ?? null,
    city: firstClose(filled, (p) => p.city)?.city ?? null,
    postcode: firstClose(filled, (p) => p.postcode)?.postcode ?? null,
    landmark: landmarkRow?.landmark ?? null,
    distanceM: landmarkRow?.distanceM ?? 0,
    source: filled.map((p) => p.source).filter(Boolean).join('+') || 'coords',
  };
  return {
    latitude: lat,
    longitude: lng,
    house: merged.house ?? null,
    road: merged.road ?? null,
    neighbourhood: merged.neighbourhood ?? null,
    city: merged.city ?? null,
    postcode: merged.postcode ?? null,
    landmark: merged.landmark ?? null,
    label: formatLabel(merged) ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    source: merged.source ?? 'coords',
  };
}

export async function reverseGeocodePrecise(lat: number, lng: number): Promise<PreciseAddress> {
  const [google, overpass, nominatim, photon, bigdata] = await Promise.all([
    fromGoogle(lat, lng),
    fromOverpass(lat, lng),
    fromNominatim(lat, lng),
    fromPhoton(lat, lng),
    fromBigDataCloud(lat, lng),
  ]);
  return mergePlaces(lat, lng, [google, overpass, nominatim, photon, bigdata]);
}
