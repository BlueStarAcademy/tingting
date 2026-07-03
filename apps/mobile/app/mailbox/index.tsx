import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { MailboxMessage } from '@tingting/shared';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { useFooterInset } from '@/hooks/useFooterInset';
import { api } from '@/lib/api';
import { tabPill } from '@/lib/ui';
import { theme } from '@/constants/theme';

type MailboxTab = 'invites' | 'mail';

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

function isPendingInvite(message: MailboxMessage | null) {
  return message?.type === 'group_invite' && message.inviteStatus === 'pending';
}

function filterMessages(messages: MailboxMessage[], tab: MailboxTab) {
  if (tab === 'invites') {
    return messages.filter((m) => m.type === 'group_invite' && m.inviteStatus === 'pending');
  }
  return messages.filter((m) => m.type !== 'group_invite');
}

const BAR_HEIGHT = 52;
const BAR_GAP = 8;
const LIST_VISIBLE_ROWS = 3;
const LIST_PANEL_HEIGHT = BAR_HEIGHT * LIST_VISIBLE_ROWS + BAR_GAP * (LIST_VISIBLE_ROWS - 1) + 4;

export default function MailboxScreen() {
  const { t, formatDate } = useLocale();
  const footerInset = useFooterInset();
  const router = useRouter();
  const listRef = useRef<ScrollView>(null);
  const [tab, setTab] = useState<MailboxTab>('invites');
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const filteredMessages = useMemo(() => filterMessages(messages, tab), [messages, tab]);
  const selected = filteredMessages.find((m) => m.id === selectedId) ?? null;

  const load = useCallback(async (keepSelection = true) => {
    setLoading(true);
    try {
      const next = await api.getMailboxMessages();
      setMessages(next);
      setSelectedId((prev) => {
        if (!keepSelection) return null;
        const visible = filterMessages(next, tab);
        return prev && visible.some((m) => m.id === prev) ? prev : null;
      });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  useEffect(() => {
    setSelectedId((prev) =>
      prev && filteredMessages.some((m) => m.id === prev) ? prev : null
    );
  }, [tab, filteredMessages]);

  useEffect(() => {
    if (!selectedId) return;
    const index = filteredMessages.findIndex((m) => m.id === selectedId);
    if (index < 0) return;
    listRef.current?.scrollTo({
      y: Math.max(0, index * (BAR_HEIGHT + BAR_GAP) - BAR_HEIGHT),
      animated: true,
    });
  }, [selectedId, filteredMessages.length]);

  const selectMessage = useCallback((message: MailboxMessage) => {
    setSelectedId(message.id);
  }, []);

  const receiveSelected = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (isPendingInvite(selected)) {
        const group = await api.respondToGroupInvite(selected.id, true);
        await load();
        Alert.alert(t('common.alert'), t('mailbox.inviteAccepted'));
        if (group) router.push(`/group/${group.id}` as Href);
        return;
      }
      if (selected.readAt) return;
      await api.markMailboxMessageRead(selected.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === selected.id ? { ...m, readAt: new Date().toISOString() } : m))
      );
      Alert.alert(t('common.alert'), t('mailbox.received'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = () => {
    if (!selected) return;

    if (isPendingInvite(selected)) {
      Alert.alert(t('common.alert'), t('mailbox.decline'), [
        { text: t('header.cancel'), style: 'cancel' },
        {
          text: t('mailbox.decline'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.respondToGroupInvite(selected.id, false);
              await load();
              Alert.alert(t('common.alert'), t('mailbox.inviteDeclined'));
            } catch (e: unknown) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
            } finally {
              setBusy(false);
            }
          },
        },
      ]);
      return;
    }

    Alert.alert(t('common.alert'), t('mailbox.deleteConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('mailbox.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.deleteMailboxMessage(selected.id);
            await load();
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const receiveDisabled =
    !selected ||
    busy ||
    (!isPendingInvite(selected) && Boolean(selected.readAt));
  const deleteDisabled = !selected || busy;

  const emptyLabel = tab === 'invites' ? t('mailbox.emptyInvites') : t('mailbox.emptyMail');

  const viewerActions = selected ? (
    <View style={styles.viewerActions}>
      <PremiumButton
        title={isPendingInvite(selected) ? t('mailbox.accept') : t('mailbox.receive')}
        onPress={receiveSelected}
        loading={busy}
        disabled={receiveDisabled}
        style={styles.viewerActionBtn}
      />
      <PremiumButton
        title={isPendingInvite(selected) ? t('mailbox.decline') : t('mailbox.delete')}
        onPress={deleteSelected}
        variant="outline"
        loading={busy}
        disabled={deleteDisabled}
        style={styles.viewerActionBtn}
      />
    </View>
  ) : null;

  return (
    <AppScreen
      title={t('mailbox.title')}
      showBack
      scroll={false}
      contentStyle={[styles.screen, { paddingBottom: footerInset + theme.spacing.sm }]}
    >
      <View style={styles.tabRow}>
        {(['invites', 'mail'] as MailboxTab[]).map((item) => {
          const active = tab === item;
          const label = item === 'invites' ? t('mailbox.tabInvites') : t('mailbox.tabMail');
          return (
            <Pressable
              key={item}
              style={[tabPill(active), styles.tabPill]}
              onPress={() => setTab(item)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primaryLight} />
        </View>
      ) : filteredMessages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="mail-open-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      ) : (
        <>
          <View style={styles.inboxPanel}>
            <View style={styles.listPanel}>
              <ScrollView
                ref={listRef}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              >
                {filteredMessages.map((message) => {
                  const active = message.id === selectedId;
                  const unread = !message.readAt;
                  return (
                    <Pressable
                      key={message.id}
                      style={[
                        styles.mailBar,
                        active && styles.mailBarActive,
                        unread && !active && styles.mailBarUnread,
                      ]}
                      onPress={() => selectMessage(message)}
                    >
                      <View style={styles.barIconWrap}>
                        <Ionicons name={typeIcon(message.type)} size={18} color={theme.colors.primaryLight} />
                      </View>
                      <Text style={styles.barTitle} numberOfLines={1}>
                        {message.title}
                      </Text>
                      <Text style={styles.barMeta} numberOfLines={1}>
                        {typeLabel(message.type, t)}
                      </Text>
                      {unread ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.viewer}>
            {selected ? (
              <View style={styles.viewerInner}>
                <ScrollView
                  style={styles.viewerScroll}
                  contentContainerStyle={styles.viewerContent}
                  refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />
                  }
                >
                  <View style={styles.viewerHeader}>
                    <View style={styles.typeBadge}>
                      <Ionicons name={typeIcon(selected.type)} size={16} color={theme.colors.primaryLight} />
                      <Text style={styles.typeText}>{typeLabel(selected.type, t)}</Text>
                    </View>
                    {!selected.readAt ? (
                      <Text style={styles.unreadBadge}>{t('mailbox.unread')}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.viewerTitle}>{selected.title}</Text>
                  <Text style={styles.viewerDate}>{formatDate(selected.createdAt)}</Text>
                  <Text style={styles.viewerBody}>{selected.body}</Text>
                </ScrollView>
                {viewerActions}
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptyText}>{t('mailbox.selectMail')}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: theme.spacing.md, gap: theme.spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  emptyText: { color: theme.colors.textMuted, fontSize: 16 },
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  tabPill: { flex: 1, alignItems: 'center' },
  tabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary, fontWeight: '800' },
  inboxPanel: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  listPanel: {
    height: LIST_PANEL_HEIGHT,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  listContent: { gap: BAR_GAP, paddingBottom: theme.spacing.sm },
  mailBar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    gap: theme.spacing.sm,
  },
  mailBarActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: 'rgba(79,107,149,0.1)',
  },
  mailBarUnread: {
    borderColor: 'rgba(122,148,184,0.45)',
  },
  barIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  barMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 72,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primaryLight },
  dotSpacer: { width: 8, height: 8 },
  viewer: {
    flex: 1,
    minHeight: 0,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  viewerInner: {
    flex: 1,
    minHeight: 0,
  },
  viewerScroll: { flex: 1, minHeight: 0 },
  viewerContent: { padding: theme.spacing.md, gap: theme.spacing.sm },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeText: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '700' },
  unreadBadge: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(79,107,149,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  viewerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '800', lineHeight: 28 },
  viewerDate: { color: theme.colors.textMuted, fontSize: 13 },
  viewerBody: { color: theme.colors.text, fontSize: 15, lineHeight: 24 },
  viewerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceLight,
    backgroundColor: theme.colors.surface,
    flexShrink: 0,
  },
  viewerActionBtn: { flex: 1 },
});
