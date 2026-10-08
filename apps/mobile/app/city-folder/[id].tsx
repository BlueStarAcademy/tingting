import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  cityFolderTitle,
  formatTripDates,
  getCity,
  getCityPinCategory,
  getRegion,
  type CityFolder,
  type CityPin,
  type Photo,
} from '@tingting/shared';
import { ActionSheet, type SheetOption } from '@/components/album/ActionSheet';
import { CityFolderFormModal } from '@/components/album/CityFolderFormModal';
import { CityPinSheet, type PinDraft } from '@/components/album/CityPinSheet';
import { PinMap } from '@/components/album/PinMap';
import { ServerAlbumGrid } from '@/components/album/ServerAlbumGrid';
import { useToast } from '@/components/album/Toast';
import { Screen } from '@/components/Screen';
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary';
import { EmptyState, Loading, type IconName } from '@/components/ui';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';
import { openDirections, openPlaceInMap } from '@/lib/place-navigation';
import { pinMapData, type PinMapMessage } from '@/lib/pin-map';
import { iconButton } from '@/lib/ui';
import { theme } from '@/constants/theme';

const MAP_HEIGHT = 280;

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ScreenErrorBoundary {...props} screen="city-folder" />;
}

function confirmAction(title: string, message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function CityFolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = String(id);
  const router = useRouter();
  const { t } = useLocale();
  const { data, setData, error, reload } = useFocusLoad(() => api.getCityFolder(folderId));
  const [toast, showToast] = useToast();
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [draft, setDraft] = useState<PinDraft | null>(null);
  const [pinSheet, setPinSheet] = useState<{ pin?: CityPin; draft?: PinDraft } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const folder = data?.folder;
  const pins = useMemo(() => data?.pins ?? [], [data]);
  const city = folder ? getCity(folder.cityCode) : undefined;
  const region = folder ? getRegion(folder.regionCode) : undefined;
  const mapData = useMemo(() => (city ? pinMapData(city, pins, selectedPin, draft) : null), [city, pins, selectedPin, draft]);

  const fail = (e: unknown) => Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.error'));

  const setFolder = (next: CityFolder) => setData((prev) => (prev ? { ...prev, folder: next } : prev));

  const onMapMessage = (msg: PinMapMessage) => {
    if (msg.type === 'pin') {
      setDraft(null);
      setSelectedPin(msg.id);
    } else if (msg.type === 'tap') {
      setSelectedPin(null);
    } else if (msg.type === 'longpress') {
      const spot = { lat: msg.lat, lng: msg.lng };
      setSelectedPin(null);
      setDraft(spot);
      setPinSheet({ draft: spot });
    }
  };

  const closePinSheet = () => {
    setPinSheet(null);
    setDraft(null);
  };

  const onPinSaved = (pin: CityPin) => {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.pins.some((p) => p.id === pin.id);
      const nextPins = exists ? prev.pins.map((p) => (p.id === pin.id ? pin : p)) : [...prev.pins, pin];
      return { folder: { ...prev.folder, pinCount: nextPins.length }, pins: nextPins };
    });
    setPinSheet(null);
    setDraft(null);
    setSelectedPin(pin.id);
    showToast(t('city.pin.saved', { name: pin.name }));
  };

  const removePin = (pin: CityPin) =>
    confirmAction(t('city.pin.deleteTitle'), t('city.pin.deleteMessage', { name: pin.name }), t('album.action.delete'), t('common.cancel'), () => {
      api
        .deleteCityPin(folderId, pin.id)
        .then(() => {
          setData((prev) =>
            prev ? { folder: { ...prev.folder, pinCount: prev.pins.length - 1 }, pins: prev.pins.filter((p) => p.id !== pin.id) } : prev,
          );
          setSelectedPin(null);
        })
        .catch(fail);
    });

  const setCover = (photo: Photo) =>
    api
      .updateCityFolder(folderId, { coverPhotoId: photo.id })
      .then((next) => {
        setFolder(next);
        showToast(t('city.coverSet'));
      })
      .catch(fail);

  const deleteFolder = (mode?: 'keep' | 'delete') =>
    api
      .deleteCityFolder(folderId, mode)
      .then(() => safeBack(router))
      .catch(fail);

  if (!folder || !city || !mapData) {
    return (
      <Screen title={t('city.folderTitle')}>
        {error ? <EmptyState icon="alert-circle-outline" title={t('city.loadFailed')} message={error} /> : <Loading />}
      </Screen>
    );
  }

  const menuOptions: SheetOption[] = [
    { key: 'edit', icon: 'create-outline', label: t('city.menu.edit'), onPress: () => setEditOpen(true) },
    { key: 'pin', icon: 'location-outline', label: t('city.menu.addPin'), onPress: () => setPinSheet({}) },
    { key: 'delete', icon: 'trash-outline', label: t('city.menu.delete'), danger: true, onPress: () => setDeleteOpen(true) },
  ];

  const deleteOptions: SheetOption[] =
    folder.photoCount > 0
      ? [
          {
            key: 'keep',
            icon: 'images-outline',
            label: t('city.delete.keep', { region: region?.name ?? '' }),
            hint: t('city.delete.keepHint'),
            onPress: () => void deleteFolder('keep'),
          },
          {
            key: 'delete',
            icon: 'trash-outline',
            label: t('city.delete.withPhotos'),
            hint: t('city.delete.withPhotosHint', { count: folder.photoCount }),
            danger: true,
            onPress: () =>
              confirmAction(
                t('city.delete.title', { name: cityFolderTitle(folder) }),
                t('album.deleteMessage', { count: folder.photoCount }),
                t('album.action.delete'),
                t('common.cancel'),
                () => void deleteFolder('delete'),
              ),
          },
        ]
      : [{ key: 'delete', icon: 'trash-outline', label: t('city.delete.empty'), danger: true, onPress: () => void deleteFolder() }];

  const header = (
    <View>
      <View style={styles.info}>
        <View style={styles.placeRow}>
          <View style={[styles.placeChip, { backgroundColor: `${region?.color ?? theme.colors.primary}1F` }]}>
            <Ionicons name="location" size={12} color={region?.color ?? theme.colors.primary} />
            <Text style={[styles.placeChipText, { color: region?.color ?? theme.colors.primary }]}>
              {region?.name} · {folder.cityName}
            </Text>
          </View>
        </View>
        <Text style={styles.dates}>{formatTripDates(folder.startDate, folder.endDate)}</Text>
        <Pressable onPress={() => setEditOpen(true)} hitSlop={4}>
          {folder.memo ? (
            <Text style={styles.memo}>“{folder.memo}”</Text>
          ) : (
            <Text style={styles.memoEmpty}>{t('city.memoEmpty')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>{t('city.pinsTitle', { count: pins.length })}</Text>
        <Pressable onPress={() => setPinSheet({})} style={styles.addPin} hitSlop={6}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addPinText}>{t('city.pin.addShort')}</Text>
        </Pressable>
      </View>
      <PinMap data={mapData} height={MAP_HEIGHT} onMessage={onMapMessage} />
      <Text style={styles.mapHint}>{t(Platform.OS === 'web' ? 'city.pin.mapHintWeb' : 'city.pin.mapHint')}</Text>
      {pins.length === 0 ? (
        <View style={styles.pinEmpty}>
          <Text style={styles.pinEmptyTitle}>{t('city.pin.emptyTitle')}</Text>
          <Text style={styles.pinEmptyText}>{t('city.pin.emptyMessage', { city: city.short })}</Text>
        </View>
      ) : (
        <View style={styles.pinList}>
          {pins.map((pin) => (
            <PinRow
              key={pin.id}
              pin={pin}
              open={selectedPin === pin.id}
              onPress={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
              onEdit={() => setPinSheet({ pin })}
              onDelete={() => removePin(pin)}
            />
          ))}
        </View>
      )}
      <View style={styles.divider} />
    </View>
  );

  return (
    <Screen
      title={cityFolderTitle(folder)}
      scroll={false}
      right={
        <Pressable onPress={() => setMenuOpen(true)} style={iconButton()} hitSlop={6} accessibilityLabel={t('city.menu.title')}>
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.primaryDark} />
        </Pressable>
      }
      overlay={toast}
    >
      <ServerAlbumGrid
        scope={{ kind: 'city', cityFolderId: folderId }}
        active
        standalone
        header={header}
        title={t('city.photosTitle')}
        subtitle={t('album.count', { count: folder.photoCount })}
        emptyTitle={t('city.photosEmptyTitle')}
        emptyMessage={t('city.photosEmptyMessage')}
        onChanged={reload}
        viewerExtra={(photo) => [{ key: 'cover', icon: 'star-outline', label: t('city.setCover'), onPress: () => void setCover(photo) }]}
      />

      <ActionSheet visible={menuOpen} title={cityFolderTitle(folder)} options={menuOptions} onClose={() => setMenuOpen(false)} />
      <ActionSheet
        visible={deleteOpen}
        title={t('city.delete.title', { name: cityFolderTitle(folder) })}
        message={folder.photoCount > 0 ? t('city.delete.message', { count: folder.photoCount }) : t('city.delete.emptyMessage')}
        options={deleteOptions}
        onClose={() => setDeleteOpen(false)}
      />
      <CityFolderFormModal
        visible={editOpen}
        folder={folder}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => {
          setEditOpen(false);
          setFolder(next);
        }}
      />
      <CityPinSheet
        visible={pinSheet !== null}
        folderId={folderId}
        cityCode={folder.cityCode}
        pin={pinSheet?.pin}
        draft={pinSheet?.draft}
        onClose={closePinSheet}
        onSaved={onPinSaved}
      />
    </Screen>
  );
}

