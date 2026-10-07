import { useEffect, useState } from 'react';
import { FilterMode, Group, Image, MipmapMode, Skia, loadData, type SkImage } from '@shopify/react-native-skia';
import type { ArOp } from '@/lib/ar/effects';
import { AR_SPRITES, type SpriteId } from '@/lib/ar/sprites';

export type ArImages = Partial<Record<SpriteId, SkImage>>;

const loaded: ArImages = {};
const pending = new Map<SpriteId, Promise<void>>();

function loadSprite(id: SpriteId): Promise<void> {
  if (loaded[id]) return Promise.resolve();
  let job = pending.get(id);
  if (!job) {
    // failures are not cached, so a missing sprite is retried on the next request
    job = loadData(AR_SPRITES[id].src, (data) => Skia.Image.MakeImageFromEncoded(data))
      .then((image) => {
        if (image) loaded[id] = image;
      })
      .catch(() => {})
      .finally(() => pending.delete(id));
    pending.set(id, job);
  }
  return job;
}

export function loadedArImages(): ArImages {
  return { ...loaded };
}

/** Decodes only the given sprites (the live camera needs a few, not the whole catalog). */
export async function loadArSprites(ids: readonly SpriteId[]): Promise<ArImages> {
  await Promise.all(ids.map(loadSprite));
  return { ...loaded };
}

export const arSpritesOf = (ops: readonly ArOp[]): SpriteId[] => Array.from(new Set(ops.map((op) => op.sprite)));

/** Decoded art for the sprites these ops draw; each sprite is decoded once per app session. */
export function useArImages(ops: readonly ArOp[]): ArImages {
  const [images, setImages] = useState<ArImages>(() => ({ ...loaded }));
  const key = arSpritesOf(ops).sort().join(',');
  useEffect(() => {
    if (!key) return;
    const ids = key.split(',') as SpriteId[];
    let alive = true;
    loadArSprites(ids).then((next) => alive && setImages(next));
    return () => {
      alive = false;
    };
  }, [key]);
  return images;
}

const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear } as const;

export function ArLayer({ ops, images }: { ops: ArOp[]; images: ArImages }) {
  return (
    <>
      {ops.map((op, i) => {
        const image = images[op.sprite];
        if (!image) return null;
        return (
          <Group
            key={i}
            transform={[{ translateX: op.x }, { translateY: op.y }, { rotate: op.rot }]}
            opacity={Math.min(1, op.alpha)}
          >
            <Image
              image={image}
              x={-op.w / 2}
              y={-op.h / 2}
              width={op.w}
              height={op.h}
              fit="fill"
              sampling={SAMPLING}
            />
          </Group>
        );
      })}
    </>
  );
}
