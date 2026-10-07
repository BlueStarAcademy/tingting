import { memo, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { layoutArEffect, type ArFace, type ArOp } from '@/lib/ar/effects';
import type { SpriteId } from '@/lib/ar/sprites';
import { blendFace, scaleFace, type FaceGeom } from '@/lib/editor/faces';
import { ArLayer, loadArSprites, loadedArImages, type ArImages } from './ArLayer';

/** Latest tracking result, written by the camera and read every animation frame. */
export type ArFeed = { faces: FaceGeom[]; bufferWidth: number; at: number };

export const createArFeed = (): ArFeed => ({ faces: [], bufferWidth: 1, at: 0 });

type Props = {
  effectId: string;
  feed: MutableRefObject<ArFeed>;
  width: number;
  height: number;
};

const FRAME_MS = 33;
const STALE_MS = 700;

/**
 * Draws the AR effect over the live preview. Detections arrive a few times a second;
 * between them each sticker eases toward the newest face so it glides instead of jumping.
 */
export const ArLiveOverlay = memo(function ArLiveOverlay({ effectId, feed, width, height }: Props) {
  const [images, setImages] = useState<ArImages>(loadedArImages);
  const [ops, setOps] = useState<ArOp[]>([]);
  const tracks = useRef<ArFace[]>([]);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let last = 0;
    let drawn = 0;
    const start = Date.now();
    const requested = new Set<SpriteId>();
    tracks.current = [];
    const step = () => {
      raf = requestAnimationFrame(step);
      const now = Date.now();
      if (now - last < FRAME_MS) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;

      const src = feed.current;
      const scale = width / Math.max(1, src.bufferWidth);
      const targets = now - src.at < STALE_MS ? src.faces.map((f) => scaleFace(f, scale)) : [];
      const ease = 1 - Math.exp(-dt * 14);
      const used = new Set<ArFace>();
      const next: ArFace[] = [];
      for (const target of targets) {
        let best: ArFace | null = null;
        let bestD = Infinity;
        for (const t of tracks.current) {
          if (used.has(t)) continue;
          const d = Math.hypot(t.face.center.x - target.center.x, t.face.center.y - target.center.y);
          if (d < bestD) {
            bestD = d;
            best = t;
          }
        }
        if (best && bestD < target.radius.x * 1.5) {
          used.add(best);
          next.push({ face: blendFace(best.face, target, ease), presence: Math.min(1, best.presence + dt * 6) });
        } else {
          next.push({ face: target, presence: 0 });
        }
      }
      for (const t of tracks.current) {
        if (used.has(t)) continue;
        const presence = t.presence - dt * 4;
        if (presence > 0) next.push({ face: t.face, presence });
      }
      tracks.current = next;
      const nextOps = layoutArEffect(effectId, { width, height, time: (now - start) / 1000, faces: next });
      // nothing to draw before and after: skip the re-render entirely
      if (nextOps.length === 0 && drawn === 0) return;
      drawn = nextOps.length;

      const missing: SpriteId[] = [];
      for (const op of nextOps) {
        if (!requested.has(op.sprite)) {
          requested.add(op.sprite);
          missing.push(op.sprite);
        }
      }
      if (missing.length) loadArSprites(missing).then((loaded) => alive && setImages(loaded));
      setOps(nextOps);
    };
    raf = requestAnimationFrame(step);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [effectId, feed, width, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <ArLayer ops={ops} images={images} />
    </Canvas>
  );
});
