import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { thumbUri } from '@/lib/media';
import { theme } from '@/constants/theme';

export type ViewerItem = { key: string; uri: string; caption?: string };
export type ViewerAction = { key: string; icon: IconName; label: string; onPress: () => void; primary?: boolean; danger?: boolean };

/** Full-screen swipeable viewer. Actions apply to the photo currently on screen. */
export function PhotoViewer<T extends ViewerItem>({
  items,
  index,
  onClose,
  onIndexChange,
  actionsFor,
  onEndReached,
  busy,
}: {
  items: T[];
  /** null hides the viewer */
  index: number | null;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  actionsFor: (item: T) => ViewerAction[];
  onEndReached?: () => void;
  busy?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const width = useContentWidth();
  const { height } = useWindowDimensions();
  const listRef = useRef<FlatList<T>>(null);
  const [current, setCurrent] = useState(index ?? 0);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  // Keep the index valid when photos are deleted or moved out while the viewer is open.
  useEffect(() => {
    if (index === null) return;
    if (items.length === 0) onClose();
    else if (current >= items.length) setCurrent(items.length - 1);
  }, [items.length, current, index, onClose]);

  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) {
      setCurrent(first.index);
      onIndexChangeRef.current?.(first.index);
    }
  }).current;

  const getItemLayout = useCallback((_: unknown, i: number) => ({ length: width, offset: width * i, index: i }), [width]);

  const item = items[Math.min(current, items.length - 1)];
  const visible = index !== null && items.length > 0;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent={false}>
      <View style={styles.root}>
        {visible ? (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(it) => it.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(index ?? 0, items.length - 1)}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            onEndReached={onEndReached}
            onEndReachedThreshold={2}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            renderItem={({ item: it }) => (
              <View style={{ width, height }}>
                <Image source={{ uri: thumbUri(it.uri, width) }} style={styles.image} resizeMode="contain" resizeMethod="resize" />
              </View>
            )}
          />
        ) : null}

        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.counter}>
              {Math.min(current, items.length - 1) + 1} / {items.length}
            </Text>
            {item?.caption ? (
              <Text style={styles.caption} numberOfLines={1}>
                {item.caption}
              </Text>
            ) : null}
          </View>
          <View style={styles.iconBtn} />
        </View>

        {item ? (
          <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actions}>
              {actionsFor(item).map((action) => (
                <Pressable
                  key={action.key}
                  onPress={action.onPress}
                  disabled={busy}
                  style={[styles.action, action.primary && styles.actionPrimary, action.danger && styles.actionDanger]}
                >
                  <Ionicons name={action.icon} size={18} color="#fff" />
                  <Text style={styles.actionText}>{action.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0A0B' },
  image: { width: '100%', height: '100%' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: 'rgba(14,10,11,0.45)',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  counter: { color: '#fff', fontSize: 14, fontWeight: '800' },
  caption: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: 'rgba(14,10,11,0.55)',
  },
  actions: { gap: 8, paddingHorizontal: theme.spacing.md },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionPrimary: { backgroundColor: theme.colors.primary },
  actionDanger: { backgroundColor: 'rgba(217,91,91,0.55)' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
});
