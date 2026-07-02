import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

const GOAL_STEPS = 5000;
const MILESTONES = [1000, 2000, 3000, 4000, 5000] as const;

const STROKE = 20;
const LABEL_PAD = 40;
const RING_DIAMETER = 228;
const CANVAS = RING_DIAMETER + LABEL_PAD * 2;
const CX = CANVAS / 2;
const CY = CANVAS / 2;
const R = RING_DIAMETER / 2 - STROKE / 2;
const CIRC = 2 * Math.PI * R;
const LABEL_R = R + STROKE / 2 + 22;

const TRACK_COLOR = 'rgba(51,77,110,0.22)';
const TRACK_INNER = 'rgba(255,255,255,0.65)';

const LABEL_W = 52;
const LABEL_H = 24;

function milestoneAngle(steps: number): number {
  return (steps / GOAL_STEPS) * 360 - 90;
}

function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function labelPosition(x: number, y: number): ViewStyle {
  let left = x - LABEL_W / 2;
  let top = y - LABEL_H / 2;

  left = Math.max(2, Math.min(left, CANVAS - LABEL_W - 2));
  top = Math.max(2, Math.min(top, CANVAS - LABEL_H - 2));

  return { left, top, width: LABEL_W };
}

interface Props {
  steps: number;
  stepsLabel: string;
}

export function StepsProgressRing({ steps, stepsLabel }: Props) {
  const progress = Math.min(steps / GOAL_STEPS, 1);
  const dashOffset = CIRC * (1 - progress);
  const percent = Math.round(progress * 100);

  return (
    <View style={[styles.wrap, cardSurface()]}>
      <View style={styles.canvas}>
        <Svg width={CANVAS} height={CANVAS} style={styles.svg}>
          <Defs>
            <LinearGradient id="stepsRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryDark} />
              <Stop offset="55%" stopColor={theme.colors.primary} />
              <Stop offset="100%" stopColor={theme.colors.teal} />
            </LinearGradient>
          </Defs>

          <Circle cx={CX} cy={CY} r={R + 1} stroke="rgba(51,77,110,0.08)" strokeWidth={STROKE + 4} fill="none" />
          <Circle cx={CX} cy={CY} r={R} stroke={TRACK_COLOR} strokeWidth={STROKE} fill="none" />
          <Circle cx={CX} cy={CY} r={R - STROKE / 2 + 1} stroke={TRACK_INNER} strokeWidth={1.5} fill="none" />

          {progress > 0 ? (
            <G transform={`rotate(-90, ${CX}, ${CY})`}>
              <Circle
                cx={CX}
                cy={CY}
                r={R}
                stroke={theme.colors.primary}
                strokeWidth={STROKE + 8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={dashOffset}
                opacity={0.22}
              />
              <Circle
                cx={CX}
                cy={CY}
                r={R}
                stroke="url(#stepsRingGrad)"
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={dashOffset}
              />
            </G>
          ) : null}

          {MILESTONES.map((m) => {
            const reached = steps >= m;
            const dot = polar(R, milestoneAngle(m));
            return (
              <Circle
                key={m}
                cx={dot.x}
                cy={dot.y}
                r={reached ? 6.5 : 5}
                fill={reached ? theme.colors.star : theme.colors.surfaceElevated}
                stroke={reached ? theme.colors.accentDark : theme.colors.primaryDark}
                strokeWidth={2}
              />
            );
          })}
        </Svg>

        {MILESTONES.map((m) => {
          const reached = steps >= m;
          const label = polar(LABEL_R, milestoneAngle(m));
          const pos = labelPosition(label.x, label.y);

          return (
            <View key={`label-${m}`} style={[styles.labelWrap, pos]} pointerEvents="none">
              <View style={[styles.labelPill, reached && styles.labelPillReached]}>
                <Text style={[styles.labelText, reached && styles.labelTextReached]} numberOfLines={1}>
                  {m.toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={styles.center} pointerEvents="none">
          <Text style={styles.steps}>{steps.toLocaleString()}</Text>
          <Text style={styles.unit}>{stepsLabel}</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goal}>/ {GOAL_STEPS.toLocaleString()}</Text>
            <View style={styles.percentPill}>
              <Text style={styles.percentText}>{percent}%</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    overflow: 'visible',
  },
  canvas: {
    width: CANVAS,
    height: CANVAS,
    overflow: 'visible',
  },
  svg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  labelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPill: {
    minWidth: LABEL_W,
    height: LABEL_H,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  labelPillReached: {
    backgroundColor: theme.colors.starGlow,
    borderColor: theme.colors.star,
  },
  labelText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  labelTextReached: {
    color: theme.colors.primaryDark,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RING_DIAMETER * 0.28,
  },
  steps: {
    color: theme.colors.primaryDark,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  unit: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  goal: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    fontWeight: '700',
  },
  percentPill: {
    backgroundColor: theme.colors.tint.pillActive,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  percentText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
});
