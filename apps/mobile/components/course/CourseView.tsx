import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseClock, type CourseDay, type CourseTransport } from '@tingting/shared';
import { CourseTimeline } from '@/components/course/CourseTimeline';
import { RouteMap } from '@/components/course/RouteMap';
import { formatDateKey, todayKey } from '@/lib/dates';
import { openDirections } from '@/lib/place-navigation';
import { routeMapData } from '@/lib/route-map';
import { glassSurface, shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

type Props = {
  days: CourseDay[];
  transport: CourseTransport;
  header?: ReactNode;
  footer?: ReactNode;
  /** Draft mode: replace a stop */
  onSwap?: (dayIndex: number, stopIndex: number) => void;
  /** Saved mode: expandable stop details and a "next stop" navigation bar */
  detailed?: boolean;
  /** Room for a bar the parent floats over the bottom */
  bottomSpace?: number;
};

/** The stop that is next right now, on the course day that is today. */
function upcomingStop(days: CourseDay[]): { day: number; stop: number } {
  const today = todayKey();
  const d = days.findIndex((day) => day.date === today);
  if (d < 0) return { day: 0, stop: 0 };
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const s = days[d].stops.findIndex((stop) => parseClock(stop.arrive) + stop.dwellMin > minutes);
  return { day: d, stop: s < 0 ? Math.max(0, days[d].stops.length - 1) : s };
}

export function CourseView({ days, transport, header, footer, onSwap, detailed, bottomSpace = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const initial = useRef(detailed ? upcomingStop(days) : { day: 0, stop: -1 });
  const [dayIndex, setDayIndex] = useState(initial.current.day);
  const [selected, setSelected] = useState<number | null>(initial.current.stop >= 0 ? initial.current.stop : null);
  const [bigMap, setBigMap] = useState(false);
  const day = days[Math.min(dayIndex, days.length - 1)];

  useEffect(() => {
    if (dayIndex >= days.length) setDayIndex(0);
  }, [dayIndex, days.length]);

  const mapData = useMemo(() => routeMapData(day, selected), [day, selected]);
  const changeDay = (i: number) => {
    setDayIndex(i);
    setSelected(detailed ? 0 : null);
  };
  const select = (i: number) => setSelected((cur) => (cur === i && !detailed ? null : i));

  const navStop = detailed && day && selected !== null ? day.stops[selected] : undefined;
  const navFrom = day && selected !== null ? (selected > 0 ? day.stops[selected - 1].place : day.start) : undefined;

  return (
    <View style={styles.flex}>
      {days.length > 1 ? (
        <View style={styles.days}>
          {days.map((d, i) => (
            <Pressable key={d.day} onPress={() => changeDay(i)} style={[styles.dayChip, i === dayIndex && styles.dayChipActive]}>
              <Text style={[styles.dayLabel, i === dayIndex && styles.dayLabelActive]}>{d.day}일차</Text>
              <Text style={[styles.dayDate, i === dayIndex && styles.dayLabelActive]}>{formatDateKey(d.date)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.mapWrap}>
        <RouteMap data={mapData} height={bigMap ? 400 : 230} onSelectStop={select} />
        <Pressable onPress={() => setBigMap((v) => !v)} style={[styles.mapToggle, shadow('sm')]} hitSlop={6}>
          <Ionicons name={bigMap ? 'contract' : 'expand'} size={16} color={theme.colors.primaryDark} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + (navStop ? 96 : 24) + bottomSpace }]}
        showsVerticalScrollIndicator={false}
      >
        {header}
        {day ? (
          <CourseTimeline
            day={day}
            transport={transport}
            selected={selected}
            onSelect={select}
            onSwap={onSwap ? (i) => onSwap(dayIndex, i) : undefined}
            detailed={detailed}
          />
        ) : null}
        {footer}
      </ScrollView>
      {navStop && day && selected !== null ? (
        <View style={[styles.navBar, glassSurface(), shadow('lg'), { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable onPress={() => setSelected(Math.max(0, selected - 1))} disabled={selected === 0} hitSlop={8} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color={selected === 0 ? theme.colors.textSubtle : theme.colors.primaryDark} />
          </Pressable>
          <View style={styles.navBody}>
            <Text style={styles.navHint}>{selected + 1}번째 장소로 길안내</Text>
            <Text style={styles.navName} numberOfLines={1}>
              {navStop.place.name}
            </Text>
          </View>
          <Pressable
            onPress={() => void openDirections(navStop.place, 'kakao', { from: navFrom, transport })}
            style={[styles.navBtn, { backgroundColor: '#FEE500' }]}
          >
            <Text style={[styles.navBtnText, { color: '#3C1E1E' }]}>카카오</Text>
          </Pressable>
          <Pressable
            onPress={() => void openDirections(navStop.place, 'tmap', { from: navFrom, transport })}
            style={[styles.navBtn, { backgroundColor: '#E5262A' }]}
          >
            <Text style={[styles.navBtnText, { color: '#fff' }]}>T맵</Text>
          </Pressable>
          <Pressable
            onPress={() => setSelected(Math.min(day.stops.length - 1, selected + 1))}
            disabled={selected >= day.stops.length - 1}
            hitSlop={8}
            style={styles.navArrow}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={selected >= day.stops.length - 1 ? theme.colors.textSubtle : theme.colors.primaryDark}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  days: { flexDirection: 'row', gap: 6, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: 8 },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
  },
  dayChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  dayDate: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  dayLabelActive: { color: '#fff' },
  mapWrap: { paddingHorizontal: theme.spacing.lg, paddingTop: 4 },
  mapToggle: {
    position: 'absolute',
    right: theme.spacing.lg + 10,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.mapControlBg,
  },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, gap: 0 },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  navArrow: { padding: 4 },
  navBody: { flex: 1, gap: 1 },
  navHint: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  navName: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  navBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: theme.radius.full },
  navBtnText: { fontSize: 13, fontWeight: '900' },
});
