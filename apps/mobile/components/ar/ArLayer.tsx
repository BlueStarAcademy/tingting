import { useEffect, useState } from 'react';
import { FilterMode, Group, Image, MipmapMode, Skia, loadData, type SkImage } from '@shopify/react-native-skia';
import type { ArOp } from '@/lib/ar/effects';
import { AR_SPRITES, SPRITE_IDS, type SpriteId } from '@/lib/ar/sprites';

export type ArImages = Partial<Record<SpriteId, SkImage>>;

const loaded: ArImages = {};
let pending: Promise<ArImages> | null = null;

export function loadArImages(): Promise<ArImages> {
  if (!pending) {
    pending = Promise.all(
      SPRITE_IDS.map((id) =>
        loadData(AR_SPRITES[id].src, (data) => Skia.Image.MakeImageFromEncoded(data))
          .then((image) => {
            if (image) loaded[id] = image;
          })
          .catch(() => {}),
      ),
    ).then(() => {
      // retry the missing ones next time instead of caching a partial failure forever
      if (SPRITE_IDS.some((id) => !loaded[id])) pending = null;
      return { ...loaded };
    });
  }
  return pending;
}

/** Decoded sticker art, loaded once per app session. */
export function useArImages(enabled = true): ArImages {
  const [images, setImages] = useState<ArImages>(() => ({ ...loaded }));
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadArImages().then((next) => alive && setImages(next));
    return () => {
      alive = false;
    };
  }, [enabled]);
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
