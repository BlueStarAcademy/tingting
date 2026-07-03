import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getRegion,
  REGIONS,
  type Group,
  type GroupSchedule,
  type Place,
  type Quest,
  type Region,
  type Visit,
} from '@tingting/shared';
import { KoreaMapPicker } from '@/components/group/KoreaMapPicker';
import type { RegionSegment } from '@/components/group/RegionSegmentBar';
import { GroupPlacesPanel } from '@/components/group/tabs/GroupPlacesPanel';
import { GroupGalleryTab } from '@/components/group/tabs/GroupGalleryTab';
import { GroupQuestTab } from '@/components/group/tabs/GroupQuestTab';
import { GroupScheduleTab } from '@/components/group/tabs/GroupScheduleTab';
import { PlaceLocationSheet } from '@/components/PlaceLocationSheet';
import { AppModal } from '@/components/AppModal';
import { useBottomSheetLayout } from '@/hooks/useBottomSheetLayout';
import { useLocale } from '@/hooks/useLocale';
import { prefersEnglishContent } from '@/lib/i18n/locales';
import { daysUntil, findNearestUpcomingSchedule, formatDday } from '@/lib/schedule-utils';
import { theme } from '@/constants/theme';

interface Props {
  group: Group;
  places: Place[];
  visits: Visit[];
  quests: Quest[];
  schedules: GroupSchedule[];
  visitedRegionCodes: string[];
  selectedRegionCode: string;
  onSelectedRegionCodeChange: (code: string) => void;
  regionOpen: boolean;
  onRegionOpenChange: (open: boolean) => void;
  segment: RegionSegment;
  isOwner: boolean;
  onUpdated: () => void;
}

export function GroupTravelTab({
  group,
  places,
  visits,
  quests,
  schedules,
  visitedRegionCodes,
  selectedRegionCode,
  onSelectedRegionCodeChange,
  regionOpen,
  onRegionOpenChange,
  segment,
  isOwner,
  onUpdated,
}: Props) {
  const router = useRouter();
  const { footerInset } = useBottomSheetLayout(true);
  const { t, locale } = useLocale();
  const [focusedPlace, setFocusedPlace] = useState<Place | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedRegion = useMemo(
    () => getRegion(selectedRegionCode) ?? REGIONS[0],
    [selectedRegionCode]
  );

  const upcomingSchedule = useMemo(
    () => findNearestUpcomingSchedule(schedules),
    [schedules]
  );

  const onRegionPress = (region: Region) => {
    setFocusedPlace(null);
    setPreviewOpen(false);
    onSelectedRegionCodeChange(region.code);
  };

  const regionLabelFor = (code: string) => {
    const region = getRegion(code);
    if (!region) return code;
    return prefersEnglishContent(locale) && region.nameEn ? region.nameEn : region.name;
  };

  const showMap = segment === 'places';

  return (
    <View style={styles.wrap}>
      {showMap ? (
        <View style={styles.mapSection}>
          <KoreaMapPicker
            compact
            visitedRegionCodes={visitedRegionCodes}
            selectedCode={selectedRegionCode}
            onRegionPress={onRegionPress}
            focusPlace={focusedPlace}
            onPinPress={() => setPreviewOpen(true)}
          />
        </View>
      ) : null}

      {previewOpen && focusedPlace ? (
        <View style={[styles.previewSheet, { bottom: footerInset }]}>
          <PlaceLocationSheet
            place={focusedPlace}
            onClose={() => setPreviewOpen(false)}
            onViewDetail={() => {
              const placeId = focusedPlace.id;
              setPreviewOpen(false);
              router.push(`/place/${placeId}`);
            }}
          />
        </View>
      ) : null}

      <View style={styles.panel}>
        {upcomingSchedule && segment === 'places' ? (
          <Pressable
            style={styles.ddayBanner}
            onPress={() => {
              onSelectedRegionCodeChange(upcomingSchedule.regionCode);
            }}
          >
            <Ionicons name="calendar" size={16} color={theme.colors.primaryLight} />
            <Text style={styles.ddayText} numberOfLines={1}>
              {t('group.ddayBanner', {
                dday: formatDday(daysUntil(upcomingSchedule.date)),
                title: upcomingSchedule.title,
              })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}

        {segment === 'gallery' ? (
          <GroupGalleryTab
            group={group}
            isOwner={isOwner}
            regionCode={selectedRegionCode}
            visits={visits}
            places={places}
            onUpdated={onUpdated}
          />
        ) : (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.content}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {segment === 'places' ? (
              <GroupPlacesPanel
                region={selectedRegion}
                visitedRegionCodes={visitedRegionCodes}
                places={places}
                visits={visits}
                onFocusPlace={(place) => {
                  setFocusedPlace(place);
                  setPreviewOpen(true);
                }}
              />
            ) : null}
            {segment === 'quest' ? (
              <GroupQuestTab
                groupId={group.id}
                regionCode={selectedRegionCode}
                quests={quests}
                onUpdated={onUpdated}
              />
            ) : null}
            {segment === 'schedule' ? (
              <GroupScheduleTab
                groupId={group.id}
                regionCode={selectedRegionCode}
                schedules={schedules}
                onUpdated={onUpdated}
              />
            ) : null}
          </ScrollView>
        )}
      </View>

      <AppModal
        visible={regionOpen}
        animationType="fade"
        onRequestClose={() => onRegionOpenChange(false)}
        variant="center"
        withGroupChat
      >
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('group.gallerySelectRegion')}</Text>
          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {REGIONS.map((region) => (
              <Pressable
                key={region.code}
                style={[styles.regionOpt, region.code === selectedRegionCode && styles.regionOptActive]}
                onPress={() => {
                  onSelectedRegionCodeChange(region.code);
                  onRegionOpenChange(false);
                }}
              >
                <Text
                  style={[
                    styles.regionOptText,
                    region.code === selectedRegionCode && styles.regionOptTextActive,
                  ]}
                >
                  {regionLabelFor(region.code)}
                </Text>
                {region.code === selectedRegionCode ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.colors.primaryLight}
                    style={styles.regionOptCheck}
                  />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  mapSection: { flexGrow: 0, flexShrink: 0 },
  panel: { flex: 1, minHeight: 0, gap: theme.spacing.sm, paddingTop: theme.spacing.xs },
  previewSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
      default: { boxShadow: '0 -4px 20px rgba(15,23,42,0.12)' } as object,
    }),
  },
  ddayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  ddayText: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  contentScroll: { flex: 1, minHeight: 0 },
  content: { paddingBottom: theme.spacing.lg, gap: theme.spacing.sm },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 360,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  modalList: { flexGrow: 0 },
  regionOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    position: 'relative',
  },
  regionOptActive: { backgroundColor: theme.colors.tint.soft },
  regionOptText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  regionOptTextActive: { color: theme.colors.primaryLight, fontWeight: '700' },
  regionOptCheck: { position: 'absolute', right: theme.spacing.sm },
});
