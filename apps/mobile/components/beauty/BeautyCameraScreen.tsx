import { useMemo, useRef, useState, type ComponentType, type Ref } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
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
import { pickCameraPhoto } from '@/lib/pick-photo';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function canTryVisionCamera(): boolean {
  if (Platform.OS === 'web' || isExpoGo()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-vision-camera');
    return true;
  } catch {
    return false;
  }
}

type Props = {
  onCapture: (uri: string) => void;
  onClose: () => void;
  initialBeauty?: BeautyParams;
  initialMakeup?: MakeupParams;
  initialLensId?: string | null;
};

type ExpoCameraModule = {
  CameraView: ComponentType<{
    ref?: Ref<unknown>;
    style?: object;
    facing?: 'front' | 'back';
    mirror?: boolean;
    children?: React.ReactNode;
  }>;
  useCameraPermissions: () => [
    { granted: boolean } | null,
    () => Promise<unknown>,
  ];
};

function loadExpoCamera(): ExpoCameraModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-camera') as ExpoCameraModule;
  } catch {
    return null;
  }
}

/**
 * Prefers Vision Camera (Dev Client only) → expo-camera → image-picker camera.
 * Expo Go never loads vision-camera (broken config plugin / native module).
 */
export function BeautyCameraScreen(props: Props) {
  const [forceExpo, setForceExpo] = useState(!canTryVisionCamera());

  if (!forceExpo) {
    // Lazy require so Expo Go / metro config never evaluates vision-camera at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VisionBeautyCamera } = require('@/components/beauty/VisionBeautyCamera') as typeof import('@/components/beauty/VisionBeautyCamera');
    return (
      <VisionBeautyCamera
        {...props}
        onUnavailable={() => setForceExpo(true)}
      />
    );
  }

  return <ExpoBeautyCameraFallback {...props} />;
}

function ExpoBeautyCameraFallback(props: Props) {
  const expoCamera = useMemo(() => loadExpoCamera(), []);
  if (!expoCamera) {
    return <PickerOnlyCameraFallback {...props} />;
  }
  return <ExpoCameraInner {...props} expoCamera={expoCamera} />;
}

function PickerOnlyCameraFallback({ onCapture, onClose }: Props) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);

  const takePhoto = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await pickCameraPhoto({
        permissionTitle: t('visits.cameraPermissionTitle'),
        permissionMessage: t('visits.cameraPermissionMessage'),
      });
      if (uri) onCapture(uri);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('photos.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.center}>
      <Text style={styles.permissionText}>{t('photos.liveCameraDevClient')}</Text>
      <Pressable style={styles.primaryBtn} onPress={() => void takePhoto()} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>{t('photos.shoot')}</Text>
        )}
      </Pressable>
      <Pressable onPress={onClose} style={styles.linkBtn}>
        <Text style={styles.linkText}>{t('header.cancel')}</Text>
      </Pressable>
    </View>
  );
}

function ExpoCameraInner({
  onCapture,
  onClose,
  initialBeauty = DEFAULT_BEAUTY,
  initialMakeup = DEFAULT_MAKEUP,
  initialLensId = 'lens_sparkle',
  expoCamera,
}: Props & { expoCamera: ExpoCameraModule }) {
  const { t } = useLocale();
  const [permission, requestPermission] = expoCamera.useCameraPermissions();
  const CameraView = expoCamera.CameraView;
  const cameraRef = useRef<{
    takePictureAsync?: (opts?: object) => Promise<{ uri?: string } | undefined>;
  } | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [busy, setBusy] = useState(false);
  const [beauty] = useState(initialBeauty);
  const [makeup] = useState(initialMakeup);
  const [lensId, setLensId] = useState<string | null>(initialLensId);
  const face = useMemo(() => defaultFaceLandmarks(), []);
  const lenses = getEditorFeaturesByCategory('lens').slice(0, 8);

  const takePhoto = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (cameraRef.current?.takePictureAsync) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.92,
          mirror: facing === 'front',
        });
        if (photo?.uri) {
          onCapture(photo.uri);
          return;
        }
      }
      const uri = await pickCameraPhoto({
        permissionTitle: t('visits.cameraPermissionTitle'),
        permissionMessage: t('visits.cameraPermissionMessage'),
      });
      if (uri) onCapture(uri);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('photos.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>{t('photos.liveCameraDevClient')}</Text>
        <Pressable onPress={onClose} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>{t('common.ok')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
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

  return (
    <View style={styles.root}>
      <CameraView
        ref={(node) => {
          cameraRef.current = node as typeof cameraRef.current;
        }}
        style={styles.camera}
        facing={facing}
        mirror={facing === 'front'}
      >
        <View style={styles.overlay} pointerEvents="none">
          <BeautyLayers beauty={beauty} makeup={makeup} lensId={lensId} face={face} />
        </View>
      </CameraView>

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
  camera: { flex: 1 },
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
