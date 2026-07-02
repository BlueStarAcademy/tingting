import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '@tingting/shared';
import { MBTI_TEST_REWARD } from '@tingting/shared';
import { api } from '@/lib/api';
import {
  formatBirthDateDisplay,
  formatBirthDateInput,
  isValidBirthDate,
} from '@/lib/birthdate';
import { useLocale } from '@/hooks/useLocale';
import { MbtiQuizModal } from '@/components/MbtiQuizModal';
import { MbtiResultModal } from '@/components/MbtiResultModal';
import { StarRewardModal } from '@/components/StarRewardModal';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { accentCard, sectionTitleStyle } from '@/lib/ui';
import { theme } from '@/constants/theme';

interface Props {
  profile: UserProfile;
  onUpdated: () => void;
  readOnly?: boolean;
  embedded?: boolean;
  /** 다른 사용자 프로필 조회 시 비공개 여부 */
  detailsHidden?: boolean;
}

export function ProfileSection({
  profile,
  onUpdated,
  readOnly = false,
  embedded = false,
  detailsHidden = false,
}: Props) {
  const { t } = useLocale();
  const [birthday, setBirthday] = useState(formatBirthDateDisplay(profile.birthday));
  const [saving, setSaving] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultMbti, setResultMbti] = useState('');
  const [starRewardOpen, setStarRewardOpen] = useState(false);
  const [starRewardAmount, setStarRewardAmount] = useState(0);
  const [starRewardTotal, setStarRewardTotal] = useState(0);
  const [pendingMbtiResult, setPendingMbtiResult] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const isCompleted = profile.mbtiTestCompleted === true;
  const isPublic = profile.profilePublic !== false;
  const showPrivateNotice = readOnly && detailsHidden;

  useEffect(() => {
    setBirthday(formatBirthDateDisplay(profile.birthday));
  }, [profile.birthday, profile.id]);

  const saveBirthday = async (value: string) => {
    const formatted = formatBirthDateInput(value);
    if (formatted && !isValidBirthDate(formatted)) {
      Alert.alert(t('common.alert'), t('profile.birthdayPlaceholder'));
      setBirthday(formatBirthDateDisplay(profile.birthday));
      return;
    }

    setSaving(true);
    try {
      await api.updateProfile({ birthday: formatted || undefined });
      setBirthday(formatted);
      onUpdated();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleProfilePublic = async (value: boolean) => {
    setVisibilitySaving(true);
    try {
      await api.updateProfile({ profilePublic: value });
      onUpdated();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setVisibilitySaving(false);
    }
  };

  const openResult = (mbti: string) => {
    setResultMbti(mbti);
    setResultOpen(true);
  };

  const onMbtiComplete = async (mbti: string) => {
    setQuizOpen(false);
    try {
      if (isCompleted) {
        await api.retakeMbtiTest(mbti);
        onUpdated();
        openResult(mbti);
      } else {
        const { profile: updated, reward } = await api.completeMbtiTest(mbti);
        onUpdated();
        setStarRewardAmount(reward);
        setStarRewardTotal(updated.stars);
        setPendingMbtiResult(mbti);
        setStarRewardOpen(true);
      }
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const closeStarReward = () => {
    setStarRewardOpen(false);
    if (pendingMbtiResult) {
      openResult(pendingMbtiResult);
      setPendingMbtiResult(null);
    }
  };

  const openMbtiAction = () => {
    if (isCompleted && profile.mbti) {
      openResult(profile.mbti);
      return;
    }
    if (!readOnly) setQuizOpen(true);
  };

  const startRetake = () => {
    if (readOnly) return;
    setResultOpen(false);
    setQuizOpen(true);
  };

  const birthDisplay = formatBirthDateDisplay(profile.birthday);

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      {!embedded ? <Text style={styles.sectionTitle}>{t('profile.title')}</Text> : null}

      {!readOnly ? (
        <View style={styles.visibilityRow}>
          <Text style={styles.visibilityLabel}>{t('profile.profilePublic')}</Text>
          <Switch
            value={isPublic}
            onValueChange={toggleProfilePublic}
            disabled={visibilitySaving}
            trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primaryLight }}
          />
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.photoCol}>
          <View style={styles.photoWrap}>
            {profile.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={32} color={theme.colors.textMuted} />
              </View>
            )}
            {!readOnly ? (
              <Pressable style={styles.editOverlay} onPress={() => setEditOpen(true)} hitSlop={6}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.nickname}>{profile.displayName}</Text>
        </View>

        <View style={styles.fields}>
          {showPrivateNotice ? (
            <View style={styles.privateBox}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} />
              <Text style={styles.privateText}>{t('profile.profilePrivateNotice')}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>{t('profile.birthday')}</Text>
              {readOnly ? (
                <Text style={styles.readOnlyValue}>
                  {birthDisplay || t('profile.birthdayEmpty')}
                </Text>
              ) : (
                <TextInput
                  style={styles.input}
                  value={birthday}
                  onChangeText={(text) => setBirthday(formatBirthDateInput(text))}
                  onBlur={() => {
                    if (birthday !== birthDisplay) {
                      void saveBirthday(birthday);
                    }
                  }}
                  placeholder={t('profile.birthdayPlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              )}

              <Text style={styles.label}>{t('profile.mbtiLabel')}</Text>
              <View style={styles.mbtiBlock}>
                {isCompleted && profile.mbti ? (
                  <Text style={styles.mbtiType}>{profile.mbti}</Text>
                ) : readOnly ? (
                  <Text style={styles.mbtiEmpty}>{t('profile.mbtiNotTaken')}</Text>
                ) : (
                  <View style={styles.mbtiRewardRow}>
                    <Ionicons name="star" size={16} color={theme.colors.star} />
                    <Text style={styles.mbtiRewardNum}>{MBTI_TEST_REWARD}</Text>
                  </View>
                )}
                {isCompleted && profile.mbti ? (
                  <Pressable style={styles.mbtiActionBtn} onPress={openMbtiAction}>
                    <Text style={styles.mbtiActionText}>{t('profile.mbtiViewInfo')}</Text>
                  </Pressable>
                ) : !readOnly ? (
                  <Pressable style={styles.mbtiActionBtn} onPress={openMbtiAction}>
                    <Text style={styles.mbtiActionText}>{t('profile.mbtiStart')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>

      {saving ? (
        <ActivityIndicator color={theme.colors.primaryLight} size="small" style={styles.loader} />
      ) : null}

      {!readOnly ? (
        <>
          <MbtiQuizModal visible={quizOpen} onClose={() => setQuizOpen(false)} onComplete={onMbtiComplete} />
          <ProfileEditModal
            visible={editOpen}
            profile={profile}
            onClose={() => setEditOpen(false)}
            onSaved={onUpdated}
          />
        </>
      ) : null}
      <StarRewardModal
        visible={starRewardOpen}
        amount={starRewardAmount}
        totalStars={starRewardTotal}
        title={t('profile.mbtiDone')}
        subtitle={t('reward.mbtiMessage', { amount: starRewardAmount })}
        onClose={closeStarReward}
      />
      <MbtiResultModal
        visible={resultOpen}
        mbti={resultMbti || profile.mbti || ''}
        onClose={() => setResultOpen(false)}
        onRetake={readOnly ? undefined : startRetake}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...accentCard(),
    alignSelf: 'stretch',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardEmbedded: { marginBottom: 0 },
  sectionTitle: sectionTitleStyle(),
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  visibilityLabel: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  photoCol: { flexShrink: 0, alignItems: 'center', width: 104, gap: 8 },
  photoWrap: { position: 'relative' },
  photo: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.surface },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.tint.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.tint.border,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surfaceElevated,
  },
  nickname: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  fields: { flex: 1, minWidth: 0, gap: 4 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.xs,
  },
  readOnlyValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.xs,
  },
  privateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginTop: theme.spacing.xs,
  },
  privateText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', flex: 1 },
  mbtiBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.tealSoft,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(91,163,146,0.25)',
    gap: 8,
  },
  mbtiType: { color: theme.colors.teal, fontSize: 20, fontWeight: '800' },
  mbtiEmpty: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  mbtiRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mbtiRewardNum: { color: theme.colors.star, fontSize: 16, fontWeight: '800' },
  mbtiActionBtn: {
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(212,132,90,0.3)',
  },
  mbtiActionText: { color: theme.colors.accentDark, fontSize: 12, fontWeight: '700' },
  loader: { alignSelf: 'center' },
});