function PinRow({ pin, open, onPress, onEdit, onDelete }: { pin: CityPin; open: boolean; onPress: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t } = useLocale();
  const cat = getCityPinCategory(pin.category);
  const target = { name: pin.name, lat: pin.lat, lng: pin.lng };
  return (
    <View style={[styles.pin, open && styles.pinOpen]}>
      <Pressable onPress={onPress} style={styles.pinMain} accessibilityRole="button">
        <View style={[styles.pinIcon, { backgroundColor: `${cat.color}22` }]}>
          <Text style={styles.pinEmoji}>{cat.emoji}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.pinName} numberOfLines={1}>
            {pin.name}
          </Text>
          <Text style={styles.pinSub} numberOfLines={open ? 3 : 1}>
            <Text style={{ color: cat.color, fontWeight: '800' }}>{cat.label}</Text>
            {pin.memo ? ` · ${pin.memo}` : pin.address ? ` · ${pin.address}` : ''}
          </Text>
          {open && pin.memo && pin.address ? (
            <Text style={styles.pinAddress} numberOfLines={2}>
              {pin.address}
            </Text>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textSubtle} />
      </Pressable>
      {open ? (
        <View style={styles.pinActions}>
          <PinButton
            icon="map"
            label={t('city.pin.kakaoMap')}
            onPress={() => void openPlaceInMap({ ...target, kakaoPlaceId: pin.kakaoPlaceId }, 'kakao')}
          />
          <PinButton icon="navigate" label={t('city.pin.kakaoNavi')} color="#3C1E1E" bg="#FEE500" onPress={() => void openDirections(target, 'kakao')} />
          <PinButton icon="navigate" label={t('city.pin.tmap')} color="#fff" bg="#E5262A" onPress={() => void openDirections(target, 'tmap')} />
          <PinButton icon="create-outline" label={t('city.pin.edit')} onPress={onEdit} />
          <PinButton icon="trash-outline" label={t('album.action.delete')} color={theme.colors.error} onPress={onDelete} />
        </View>
      ) : null}
    </View>
  );
}

