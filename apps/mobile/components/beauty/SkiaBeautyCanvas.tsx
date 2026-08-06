import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { PhotoAdjustmentValues, PhotoFrameStyle } from '@/lib/photo-effects';
import type { BeautyParams, FaceLandmarks, MakeupParams } from '@/lib/beauty-engine';
import {
  buildComposeColorMatrix,
  exportSkiaCanvasToJpeg,
  isSkiaAvailableSync,
  reshapeLandmarks,
} from '@/lib/beauty-engine';
import { hexToRgba } from '@/lib/beauty-engine/filter-luts';

export type SkiaBeautyCanvasHandle = {
  exportJpeg: () => Promise<string>;
};

type StickerDraw = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type Props = {
  uri: string;
  width: number;
  height: number;
  filterEffectKey?: string | null;
  beauty: BeautyParams;
  makeup: MakeupParams;
  adjustments: PhotoAdjustmentValues;
  face: FaceLandmarks | null;
  lensId?: string | null;
  stickers?: StickerDraw[];
  frame?: PhotoFrameStyle;
  watermark?: boolean;
};

const LENS_EMOJI: Record<string, string> = {
  lens_dog_ears: '🐶',
  lens_cat_ears: '🐱',
  lens_sunglasses: '🕶️',
  lens_crown: '👑',
  lens_heart_eyes: '😍',
  lens_travel_stamp: '✈️',
  lens_sparkle: '✨',
  lens_bunny: '🐰',
  lens_flower_crown: '🌺',
};

