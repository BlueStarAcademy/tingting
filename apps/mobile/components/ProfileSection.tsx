import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '@tingting/shared';
import { MBTI_TEST_REWARD } from '@tingting/shared';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { MbtiQuizModal } from '@/components/MbtiQuizModal';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { cardSurface, sectionTitleStyle } from '@/lib/ui';
import { theme } from '@/constants/theme';

interface Props {
  profile: UserProfile;
  onUpdated: () => void;
}

export function ProfileSection({ profile, onUpdated }: Props) {
  const { t } = useLocale();
  const [birthday, setBirthday] = useState(profile.birthday ?? '');
  const [saving, setSaving] = useState(false);
  const [mbtiOpen, setMbtiOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isRetake = profile.mbtiTestCompleted === true;

  const saveBirthday = async (value: string) => {
    setSaving(true);
    try {
      await api.updateProfile({ birthday: value.trim() || undefined });
      onUpdated();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setSaving(false);
    }
  };

  const onMbtiComplete = async (mbti: string) => {
    try {
      if (isRetake) {
        await api.retakeMbtiTest(mbti);
        setMbtiOpen(false);
        onUpdated();
        Alert.alert(t('profile.mbtiDone'), t('profile.mbtiRetakeDone', { mbti }));
      } else {
        const result = await api.completeMbtiTest(mbti);
        setMbtiOpen(false);
        onUpdated();
        Alert.alert(t('profile.mbtiDone'), t('profile.mbtiReward', { mbti, reward: result.reward }));
      }
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('profile.title')}</Text>
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
            <Pressable style={styles.editOverlay} onPress={() => setEditOpen(true)} hitSlop={6}>
              <Ionicons name="pencil" size={12} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.nickname}>{profile.displayName}</Text>
        </View>

        <View style={styles.fields}>
          <Text style={styles.label}>{t('profile.birthday')}</Text>
          <TextInput
            style={styles.input}
            value={birthday}
            onChangeText={setBirthday}
            onBlur={() => {
              if (birthday !== (profile.birthday ?? '')) {
                saveBirthday(birthday);
              }
            }}
            placeholder={t('profile.birthdayPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.label}>{t('profile.mbtiLabel')}</Text>
          <View style={styles.mbtiBlock}>
            {profile.mbtiTestCompleted && profile.mbti ? (
              <Text style={styles.mbtiType}>{profile.mbti}</Text>
            ) : (
              <View style={styles.mbtiRewardRow}>
                <Ionicons name="star" size={16} color={theme.colors.star} />
                <Text style={styles.mbtiRewardNum}>{MBTI_TEST_REWARD}</Text>
              </View>
            )}
            <Pressable style={styles.mbtiActionBtn} onPress={() => setMbtiOpen(true)}>
              <Text style={styles.mbtiActionText}>
                {isRetake ? t('profile.mbtiRetake') : t('profile.mbtiStart')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {saving ? (
        <ActivityIndicator color={theme.colors.primaryLight} size="small" style={styles.loader} />
      ) : null}

      <MbtiQuizModal visible={mbtiOpen} onClose={() => setMbtiOpen(false)} onComplete={onMbtiComplete} />
      <ProfileEditModal
        visible={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSaved={onUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface(),
    alignSelf: 'stretch',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sectionTitle: sectionTitleStyle(),
  row: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  photoCol: { flexShrink: 0, alignItems: 'center', width: 104, gap: 8 },
  photoWrap: { position: 'relative' },
  photo: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.surface },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(30,27,75,0.9)',
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
  mbtiBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    gap: 8,
  },
  mbtiType: { color: theme.colors.primaryLight, fontSize: 20, fontWeight: '800' },
  mbtiRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mbtiRewardNum: { color: theme.colors.star, fontSize: 16, fontWeight: '800' },
  mbtiActionBtn: {
    backgroundColor: theme.colors.tint.medium,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  mbtiActionText: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700' },
  loader: { alignSelf: 'center' },
});
