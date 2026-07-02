import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { GroupTabBar, type GroupTab } from '@/components/group/GroupTabBar';
import { GroupChatBar } from '@/components/group/GroupChatBar';
import { GroupNameEditModal } from '@/components/group/GroupNameEditModal';
import { GroupHomeTab } from '@/components/group/tabs/GroupHomeTab';
import { GroupMembersTab } from '@/components/group/tabs/GroupMembersTab';
import { GroupTravelTab } from '@/components/group/tabs/GroupTravelTab';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import type { Group, GroupSchedule, Place, Quest, Visit } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { session, profile, refresh: refreshAuth } = useAuth();
  const [tab, setTab] = useState<GroupTab>('home');
  const [group, setGroup] = useState<Group | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [schedules, setSchedules] = useState<GroupSchedule[]>([]);
  const [nameEditOpen, setNameEditOpen] = useState(false);

  const load = async () => {
    const [groupRes, visitsRes, placesRes, questsRes, schedulesRes] = await Promise.allSettled([
      api.getGroup(id),
      api.getGroupVisits(id),
      api.getPlaces(),
      api.getGroupQuests(id),
      api.getGroupSchedules(id),
    ]);
    if (groupRes.status === 'fulfilled') setGroup(groupRes.value);
    if (visitsRes.status === 'fulfilled') setVisits(visitsRes.value);
    if (placesRes.status === 'fulfilled') setPlaces(placesRes.value);
    if (questsRes.status === 'fulfilled') setQuests(questsRes.value);
    if (schedulesRes.status === 'fulfilled') setSchedules(schedulesRes.value);
    await refreshAuth();
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id])
  );

  if (!group) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <AppHeader showBack />
        <Text style={styles.loading}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  const isOwner = session?.userId === group.ownerId;
  const visitedRegions = [
    ...new Set(
      visits
        .map((v) => places.find((p) => p.id === v.placeId)?.regionCode)
        .filter((c): c is string => Boolean(c))
    ),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AppHeader
        title={group.name}
        showBack
        showActions={false}
        onEditTitle={isOwner ? () => setNameEditOpen(true) : undefined}
      />
      <GroupTabBar active={tab} onChange={setTab} />
      <View style={styles.body}>
        {tab === 'travel' ? (
          <View style={styles.travelBody}>
            <GroupTravelTab
              group={group}
              places={places}
              visits={visits}
              quests={quests}
              schedules={schedules}
              visitedRegionCodes={visitedRegions}
              onUpdated={load}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.homeSections}>
              <GroupHomeTab group={group} isOwner={isOwner} onUpdated={load} />
              <GroupMembersTab
                group={group}
                isOwner={isOwner}
                currentUserId={session?.userId}
                onUpdated={load}
                onLeft={() => {}}
              />
            </View>
          </ScrollView>
        )}
        <GroupChatBar groupId={id} />
      </View>
      <GroupNameEditModal
        visible={nameEditOpen}
        groupId={id}
        currentName={group.name}
        onClose={() => setNameEditOpen(false)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background, minHeight: 0 },
  body: { flex: 1, minHeight: 0, position: 'relative' },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  homeSections: { gap: theme.spacing.xl },
  travelBody: { flex: 1, minHeight: 0, padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  loading: { color: theme.colors.text, padding: theme.spacing.lg },
});
