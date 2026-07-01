import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Region } from '@tingting/shared';
import { TravelProgressBar } from '@/components/TravelProgressBar';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  region: Region | null;
  progress: number;
  visitedCount: number;
  totalCount: number;
  regionVisited: boolean;
  onClose: () => void;
  onViewPlaces: () => void;
}

export function RegionProgressModal({
  visible,
  region,
  progress,
  visitedCount,
  totalCount,
  regionVisited,
  onClose,
  onViewPlaces,
}: Props) {
  const { t, locale } = useLocale();

  if (!region) return null;

  const regionLabel = locale === 'en' && region.nameEn ? region.nameEn : region.name;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: region.color }]} />
            <Text style={styles.sheetTitle}>{regionLabel}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {locale === 'ko' && region.nameEn ? (
          <Text style={styles.nameEn}>{region.nameEn}</Text>
        ) : null}

        <View style={[styles.badge, regionVisited && styles.badgeVisited]}>
          <Text style={styles.badgeText}>
            {regionVisited ? t('region.visited') : t('region.notVisited')}
          </Text>
        </View>

        <TravelProgressBar
          title={t('map.regionProgressTitle')}
          subtitle={t('map.regionProgressSub', { visited: visitedCount, total: totalCount })}
          progress={progress}
          accentColor={region.color}
        />

        <PremiumButton title={t('map.viewRegionPlaces')} onPress={onViewPlaces} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sheetTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '800', flexShrink: 1 },
  nameEn: { color: theme.colors.textMuted, fontSize: 13, marginTop: -8 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  badgeVisited: { backgroundColor: theme.colors.successSoft },
  badgeText: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
});
