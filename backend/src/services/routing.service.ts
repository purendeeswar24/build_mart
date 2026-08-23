/** Open-source distance: Haversine (straight line) + OSRM driving route. */

export const HUB = {
  latitude: Number(process.env.HUB_LAT ?? 17.4375),
  longitude: Number(process.env.HUB_LNG ?? 78.4483),
  label: process.env.HUB_LABEL ?? 'BuildMart Hub, Hyderabad',
};

const EARTH_KM = 6371;

export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type RouteInfo = {
  straightKm: number;
  driveKm: number | null;
  driveMinutes: number | null;
  mapUrl: string;
  hub: typeof HUB;
};

export async function routeFromHub(lat: number, lng: number): Promise<RouteInfo> {
  const straightKm = Number(haversineKm(HUB, { latitude: lat, longitude: lng }).toFixed(2));
  const mapUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${HUB.latitude}%2C${HUB.longitude}%3B${lat}%2C${lng}`;

  let driveKm: number | null = null;
  let driveMinutes: number | null = null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${HUB.longitude},${HUB.latitude};${lng},${lat}?overview=false`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as {
        routes?: Array<{ distance: number; duration: number }>;
      };
      const route = data.routes?.[0];
      if (route) {
        driveKm = Number((route.distance / 1000).toFixed(2));
        driveMinutes = Math.max(1, Math.round(route.duration / 60));
      }
    }
  } catch {
    /* OSRM public demo can be rate-limited; haversine still works */
  }

  return { straightKm, driveKm, driveMinutes, mapUrl, hub: HUB };
}