function PinButton({ icon, label, onPress, color, bg }: { icon: IconName; label: string; onPress: () => void; color?: string; bg?: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.small, bg ? { backgroundColor: bg, borderColor: bg } : null, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={13} color={color ?? theme.colors.primaryDark} />
      <Text style={[styles.smallText, { color: color ?? theme.colors.primaryDark }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  info: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    gap: 6,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  placeRow: { flexDirection: 'row' },
  placeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: theme.radius.full },
  placeChipText: { fontSize: 12, fontWeight: '800' },
  dates: { color: theme.colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  memo: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  memoEmpty: { color: theme.colors.textSubtle, fontSize: 14, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  section: { color: theme.colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  addPin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  addPinText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  mapHint: { color: theme.colors.textSubtle, fontSize: 12, marginTop: 6 },
  pinEmpty: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    gap: 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tint.soft,
    alignItems: 'center',
  },
  pinEmptyTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  pinEmptyText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pinList: { marginTop: theme.spacing.sm, gap: 8 },
  pin: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pinOpen: { borderColor: theme.colors.tint.border },
  pinMain: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  pinIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pinEmoji: { fontSize: 17 },
  pinName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  pinSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 1 },
  pinAddress: { color: theme.colors.textSubtle, fontSize: 11.5, marginTop: 2 },
  pinActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingBottom: 10 },
  small: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    backgroundColor: theme.colors.tint.soft,
  },
  smallText: { fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing.lg },
});
