import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  jobId: string;
  onOpenChat?: () => void;
};

export function JobDetailScreen({ jobId, onOpenChat }: Props) {
  const { requireAuth } = useAuth();
  const [job, setJob] = useState<HireJobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hireService.get(jobId);
      setJob(res.job);
      if (res.job.myBid) {
        setAmount(String(res.job.myBid.amount));
        setMessage(res.job.myBid.message ?? '');
        setDays(res.job.myBid.daysToComplete != null ? String(res.job.myBid.daysToComplete) : '');
      }
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const place = () => {
    requireAuth(async () => {
      const value = Number(amount);
      if (!(value > 0)) {
        Alert.alert('Enter your bid', 'Add the amount you will charge for this work.');
        return;
      }
      setBusy(true);
      try {
        const daysToComplete = Number(days);
        const res = await hireService.bid(jobId, {
          amount: value,
          message: message.trim() || undefined,
          daysToComplete: Number.isFinite(daysToComplete) && daysToComplete > 0 ? daysToComplete : undefined,
        });
        setJob(res.job);
        Alert.alert('Bid saved', 'Only you and the builder can see this amount. Phone numbers stay hidden.');
      } catch (err) {
        Alert.alert('Bid failed', err instanceof Error ? err.message : 'Try again.');
      } finally {
        setBusy(false);
      }
    });
  };

  const act = (kind: 'shortlist' | 'award', bidId: string) => {
    requireAuth(async () => {
      setBusy(true);
      try {
        const res =
          kind === 'shortlist' ? await hireService.shortlist(jobId, bidId) : await hireService.award(jobId, bidId);
        setJob(res.job);
        if (kind === 'award') {
          Alert.alert(
            'Accepted',
            'BuildMart is now the only bridge. Talk inside the app — we will not share phone or WhatsApp.',
          );
          onOpenChat?.();
        }
      } catch (err) {
        Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again.');
      } finally {
        setBusy(false);
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <ListRowSkeleton rows={5} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.screen}>
        <EmptyState title="Work not found" message="This listing may have been removed." />
      </View>
    );
  }

  const open = job.status === 'open';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.cat}>{hireCategoryLabel(job.category)}</Text>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.meta}>
        {[job.city, job.pincode].filter(Boolean).join(' · ') || 'Location on request'} · {hireTimeLeft(job.biddingEndsAt)} ·{' '}
        {job.bidCount} bids
      </Text>
      <Text style={styles.body}>{job.description}</Text>

      {job.canSeeEstimate && job.ownerEstimate != null ? (
        <View style={styles.private}>
          <Text style={styles.privateLabel}>
            {job.isOwner ? 'Your estimate — only you and admin can see this' : 'Owner estimate — admin only'}
          </Text>
          <Text style={styles.privateValue}>{formatInr(job.ownerEstimate)}</Text>
        </View>
      ) : null}

      {job.bridge?.open ? (
        <View style={styles.win}>
          <Text style={styles.winTitle}>Talk through BuildMart only</Text>
          <Text style={styles.winBody}>{job.bridge.note}</Text>
          <View style={{ marginTop: 12 }}>
            <Button title="Open the bridge thread" onPress={onOpenChat} />
          </View>
        </View>
      ) : null}

      {job.isOwner ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Bids from service companies</Text>
          <Text style={styles.hint}>
            Amounts are private to you. After you accept, you talk only inside BuildMart — no phone numbers either way.
          </Text>
          {(job.bids ?? []).length === 0 ? (
            <Text style={styles.hint}>No bids yet.</Text>
          ) : (
            (job.bids ?? []).map((bid) => (
              <View key={bid.id} style={styles.bid}>
                <Text style={styles.bidAmt}>{formatInr(bid.amount)}</Text>
                <Text style={styles.bidName}>{bid.bidder.name ?? 'Service company'}</Text>
                {bid.daysToComplete ? <Text style={styles.hint}>{bid.daysToComplete} days to complete</Text> : null}
                {bid.message ? <Text style={styles.bidMsg}>{bid.message}</Text> : null}
                <Text style={styles.hint}>Status: {bid.status}</Text>
                {open || job.status === 'closed' ? (
                  <View style={styles.bidActs}>
                    {bid.status !== 'shortlisted' ? (
                      <Button title="Shortlist" size="sm" variant="outline" disabled={busy} onPress={() => act('shortlist', bid.id)} />
                    ) : null}
                    <Button title="Accept — talk via BuildMart" size="sm" disabled={busy} onPress={() => act('award', bid.id)} />
                  </View>
                ) : null}
              </View>
            ))
          )}
          {job.commissionAmount != null ? (
            <Text style={styles.hint}>
              Platform commission {job.commissionPercent}% = {formatInr(job.commissionAmount)}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{job.myBid ? 'Update your private bid' : 'Bid for this work'}</Text>
          <Text style={styles.hint}>
            Other companies cannot see your price. If the builder accepts, you talk only through BuildMart.
          </Text>
          {!open ? (
            <Text style={styles.hint}>Bidding is closed on this work.</Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="Your amount in ₹"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={days}
                onChangeText={setDays}
                keyboardType="number-pad"
                placeholder="Days to complete (optional)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.area]}
                value={message}
                onChangeText={setMessage}
                multiline
                placeholder="Note to the owner — materials, visit time, GST…"
                placeholderTextColor={colors.textMuted}
              />
              <Button title={job.myBid ? 'Update bid' : 'Submit bid'} loading={busy} onPress={place} />
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 48 },
  cat: { ...typography.micro, color: colors.primaryDark, fontWeight: '800' },
  title: { ...typography.heading, color: colors.text, marginTop: 6 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 8 },
  body: { ...typography.body, color: colors.text, marginTop: 14, lineHeight: 22 },
  private: {
    marginTop: 16,
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  privateLabel: { ...typography.micro, color: colors.primaryDark, fontWeight: '800' },
  privateValue: { ...typography.subheading, color: colors.text, marginTop: 4 },
  win: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success,
  },
  winTitle: { ...typography.subheading, color: colors.success },
  winBody: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  block: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  blockTitle: { ...typography.subheading, color: colors.text, fontSize: 16 },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.background,
  },
  area: { minHeight: 90, textAlignVertical: 'top' },
  bid: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bidAmt: { ...typography.subheading, color: colors.text },
  bidName: { ...typography.label, color: colors.text, marginTop: 2 },
  bidMsg: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  bidActs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
