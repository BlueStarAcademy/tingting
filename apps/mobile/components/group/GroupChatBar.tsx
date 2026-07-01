import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GroupChatMessage } from '@tingting/shared';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '✈️', '📸', '🗺️', '⭐', '🍜', '🏨', '🌸'];
const CHAT_PANEL_HEIGHT = 220;
const BRAND_NAME = 'TingTalk';

interface Props {
  groupId: string;
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function GroupChatBar({ groupId }: Props) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const tabBarInset = MAIN_TAB_BAR_HEIGHT + Math.max(insets.bottom, 6);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    setMessages(await api.getGroupChatMessages(groupId));
  }, [groupId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

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
  const collapse = () => {
    setExpanded(false);
    setEmojiOpen(false);
  };

  if (!expanded) {
    return (
      <View style={[styles.bubbleWrap, { bottom: tabBarInset + 12 }]} pointerEvents="box-none">
        <Pressable
          style={styles.bubble}
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={`${BRAND_NAME} ${t('group.chatOpen')}`}
        >
          <View style={styles.bubbleRow}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
            <Text style={styles.bubbleBrand}>
              <Text style={styles.bubbleTing}>Ting</Text>
              <Text style={styles.bubbleTalk}>Talk</Text>
            </Text>
          </View>
        </Pressable>
      </View>
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
            <Text style={styles.headerBrandText}>
              <Text style={styles.bubbleTingDark}>Ting</Text>
              <Text style={styles.bubbleTalkDark}>Talk</Text>
            </Text>
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
              messages.map((m, index) => (
                <View key={m.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.messageBlock}>
                    <View style={styles.metaRow}>
                      <Text style={styles.sender} numberOfLines={1}>
                        {m.displayName}
                      </Text>
                      <Text style={styles.time}>{formatChatTime(m.createdAt)}</Text>
                    </View>
                    <Text style={styles.msg}>{m.text}</Text>
                  </View>
                </View>
              ))
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    position: 'absolute',
    right: theme.spacing.md,
    zIndex: 20,
    overflow: 'visible',
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
    elevation: 8,
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
    zIndex: 20,
    paddingHorizontal: theme.spacing.sm,
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
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
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
  time: { color: theme.colors.textMuted, fontSize: 11, flexShrink: 0 },
  msg: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
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
