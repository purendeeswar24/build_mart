import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { locationService } from '../../services/location.service';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  visible: boolean;
  waiting: boolean;
  blocked: boolean;
  onRetry: () => void;
};

export function LocationPermissionCard({ visible, waiting, blocked, onRetry }: Props) {
  const [copied, setCopied] = useState(false);
  if (!visible) return null;

  const url = locationService.shopPageUrl();

  const copyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <MapPin size={18} color={colors.primaryInk} />
      </View>
      <Text style={styles.title}>{waiting ? 'Allow location now' : 'Allow location to drop the pin'}</Text>
      <Text style={styles.body}>
        {waiting
          ? 'Look at the top of Chrome for Allow / Block. Tap Allow.'
          : blocked
            ? 'Chrome blocked location for this site. Click the lock icon next to the address → Site settings → Location → Allow, then tap Use my current location again.'
            : 'Tap Use my current location. If no popup appears, copy the link and open it in Chrome.'}
      </Text>
      <Text style={styles.url}>{url}</Text>
      {Platform.OS === 'web' ? (
        <View style={styles.row}>
          <a href={url} target="_blank" rel="noreferrer" style={anchorStyle}>
            Open this page in a new Chrome tab
          </a>
        </View>
      ) : null}
      <Pressable style={styles.primary} onPress={() => void copyUrl()}>
        <Text style={styles.primaryText}>{copied ? 'Link copied' : 'Copy link'}</Text>
      </Pressable>
      <Pressable style={styles.retry} onPress={onRetry}>
        <Text style={styles.retryText}>{waiting ? 'Waiting for Allow…' : 'Ask for location again'}</Text>
      </Pressable>
    </View>
  );
}

const anchorStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'center',
  background: '#0A0A0A',
  color: '#D4A017',
  fontWeight: 800,
  fontSize: 12,
  textDecoration: 'none',
  borderRadius: 12,
  padding: '10px 12px',
};

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    marginBottom: 8,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    gap: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.body, fontWeight: '800', color: colors.primaryInk },
  body: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  url: { ...typography.caption, color: colors.text, fontWeight: '700', marginTop: 4 },
  row: { marginTop: 8 },
  primary: {
    marginTop: 8,
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  retry: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: { fontSize: 12, fontWeight: '800', color: colors.primaryInk },
});
