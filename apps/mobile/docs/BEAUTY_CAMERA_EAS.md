# Beauty Camera — EAS Development Build

Live beauty, face landmarks, Skia, and Vision Camera require a **development build** (not Expo Go).

## Build

```bash
# from repo root
npm install
npm run eas:android:dev
# or from apps/mobile:
# npx eas-cli build --profile development --platform android
```

Install the APK/IPA on device, then:

```bash
npm run mobile:dev-client
# or: npx expo start --dev-client
```

> Note: Do **not** put `react-native-vision-camera` in `app.json` plugins on this Expo SDK —
> v5 has no `app.plugin.js` and breaks `expo start`. Use `expo-camera` permissions plugin;
> Vision Camera is optional via runtime require in Dev Client only.

## Stack (Dev Client)

| Layer | Package | Role |
|-------|---------|------|
| Live camera | `react-native-vision-camera` | Viewfinder + shutter (falls back to `expo-camera`) |
| GPU compose | `@shopify/react-native-skia` | ColorMatrix LUT filters + beauty/makeup bake |
| Face | `mediapipe-provider` + `face-detect` | Landmarks for makeup/AR; swap in native MediaPipe via `registerNativeFaceDetector` |
| Persist | `POST /media/upload` | HTTPS URL for visits/groups + MediaLibrary album save |

## Verify checklist

1. Admin login (`tingadmin`) unlocks all editor passes, slots, nickname, ad-free.
2. Photos tab → **뷰티 촬영** opens Vision Camera (or expo-camera fallback) with lens chips; shutter returns to editor.
3. Beauty / Makeup / Lens tabs apply face-anchored layers; **Apply** prefers Skia JPEG export (no stickers) else view-shot.
4. Save to device creates/updates TingTing album (native) or downloads (web).
5. Visit editor / group gallery save uploads via `POST /media/upload` and stores HTTPS URL.
6. Set `SUPABASE_SERVICE_ROLE_KEY` + run `006_photos_storage.sql` for Supabase Storage; otherwise API serves `/media/files/*`.

## Native face landmarker

```ts
import { registerNativeFaceDetector } from '@/lib/beauty-engine';
registerNativeFaceDetector(async (uri) => { /* MediaPipe 478 pts → FaceLandmarks */ });
```

Until linked, `analyzeFaceFromImage` places selfie-oriented anchors for makeup/AR.