function SkiaBeautyCanvasInner(
  {
    uri,
    width,
    height,
    filterEffectKey,
    beauty,
    makeup,
    adjustments,
    face,
    lensId,
    stickers = [],
    frame,
    watermark,
  }: Props,
  ref: React.ForwardedRef<SkiaBeautyCanvasHandle>,
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Skia = require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia');
  const {
    Canvas,
    Image: SkImage,
    ColorMatrix,
    Circle,
    Group,
    Rect,
    Text: SkText,
    matchFont,
    useImage,
    useCanvasRef,
  } = Skia;

  const canvasRef = useCanvasRef();
  const image = useImage(uri);
  const matrix = useMemo(
    () => buildComposeColorMatrix({ filterEffectKey, beauty, makeup, adjustments, face, lensId }),
    [filterEffectKey, beauty, makeup, adjustments, face, lensId],
  );

  useImperativeHandle(ref, () => ({
    exportJpeg: async () => exportSkiaCanvasToJpeg(canvasRef),
  }));

  const font = useMemo(() => {
    try {
      return matchFont({ fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif', fontSize: 36 });
    } catch {
      return null;
    }
  }, [matchFont]);

  const faceDrawn = face
    ? reshapeLandmarks(face, beauty.slimFace, beauty.jaw, beauty.eyes, beauty.nose, beauty.cheek)
    : null;

  const w = Math.max(width, 1);
  const h = Math.max(height, 1);

  return (
    <Canvas ref={canvasRef} style={{ width: w, height: h }}>
      {image ? (
        <Group>
          <SkImage image={image} x={0} y={0} width={w} height={h} fit="cover">
            <ColorMatrix matrix={matrix} />
          </SkImage>
        </Group>
      ) : (
        <Rect x={0} y={0} width={w} height={h} color="#111" />
      )}

      {faceDrawn && beauty.smooth > 0.01 ? (
        <Circle
          cx={faceDrawn.centerX * w}
          cy={faceDrawn.centerY * h}
          r={Math.max(faceDrawn.width, faceDrawn.height) * w * 0.55}
          color={hexToRgba('#FFF7ED', 0.06 + beauty.smooth * 0.12)}
        />
      ) : null}

      {faceDrawn && makeup.blush > 0.01 ? (
        <>
          <Circle
            cx={faceDrawn.leftCheek.x * w}
            cy={faceDrawn.leftCheek.y * h}
            r={w * 0.05}
            color={hexToRgba('#FB7185', makeup.blush * 0.35)}
          />
          <Circle
            cx={faceDrawn.rightCheek.x * w}
            cy={faceDrawn.rightCheek.y * h}
            r={w * 0.05}
            color={hexToRgba('#FB7185', makeup.blush * 0.35)}
          />
        </>
      ) : null}

      {faceDrawn && makeup.lip > 0.01 ? (
        <Circle
          cx={faceDrawn.mouth.x * w}
          cy={faceDrawn.mouth.y * h}
          r={w * 0.035}
          color={hexToRgba('#E11D48', makeup.lip * 0.4)}
        />
      ) : null}

      {faceDrawn && makeup.eyeshadow > 0.01 ? (
        <>
          <Circle
            cx={faceDrawn.leftEye.x * w}
            cy={faceDrawn.leftEye.y * h}
            r={w * 0.03}
            color={hexToRgba('#A78BFA', makeup.eyeshadow * 0.35)}
          />
          <Circle
            cx={faceDrawn.rightEye.x * w}
            cy={faceDrawn.rightEye.y * h}
            r={w * 0.03}
            color={hexToRgba('#A78BFA', makeup.eyeshadow * 0.35)}
          />
        </>
      ) : null}

      {faceDrawn && makeup.highlight > 0.01 ? (
        <Circle
          cx={faceDrawn.nose.x * w}
          cy={faceDrawn.forehead.y * h}
          r={w * 0.02}
          color={hexToRgba('#FEF3C7', makeup.highlight * 0.3)}
        />
      ) : null}

      {faceDrawn && lensId && lensId !== 'lens_none' && font && LENS_EMOJI[lensId] ? (
        lensId === 'lens_dog_ears' || lensId === 'lens_cat_ears' || lensId === 'lens_bunny' ? (
          <>
            <SkText
              text={LENS_EMOJI[lensId]}
              x={faceDrawn.leftEye.x * w - 28}
              y={faceDrawn.forehead.y * h - 8}
              font={font}
              color="white"
            />
            <SkText
              text={LENS_EMOJI[lensId]}
              x={faceDrawn.rightEye.x * w - 8}
              y={faceDrawn.forehead.y * h - 8}
              font={font}
              color="white"
            />
          </>
        ) : (
          <SkText
            text={LENS_EMOJI[lensId]}
            x={faceDrawn.centerX * w - 18}
            y={
              (lensId === 'lens_sunglasses' || lensId === 'lens_heart_eyes'
                ? (faceDrawn.leftEye.y + faceDrawn.rightEye.y) / 2
                : faceDrawn.forehead.y) *
                h -
              10
            }
            font={font}
            color="white"
          />
        )
      ) : null}

      {stickers.map((sticker) =>
        font ? (
          <Group
            key={sticker.id}
            transform={[
              { translateX: sticker.x },
              { translateY: sticker.y },
              { scale: sticker.scale },
              { rotate: (sticker.rotation * Math.PI) / 180 },
            ]}
          >
            <SkText text={sticker.emoji} x={0} y={36} font={font} color="white" />
          </Group>
        ) : null,
      )}

      {frame?.borderWidth ? (
        <Rect
          x={frame.borderWidth / 2}
          y={frame.borderWidth / 2}
          width={w - frame.borderWidth}
          height={h - frame.borderWidth}
          color={frame.borderColor ?? '#fff'}
          style="stroke"
          strokeWidth={frame.borderWidth}
        />
      ) : null}

      {watermark && font ? (
        <SkText text="TingTing" x={w - 110} y={36} font={font} color="rgba(255,255,255,0.75)" />
      ) : null}

      {adjustments.vignette > 0.01 ? (
        <Rect x={0} y={0} width={w} height={h} color={hexToRgba('#000000', adjustments.vignette * 0.22)} />
      ) : null}
    </Canvas>
  );
}

const ForwardSkia = forwardRef(SkiaBeautyCanvasInner);

/** Skia GPU preview/export. Returns null when native Skia is unavailable (Expo Go/web). */
export const SkiaBeautyCanvas = forwardRef<SkiaBeautyCanvasHandle, Props>(function SkiaBeautyCanvas(props, ref) {
  if (!isSkiaAvailableSync() || props.width <= 0 || props.height <= 0) {
    return <View style={[styles.fallback, { width: props.width || '100%', height: props.height || 300 }]} />;
  }
  return <ForwardSkia {...props} ref={ref} />;
});

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#111' },
});
