import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPlaceCategory, type Place, type TripPlan } from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import { CalendarMonth, type CalendarMarks } from '@/components/CalendarMonth';
import { DateField } from '@/components/DateField';
import { PlacePickerModal } from '@/components/PlacePickerModal';
import { ActionButton, Card, Fab, Field, SectionTitle } from '@/components/ui';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { addDays, dDayLabel, formatDateKey, parseDateKey, todayKey } from '@/lib/dates';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

const EVENT_COLOR = getPlaceCategory('event').color;

type Draft = { id?: string; date: string | null; title: string; memo: string; place: { id: string; name: string } | null };

export default function PlansScreen() {
  const router = useRouter();
  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const initial = parseDateKey(today);
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, setData, refreshing, refresh } = useFocusLoad(async () => {
    const [plans, events] = await Promise.all([api.listPlans(), api.listPlaces({ category: 'event' })]);
    return { plans, events: events.filter((e) => e.eventStart) };
  });
  const plans = data?.plans ?? [];
  const events = data?.events ?? [];

  const marks = useMemo(() => {
    const m: CalendarMarks = {};
    const push = (key: string, color: string) => {
      const list = (m[key] ??= []);
      if (!list.includes(color)) list.push(color);
    };
    for (const plan of plans) push(plan.date, plan.done ? theme.colors.textSubtle : theme.colors.primary);
    for (const event of events) {
      let key = event.eventStart!;
      const end = event.eventEnd ?? key;
      for (let i = 0; key <= end && i < 62; i += 1) {
        push(key, EVENT_COLOR);
        key = addDays(key, 1);
      }
    }
    return m;
  }, [plans, events]);

  const dayPlans = plans.filter((p) => p.date === selected);
  const dayEvents = events.filter((e) => e.eventStart! <= selected && (e.eventEnd ?? e.eventStart!) >= selected);
  const upcoming = plans.filter((p) => p.date >= today && !p.done && p.date !== selected).slice(0, 10);

  const openNew = () => setDraft({ date: selected, title: '', memo: '', place: null });
  const openEdit = (plan: TripPlan) =>
    setDraft({
      id: plan.id,
      date: plan.date,
      title: plan.title,
      memo: plan.memo ?? '',
      place: plan.placeId ? { id: plan.placeId, name: plan.placeName ?? '연결된 장소' } : null,
    });

  const replacePlan = (plan: TripPlan) => {
    if (!data) return;
    const others = data.plans.filter((p) => p.id !== plan.id);
    const next = [...others, plan].sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
    setData({ ...data, plans: next });
  };

  const toggleDone = async (plan: TripPlan) => {
    replacePlan({ ...plan, done: !plan.done });
    try {
      replacePlan(await api.updatePlan(plan.id, { done: !plan.done }));
    } catch (e) {
      replacePlan(plan);
      Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해 주세요');
    }
  };

  const save = async () => {
    if (!draft?.date || !draft.title.trim()) {
      Alert.alert('알림', '날짜와 제목을 입력해 주세요');
      return;
    }
    setSaving(true);
    try {
      const input = { date: draft.date, title: draft.title.trim(), memo: draft.memo.trim() || undefined, placeId: draft.place?.id };
      const plan = draft.id
        ? await api.updatePlan(draft.id, { ...input, memo: input.memo ?? '', placeId: input.placeId ?? '' })
        : await api.createPlan(input);
      replacePlan(plan);
      setSelected(plan.date);
      setDraft(null);
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '다시 시도해 주세요');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!draft?.id || !data) return;
    const id = draft.id;
    Alert.alert('일정 삭제', '이 일정을 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deletePlan(id);
            setData({ ...data, plans: data.plans.filter((p) => p.id !== id) });
            setDraft(null);
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해 주세요');
          }
        },
      },
    ]);
  };

  return (
    <Screen tab title="일정" refreshing={refreshing} onRefresh={refresh} overlay={<Fab label="일정" onPress={openNew} />}>
      <Card>
        <CalendarMonth
          year={cursor.year}
          month={cursor.month}
          selected={selected}
          marks={marks}
          onSelect={setSelected}
          onChangeMonth={(year, month) => setCursor({ year, month })}
        />
        <View style={styles.legend}>
          <Legend color={theme.colors.primary} label="우리 일정" />
          <Legend color={EVENT_COLOR} label="담아 둔 행사" />
        </View>
      </Card>

      <SectionTitle title={`${formatDateKey(selected)} · ${dDayLabel(selected)}`} />
      {dayPlans.length === 0 && dayEvents.length === 0 ? (
        <Card>
          <Text style={styles.muted}>이날은 비어 있어요. 오른쪽 아래 버튼으로 일정을 추가하세요.</Text>
        </Card>
      ) : null}
      {dayPlans.map((plan) => (
        <PlanRow
          key={plan.id}
          plan={plan}
          onToggle={() => toggleDone(plan)}
          onPress={() => (plan.courseId ? router.push(`/course/${plan.courseId}` as Href) : openEdit(plan))}
          onOpenPlace={(id) => router.push(`/place/${id}` as Href)}
        />
      ))}
      {dayEvents.map((event) => (
        <EventRow key={event.id} event={event} onPress={() => router.push(`/place/${event.id}` as Href)} />
      ))}

      {upcoming.length > 0 ? (
        <>
          <SectionTitle title="다가오는 일정" />
          {upcoming.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              showDate
              onToggle={() => toggleDone(plan)}
              onPress={() => {
                setSelected(plan.date);
                const d = parseDateKey(plan.date);
                setCursor({ year: d.getFullYear(), month: d.getMonth() });
              }}
              onOpenPlace={(id) => router.push(`/place/${id}` as Href)}
            />
          ))}
        </>
      ) : null}

      <PlanSheet
        draft={draft}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onPickPlace={() => setPickerOpen(true)}
        onSave={save}
        onDelete={remove}
        saving={saving}
      />
      <PlacePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={draft?.place?.id}
        onSelect={(place: Place | null) => {
          if (!draft) return;
          setDraft({
            ...draft,
            place: place ? { id: place.id, name: place.name } : null,
            title: draft.title || (place?.name ?? ''),
          });
        }}
      />
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function PlanRow({
  plan,
  showDate,
  onToggle,
  onPress,
  onOpenPlace,
}: {
  plan: TripPlan;
  showDate?: boolean;
  onToggle: () => void;
  onPress: () => void;
  onOpenPlace: (placeId: string) => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Pressable onPress={onToggle} hitSlop={8}>
        <Ionicons
          name={plan.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={plan.done ? theme.colors.success : theme.colors.primaryLight}
        />
      </Pressable>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, plan.done && styles.done]} numberOfLines={1}>
          {plan.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {[showDate ? `${formatDateKey(plan.date)} · ${dDayLabel(plan.date)}` : null, plan.memo].filter(Boolean).join(' · ') || ' '}
        </Text>
      </View>
      {plan.placeId ? (
        <Pressable onPress={() => onOpenPlace(plan.placeId!)} style={styles.placeTag} hitSlop={6}>
          <Ionicons name="location" size={12} color={theme.colors.primaryDark} />
          <Text style={styles.placeTagText} numberOfLines={1}>
            {plan.placeName ?? '장소'}
          </Text>
        </Pressable>
      ) : null}
      {plan.courseId ? (
        <View style={styles.placeTag}>
          <Ionicons name="trail-sign" size={12} color={theme.colors.primaryDark} />
          <Text style={styles.placeTagText}>코스</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function EventRow({ event, onPress }: { event: Place; onPress: () => void }) {
  return (
    <Pressable style={[styles.row, styles.eventRow]} onPress={onPress}>
      <Ionicons name="calendar" size={22} color={EVENT_COLOR} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={styles.rowSub}>
          행사 · {event.eventStart}
          {event.eventEnd && event.eventEnd !== event.eventStart ? ` ~ ${event.eventEnd}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

function PlanSheet({
  draft,
  onChange,
  onClose,
  onPickPlace,
  onSave,
  onDelete,
  saving,
}: {
  draft: Draft | null;
  onChange: (draft: Draft) => void;
  onClose: () => void;
  onPickPlace: () => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const local = draft;
  const update = (patch: Partial<Draft>) => {
    if (local) onChange({ ...local, ...patch });
  };
  return (
    <AppModal visible={draft !== null} onRequestClose={onClose}>
      <SheetHeader title={draft?.id ? '일정 수정' : '새 일정'} onClose={onClose} />
      {local ? (
        <View style={styles.sheetBody}>
          <DateField label="날짜" value={local.date} onChange={(date) => update({ date })} />
          <Field label="제목" value={local.title} onChangeText={(title) => update({ title })} placeholder="예: 부산 1일차" />
          <Pressable style={styles.placePicker} onPress={onPickPlace}>
            <Ionicons name="location-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.placePickerText, !local.place && styles.mutedText]}>{local.place?.name ?? '장소 연결 (선택)'}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSubtle} />
          </Pressable>
          <Field label="메모" value={local.memo} onChangeText={(memo) => update({ memo })} placeholder="예약 번호, 준비물…" multiline />
          <ActionButton label="저장" icon="checkmark" tone="primary" loading={saving} onPress={onSave} />
          {draft?.id ? <ActionButton label="삭제" icon="trash-outline" tone="danger" onPress={onDelete} /> : null}
        </View>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 14, marginTop: 6, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  muted: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  mutedText: { color: theme.colors.textSubtle },
  row: { ...cardSurface(), flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 },
  eventRow: { borderLeftWidth: 3, borderLeftColor: EVENT_COLOR },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  done: { textDecorationLine: 'line-through', color: theme.colors.textSubtle },
  rowSub: { color: theme.colors.textMuted, fontSize: 12 },
  placeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: 110,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.light,
  },
  placeTagText: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '800', flexShrink: 1 },
  sheetBody: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: 12 },
  placePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  placePickerText: { flex: 1, color: theme.colors.text, fontSize: 15 },
});
