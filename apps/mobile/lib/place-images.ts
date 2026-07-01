import type { Place } from '@tingting/shared';

/** Curated cover photos for demo / local mode (Unsplash, crop 600×400) */
const PLACE_IMAGES: Record<string, string> = {
  'p-seo-1': 'https://images.unsplash.com/photo-1583417319070-4a1d3d9f5a6e?auto=format&fit=crop&w=600&h=400&q=80',
  'p-seo-2': 'https://images.unsplash.com/photo-1534274867514-d5b3310cb327?auto=format&fit=crop&w=600&h=400&q=80',
  'p-bus-1': 'https://images.unsplash.com/photo-1596436889106-58a3ee4c6b54?auto=format&fit=crop&w=600&h=400&q=80',
  'p-bus-2': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=600&h=400&q=80',
  'p-dae-1': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=600&h=400&q=80',
  'p-icn-1': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&h=400&q=80',
  'p-gwj-1': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&h=400&q=80',
  'p-djn-1': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&h=400&q=80',
  'p-uls-1': 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=600&h=400&q=80',
  'p-sjg-1': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&h=400&q=80',
  'p-ggd-1': 'https://images.unsplash.com/photo-1517154421774-6aad56366d86?auto=format&fit=crop&w=600&h=400&q=80',
  'p-gwn-1': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&h=400&q=80',
  'p-ncb-1': 'https://images.unsplash.com/photo-1439066588041-2504cb8550a9?auto=format&fit=crop&w=600&h=400&q=80',
  'p-scb-1': 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=600&h=400&q=80',
  'p-njb-1': 'https://images.unsplash.com/photo-1583417319070-4a1d3d9f5a6e?auto=format&fit=crop&w=600&h=400&q=80',
  'p-sjb-1': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a8fe05?auto=format&fit=crop&w=600&h=400&q=80',
  'p-ngb-1': 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=600&h=400&q=80',
  'p-sgb-1': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=600&h=400&q=80',
  'p-jej-1': 'https://images.unsplash.com/photo-1590523277543-a94d2e4ddb54?auto=format&fit=crop&w=600&h=400&q=80',
  'p-jej-2': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&h=400&q=80',
};

export function getPlaceImageUrl(place: Place): string | undefined {
  return place.imageUrl ?? PLACE_IMAGES[place.id];
}
