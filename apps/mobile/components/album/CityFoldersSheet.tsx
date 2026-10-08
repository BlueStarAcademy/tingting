import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCity, getRegion, type CityFolder } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { CityFolderRow } from '@/components/album/CityFolderRow';
import { SheetHeader } from '@/components/SheetHeader';
import { ActionButton } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

/** Trip folders of one municipality, opened by tapping it on the province map. */
export function CityFoldersSheet({
  cityCode,
  folders,
  onClose,
  onOpen,
  onCreate,
}: {
  cityCode: string | null;
  /** null while loading */
  folders: CityFolder[] | null;
  onClose: () => void;
  onOpen: (folder: CityFolder) => void;
  onCreate: () => void;
}) {
  const { t } = useLocale();
  const city = cityCode ? getCity(cityCode) : undefined;
  const region = city ? getRegion(city.regionCode) : undefined;
  const empty = folders !== null && folders.length === 0;

  return (
    <AppModal visible={Boolean(cityCode)} onRequestClose={onClose} sheetStyle={styles.sheet}>
      <SheetHeader title={city ? `${region?.name ?? ''} ${city.name}` : ''} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.content}>
        {folders === null ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
        {empty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('city.sheet.emptyTitle', { city: city?.short ?? '' })}</Text>
            <Text style={styles.emptyMessage}>{t('city.sheet.emptyMessage')}</Text>
          </View>
        ) : null}
        {(folders ?? []).map((folder) => (
          <CityFolderRow key={folder.id} folder={folder} onPress={() => onOpen(folder)} />
        ))}
        <ActionButton
          icon="add-circle-outline"
          label={empty ? t('city.sheet.createFirst') : t('city.sheet.create')}
          tone={empty ? 'primary' : 'soft'}
          onPress={onCreate}
          style={styles.create}
        />
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: '80%' },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: 10 },
  loader: { marginVertical: theme.spacing.lg },
  empty: { alignItems: 'center', gap: 6, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.sm },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyMessage: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  create: { marginTop: 4 },
});
