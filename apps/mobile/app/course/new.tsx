import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  COURSE_FOCUS_OPTIONS,
  COURSE_NIGHT_OPTIONS,
  COURSE_TRANSPORT_OPTIONS,
  dayPoints,
  estimateMissingLegs,
  getRegion,
  REGION_HUBS,
  retimeDay,
  ROUTE_SOURCE_LABELS,
  slotCategory,
  type CourseDraft,
  type CourseFocus,
  type CourseNights,
  type CoursePoint,
  type CourseRequest,
  type CourseTransport,
  type Place,
  type RecommendedPlace,
} from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { CalendarMonth } from '@/components/CalendarMonth';
import { CourseView } from '@/components/course/CourseView';
import { SwapSheet } from '@/components/course/SwapSheet';
import { ActionButton, EmptyState, type IconName } from '@/components/ui';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { api } from '@/lib/api';
import { addDays, formatDateKey, parseDateKey, todayKey } from '@/lib/dates';
import { cardSurface, glassSurface, shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

const STEPS = ['focus', 'nights', 'date', 'transport', 'start'] as const;
type Step = (typeof STEPS)[number];

type StartChoice = { kind: 'hub' } | { kind: 'here' } | { kind: 'place'; point: CoursePoint };

function nextSaturday(weeksAhead = 0): string {
  const today = todayKey();
  const dow = parseDateKey(today).getDay();
  return addDays(today, ((6 - dow + 7) % 7) + weeksAhead * 7);
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function NewCourseScreen() {
  const params = useLocalSearchParams<{ region?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const region = getRegion(String(params.region ?? ''));

  const [step, setStep] = useState<Step | 'result'>('focus');
  const [focus, setFocus] = useState<CourseFocus[]>(['food', 'sight']);
  const [nights, setNights] = useState<CourseNights>(1);
  const [startDate, setStartDate] = useState(nextSaturday());
  const [month, setMonth] = useState(() => {
    const d = parseDateKey(nextSaturday());
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [transport, setTransport] = useState<CourseTransport>('car');
  const [start, setStart] = useState<StartChoice>({ kind: 'hub' });
  const { state: location, locate } = useCurrentLocation();
  const [savedPlaces, setSavedPlaces] = useState<Place[] | null>(null);

  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swap, setSwap] = useState<{ day: number; stop: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 'start' || savedPlaces || !region) return;
    api
      .listPlaces({ regionCode: region.code })
      .then(setSavedPlaces)
      .catch(() => setSavedPlaces([]));
  }, [step, savedPlaces, region]);

  const startPoint = useMemo((): CoursePoint | undefined => {
    if (start.kind === 'place') return start.point;
    if (start.kind === 'here' && location.status === 'ready') return { name: '현재 위치', ...location.coords };
    return undefined;
  }, [start, location]);

  if (!region || !REGION_HUBS[region.code]) {
    return (
      <Screen title="여행 계획">
        <EmptyState icon="alert-circle-outline" title="지역을 먼저 골라 주세요" message="지도에서 지역을 누른 뒤 '여행계획 세우기'를 눌러 주세요." />
      </Screen>
    );
  }

  const stepIndex = step === 'result' ? STEPS.length : STEPS.indexOf(step);
  const lastDate = addDays(startDate, nights);
  const pastDate = startDate < todayKey();
  const waitingForLocation = start.kind === 'here' && location.status !== 'ready';
  const canNext =
    step === 'focus' ? focus.length > 0 : step === 'date' ? !pastDate : step === 'start' ? !waitingForLocation : true;

  const generate = async (seed = newSeed()) => {
    const req: CourseRequest = { regionCode: region.code, focus, nights, transport, startDate, start: startPoint, seed };
    setStep('result');
    setGenerating(true);
    setError(null);
    setSaveError(null);
    try {
      setDraft(await api.generateCourse(req));
    } catch (e) {
      setError(e instanceof Error ? e.message : '코스를 만들지 못했어요');
    } finally {
      setGenerating(false);
    }
  };

  const goNext = () => {
    if (step === 'result') return;
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
    else void generate();
  };
  const goBack = () => {
    if (step === 'result') setStep('start');
    else if (STEPS.indexOf(step) > 0) setStep(STEPS[STEPS.indexOf(step) - 1]);
    else router.back();
  };

  const pickReplacement = async (place: RecommendedPlace) => {
    if (!draft || !swap) return;
    const { day: d, stop: s } = swap;
    setSwap(null);
    const old = draft.days[d].stops[s];
    const category = slotCategory(old.slot, old.place.category);
    const alternatives = {
      ...draft.alternatives,
      [category]: [old.place, ...(draft.alternatives[category] ?? []).filter((p) => p.id !== place.id)],
    };
    // Show straight-line legs right away, then ask the server for road routes.
    const stops = draft.days[d].stops.map((stop, i) =>
      i === s ? { ...stop, place, leg: undefined } : i === s + 1 ? { ...stop, leg: undefined } : stop,
    );
    const day = estimateMissingLegs({ ...draft.days[d], stops }, transport);
    const days = draft.days.map((x, i) => (i === d ? day : x));
    setDraft({ ...draft, days, alternatives });
    try {
      const routed = await api.routeCourse(dayPoints(day), draft.request.transport);
      setDraft((cur) => {
        if (!cur || cur.days[d] !== day) return cur;
        const next = retimeDay({ ...day, stops: day.stops.map((stop, i) => ({ ...stop, leg: routed.legs[i] ?? stop.leg })) });
        return { ...cur, days: cur.days.map((x, i) => (i === d ? next : x)) };
      });
    } catch {
      // keep the estimate
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await api.saveCourse({
        request: draft.request,
        title: draft.title,
        days: draft.days,
        routeSource: draft.routeSource,
        sources: draft.sources,
      });
      router.replace(`/course/${saved.id}` as Href);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장하지 못했어요');
      setSaving(false);
    }
  };

  if (step === 'result') {
    if (generating || (!draft && !error)) {
      return (
        <Screen title={`${region.name} 여행 계획`} scroll={false}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.centerTitle}>우리 둘만의 코스를 짜는 중이에요</Text>
            <Text style={styles.centerSub}>
              장소를 고르고 동선을 계산하고 있어요.{'\n'}길게는 30초 정도 걸릴 수 있어요.
            </Text>
          </View>
        </Screen>
      );
    }
    if (error || !draft) {
      return (
        <Screen title={`${region.name} 여행 계획`}>
          <EmptyState icon="cloud-offline-outline" title="코스를 만들지 못했어요" message={error ?? undefined}>
            <View style={styles.errorActions}>
              <ActionButton icon="refresh" label="다시 시도" tone="primary" onPress={() => void generate()} />
              <ActionButton icon="arrow-back" label="질문으로 돌아가기" onPress={() => setStep('focus')} />
            </View>
          </EmptyState>
        </Screen>
      );
    }
    const focusLabels = COURSE_FOCUS_OPTIONS.filter((o) => draft.request.focus.includes(o.id)).map((o) => o.label);
    const stopCount = draft.days.reduce((n, d) => n + d.stops.length, 0);
    return (
      <Screen title={draft.title} scroll={false}>
        <CourseView
          days={draft.days}
          transport={draft.request.transport}
          onSwap={(day, stop) => setSwap({ day, stop })}
          bottomSpace={76}
          header={
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>
                {formatDateKey(draft.request.startDate)}
                {draft.request.nights ? ` ~ ${formatDateKey(addDays(draft.request.startDate, draft.request.nights))}` : ''}
              </Text>
              <Text style={styles.summarySub}>
                {focusLabels.join(' · ')} 중심 · {COURSE_TRANSPORT_OPTIONS.find((o) => o.id === draft.request.transport)?.label} · {stopCount}곳
              </Text>
              <Text style={styles.summaryHint}>
                동선: {ROUTE_SOURCE_LABELS[draft.routeSource]}
                {draft.routeSource === 'estimate' ? ' (예상)' : ''} · 마음에 안 드는 곳은 '바꾸기'를 눌러 보세요
              </Text>
              {draft.notices.map((n, i) => (
                <View key={`${n.code}-${i}`} style={styles.notice}>
                  <Ionicons name="information-circle" size={15} color={theme.colors.accentDark} />
                  <Text style={styles.noticeText}>{n.message}</Text>
                </View>
              ))}
            </View>
          }
          footer={
            <Pressable onPress={() => setStep('focus')} style={styles.restart}>
              <Ionicons name="options-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.restartText}>질문 다시 고르기</Text>
            </Pressable>
          }
        />
        <View style={[styles.bottomBar, glassSurface(), shadow('lg'), { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
          <View style={styles.bottomRow}>
            <ActionButton icon="shuffle" label="다시 추천" onPress={() => void generate()} style={styles.half} disabled={saving} />
            <ActionButton icon="checkmark-circle" label="이대로 할게요" tone="primary" onPress={() => void save()} loading={saving} style={styles.half} />
          </View>
        </View>
        <SwapSheet
          day={swap ? draft.days[swap.day] : undefined}
          index={swap?.stop ?? null}
          alternatives={draft.alternatives}
          onPick={(p) => void pickReplacement(p)}
          onClose={() => setSwap(null)}
        />
      </Screen>
    );
  }

  return (
    <Screen title={`${region.name} 여행 계획`} scroll={false}>
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressDot, i <= stepIndex && styles.progressDotOn]} />
        ))}
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        {step === 'focus' ? (
          <>
            <Question title="어떤 여행을 하고 싶어요?" sub="여러 개 고를 수 있어요. 고른 걸 중심으로 코스를 짤게요." />
            {COURSE_FOCUS_OPTIONS.map((o) => (
              <OptionCard
                key={o.id}
                icon={o.icon as IconName}
                label={o.label}
                description={o.description}
                active={focus.includes(o.id)}
                multi
                onPress={() => setFocus((cur) => (cur.includes(o.id) ? cur.filter((f) => f !== o.id) : [...cur, o.id]))}
              />
            ))}
          </>
        ) : null}

        {step === 'nights' ? (
          <>
            <Question title="며칠 동안 여행해요?" sub="1박 이상이면 숙소도 동선에 맞춰 골라 드려요." />
            {COURSE_NIGHT_OPTIONS.map((o) => (
              <OptionCard
                key={o.id}
                icon={o.id === 0 ? 'sunny-outline' : 'moon-outline'}
                label={o.label}
                description={o.description}
                active={nights === o.id}
                onPress={() => setNights(o.id)}
              />
            ))}
          </>
        ) : null}

        {step === 'date' ? (
          <>
            <Question
              title="언제 떠나요?"
              sub={focus.includes('event') ? '이 날짜에 열리는 축제 · 행사를 찾아 넣을게요.' : '날짜에 맞춰 일정표에 넣어 둘게요.'}
            />
            <View style={styles.quickRow}>
              {[
                { label: '오늘', date: todayKey() },
                { label: '이번 주말', date: nextSaturday() },
                { label: '다음 주말', date: nextSaturday(1) },
              ].map((q) => (
                <Pressable
                  key={q.label}
                  onPress={() => {
                    setStartDate(q.date);
                    const d = parseDateKey(q.date);
                    setMonth({ year: d.getFullYear(), month: d.getMonth() });
                  }}
                  style={[styles.quick, startDate === q.date && styles.quickOn]}
                >
                  <Text style={[styles.quickText, startDate === q.date && styles.quickTextOn]}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.calendar}>
              <CalendarMonth
                year={month.year}
                month={month.month}
                selected={startDate}
                onSelect={setStartDate}
                onChangeMonth={(year, m) => setMonth({ year, month: m })}
              />
            </View>
            <Text style={[styles.dateSummary, pastDate && styles.dateError]}>
              {pastDate
                ? '지난 날짜예요. 오늘 이후로 골라 주세요.'
                : nights
                  ? `${formatDateKey(startDate)} ~ ${formatDateKey(lastDate)}`
                  : `${formatDateKey(startDate)} 당일`}
            </Text>
          </>
        ) : null}

        {step === 'transport' ? (
          <>
            <Question title="어떻게 이동해요?" sub="대중교통이면 가까운 곳끼리 묶어서 덜 걷게 짤게요." />
            {COURSE_TRANSPORT_OPTIONS.map((o) => (
              <OptionCard
                key={o.id}
                icon={o.icon as IconName}
                label={o.label}
                description={o.description}
                active={transport === o.id}
                onPress={() => setTransport(o.id)}
              />
            ))}
          </>
        ) : null}

        {step === 'start' ? (
          <>
            <Question title="어디서 출발해요?" sub="첫 장소까지의 거리와 시간을 계산할 때 써요." />
            <OptionCard
              icon="business-outline"
              label={`${REGION_HUBS[region.code].name}에서 시작`}
              description="도착해서 바로 시작하는 일정이에요"
              active={start.kind === 'hub'}
              onPress={() => setStart({ kind: 'hub' })}
            />
            <OptionCard
              icon="locate"
              label="지금 내 위치에서 출발"
              description={
                start.kind !== 'here'
                  ? '집이나 숙소에서 바로 떠날 때'
                  : location.status === 'locating'
                    ? '위치를 찾는 중이에요…'
                    : location.status === 'ready'
                      ? '현재 위치를 찾았어요'
                      : location.status === 'denied'
                        ? '위치 권한이 없어요. 설정에서 허용해 주세요'
                        : location.status === 'outside'
                          ? '국내에서만 쓸 수 있어요'
                          : location.status === 'error'
                            ? location.message
                            : '위치를 확인할게요'
              }
              active={start.kind === 'here'}
              onPress={() => {
                setStart({ kind: 'here' });
                if (location.status !== 'ready' && location.status !== 'locating') void locate();
              }}
            />
            {savedPlaces && savedPlaces.length > 0 ? (
              <>
                <Text style={styles.subhead}>우리가 담은 {region.name} 장소에서</Text>
                <View style={styles.placeChips}>
                  {savedPlaces.slice(0, 12).map((p) => {
                    const active = start.kind === 'place' && start.point.name === p.name;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setStart({ kind: 'place', point: { name: p.name, lat: p.lat, lng: p.lng } })}
                        style={[styles.quick, active && styles.quickOn]}
                      >
                        <Text style={[styles.quickText, active && styles.quickTextOn]} numberOfLines={1}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <View style={[styles.bottomBar, glassSurface(), shadow('lg'), { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.bottomRow}>
          <ActionButton icon="arrow-back" label={stepIndex === 0 ? '닫기' : '이전'} onPress={goBack} style={styles.half} />
          <ActionButton
            icon={step === 'start' ? 'sparkles' : 'arrow-forward'}
            label={step === 'start' ? '코스 만들기' : '다음'}
            tone="primary"
            onPress={goNext}
            disabled={!canNext}
            style={styles.half}
          />
        </View>
      </View>
    </Screen>
  );
}

function Question({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionTitle}>{title}</Text>
      <Text style={styles.questionSub}>{sub}</Text>
    </View>
  );
}

function OptionCard({
  icon,
  label,
  description,
  active,
  multi,
  onPress,
}: {
  icon: IconName;
  label: string;
  description: string;
  active: boolean;
  multi?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, active && styles.optionOn, pressed && styles.pressed]}>
      <View style={[styles.optionIcon, active && styles.optionIconOn]}>
        <Ionicons name={icon} size={20} color={active ? '#fff' : theme.colors.primary} />
      </View>
      <View style={styles.optionBody}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
      <Ionicons
        name={multi ? (active ? 'checkbox' : 'square-outline') : active ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={active ? theme.colors.primary : theme.colors.textSubtle}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.tint.medium },
  progressDotOn: { backgroundColor: theme.colors.primary },
  stepContent: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: 120, gap: 10 },
  question: { gap: 6, marginBottom: 8 },
  questionTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  questionSub: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  option: { ...cardSurface(), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5 },
  optionOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.tint.soft },
  pressed: { opacity: 0.85 },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  optionIconOn: { backgroundColor: theme.colors.primary },
  optionBody: { flex: 1, gap: 2 },
  optionLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  optionDesc: { color: theme.colors.textMuted, fontSize: 13 },
  quickRow: { flexDirection: 'row', gap: 6 },
  quick: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
    maxWidth: '100%',
  },
  quickOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  quickText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  quickTextOn: { color: '#fff' },
  calendar: { ...cardSurface(), padding: 12 },
  dateSummary: { color: theme.colors.primaryDark, fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  dateError: { color: theme.colors.error },
  subhead: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 8 },
  placeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 10,
    gap: 6,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  bottomRow: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  saveError: { color: theme.colors.error, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: theme.spacing.xl },
  centerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  centerSub: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  errorActions: { gap: 8, alignSelf: 'stretch', marginTop: 8 },
  summary: { gap: 4, marginBottom: theme.spacing.md },
  summaryTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  summarySub: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  summaryHint: { color: theme.colors.textSubtle, fontSize: 12 },
  notice: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    marginTop: 6,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentSoft,
  },
  noticeText: { flex: 1, color: theme.colors.text, fontSize: 12, lineHeight: 17 },
  restart: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  restartText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
});
