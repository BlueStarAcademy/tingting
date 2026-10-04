import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COURSE_SLOT_LABELS,
  dayTotals,
  formatClock,
  formatMeters,
  formatMinutes,
  isWalkingLeg,
  parseClock,
  type CourseDay,
  type CoursePoint,
  type CourseStop,
  type CourseTransport,
  type PlaceExtraInfo,
} from '@tingting/shared';
import { SLOT_STYLE } from '@/components/course/course-style';
import type { IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { openDirections, openPlaceInMap } from '@/lib/place-navigation';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

type Props = {
  day: CourseDay;
  transport: CourseTransport;
  selected: number | null;
  onSelect: (index: number) => void;
  /** Draft mode: offer replacing a stop */
  onSwap?: (index: number) => void;
  /** Saved mode: the selected stop expands with photo, hours and links */
  detailed?: boolean;
};

export function CourseTimeline({ day, transport, selected, onSelect, onSwap, detailed }: Props) {
  const totals = dayTotals(day);
  const points: CoursePoint[] = [day.start, ...day.stops.map((s) => s.place)];
  return (
    <View>
      <View style={styles.startRow}>
        <View style={styles.startDot}>
          <Ionicons name="flag" size={12} color="#fff" />
        </View>
        <Text style={styles.startText} numberOfLines={1}>
          <Text style={styles.time}>{day.startTime}</Text> 출발 · {day.start.name}
        </Text>
      </View>
      {day.stops.map((stop, i) => (
        <View key={stop.key}>
          <LegRow stop={stop} transport={transport} />
          <StopCard
            stop={stop}
            index={i}
            from={points[i]}
            transport={transport}
            active={selected === i}
            detailed={detailed && selected === i}
            onPress={() => onSelect(i)}
            onSwap={onSwap ? () => onSwap(i) : undefined}
          />
        </View>
      ))}
      {day.stops.length ? (
        <View style={styles.totals}>
          <Ionicons name="analytics-outline" size={15} color={theme.colors.textMuted} />
          <Text style={styles.totalsText}>
            하루 이동 {formatMeters(totals.distanceM)} · {formatMinutes(totals.moveMin)}
            {totals.estimated ? ' (일부 예상치)' : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function LegRow({ stop, transport }: { stop: CourseStop; transport: CourseTransport }) {
  const leg = stop.leg;
  if (!leg) return <View style={styles.legLine} />;
  const walking = isWalkingLeg(leg, transport);
  const icon: IconName = walking ? 'walk' : transport === 'transit' ? 'bus' : 'car';
  const estimated = leg.source === 'estimate';
  return (
    <View style={styles.leg}>
      <View style={styles.legRail} />
      <Ionicons name={icon} size={13} color={theme.colors.textMuted} />
      <Text style={styles.legText}>
        {walking ? '도보 ' : ''}
        {formatMinutes(leg.durationMin)} · {formatMeters(leg.distanceM)}
      </Text>
      {estimated ? (
        <View style={styles.estimateTag}>
          <Text style={styles.estimateText}>예상</Text>
        </View>
      ) : null}
    </View>
  );
}

function StopCard({
  stop,
  index,
  from,
  transport,
  active,
  detailed,
  onPress,
  onSwap,
}: {
  stop: CourseStop;
  index: number;
  from: CoursePoint;
  transport: CourseTransport;
  active: boolean;
  detailed?: boolean;
  onPress: () => void;
  onSwap?: () => void;
}) {
  const { place, slot } = stop;
  const style = SLOT_STYLE[slot];
  const leaveAt = slot === 'stay' ? null : formatClock(parseClock(stop.arrive) + stop.dwellMin);
  return (
    <Pressable onPress={onPress} style={[styles.card, active && { borderColor: style.color }]}>
      <View style={styles.cardTop}>
        <View style={styles.timeCol}>
          <Text style={styles.time}>{stop.arrive}</Text>
          {leaveAt ? <Text style={styles.leave}>~{leaveAt}</Text> : null}
        </View>
        <View style={[styles.num, { backgroundColor: style.color }]}>
          <Text style={styles.numText}>{index + 1}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.slotRow}>
            <Ionicons name={style.icon} size={12} color={style.color} />
            <Text style={[styles.slot, { color: style.color }]}>{COURSE_SLOT_LABELS[slot]}</Text>
            {place.categoryLabel ? <Text style={styles.category}>· {place.categoryLabel}</Text> : null}
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {place.name}
          </Text>
          {place.address ? (
            <Text style={styles.address} numberOfLines={detailed ? 3 : 1}>
              {place.address}
            </Text>
          ) : null}
          {place.eventStart ? (
            <Text style={styles.address}>
              행사 기간 {place.eventStart}
              {place.eventEnd && place.eventEnd !== place.eventStart ? ` ~ ${place.eventEnd}` : ''}
            </Text>
          ) : null}
        </View>
        {place.thumbnailUrl || place.imageUrl ? (
          <Image source={{ uri: place.thumbnailUrl ?? place.imageUrl }} style={styles.thumb} />
        ) : null}
      </View>
      {detailed ? <StopDetails stop={stop} /> : null}
      <View style={styles.actions}>
        {onSwap ? <SmallButton icon="swap-horizontal" label="바꾸기" onPress={onSwap} /> : null}
        <SmallButton icon="navigate" label="카카오" color="#3C1E1E" bg="#FEE500" onPress={() => void openDirections(place, 'kakao', { from, transport })} />
        <SmallButton icon="navigate" label="T맵" color="#fff" bg="#E5262A" onPress={() => void openDirections(place, 'tmap', { from, transport })} />
      </View>
    </Pressable>
  );
}

function StopDetails({ stop }: { stop: CourseStop }) {
  const { place } = stop;
  const [info, setInfo] = useState<PlaceExtraInfo | null>(null);
  useEffect(() => {
    if (!place.id.startsWith('tour:')) return;
    let alive = true;
    api
      .getPlaceInfo(place.id, place.tourContentTypeId)
      .then((r) => alive && setInfo(r))
      .catch(() => alive && setInfo({}));
    return () => {
      alive = false;
    };
  }, [place.id, place.tourContentTypeId]);

  const phone = info?.phone ?? place.phone;
  const hours = info?.hours ?? place.openingHours;
  const rows: { icon: IconName; label: string; value: string; onPress?: () => void }[] = [];
  if (phone) rows.push({ icon: 'call', label: '전화', value: phone, onPress: () => void Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`) });
  if (hours) rows.push({ icon: 'time', label: stop.slot === 'stay' ? '이용' : '영업', value: hours });
  if (info?.checkIn || info?.checkOut) rows.push({ icon: 'bed', label: '체크인', value: [info.checkIn, info.checkOut && `체크아웃 ${info.checkOut}`].filter(Boolean).join(' · ') });
  if (info?.restDays) rows.push({ icon: 'close-circle', label: '휴무', value: info.restDays });
  if (info?.fee) rows.push({ icon: 'pricetag', label: '요금', value: info.fee });
  if (info?.menu) rows.push({ icon: 'restaurant', label: '메뉴', value: info.menu });
  if (info?.parking) rows.push({ icon: 'car', label: '주차', value: info.parking });
  const link = info?.homepage ?? place.url;

  return (
    <View style={styles.details}>
      {place.imageUrl ? <Image source={{ uri: place.imageUrl }} style={styles.photo} resizeMode="cover" /> : null}
      <Text style={styles.planned}>
        {stop.slot === 'stay' ? `${stop.arrive} 체크인 예정` : `${stop.arrive} 도착 · ${formatMinutes(stop.dwellMin)} 머무를 예정`}
      </Text>
      {rows.map((row) => (
        <Pressable key={row.label} onPress={row.onPress} disabled={!row.onPress} style={styles.infoRow}>
          <Ionicons name={row.icon} size={14} color={theme.colors.primaryDark} />
          <Text style={styles.infoLabel}>{row.label}</Text>
          <Text style={[styles.infoValue, row.onPress && styles.link]}>{row.value}</Text>
        </Pressable>
      ))}
      {info?.overview ? (
        <Text style={styles.overview} numberOfLines={6}>
          {info.overview}
        </Text>
      ) : null}
      {place.id.startsWith('tour:') && info === null ? <Text style={styles.muted}>상세 정보를 불러오는 중…</Text> : null}
      <View style={styles.linkRow}>
        <SmallButton
          icon="map"
          label="카카오맵에서 보기"
          onPress={() => void openPlaceInMap({ name: place.name, lat: place.lat, lng: place.lng, kakaoPlaceId: place.kakaoPlaceId }, 'kakao')}
        />
        {link ? <SmallButton icon="open-outline" label="상세 페이지" onPress={() => void Linking.openURL(link)} /> : null}
      </View>
    </View>
  );
}

function SmallButton({ icon, label, onPress, color, bg }: { icon: IconName; label: string; onPress: () => void; color?: string; bg?: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.small, bg ? { backgroundColor: bg, borderColor: bg } : null, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={13} color={color ?? theme.colors.primaryDark} />
      <Text style={[styles.smallText, { color: color ?? theme.colors.primaryDark }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  startRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  startDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: 50,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { flex: 1, color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  legLine: { height: 10 },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 56, paddingVertical: 7 },
  legRail: { position: 'absolute', left: 60, top: 0, bottom: 0, width: 2, backgroundColor: theme.colors.tint.border },
  legText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', marginLeft: 8 },
  estimateTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: theme.colors.accentSoft },
  estimateText: { color: theme.colors.accentDark, fontSize: 10, fontWeight: '800' },
  card: { ...cardSurface(), padding: 12, gap: 10, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  timeCol: { width: 42, alignItems: 'flex-start', paddingTop: 3 },
  time: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  leave: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '600' },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  body: { flex: 1, gap: 2 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slot: { fontSize: 11, fontWeight: '800' },
  category: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  address: { color: theme.colors.textMuted, fontSize: 12 },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: theme.colors.surfaceLight },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' },
  small: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.light,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  smallText: { fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  details: { gap: 8, paddingTop: 2 },
  photo: { width: '100%', height: 170, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceLight },
  planned: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  infoLabel: { width: 42, color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 1 },
  infoValue: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 18 },
  link: { color: theme.colors.primary, textDecorationLine: 'underline' },
  overview: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  muted: { color: theme.colors.textSubtle, fontSize: 12 },
  linkRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  totals: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  totalsText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
});
