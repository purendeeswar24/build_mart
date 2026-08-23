import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../../theme';

type Props = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  onChange: (latitude: number, longitude: number) => void;
};

type LeafletLayer = { addTo: (map: LeafletMap) => LeafletLayer; remove: () => void };

type LeafletMap = {
  setView: (latlng: [number, number], zoom?: number) => void;
  remove: () => void;
  invalidateSize?: () => void;
  on: (event: string, fn: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  dragging: { enable: () => void };
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (latlng: [number, number]) => void;
  on: (event: string, fn: (e: { latlng: { lat: number; lng: number } }) => void) => void;
};

type LeafletCircle = {
  addTo: (map: LeafletMap) => LeafletCircle;
  setLatLng: (latlng: [number, number]) => void;
  setRadius: (m: number) => void;
  remove: () => void;
};

type LeafletNs = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => LeafletLayer;
  marker: (latlng: [number, number], opts: Record<string, unknown>) => LeafletMarker;
  circle: (latlng: [number, number], opts: Record<string, unknown>) => LeafletCircle;
  Icon: { Default: { imagePath: string } };
};

declare global {
  interface Window {
    L?: LeafletNs;
  }
}

let leafletPromise: Promise<LeafletNs> | null = null;

function loadLeaflet(): Promise<LeafletNs> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Map is only available in the browser.'));
  }
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const cssId = 'buildmart-leaflet-css';
    if (!document.getElementById(cssId)) {
      const css = document.createElement('link');
      css.id = cssId;
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      if (!window.L) {
        reject(new Error('Leaflet failed to load'));
        return;
      }
      window.L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
      resolve(window.L);
    };
    script.onerror = () => reject(new Error('Could not load the map.'));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

export function MapPinPicker({ latitude, longitude, accuracy, onChange }: Props) {
  const hostRef = useRef<View>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const streetRef = useRef<LeafletLayer | null>(null);
  const satRef = useRef<LeafletLayer | null>(null);
  const movingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const [mode, setMode] = useState<'satellite' | 'street'>('satellite');
  onChangeRef.current = onChange;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;

    void (async () => {
      const node = hostRef.current as unknown as HTMLElement | null;
      if (!node) return;
      const L = await loadLeaflet();
      if (cancelled) return;

      const map = L.map(node, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });
      streetRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap',
      });
      satRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri',
        },
      );
      satRef.current.addTo(map);
      map.setView([latitude, longitude], 19);

      const marker = L.marker([latitude, longitude], { draggable: true, autoPan: true }).addTo(map);
      marker.on('dragstart', () => {
        movingRef.current = true;
      });
      marker.on('dragend', (event) => {
        movingRef.current = false;
        onChangeRef.current(event.latlng.lat, event.latlng.lng);
      });
      map.on('click', (event) => {
        marker.setLatLng([event.latlng.lat, event.latlng.lng]);
        onChangeRef.current(event.latlng.lat, event.latlng.lng);
      });

      if (accuracy && accuracy > 0) {
        circleRef.current = L.circle([latitude, longitude], {
          radius: Math.min(accuracy, 120),
          color: '#D4A017',
          fillColor: '#D4A017',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
      }

      mapRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize?.(), 120);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // Create the map once; position updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (movingRef.current) return;
    mapRef.current?.setView([latitude, longitude], 19);
    markerRef.current?.setLatLng([latitude, longitude]);
    circleRef.current?.setLatLng([latitude, longitude]);
    if (accuracy) circleRef.current?.setRadius(Math.min(accuracy, 120));
  }, [latitude, longitude, accuracy]);

  const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;

  const switchMode = (next: 'satellite' | 'street') => {
    setMode(next);
    streetRef.current?.remove();
    satRef.current?.remove();
    if (next === 'satellite') satRef.current?.addTo(mapRef.current as LeafletMap);
    else streetRef.current?.addTo(mapRef.current as LeafletMap);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.switchRow}>
        <Text
          style={[styles.switchBtn, mode === 'satellite' && styles.switchOn]}
          onPress={() => switchMode('satellite')}
        >
          Satellite
        </Text>
        <Text
          style={[styles.switchBtn, mode === 'street' && styles.switchOn]}
          onPress={() => switchMode('street')}
        >
          Street
        </Text>
      </View>
      <View ref={hostRef} style={styles.map} collapsable={false} />
      <Text style={styles.help}>
        The pin is your GPS point. Drag it onto your building if the label is still a bit off.
      </Text>
      <Text style={styles.coords}>
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
        {accuracy ? `  ·  ±${Math.round(accuracy)}m` : ''}
      </Text>
      {Platform.OS !== 'web' ? (
        <Text style={styles.link} onPress={() => {
          const Linking = require('react-native').Linking as { openURL: (url: string) => void };
          Linking.openURL(osmUrl);
        }}>
          Open this pin in Maps
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    marginBottom: 6,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  switchBtn: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchOn: {
    backgroundColor: colors.primary,
    color: colors.primaryInk,
  },
  map: {
    height: 280,
    width: '100%',
    backgroundColor: colors.surfaceMuted,
  },
  help: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  coords: {
    ...typography.micro,
    color: colors.textMuted,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
    fontVariant: ['tabular-nums'],
  },
  link: {
    ...typography.caption,
    color: colors.primaryDark,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});
