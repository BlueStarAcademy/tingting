import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '@tingting/shared';
import { getDisplayNameChangeCost } from '@tingting/shared';
import { pickPhoto } from '@/lib/pick-photo';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileEditModal({ visible, profile, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const [name, setName] = useState(profile.displayName);
  const [photoUri, setPhotoUri] = useState(profile.photoUri ?? '');
  const [loading, setLoading] = useState(false);
  const nicknameCost = getDisplayNameChangeCost(profile.displayNameChangeCount ?? 0);
  const nameChanged = name.trim() !== profile.displayName;
  const photoChanged = photoUri !== (profile.photoUri ?? '');

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

  const saveChanges = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('common.alert'), t('profile.nicknameRequired'));
      return;
    }
    if (!nameChanged && !photoChanged) {
      handleClose();
      return;
    }

    const doSave = async () => {
      setLoading(true);
      try {
        if (photoChanged) {
          await api.updateProfile({ photoUri: photoUri || undefined });
        }
        if (nameChanged) {
          const result = await api.changeDisplayName(trimmed);
          if (result.cost > 0) {
            Alert.alert(t('profile.nicknameChanged'), t('profile.nicknameChangedPaid', { cost: result.cost }));
          } else if (!photoChanged) {
            Alert.alert(t('profile.nicknameChanged'), t('profile.nicknameChangedFree'));
          }
        } else if (photoChanged) {
          Alert.alert(t('profile.editSaved'), t('profile.photoUpdated'));
        }
        onSaved();
        handleClose();
      } catch (e: unknown) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
      } finally {
        setLoading(false);
      }
    };

    if (nameChanged && nicknameCost > 0) {
      Alert.alert(t('profile.nicknameChangeTitle'), t('profile.nicknameChangeMessage', { cost: nicknameCost }), [
        { text: t('header.cancel'), style: 'cancel' },
        { text: t('common.continue'), onPress: doSave },
      ]);
    } else {
      await doSave();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('profile.editTitle')}</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </Pressable>
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

            <Text style={styles.label}>{t('auth.displayName')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('auth.displayName')}
              placeholderTextColor={theme.colors.textMuted}
              maxLength={20}
            />
            {nameChanged ? (
              nicknameCost > 0 ? (
                <Text style={styles.cost}>✦ {nicknameCost}</Text>
              ) : (
                <Text style={styles.free}>{t('profile.nicknameFirstFree')}</Text>
              )
            ) : null}

            <PremiumButton title={t('common.save')} onPress={saveChanges} loading={loading} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
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
    marginBottom: theme.spacing.md,
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
  cost: { color: theme.colors.star, fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: theme.spacing.sm },
  free: { color: theme.colors.success, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: theme.spacing.sm },
});
