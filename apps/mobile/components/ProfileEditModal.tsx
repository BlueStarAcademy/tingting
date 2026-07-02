import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '@tingting/shared';
import { getDisplayNameChangeCost } from '@tingting/shared';
import { pickPhoto } from '@/lib/pick-photo';
import { api } from '@/lib/api';
import { clampNicknameInput, getNicknameLength, nicknameErrorMessage, validateNickname } from '@/lib/nickname';
import { useLocale } from '@/hooks/useLocale';
import { useBottomSheetLayout } from '@/hooks/useBottomSheetLayout';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { AppModal } from '@/components/AppModal';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileEditModal({ visible, profile, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const { maxSheetHeight } = useBottomSheetLayout();
  const [name, setName] = useState(profile.displayName);
  const [photoUri, setPhotoUri] = useState(profile.photoUri ?? '');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const nicknameCost = getDisplayNameChangeCost(profile.displayNameChangeCount ?? 0);
  const nameChanged = name.trim() !== profile.displayName;
  const photoChanged = photoUri !== (profile.photoUri ?? '');
  const nicknameValid = validateNickname(name) === null;
  const nicknameButtonTitle =
    nicknameCost > 0
      ? t('profile.nicknameChangeButtonPaid', { cost: nicknameCost })
      : t('profile.nicknameChangeButtonFree');

  useEffect(() => {
    if (visible) {
      setName(profile.displayName);
      setPhotoUri(profile.photoUri ?? '');
    }
  }, [visible, profile.displayName, profile.photoUri]);

  const handleClose = () => {
    setName(profile.displayName);
    setPhotoUri(profile.photoUri ?? '');
    onClose();
  };

  const pickNewPhoto = async () => {
    const uri = await pickPhoto({
      upload: t('profile.uploadPhoto'),
      fromLibrary: t('visits.fromLibrary'),
      fromCamera: t('visits.fromCamera'),
      cancel: t('header.cancel'),
      libraryPermissionTitle: t('visits.permissionTitle'),
      libraryPermissionMessage: t('visits.permissionMessage'),
      cameraPermissionTitle: t('visits.cameraPermissionTitle'),
      cameraPermissionMessage: t('visits.cameraPermissionMessage'),
    });
    if (uri) setPhotoUri(uri);
  };

  const savePhoto = async () => {
    if (!photoChanged) {
      handleClose();
      return;
    }
    setPhotoLoading(true);
    try {
      await api.updateProfile({ photoUri: photoUri || undefined });
      Alert.alert(t('profile.editSaved'), t('profile.photoUpdated'));
      onSaved();
      handleClose();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setPhotoLoading(false);
    }
  };

  const changeNickname = async () => {
    const trimmed = name.trim();
    const validationError = validateNickname(trimmed);
    if (validationError) {
      Alert.alert(t('common.alert'), nicknameErrorMessage(validationError, t));
      return;
    }
    if (!nameChanged) return;

    const doChange = async () => {
      setNicknameLoading(true);
      try {
        const result = await api.changeDisplayName(trimmed);
        if (result.cost > 0) {
          Alert.alert(t('profile.nicknameChanged'), t('profile.nicknameChangedPaid', { cost: result.cost }));
        } else {
          Alert.alert(t('profile.nicknameChanged'), t('profile.nicknameChangedFree'));
        }
        onSaved();
        handleClose();
      } catch (e: unknown) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
      } finally {
        setNicknameLoading(false);
      }
    };

    if (nicknameCost > 0) {
      Alert.alert(t('profile.nicknameChangeTitle'), t('profile.nicknameChangeMessage', { cost: nicknameCost }), [
        { text: t('header.cancel'), style: 'cancel' },
        { text: t('common.continue'), onPress: doChange },
      ]);
    } else {
      await doChange();
    }
  };

  return (
    <AppModal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { maxHeight: maxSheetHeight }]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.editTitle')}</Text>
            <PremiumIconButton
              icon="close"
              onPress={handleClose}
              variant="soft"
              color={theme.colors.textMuted}
              accessibilityLabel={t('header.cancel')}
            />
          </View>

          <Pressable style={styles.photoArea} onPress={pickNewPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={styles.photoBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.photoHint}>{t('profile.changePhoto')}</Text>
          <PremiumButton
            title={t('profile.savePhoto')}
            onPress={savePhoto}
            loading={photoLoading}
            variant="outline"
          />

          <View style={styles.divider} />

          <Text style={styles.label}>{t('auth.displayName')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(text) => setName(clampNicknameInput(text))}
            placeholder={t('auth.displayName')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.hint}>
            {t('profile.nicknameLengthHint', { count: getNicknameLength(name) })}
          </Text>

          <PremiumButton
            title={nicknameButtonTitle}
            onPress={changeNickname}
            loading={nicknameLoading}
            disabled={!nameChanged || !nicknameValid}
            variant="outline"
          />
          {!nameChanged || !nicknameValid ? (
            <Text style={styles.helper}>
              {!nameChanged ? t('profile.nicknameUnchanged') : t('profile.nicknameInvalidHint')}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  photoArea: { alignSelf: 'center', marginBottom: theme.spacing.xs },
  photo: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.surface },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    borderStyle: 'dashed',
  },
  photoBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  photoHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceLight,
    marginVertical: theme.spacing.md,
  },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.xs,
  },
  hint: { color: theme.colors.textMuted, fontSize: 12, marginBottom: theme.spacing.sm },
  helper: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: theme.spacing.xs },
});
