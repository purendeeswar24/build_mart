import React, { useCallback, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { hireService, type HireMessage } from '../../services/hire.service';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  jobId: string;
};

function roleLabel(role: string, mine: boolean) {
  if (mine) return 'You';
  if (role === 'system') return 'BuildMart';
  if (role === 'admin') return 'BuildMart desk';
  if (role === 'owner') return 'Builder';
  if (role === 'bidder') return 'Service company';
  return role;
}

export function WorkChatScreen({ jobId }: Props) {
  const [messages, setMessages] = useState<HireMessage[]>([]);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await hireService.messages(jobId);
      setMessages(res.messages ?? []);
      setNote(res.note ?? '');
    } catch (err) {
      Alert.alert('Thread closed', err instanceof Error ? err.message : 'Accept a bid first.');
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const id = setInterval(() => void load(), 8000);
      return () => clearInterval(id);
    }, [load]),
  );

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      const res = await hireService.sendMessage(jobId, body);
      setMessages(res.messages ?? []);
      setDraft('');
    } catch (err) {
      Alert.alert('Not sent', err instanceof Error ? err.message : 'Try again without a phone number.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'system' && styles.sys,
              item.mine && styles.mine,
            ]}
          >
            <Text style={[styles.who, item.role === 'system' && styles.sysWho]}>
              {roleLabel(item.role, item.mine)}
            </Text>
            <Text style={[styles.body, item.role === 'system' && styles.sysBody]}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Site details, visit time… no phone numbers"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Button title="Send" size="sm" loading={busy} onPress={() => void send()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    lineHeight: 18,
  },
  list: { padding: spacing.lg, gap: 10, paddingBottom: 20 },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 12,
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  sys: {
    alignSelf: 'center',
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  who: { ...typography.micro, color: colors.primaryDark, fontWeight: '800', marginBottom: 4 },
  sysWho: { color: colors.primary },
  body: { ...typography.body, color: colors.text },
  sysBody: { color: colors.textInverse },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
  },
});
