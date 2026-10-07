import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { FilterMode, MipmapMode, Skia, SkiaPictureView, type SkPicture } from '@shopify/react-native-skia';
import { layoutArEffect, type ArFace } from '@/lib/ar/effects';
import type { SpriteId } from '@/lib/ar/sprites';
import { scaleFace, type FaceGeom } from '@/lib/editor/faces';
import { loadArSprites, loadedArImages, type ArImages } from './ArLayer';

export type ArLiveHandle = {
  /** draws one frame; called by the camera right after it rendered the frame with these faces */
  draw: (faces: readonly FaceGeom[], bufferWidth: number, at: number) => void;
};

type Props = {
  effectId: string;
  width: number;
  height: number;
};

type ViewApi = {
  setJsiProperty: (nativeId: number, name: string, value: unknown) => void;
  requestRedraw: (nativeId: number) => void;
};

const viewApi = () => (globalThis as { SkiaViewApi?: ViewApi }).SkiaViewApi ?? null;

type Rect = { x: number; y: number; width: number; height: number };

type State = {
  tracks: ArFace[];
  last: number;
  start: number;
  drawn: number;
  images: ArImages;
  requested: Set<SpriteId>;
  picture: SkPicture | null;
  recorder: ReturnType<typeof Skia.PictureRecorder>;
  paint: ReturnType<typeof Skia.Paint>;
  src: Rect;
  dst: Rect;
};

const createState = (): State => ({
  tracks: [],
  last: 0,
  start: 0,
  drawn: 0,
  images: loadedArImages(),
  requested: new Set(),
  picture: null,
  recorder: Skia.PictureRecorder(),
  paint: Skia.Paint(),
  src: { x: 0, y: 0, width: 1, height: 1 },
  dst: { x: 0, y: 0, width: 1, height: 1 },
});

/**
 * Draws the AR effect over the live preview. The camera calls `draw` once per rendered GL frame with
 * the same (already smoothed and predicted) faces it used for the beauty warp, so stickers move in
 * lockstep with the image. Each frame is recorded into a Skia picture and handed to the native view
 * directly: no React state, no re-render per frame.
 */
export const ArLiveOverlay = memo(
  forwardRef<ArLiveHandle, Props>(function ArLiveOverlay({ effectId, width, height }, ref) {
    const viewRef = useRef<SkiaPictureView | null>(null);
    const stateRef = useRef<State | null>(null);
    stateRef.current ??= createState();
    const s = stateRef.current;

    const show = (picture: SkPicture | null) => {
      const view = viewRef.current;
      const api = viewApi();
      if (!view || !api) return;
      api.setJsiProperty(view.nativeId, 'picture', picture);
      api.requestRedraw(view.nativeId);
      s.picture?.dispose();
      s.picture = picture;
    };

    useEffect(() => {
      s.tracks = [];
      s.last = 0;
      s.start = 0;
      s.drawn = 0;
      s.requested.clear();
      return () => {
        s.picture?.dispose();
        s.picture = null;
      };
    }, [effectId, s]);

    useImperativeHandle(
      ref,
      () => ({
        draw(faces, bufferWidth, at) {
          const dt = s.last ? Math.min(0.1, (at - s.last) / 1000) : 0;
          s.last = at;
          if (!s.start) s.start = at;
          const scale = width / Math.max(1, bufferWidth);
          const used = new Set<ArFace>();
          const next: ArFace[] = [];
          for (const face of faces) {
            const target = scaleFace(face, scale);
            let best: ArFace | null = null;
            let bestD = Infinity;
            for (const t of s.tracks) {
              if (used.has(t)) continue;
              const d = Math.hypot(t.face.center.x - target.center.x, t.face.center.y - target.center.y);
              if (d < bestD) {
                bestD = d;
                best = t;
              }
            }
            if (best && bestD < target.radius.x * 1.5) {
              used.add(best);
              next.push({ face: target, presence: Math.min(1, best.presence + dt * 6) });
            } else {
              next.push({ face: target, presence: 0 });
            }
          }
          for (const t of s.tracks) {
            if (used.has(t)) continue;
            const presence = t.presence - dt * 4;
            if (presence > 0) next.push({ face: t.face, presence });
          }
          s.tracks = next;

          const ops = layoutArEffect(effectId, { width, height, time: (at - s.start) / 1000, faces: next });
          // nothing to draw before and after: leave the view alone
          if (ops.length === 0 && s.drawn === 0) return;
          s.drawn = ops.length;

          const missing: SpriteId[] = [];
          for (const op of ops) {
            if (!s.requested.has(op.sprite)) {
              s.requested.add(op.sprite);
              missing.push(op.sprite);
            }
          }
          if (missing.length) {
            loadArSprites(missing).then((loaded) => {
              s.images = loaded;
            });
          }

          const canvas = s.recorder.beginRecording({ x: 0, y: 0, width, height });
          for (const op of ops) {
            const image = s.images[op.sprite];
            if (!image) continue;
            s.src.width = image.width();
            s.src.height = image.height();
            s.dst.x = -op.w / 2;
            s.dst.y = -op.h / 2;
            s.dst.width = op.w;
            s.dst.height = op.h;
            s.paint.setAlphaf(Math.min(1, op.alpha));
            canvas.save();
            canvas.translate(op.x, op.y);
            canvas.rotate((op.rot * 180) / Math.PI, 0, 0);
            canvas.drawImageRectOptions(image, s.src, s.dst, FilterMode.Linear, MipmapMode.Linear, s.paint);
            canvas.restore();
          }
          show(s.recorder.finishRecordingAsPicture());
        },
      }),
      [effectId, width, height, s],
    );

    return <SkiaPictureView ref={viewRef} style={StyleSheet.absoluteFill} pointerEvents="none" />;
  }),
);
