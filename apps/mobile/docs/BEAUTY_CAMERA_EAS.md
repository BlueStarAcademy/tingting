# Beauty Camera

## Runtime

| Environment | Camera | Compose |
|-------------|--------|---------|
| Web | Gallery/edit only (live camera message) | Overlay + view-shot |
| Expo Go | `expo-camera` | Overlay + view-shot (Skia optional if linked) |
| Dev Client / release | `expo-camera` | Skia ColorMatrix when `@shopify/react-native-skia` is available |

`react-native-vision-camera` was removed — it has no Expo config plugin on this SDK and broke web static export (`react-native-nitro-modules` missing).

## Verify checklist

1. Admin login unlocks editor passes / slots / ad-free.
2. Photos tab → beauty shoot uses expo-camera on native; web shows fallback copy.
3. Beauty / Makeup / Lens tabs apply face-anchored layers; Apply flattens via Skia (native) or view-shot.
4. Device save → TingTing album / web download.
5. Visit / group gallery → `POST /media/upload` HTTPS URLs.
6. Optional: `SUPABASE_SERVICE_ROLE_KEY` + `006_photos_storage.sql`.

## Face landmarker hook

```ts
import { registerNativeFaceDetector } from '@/lib/beauty-engine';
registerNativeFaceDetector(async (uri) => { /* map landmarks */ });
```
