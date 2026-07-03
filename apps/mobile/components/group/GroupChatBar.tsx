import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GroupChatMessage } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '✈️', '📸', '🗺️', '⭐', '🍜', '🏨', '🌸'];
const CHAT_PANEL_HEIGHT = 220;
const CHAT_LAYER_Z_INDEX = 1000;
const CHAT_LAYER_ELEVATION = 64;
const BRAND_NAME = 'TingTalk';

interface Props {
  groupId: string;
}

function visibleMessages(messages: GroupChatMessage[]): GroupChatMessage[] {
  return messages.filter((message) => !message.deletedAt);
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function GroupChatBar({ groupId }: Props) {
  const { t } = useLocale();
  const { session, profile } = useAuth();
  const ownerIds = useMemo(
    () => new Set([profile?.id, session?.userId].filter(Boolean) as string[]),
    [profile?.id, session?.userId],
  );
  const insets = useSafeAreaInsets();
  const tabBarInset = MAIN_TAB_BAR_HEIGHT + Math.max(insets.bottom, 6);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GroupChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      setMessages(visibleMessages(await api.getGroupChatMessages(groupId)));
    } catch {
      /* endpoint may be unavailable on older API builds */
    }
  }, [groupId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const next = visibleMessages(await api.getGroupChatMessages(groupId));
        if (active) setMessages(next);
      } catch {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
    };

    poll();
    timer = setInterval(poll, 4000);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [groupId]);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [expanded, messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await api.sendGroupChatMessage(groupId, trimmed);
      setText('');
      setEmojiOpen(false);
      await load();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      /* ignore */
    }
  };

  const appendEmoji = (emoji: string) => setText((prev) => prev + emoji);

  const confirmDelete = (message: GroupChatMessage) => {
    if (Platform.OS === 'web') {
      setDeleteTarget(message);
      return;
    }
    Alert.alert(t('group.chatDelete'), t('group.chatDeleteConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('group.chatDelete'),
        style: 'destructive',
        onPress: () => runDelete(message),
      },
    ]);
  };

  const runDelete = async (message: GroupChatMessage) => {
    setDeleteTarget(null);
    setDeleting(true);
    const previous = messages;
    setMessages((current) => current.filter((item) => item.id !== message.id));
    try {
      await api.deleteGroupChatMessage(groupId, message.id);
      await load();
    } catch (e: unknown) {
      setMessages(previous);
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setDeleting(false);
    }
  };

  const collapse = () => {
    setExpanded(false);
    setEmojiOpen(false);
  };

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset(lastOffset.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const { width: screenW, height: screenH } = Dimensions.get('window');
        const curX = (pan.x as any)._value ?? 0;
        const curY = (pan.y as any)._value ?? 0;
        const clampedX = Math.max(-(screenW - 120), Math.min(0, curX));
        const clampedY = Math.max(-(screenH - 200), Math.min(screenH - 200, curY));
        lastOffset.current = { x: clampedX, y: clampedY };
        pan.setValue({ x: clampedX, y: clampedY });
      },
    })
  ).current;

  if (!expanded) {
    return (
      <Animated.View
        style={[
          styles.bubbleWrap,
          { bottom: tabBarInset + 12 },
          { transform: pan.getTranslateTransform() },
        ]}
        pointerEvents="box-none"
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.bubble}
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={`${BRAND_NAME} ${t('group.chatOpen')}`}
        >
          <View style={styles.bubbleRow}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
            <View style={styles.bubbleBrand}>
              <Text style={[styles.bubbleBrandText, styles.bubbleTing]}>Ting</Text>
              <Text style={[styles.bubbleBrandText, styles.bubbleTalk]}>Talk</Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.overlay, { bottom: tabBarInset }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.panelHeader}>
          <View style={styles.headerBrand}>
            <Ionicons name="chatbubble-ellipses" size={16} color={theme.colors.primaryLight} />
            <View style={styles.headerBrandText}>
              <Text style={[styles.bubbleBrandText, styles.bubbleTingDark]}>Ting</Text>
              <Text style={[styles.bubbleBrandText, styles.bubbleTalkDark]}>Talk</Text>
            </View>
          </View>
          <Pressable
            style={styles.collapseBtn}
            onPress={collapse}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('group.chatCollapse')}
          >
            <Ionicons name="chevron-down" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.panel}>
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <Text style={styles.empty}>{t('group.chatEmpty')}</Text>
            ) : (
              messages.map((m, index) => {
                const isOwn = ownerIds.has(m.userId);

                return (
                  <View key={m.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.messageBlock}>
                      <View style={styles.metaRow}>
                        <Text style={styles.sender} numberOfLines={1}>
                          {m.displayName}
                        </Text>
                        <View style={styles.metaRight}>
                          {isOwn ? (
                            <Pressable
                              onPress={() => confirmDelete(m)}
                              hitSlop={6}
                              disabled={deleting}
                              accessibilityRole="button"
                              accessibilityLabel={t('group.chatDelete')}
                            >
                              <Text style={styles.deleteBtn}>{t('group.chatDelete')}</Text>
                            </Pressable>
                          ) : null}
                          <Text style={styles.time}>{formatChatTime(m.createdAt)}</Text>
                        </View>
                      </View>
                      <Text style={styles.msg}>{m.text}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {emojiOpen ? (
          <View style={styles.emojiRow}>
            {QUICK_EMOJIS.map((e) => (
              <Pressable key={e} style={styles.emojiBtn} onPress={() => appendEmoji(e)}>
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <Pressable style={styles.iconBtn} onPress={() => setEmojiOpen((v) => !v)}>
            <Ionicons name="happy-outline" size={22} color={theme.colors.primaryLight} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('group.chatPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <AppModal
        visible={deleteTarget != null}
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
        variant="center"
        withGroupChat
      >
        <View style={styles.deleteModal}>
          <Text style={styles.deleteModalTitle}>{t('group.chatDelete')}</Text>
          <Text style={styles.deleteModalBody}>{t('group.chatDeleteConfirm')}</Text>
          <View style={styles.deleteModalActions}>
            <PremiumButton
              title={t('header.cancel')}
              variant="outline"
              onPress={() => setDeleteTarget(null)}
              fullWidth={false}
              style={styles.deleteModalButton}
            />
            <PremiumButton
              title={t('group.chatDelete')}
              variant="danger"
              onPress={() => deleteTarget && runDelete(deleteTarget)}
              loading={deleting}
              fullWidth={false}
              style={styles.deleteModalButton}
            />
          </View>
        </View>
      </AppModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    position: 'absolute',
    right: theme.spacing.md,
    zIndex: CHAT_LAYER_Z_INDEX,
    elevation: CHAT_LAYER_ELEVATION,
    overflow: 'visible',
    ...Platform.select({
      web: { position: 'fixed', zIndex: CHAT_LAYER_Z_INDEX } as any,
    }),
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: CHAT_LAYER_ELEVATION,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'visible',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bubbleBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleBrandText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  bubbleTing: {
    color: '#fff',
  },
  bubbleTalk: {
    color: theme.colors.star,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: CHAT_LAYER_Z_INDEX,
    elevation: CHAT_LAYER_ELEVATION,
    paddingHorizontal: theme.spacing.sm,
    ...Platform.select({
      web: { position: 'fixed', zIndex: CHAT_LAYER_Z_INDEX } as any,
    }),
  },
  card: {
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...shadow('lg'),
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLight,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  headerBrandText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleTingDark: {
    color: theme.colors.text,
  },
  bubbleTalkDark: {
    color: theme.colors.star,
  },
  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  panel: {
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    height: CHAT_PANEL_HEIGHT,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    overflow: 'hidden',
  },
  messages: { flex: 1 },
  messagesContent: { padding: theme.spacing.sm, flexGrow: 1 },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.tint.light,
    marginVertical: theme.spacing.xs,
  },
  messageBlock: { gap: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sender: {
    flex: 1,
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  deleteBtn: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  time: { color: theme.colors.textMuted, fontSize: 11, flexShrink: 0 },
  msg: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
  deleteModal: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    minWidth: 280,
  },
  deleteModalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  deleteModalBody: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  deleteModalButton: {
    flex: 1,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    gap: 4,
  },
  emojiBtn: { padding: 4 },
  emoji: { fontSize: 22 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: 6,
  },
  iconBtn: { padding: 8 },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
