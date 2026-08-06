import type { ViewStyle } from 'react-native';
import type { BeautyParams, FaceLandmarks, MakeupParams } from './types';
import { reshapeLandmarks } from './face';

export interface BeautyOverlaySpec {
  key: string;
  style: ViewStyle;
  color: string;
  opacity: number;
  text?: string;
  textStyle?: ViewStyle & { fontSize?: number };
}

function pct(n: number): `${number}%` {
  return `${Math.round(n * 1000) / 10}%`;
}

export function buildBeautyOverlays(beauty: BeautyParams): BeautyOverlaySpec[] {
  const layers: BeautyOverlaySpec[] = [];
  if (beauty.smooth > 0.01) {
    layers.push({
      key: 'smooth',
      color: '#FFF7ED',
      opacity: 0.08 + beauty.smooth * 0.16,
      style: { ...StyleSheetAbsoluteFill },
    });
  }
  if (beauty.whiten > 0.01) {
    layers.push({
      key: 'whiten',
      color: '#FFFFFF',
      opacity: 0.05 + beauty.whiten * 0.18,
      style: { ...StyleSheetAbsoluteFill },
    });
  }
  if (beauty.clarity > 0.01) {
    layers.push({
      key: 'clarity',
      color: '#38BDF8',
      opacity: beauty.clarity * 0.08,
      style: { ...StyleSheetAbsoluteFill },
    });
  }
  return layers;
}

export function buildMakeupOverlays(
  makeup: MakeupParams,
  face: FaceLandmarks | null,
  beauty: BeautyParams,
): BeautyOverlaySpec[] {
  if (!face) return [];
  const f = reshapeLandmarks(
    face,
    beauty.slimFace,
    beauty.jaw,
    beauty.eyes,
    beauty.nose,
    beauty.cheek,
  );
  const layers: BeautyOverlaySpec[] = [];

  if (makeup.concealer > 0.01) {
    layers.push({
      key: 'concealer',
      color: '#FDE68A',
      opacity: makeup.concealer * 0.22,
      style: {
        position: 'absolute',
        left: pct(f.centerX - f.width * 0.28),
        top: pct(f.centerY - f.height * 0.15),
        width: pct(f.width * 0.56),
        height: pct(f.height * 0.35),
        borderRadius: 999,
      },
    });
  }

  if (makeup.blush > 0.01) {
    for (const side of ['left', 'right'] as const) {
      const cheek = side === 'left' ? f.leftCheek : f.rightCheek;
      layers.push({
        key: `blush-${side}`,
        color: '#FB7185',
        opacity: makeup.blush * 0.35,
        style: {
          position: 'absolute',
          left: pct(cheek.x - 0.06),
          top: pct(cheek.y - 0.04),
          width: pct(0.12),
          height: pct(0.08),
          borderRadius: 999,
        },
      });
    }
  }

  if (makeup.eyeshadow > 0.01) {
    for (const eye of [f.leftEye, f.rightEye]) {
      layers.push({
        key: `shadow-${eye.x}`,
        color: '#A78BFA',
        opacity: makeup.eyeshadow * 0.4,
        style: {
          position: 'absolute',
          left: pct(eye.x - 0.05),
          top: pct(eye.y - 0.025),
          width: pct(0.1),
          height: pct(0.04),
          borderRadius: 999,
        },
      });
    }
  }

  if (makeup.eyeliner > 0.01) {
    for (const eye of [f.leftEye, f.rightEye]) {
      layers.push({
        key: `liner-${eye.x}`,
        color: '#111827',
        opacity: makeup.eyeliner * 0.55,
        style: {
          position: 'absolute',
          left: pct(eye.x - 0.045),
          top: pct(eye.y + 0.005),
          width: pct(0.09),
          height: 2,
          borderRadius: 2,
        },
      });
    }
  }

  if (makeup.lip > 0.01) {
    layers.push({
      key: 'lip',
      color: '#E11D48',
      opacity: makeup.lip * 0.45,
      style: {
        position: 'absolute',
        left: pct(f.mouth.x - 0.07),
        top: pct(f.mouth.y - 0.02),
        width: pct(0.14),
        height: pct(0.045),
        borderRadius: 999,
      },
    });
  }

  if (makeup.highlight > 0.01) {
    layers.push({
      key: 'highlight',
      color: '#FEF3C7',
      opacity: makeup.highlight * 0.28,
      style: {
        position: 'absolute',
        left: pct(f.nose.x - 0.015),
        top: pct(f.forehead.y),
        width: pct(0.03),
        height: pct(f.height * 0.35),
        borderRadius: 999,
      },
    });
  }

  return layers;
}

