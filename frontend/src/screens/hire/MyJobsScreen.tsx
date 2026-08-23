import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState } from '../../components/layout/EmptyState';
import { ListRowSkeleton } from '../../components/layout/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { formatInr, hireCategoryLabel, hireService, hireTimeLeft, type HireJobCard } from '../../services/hire.service';
import { colors, radii, shadows, spacing, typography } from '../../theme';

type BidRow = { id: string; jobId: string; title: string; amount: number; status: string };

type Props = {
  onOpenJob: (jobId: string) => void;
  onPostJob: () => void;
};

export function MyJobsScreen({ onOpenJob, onPostJob }: Props) {
  const { isAuthenticated, requireAuth, openLoginModal } = useAuth();
  const [posted, setPosted] = useState<HireJobCard[]>([]);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setPosted([]);
      setBids([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const mine = await hireService.mine();
      setPosted(mine.posted ?? []);
      setBids(mine.bids ?? []);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="Sign in for your hire desk"
          message="Post vacancies or track the bids you placed."
          actionLabel="Log in"
          onAction={openLoginModal}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ListRowSkeleton rows={4} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.h}>Jobs you posted</Text>
        <Pressable onPress={() => requireAuth(() => onPostJob())}>
          <Text style={styles.link}>Open work</Text>
        </Pressable>
      </View>
      {posted.length === 0 ? (
        <Text style={styles.empty}>You have not posted a vacancy yet.</Text>
      ) : (
        posted.map((job) => (
          <Pressable key={job.id} style={styles.card} onPress={() => onOpenJob(job.id)}>
            <Text style={styles.cat}>{hireCategoryLabel(job.category)}</Text>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.meta}>
              {job.status} · {job.bidCount} bids · {hireTimeLeft(job.biddingEndsAt)}
            </Text>
          </Pressable>
        ))
      )}

      <Text style={[styles.h, { marginTop: 24 }]}>Bids you placed</Text>
      <Text style={styles.hint}>Other bidders cannot see these amounts.</Text>
      {bids.length === 0 ? (
        <Text style={styles.empty}>You have not bid on any job yet.</Text>
      ) : (
        bids.map((bid) => (
          <Pressable key={bid.id} style={styles.card} onPress={() => onOpenJob(bid.jobId)}>
            <Text style={styles.title}>{bid.title}</Text>
            <Text style={styles.meta}>
              Your bid {formatInr(bid.amount)} · {bid.status}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 40 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h: { ...typography.subheading, color: colors.text },
  link: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: 4, marginBottom: 8 },
  empty: { ...typography.body, color: colors.textMuted, marginTop: 8 },
  card: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.soft,
  },
  cat: { ...typography.micro, color: colors.primaryDark, fontWeight: '800' },
  title: { ...typography.label, color: colors.text, marginTop: 4 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
});
