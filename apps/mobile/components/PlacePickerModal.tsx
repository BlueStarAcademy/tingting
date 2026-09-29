import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRegion, type Place } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import { CategoryBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (place: Place | null) => void;
  selectedId?: string | null;
  allowNone?: boolean;
  title?: string;
};

export function PlacePickerModal({ visible, onClose, onSelect, selectedId, allowNone = true, title = '장소 선택' }: Props) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    api.listPlaces().then(setPlaces).catch(() => setPlaces([]));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = places ?? [];
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q) ||
        (getRegion(p.regionCode)?.name ?? '').includes(q),
    );
  }, [places, query]);

  const pick = (place: Place | null) => {
    onSelect(place);
    onClose();
  };

  return (
    <AppModal visible={visible} onRequestClose={onClose} sheetStyle={styles.sheet}>
      <SheetHeader title={title} onClose={onClose} />
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="이름, 주소, 지역으로 찾기"
          placeholderTextColor={theme.colors.textSubtle}
          style={styles.search}
        />
      </View>
      {places === null ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            allowNone ? (
              <Pressable style={styles.row} onPress={() => pick(null)}>
                <Ionicons name="remove-circle-outline" size={20} color={theme.colors.textMuted} />
                <Text style={styles.noneText}>장소 연결 안 함</Text>
                {!selectedId ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
              </Pressable>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>저장된 장소가 없어요. 먼저 장소를 추가해 주세요.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => pick(item)}>
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.meta}>
                  <CategoryBadge category={item.category} small />
                  <Text style={styles.region}>{getRegion(item.regionCode)?.name}</Text>
                </View>
              </View>
              {item.id === selectedId ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          )}
        />
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: { height: '80%' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
  },
  search: { flex: 1, paddingVertical: 10, color: theme.colors.text, fontSize: 15 },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowBody: { flex: 1, gap: 4 },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  region: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  noneText: { flex: 1, color: theme.colors.textMuted, fontSize: 15, fontWeight: '600' },
  empty: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 30, lineHeight: 20 },
});
