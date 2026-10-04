import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { Field } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const MAX_NAME = 40;

/** Cross-platform text prompt (Alert.prompt is iOS-only). */
export function NamePromptModal({
  visible,
  title,
  initialValue = '',
  placeholder,
  confirmLabel,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel: string;
  onCancel: () => void;
  /** Throw to keep the prompt open (the error is shown inline). */
  onSubmit: (name: string) => Promise<void>;
}) {
  const { t } = useLocale();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setValue(initialValue);
    setError(null);
    setBusy(false);
  }, [visible, initialValue]);

  const name = value.trim();
  const submit = async () => {
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal visible={visible} onRequestClose={onCancel} variant="center" animationType="fade">
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Field
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          autoFocus
          maxLength={MAX_NAME}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttons}>
          <PremiumButton title={t('common.cancel')} variant="outline" onPress={onCancel} style={styles.button} fullWidth={false} />
          <PremiumButton title={confirmLabel} onPress={submit} loading={busy} disabled={!name} style={styles.button} fullWidth={false} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: { padding: theme.spacing.lg, gap: 12 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  error: { color: theme.colors.error, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1 },
});