const LENS_EMOJI: Record<string, { emoji: string; anchor: 'forehead' | 'eyes' | 'center'; scale: number }> = {
  lens_dog_ears: { emoji: '🐶', anchor: 'forehead', scale: 1.4 },
  lens_cat_ears: { emoji: '🐱', anchor: 'forehead', scale: 1.4 },
  lens_sunglasses: { emoji: '🕶️', anchor: 'eyes', scale: 1.6 },
  lens_crown: { emoji: '👑', anchor: 'forehead', scale: 1.5 },
  lens_heart_eyes: { emoji: '😍', anchor: 'eyes', scale: 1.3 },
  lens_travel_stamp: { emoji: '✈️', anchor: 'center', scale: 1.2 },
  lens_sparkle: { emoji: '✨', anchor: 'forehead', scale: 1.1 },
  lens_bunny: { emoji: '🐰', anchor: 'forehead', scale: 1.4 },
  lens_flower_crown: { emoji: '🌺', anchor: 'forehead', scale: 1.5 },
};

export function buildLensOverlays(
  lensId: string | null,
  face: FaceLandmarks | null,
  beauty: BeautyParams,
): BeautyOverlaySpec[] {
  if (!lensId || lensId === 'lens_none' || !face) return [];
  const def = LENS_EMOJI[lensId];
  if (!def) return [];
  const f = reshapeLandmarks(
    face,
    beauty.slimFace,
    beauty.jaw,
    beauty.eyes,
    beauty.nose,
    beauty.cheek,
  );

  let x = f.centerX;
  let y = f.centerY;
  if (def.anchor === 'forehead') {
    x = f.forehead.x;
    y = f.forehead.y - 0.06;
  } else if (def.anchor === 'eyes') {
    x = (f.leftEye.x + f.rightEye.x) / 2;
    y = (f.leftEye.y + f.rightEye.y) / 2;
  }

  const size = 0.16 * def.scale;

  if (lensId === 'lens_dog_ears' || lensId === 'lens_cat_ears' || lensId === 'lens_bunny') {
    return [
      {
        key: 'ear-l',
        color: 'transparent',
        opacity: 1,
        text: def.emoji,
        textStyle: { fontSize: 36 * def.scale },
        style: {
          position: 'absolute',
          left: pct(f.leftEye.x - 0.12),
          top: pct(f.forehead.y - 0.12),
          width: pct(size),
          height: pct(size),
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      {
        key: 'ear-r',
        color: 'transparent',
        opacity: 1,
        text: def.emoji,
        textStyle: { fontSize: 36 * def.scale },
        style: {
          position: 'absolute',
          left: pct(f.rightEye.x - 0.02),
          top: pct(f.forehead.y - 0.12),
          width: pct(size),
          height: pct(size),
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    ];
  }

  return [
    {
      key: 'lens',
      color: 'transparent',
      opacity: 1,
      text: def.emoji,
      textStyle: { fontSize: 40 * def.scale },
      style: {
        position: 'absolute',
        left: pct(x - size / 2),
        top: pct(y - size / 2),
        width: pct(size),
        height: pct(size),
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
  ];
}

export function buildReshapeShadeOverlays(beauty: BeautyParams, face: FaceLandmarks | null): BeautyOverlaySpec[] {
  if (!face) return [];
  const slim = beauty.slimFace + beauty.jaw + beauty.cheek;
  if (slim < 0.05) return [];
  return [
    {
      key: 'reshape-l',
      color: '#000000',
      opacity: Math.min(0.18, slim * 0.12),
      style: {
        position: 'absolute',
        left: pct(face.centerX - face.width * 0.55),
        top: pct(face.centerY - face.height * 0.2),
        width: pct(face.width * 0.18),
        height: pct(face.height * 0.55),
        borderRadius: 999,
      },
    },
    {
      key: 'reshape-r',
      color: '#000000',
      opacity: Math.min(0.18, slim * 0.12),
      style: {
        position: 'absolute',
        left: pct(face.centerX + face.width * 0.37),
        top: pct(face.centerY - face.height * 0.2),
        width: pct(face.width * 0.18),
        height: pct(face.height * 0.55),
        borderRadius: 999,
      },
    },
  ];
}

const StyleSheetAbsoluteFill: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};
