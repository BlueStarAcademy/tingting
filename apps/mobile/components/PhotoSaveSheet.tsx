import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { defaultPhotoFilename, sanitizePhotoFilename } from '@/lib/save-photo';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSave: (filename: string) => void | Promise<void>;
}

export function PhotoSaveSheet({ visible, loading = false, onClose, onSave }: Props) {
  const { t } = useLocale();
  const [filename, setFilename] = useState(defaultPhotoFilename());

  useEffect(() => {
    if (visible) setFilename(defaultPhotoFilename());
  }, [visible]);

  const submit = () => {
    const safe = sanitizePhotoFilename(filename);
    if (!safe.trim()) return;
    void onSave(safe);
  };

  return (
    <AppModal visible={visible} onRequestClose={onClose} variant="center" animationType="fade">
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('photos.saveSheetTitle')}</Text>
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={8} disabled={loading}>
            <Ionicons name="close" size={20} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.hint}>
          {Platform.OS === 'web' ? t('photos.saveFilenameHintWeb') : t('photos.saveFilenameHintNative')}
        </Text>

        <Text style={styles.label}>{t('photos.saveFilenameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={filename}
          onChangeText={setFilename}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          placeholder={defaultPhotoFilename()}
          placeholderTextColor={theme.colors.textMuted}
          selectTextOnFocus
        />

        <View style={styles.actions}>
          <PremiumButton
            title={t('header.cancel')}
            onPress={onClose}
            variant="outline"
            disabled={loading}
            style={styles.actionBtn}
          />
          <PremiumButton
            title={t('photos.saveToGallery')}
            onPress={submit}
            loading={loading}
            disabled={loading || !filename.trim()}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});
