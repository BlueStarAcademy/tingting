import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CITY_FOLDER_MEMO_MAX,
  CITY_FOLDER_TITLE_MAX,
  cityFolderTitle,
  getCity,
  getRegion,
  type CityFolder,
} from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { DateField } from '@/components/DateField';
import { PremiumButton } from '@/components/PremiumButton';
import { SheetHeader } from '@/components/SheetHeader';
import { Field } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  /** Edit this folder, or create one for `cityCode` */
  folder?: CityFolder | null;
  cityCode?: string | null;
  onClose: () => void;
  onSaved: (folder: CityFolder) => void;
};

/** Create or edit a city trip folder: dates, one-line memo, optional title. */
export function CityFolderFormModal({ visible, folder, cityCode, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const code = folder?.cityCode ?? cityCode ?? '';
  const city = getCity(code);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStartDate(folder?.startDate ?? todayKey());
    setEndDate(folder?.endDate ?? null);
    setMemo(folder?.memo ?? '');
    setTitle(folder?.title ?? '');
    setError(null);
    setBusy(false);
  }, [visible, folder]);

  const endBeforeStart = Boolean(startDate && endDate && endDate < startDate);
  const placeholderTitle = startDate && city ? cityFolderTitle({ cityCode: code, cityName: city.name, startDate }) : '';

  const submit = async () => {
    if (!startDate || !city || busy) return;
    if (endBeforeStart) {
      setError(t('city.form.endBeforeStart'));
      return;
    }
    setBusy(true);
    setError(null);
    const fields = {
      startDate,
      endDate: endDate && endDate !== startDate ? endDate : null,
      memo: memo.trim() || null,
      title: title.trim() || null,
    };
    try {
      const saved = folder
        ? await api.updateCityFolder(folder.id, fields)
        : await api.createCityFolder({ regionCode: city.regionCode, cityCode: city.code, ...fields });
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal visible={visible} onRequestClose={onClose}>
      <SheetHeader title={folder ? t('city.form.editTitle') : t('city.form.newTitle')} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {city ? (
          <Text style={styles.place}>
            {getRegion(city.regionCode)?.name} · <Text style={styles.placeStrong}>{city.name}</Text>
          </Text>
        ) : null}
        <View style={styles.dates}>
          <DateField label={t('city.form.start')} value={startDate} onChange={(v) => v && setStartDate(v)} />
          <DateField label={t('city.form.end')} value={endDate} onChange={setEndDate} placeholder={t('city.form.endPlaceholder')} clearable />
        </View>
        {endBeforeStart ? <Text style={styles.error}>{t('city.form.endBeforeStart')}</Text> : null}
        <View>
          <Field
            label={t('city.form.memo')}
            value={memo}
            onChangeText={setMemo}
            placeholder={t('city.form.memoPlaceholder')}
            maxLength={CITY_FOLDER_MEMO_MAX}
            returnKeyType="done"
          />
          <Text style={styles.counter}>
            {memo.length}/{CITY_FOLDER_MEMO_MAX}
          </Text>
        </View>
        <Field
          label={t('city.form.title')}
          value={title}
          onChangeText={setTitle}
          placeholder={placeholderTitle}
          maxLength={CITY_FOLDER_TITLE_MAX}
          returnKeyType="done"
        />
        <Text style={styles.help}>{t('city.form.titleHelp')}</Text>
        {error && !endBeforeStart ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttons}>
          <PremiumButton title={t('common.cancel')} variant="outline" onPress={onClose} style={styles.button} fullWidth={false} />
          <PremiumButton
            title={folder ? t('city.form.save') : t('city.form.create')}
            onPress={submit}
            loading={busy}
            disabled={!startDate || !city || endBeforeStart}
            style={styles.button}
            fullWidth={false}
          />
        </View>
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: 12 },
  place: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  placeStrong: { color: theme.colors.primaryDark, fontWeight: '800' },
  dates: { flexDirection: 'row', gap: 10 },
  counter: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  help: { color: theme.colors.textSubtle, fontSize: 12, marginTop: -6 },
  error: { color: theme.colors.error, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1 },
});
