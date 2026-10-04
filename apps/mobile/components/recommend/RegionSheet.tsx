import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRecommendationCategory, getRegion, type RecommendationCategory, type RegionVisitStat } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import { useToast } from '@/components/album/Toast';
import { CategoryChips } from '@/components/recommend/CategoryChips';
import { RecommendationResults } from '@/components/recommend/RecommendationResults';
import { usePagedRecommendations } from '@/hooks/usePagedRecommendations';
import { api } from '@/lib/api';
import { heatColor, heatLevel } from '@/lib/korea-map-visual';
import { theme } from '@/constants/theme';

/** Bottom sheet with a region's own record summary and category recommendations. */
export function RegionSheet({
  regionCode,
  stat,
  from,
  onClose,
  onOpenRegion,
  onOpenPlace,
}: {
  regionCode: string | null;
  stat?: RegionVisitStat;
  /** Current position, to show distances */
  from?: { lat: number; lng: number } | null;
  onClose: () => void;
  onOpenRegion?: (code: string) => void;
  onOpenPlace: (placeId: string) => void;
}) {
  // Keep showing the last region while the sheet slides away.
  const lastCode = useRef(regionCode);
  if (regionCode) lastCode.current = regionCode;
  const region = lastCode.current ? getRegion(lastCode.current) : undefined;
  const [category, setCategory] = useState<RecommendationCategory>('food');
  const [toast, showToast] = useToast();

  const state = usePagedRecommendations(region ? `${region.code}:${category}` : null, (page, source) =>
    api.getRecommendations({ regionCode: region!.code, category, page, source, from: from ?? undefined }),
  );

  const level = heatLevel(stat);
  const label = getRecommendationCategory(category).label;

  return (
    <AppModal visible={Boolean(regionCode)} onRequestClose={onClose} sheetStyle={styles.sheet}>
      {region ? (
        <View style={styles.flex}>
          <SheetHeader title={`${region.name} 추천 장소`} onClose={onClose} />
          <Pressable
            style={({ pressed }) => [styles.record, pressed && onOpenRegion && styles.pressed]}
            onPress={onOpenRegion ? () => onOpenRegion(region.code) : undefined}
            disabled={!onOpenRegion}
          >
            <View style={[styles.dot, { backgroundColor: heatColor(level) }]} />
            <View style={styles.recordBody}>
              <Text style={styles.recordTitle}>{stat?.visited ? '우리가 다녀온 곳이에요' : '아직 색칠 전이에요'}</Text>
              <Text style={styles.recordSub}>
                장소 {stat?.placeCount ?? 0}곳 · 다녀온 곳 {stat?.visitedPlaceCount ?? 0}곳 · 사진 {stat?.photoCount ?? 0}장
              </Text>
            </View>
            {onOpenRegion ? (
              <View style={styles.recordLink}>
                <Text style={styles.recordLinkText}>우리 기록</Text>
                <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} />
              </View>
            ) : null}
          </Pressable>
          <View style={styles.chips}>
            <CategoryChips value={category} onChange={setCategory} inset={theme.spacing.lg} />
          </View>
          <ScrollView style={styles.flex} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <RecommendationResults
              state={state}
              emptyTitle={`${region.name} ${label} 정보가 아직 없어요`}
              emptyMessage="다른 카테고리를 눌러 보거나 근처 검색을 이용해 보세요."
              onOpenSaved={onOpenPlace}
              onToast={showToast}
            />
          </ScrollView>
          {toast}
        </View>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: { height: '88%' },
  flex: { flex: 1 },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 12,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  pressed: { opacity: 0.85 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  recordBody: { flex: 1, gap: 2 },
  recordTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  recordSub: { color: theme.colors.textMuted, fontSize: 12 },
  recordLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  recordLinkText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  chips: { paddingHorizontal: theme.spacing.lg, marginBottom: 10 },
  list: { paddingHorizontal: theme.spacing.lg, paddingTop: 4, paddingBottom: theme.spacing.lg },
});
