import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';
import { BeautyLayers } from '@/components/beauty/BeautyLayers';
import {
  DEFAULT_BEAUTY,
  DEFAULT_MAKEUP,
  defaultFaceLandmarks,
  type BeautyParams,
  type MakeupParams,
} from '@/lib/beauty-engine';
import { getEditorFeaturesByCategory } from '@tingting/shared';

type Props = {
  onCapture: (uri: string) => void;
  onClose: () => void;
  initialBeauty?: BeautyParams;
  initialMakeup?: MakeupParams;
  initialLensId?: string | null;
  onUnavailable?: () => void;
};

function isVisionCameraAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-vision-camera');
    return true;
  } catch {
    return false;
  }
}

/** Live beauty viewfinder using Vision Camera (Dev Client). */
export function VisionBeautyCamera(props: Props) {
  const available = useMemo(() => isVisionCameraAvailable(), []);
  useEffect(() => {
    if (!available) props.onUnavailable?.();
  }, [available, props]);

  if (!available) return null;
  return <VisionBeautyCameraInner {...props} />;
}

function VisionBeautyCameraInner({
  onCapture,
  onClose,
  initialBeauty = DEFAULT_BEAUTY,
  initialMakeup = DEFAULT_MAKEUP,
  initialLensId = 'lens_sparkle',
}: Props) {
  const { t } = useLocale();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Vision = require('react-native-vision-camera') as {
    Camera: React.ComponentType<Record<string, unknown>>;
    useCameraDevice: (position: 'front' | 'back') => unknown;
    useCameraPermission: () => {
      hasPermission: boolean;
      requestPermission: () => Promise<boolean>;
    };
  };

  const { Camera, useCameraDevice, useCameraPermission } = Vision;
  const { hasPermission, requestPermission } = useCameraPermission();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const device = useCameraDevice(facing);
  const [busy, setBusy] = useState(false);
  const [beauty] = useState(initialBeauty);
  const [makeup] = useState(initialMakeup);
  const [lensId, setLensId] = useState<string | null>(initialLensId);
  const face = useMemo(() => defaultFaceLandmarks(), []);
  const lenses = getEditorFeaturesByCategory('lens').slice(0, 8);
  const cameraRef = useRef<{ takePhoto?: (opts?: object) => Promise<{ path: string }> } | null>(null);

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current?.takePhoto || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      onCapture(uri);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('photos.saveFailed'));
    } finally {
      setBusy(false);
    }
  }, [busy, onCapture, t]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>{t('photos.cameraPermissionNeeded')}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>{t('photos.grantCamera')}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.linkBtn}>
          <Text style={styles.linkText}>{t('header.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.permissionText}>{t('photos.liveCameraDevClient')}</Text>
        <Pressable onPress={onClose} style={styles.linkBtn}>
          <Text style={styles.linkText}>{t('header.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Camera
        ref={(node: unknown) => {
          cameraRef.current = node as typeof cameraRef.current;
        }}
        style={styles.camera}
        device={device}
        isActive
        photo
        enableZoomGesture
      />
      <View style={styles.overlay} pointerEvents="none">
        <BeautyLayers beauty={beauty} makeup={makeup} lensId={lensId} face={face} />
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={onClose} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('photos.beautyCamera')}</Text>
        <Pressable
          onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          style={styles.iconBtn}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.lensRow}>
        {lenses.map((lens) => (
          <Pressable
            key={lens.id}
            style={[styles.lensChip, lensId === lens.id && styles.lensChipActive]}
            onPress={() => setLensId(lens.id === 'lens_none' ? null : lens.id)}
          >
            <Text style={styles.lensEmoji}>{lens.icon ?? '✨'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.shutter, busy && styles.shutterDisabled]}
          onPress={() => void takePhoto()}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#111" /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFill },
  overlay: { ...StyleSheet.absoluteFill },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  permissionText: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  linkBtn: { padding: 8 },
  linkText: { color: theme.colors.textMuted },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 16 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensRow: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  lensChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  lensChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(99,102,241,0.45)',
  },
  lensEmoji: { fontSize: 20 },
  bottomBar: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterDisabled: { opacity: 0.6 },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});
