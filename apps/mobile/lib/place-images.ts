import type { Place } from '@tingting/shared';

const CROP = 'auto=format&fit=crop&w=600&h=400&q=80';

/** Category fallback covers (Unsplash) */
export const CATEGORY_IMAGES: Record<string, string> = {
  food: `https://images.unsplash.com/photo-1504674900247-0877df9cc836?${CROP}`,
  restaurant: `https://images.unsplash.com/photo-1504674900247-0877df9cc836?${CROP}`,
  stay: `https://images.unsplash.com/photo-1566073771259-6a8506099945?${CROP}`,
  hotel: `https://images.unsplash.com/photo-1566073771259-6a8506099945?${CROP}`,
  event: `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?${CROP}`,
  activity: `https://images.unsplash.com/photo-1529156069898-49953e39b3ac?${CROP}`,
  beach: `https://images.unsplash.com/photo-1505142468610-359e7d316be0?${CROP}`,
  culture: `https://images.unsplash.com/photo-1559827260-dc66d52bef19?${CROP}`,
  city: `https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?${CROP}`,
  science: `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?${CROP}`,
  heritage: `https://images.unsplash.com/photo-1548013146-72479768bada?${CROP}`,
  landmark: `https://images.unsplash.com/photo-1555881400-74d7acaacd8b?${CROP}`,
  mountain: `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?${CROP}`,
  sea: `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?${CROP}`,
  park: `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?${CROP}`,
  nature: `https://images.unsplash.com/photo-1469474968028-56623f02e42e?${CROP}`,
};

export function getPlaceImageUrl(place: Place): string {
  return (
    place.imageUrl ??
    CATEGORY_IMAGES[place.category] ??
    `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?${CROP}`
  );
}
