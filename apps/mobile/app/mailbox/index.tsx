import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { MailboxMessage } from '@tingting/shared';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

function typeLabel(type: MailboxMessage['type'], t: (key: string) => string) {
  if (type === 'notice') return t('mailbox.notice');
  if (type === 'notification') return t('mailbox.notification');
  return t('mailbox.groupInvite');
}

function typeIcon(type: MailboxMessage['type']) {
  if (type === 'notice') return 'megaphone-outline' as const;
  if (type === 'notification') return 'notifications-outline' as const;
  return 'people-outline' as const;
}

export default function MailboxScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMessages(await api.getMailboxMessages());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openMessage = async (message: MailboxMessage) => {
    if (!message.readAt) {
      await api.markMailboxMessageRead(message.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, readAt: new Date().toISOString() } : m))
      );
    }
  };

  const respond = async (message: MailboxMessage, accept: boolean) => {
    setRespondingId(message.id);
    try {
      const group = await api.respondToGroupInvite(message.id, accept);
      await load();
      Alert.alert(
        t('common.alert'),
        accept ? t('mailbox.inviteAccepted') : t('mailbox.inviteDeclined')
      );
      if (accept && group) {
        router.push(`/group/${group.id}` as Href);
      }
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <AppScreen
      title={t('mailbox.title')}
      showBack
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {messages.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Ionicons name="mail-open-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{t('mailbox.empty')}</Text>
        </View>
      ) : (
        messages.map((message) => {
          const unread = !message.readAt;
          const pendingInvite = message.type === 'group_invite' && message.inviteStatus === 'pending';
          return (
            <Pressable
              key={message.id}
              style={[styles.card, unread && styles.cardUnread]}
              onPress={() => openMessage(message)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Ionicons name={typeIcon(message.type)} size={14} color={theme.colors.primaryLight} />
                  <Text style={styles.typeText}>{typeLabel(message.type, t)}</Text>
                </View>
                {unread ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.title}>{message.title}</Text>
              <Text style={styles.body}>{message.body}</Text>
              <Text style={styles.date}>{new Date(message.createdAt).toLocaleString()}</Text>

              {pendingInvite ? (
                <View style={styles.actions}>
                  <PremiumButton
                    title={t('mailbox.decline')}
                    onPress={() => respond(message, false)}
                    variant="outline"
                    loading={respondingId === message.id}
                    style={styles.actionBtn}
                  />
                  <PremiumButton
                    title={t('mailbox.accept')}
                    onPress={() => respond(message, true)}
                    loading={respondingId === message.id}
                    style={styles.actionBtn}
                  />
                </View>
              ) : message.type === 'group_invite' && message.inviteStatus ? (
                <Text style={styles.status}>
                  {message.inviteStatus === 'accepted' ? t('mailbox.accepted') : t('mailbox.declined')}
                </Text>
              ) : null}
            </Pressable>
          );
        })
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingTop: 80, gap: theme.spacing.md },
  emptyText: { color: theme.colors.textMuted, fontSize: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  cardUnread: { borderColor: theme.colors.primaryLight },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeText: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primaryLight },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  body: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  date: { color: theme.colors.textMuted, fontSize: 12, marginTop: 8 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  actionBtn: { flex: 1 },
  status: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: theme.spacing.sm },
});
