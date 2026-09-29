import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPlaceCategory, type PlaceCategory, type PlaceStatus } from '@tingting/shared';
import { cardSurface, shadow } from '@/lib/ui';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, message, children }: { icon: IconName; title: string; message?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {children}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

export function CategoryBadge({ category, small }: { category: PlaceCategory; small?: boolean }) {
  const info = getPlaceCategory(category);
  return (
    <View style={[styles.badge, { backgroundColor: `${info.color}1F` }, small && styles.badgeSmall]}>
      <Ionicons name={info.icon as IconName} size={small ? 10 : 12} color={info.color} />
      <Text style={[styles.badgeText, { color: info.color }, small && styles.badgeTextSmall]}>{info.label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: PlaceStatus }) {
  const visited = status === 'visited';
  return (
    <View style={[styles.badge, { backgroundColor: visited ? theme.colors.successSoft : theme.colors.tint.light }]}>
      <Ionicons name={visited ? 'checkmark-circle' : 'heart'} size={12} color={visited ? theme.colors.success : theme.colors.primary} />
      <Text style={[styles.badgeText, { color: visited ? theme.colors.success : theme.colors.primary }]}>
        {visited ? '다녀왔어요' : '가고 싶어요'}
      </Text>
    </View>
  );
}

export type SegmentOption<T extends string> = { id: T; label: string; icon?: IconName; color?: string };

export function Segment<T extends string>({
  options,
  value,
  onChange,
  scroll,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scroll?: boolean;
}) {
  return (
    <View style={[styles.segment, scroll && styles.segmentWrap]}>
      {options.map((option) => {
        const active = option.id === value;
        const color = option.color ?? theme.colors.primary;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[styles.segmentItem, active && { backgroundColor: color, borderColor: color }]}
          >
            {option.icon ? <Ionicons name={option.icon} size={13} color={active ? '#fff' : color} /> : null}
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress: () => void; color?: string }) {
  const c = color ?? theme.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: `${c}22`, borderColor: c }]}
    >
      <Text style={[styles.chipText, active && { color: c, fontWeight: '800' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textSubtle}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, style]}
      />
    </View>
  );
}

export function Fab({ icon = 'add', label, onPress }: { icon?: IconName; label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.fab, shadow('lg')]} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color="#fff" />
      {label ? <Text style={styles.fabText}>{label}</Text> : null}
    </Pressable>
  );
}

export function ActionButton({
  icon,
  label,
  onPress,
  tone = 'soft',
  disabled,
  loading,
  style,
}: {
  icon?: IconName;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'soft' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = tone === 'primary';
  const danger = tone === 'danger';
  const fg = primary ? '#fff' : danger ? theme.colors.error : theme.colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        danger && styles.actionDanger,
        (disabled || loading) && styles.actionDisabled,
        pressed && styles.actionPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
          <Text style={[styles.actionText, { color: fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function StarRating({ value, onChange, size = 22 }: { value: number; onChange?: (value: number) => void; size?: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={onChange ? () => onChange(n) : undefined} disabled={!onChange} hitSlop={4}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={theme.colors.star} />
        </Pressable>
      ))}
    </View>
  );
}

export const TAB_BOTTOM_SPACE = MAIN_TAB_BAR_HEIGHT + theme.spacing.xl;

const styles = StyleSheet.create({
  card: { ...cardSurface(), padding: theme.spacing.md },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  sectionAction: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyMessage: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  loading: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextSmall: { fontSize: 10 },
  segment: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentWrap: { flexWrap: 'wrap' },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
  },
  segmentText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: '#fff', fontWeight: '800' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chipText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  field: { gap: 6 },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: MAIN_TAB_BAR_HEIGHT + theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    zIndex: 20,
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tint.light,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  actionPrimary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  actionDanger: { backgroundColor: 'rgba(217,91,91,0.08)', borderColor: 'rgba(217,91,91,0.25)' },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.8 },
  actionText: { fontSize: 14, fontWeight: '800' },
  stars: { flexDirection: 'row', gap: 4 },
});
