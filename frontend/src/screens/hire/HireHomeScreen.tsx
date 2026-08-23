import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Hammer, Plus } from 'lucide-react-native';
import { EmptyState } from '../../components/layout/EmptyState';
import { ListRowSkeleton } from '../../components/layout/Skeleton';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import {
  formatInr,
  hireCategoryLabel,
  hireService,
  hireTimeLeft,
  type HireJobCard,
} from '../../services/hire.service';
import { colors, radii, shadows, spacing, typography } from '../../theme';

type Props = {
  onOpenJob: (jobId: string) => void;
  onPostJob: () => void;
  onMyJobs: () => void;
};

export function HireHomeScreen({ onOpenJob, onPostJob, onMyJobs }: Props) {
  const { requireAuth } = useAuth();
  const [jobs, setJobs] = useState<HireJobCard[]>([]);
  const [soon, setSoon] = useState<HireJobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, ending] = await Promise.all([hireService.list(), hireService.endingSoon()]);
      setJobs(all.jobs ?? []);
      setSoon(ending.jobs ?? []);
    } catch {
      setError('Could not load open work. Start the API and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const post = () => {
    requireAuth(() => onPostJob());
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ListRowSkeleton rows={5} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState title="Work desk offline" message={error} actionLabel="Retry" onAction={() => void load()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>BUILDER WORK · PRIVATE BIDS</Text>
              <Text style={styles.title}>Building a house? Open the work.</Text>
              <Text style={styles.sub}>
                Service companies bid their price. They cannot see each other. If you accept, you talk only
                through BuildMart — we keep the bridge and the commission.
              </Text>
              <View style={styles.heroActions}>
                <Button title="Open a work" onPress={post} />
                <Button title="My work & bids" variant="outline" onPress={() => requireAuth(() => onMyJobs())} />
              </View>
            </View>

            {soon.length > 0 ? (
              <View style={styles.soonBlock}>
                <Text style={styles.soonTitle}>Completing soon</Text>
                <Text style={styles.soonHint}>Bid windows closing in the next 36 hours</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soonRow}>
                  {soon.map((job) => (
                    <Pressable key={job.id} style={styles.soonCard} onPress={() => onOpenJob(job.id)}>
                      <Text style={styles.soonBadge}>CLOSING</Text>
                      <Text style={styles.soonJob} numberOfLines={2}>
                        {job.title}
                      </Text>
                      <Text style={styles.soonMeta}>
                        {hireCategoryLabel(job.category)} · {hireTimeLeft(job.biddingEndsAt)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.section}>Open work</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={Hammer}
            title="No work posted yet"
            message="A builder can open work. Service companies bid privately. After accept, talk only through us."
            actionLabel="Open a work"
            onAction={post}
          />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpenJob(item.id)}>
            <View style={styles.cardTop}>
              <Text style={styles.cat}>{hireCategoryLabel(item.category)}</Text>
              {item.endingSoon ? <Text style={styles.closing}>Completing soon</Text> : null}
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.meta}>
              {[item.city, item.pincode].filter(Boolean).join(' · ') || 'Location on request'}
              {' · '}
              {hireTimeLeft(item.biddingEndsAt)}
              {' · '}
              {item.bidCount} {item.bidCount === 1 ? 'bid' : 'bids'}
            </Text>
            {item.myBid ? (
              <Text style={styles.mine}>Your bid {formatInr(item.myBid.amount)} — hidden from others</Text>
            ) : null}
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={post} accessibilityRole="button" accessibilityLabel="Open a work">
        <Plus size={22} color={colors.primaryInk} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, paddingBottom: 96, gap: 12 },
  hero: {
    backgroundColor: colors.secondary,
    borderRadius: radii.xl,
    padding: 18,
    marginBottom: 18,
  },
  eyebrow: { ...typography.micro, color: colors.primary, fontWeight: '800', letterSpacing: 0.8 },
  title: { ...typography.heading, color: colors.textInverse, marginTop: 8, fontSize: 22 },
  sub: { ...typography.caption, color: '#C9D6E0', marginTop: 8, lineHeight: 18 },
  heroActions: { marginTop: 14, gap: 8 },
  soonBlock: { marginBottom: 18 },
  soonTitle: { ...typography.subheading, color: colors.text },
  soonHint: { ...typography.caption, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  soonRow: { gap: 10 },
  soonCard: {
    width: 200,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    padding: 12,
  },
  soonBadge: { ...typography.micro, color: colors.primaryDark, fontWeight: '800' },
  soonJob: { ...typography.label, color: colors.text, marginTop: 6 },
  soonMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  section: { ...typography.subheading, color: colors.text, marginBottom: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.soft,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cat: { ...typography.micro, color: colors.primaryDark, fontWeight: '800' },
  closing: { ...typography.micro, color: colors.danger, fontWeight: '800' },
  cardTitle: { ...typography.subheading, color: colors.text, marginTop: 6, fontSize: 16 },
  cardBody: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 10 },
  mine: { ...typography.caption, color: colors.success, marginTop: 8, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lifted,
  },
});
