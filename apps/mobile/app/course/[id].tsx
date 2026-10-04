import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  COURSE_FOCUS_OPTIONS,
  COURSE_TRANSPORT_OPTIONS,
  getRegion,
  ROUTE_SOURCE_LABELS,
} from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { CourseView } from '@/components/course/CourseView';
import { EmptyState, Loading } from '@/components/ui';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { addDays, dDayLabel, formatDateKey } from '@/lib/dates';
import { iconButton } from '@/lib/ui';
import { theme } from '@/constants/theme';

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: course, error } = useFocusLoad(() => api.getCourse(String(id)));

  const remove = () => {
    const run = async () => {
      try {
        await api.deleteCourse(String(id));
        router.back();
      } catch (e) {
        Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해 주세요');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('이 여행 코스를 지울까요? 일정 탭의 코스 일정도 함께 지워져요.')) void run();
      return;
    }
    Alert.alert('코스 삭제', '이 여행 코스를 지울까요? 일정 탭의 코스 일정도 함께 지워져요.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void run() },
    ]);
  };

  if (!course) {
    return (
      <Screen title="여행 코스">
        {error ? <EmptyState icon="alert-circle-outline" title="코스를 불러오지 못했어요" message={error} /> : <Loading />}
      </Screen>
    );
  }

  const { request } = course;
  const region = getRegion(request.regionCode);
  const focusLabels = COURSE_FOCUS_OPTIONS.filter((o) => request.focus.includes(o.id)).map((o) => o.label);
  const stopCount = course.days.reduce((n, d) => n + d.stops.length, 0);
  const lastDate = addDays(request.startDate, request.nights);

  return (
    <Screen
      title={course.title}
      scroll={false}
      right={
        <Pressable onPress={remove} style={iconButton()} hitSlop={6} accessibilityLabel="코스 삭제">
          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
        </Pressable>
      }
    >
      <CourseView
        days={course.days}
        transport={request.transport}
        detailed
        header={
          <View style={styles.summary}>
            <View style={styles.titleRow}>
              <Text style={styles.dates}>
                {formatDateKey(request.startDate)}
                {request.nights ? ` ~ ${formatDateKey(lastDate)}` : ''}
              </Text>
              <View style={styles.dday}>
                <Text style={styles.ddayText}>{dDayLabel(request.startDate)}</Text>
              </View>
            </View>
            <Text style={styles.sub}>
              {region?.name} · {focusLabels.join(' · ')} 중심 · {COURSE_TRANSPORT_OPTIONS.find((o) => o.id === request.transport)?.label} ·{' '}
              {stopCount}곳
            </Text>
            <Text style={styles.hint}>
              동선: {ROUTE_SOURCE_LABELS[course.routeSource]}
              {course.routeSource === 'estimate' ? ' (예상)' : ''} · 장소를 누르면 사진 · 영업시간 · 연락처를 볼 수 있어요
            </Text>
            {region ? (
              <Pressable onPress={() => router.push(`/region/${region.code}` as Href)} style={styles.regionLink}>
                <Text style={styles.regionLinkText}>{region.name} 기록 보기</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
              </Pressable>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 4, marginBottom: theme.spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dates: { color: theme.colors.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  dday: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.full, backgroundColor: theme.colors.tint.medium },
  ddayText: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '900' },
  sub: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  hint: { color: theme.colors.textSubtle, fontSize: 12 },
  regionLink: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginTop: 2 },
  regionLinkText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
});
