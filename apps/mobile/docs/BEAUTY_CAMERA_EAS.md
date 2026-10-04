# 뷰티 카메라 · 사진 편집기

## 구성

| 부분 | 구현 |
|------|------|
| 실시간 미리보기 | `components/beauty/LiveBeautyView.tsx`. `expo-camera` 미리보기를 `expo-gl` 의 `createCameraTextureAsync` 로 GL 텍스처로 받아 GLSL 셰이더(`lib/editor/camera-shader-source.ts`)로 매 프레임 그림 |
| 실시간 얼굴 추적 | 카메라 화면을 작은(360px) 프레임버퍼에 복사 → `takeSnapshotAsync` → ML Kit(fast) → 미리보기 좌표로 변환 후 지수 평활. 초당 약 5~10회 |
| 촬영 화면 | `components/beauty/BeautyCameraScreen.tsx`. 전/후면, 플래시(전면은 화면 플래시), 타이머 0/3/5/10, 비율 3:4·1:1·9:16, 격자, 1x/2x, 뷰티/필터 패널, 누르고 있으면 원본 비교. 설정은 AsyncStorage 에 저장 |
| 얼굴 인식(결과 화면) | `@react-native-ml-kit/face-detection` (`lib/editor/faces.ts`). 정확도 모드 랜드마크 + 윤곽선(얼굴 외곽·입술·눈·코) 2회 호출을 합쳐 사용, 최대 3명 |
| 보정 수식 | `lib/editor/beauty-core.ts` 하나를 Skia(SkSL)와 GL(GLSL ES 3.0) 셰이더가 같이 씀 — 얼굴 슬림/V라인/턱 길이/광대/코/눈 워프, 피부 마스크 + bilateral 스무딩, 미백, 피부톤, 립 틴트, 블러셔 |
| 색감 | `lib/editor/color.ts` ColorMatrix (필터 강도는 항등 행렬과 보간). 카메라는 같은 행렬을 mat4 로 넘김 |
| 텍스트·스티커·렌즈·프레임 | Skia Paragraph/도형으로 같은 장면에 그림 (`components/editor/EditorScene.tsx`) |
| 저장 | 촬영 → 비율에 맞게 자름 → 편집기(결과 화면)에 카메라 설정(`look`)을 그대로 적용 → `drawAsImage` 로 원본 해상도(긴 변 최대 2560px) 렌더 → JPEG. 원본은 항상 따로 보관 |

실시간 미리보기가 안 되는 기기(카메라 텍스처 생성 실패, 5초간 프레임 없음)는 자동으로 일반 미리보기로 바뀌고,
"미리보기는 원본 · 찍으면 뷰티가 적용돼요" 안내가 뜹니다. 이때도 결과 화면에서는 모든 보정이 적용됩니다.

## 네이티브 빌드

`expo-gl`, ML Kit 은 네이티브 모듈이라 **새 APK 빌드가 필요**합니다 (expo.dev → Builds → Build from GitHub → Android, profile `preview`).

## 셰이더 확인

```
node apps/mobile/scripts/check-shaders.mjs
```

CanvasKit 으로 편집기 셰이더와 카메라 셰이더(SkSL 쌍둥이)를 컴파일합니다.

## 확인 목록

1. 카메라 → 상단 상태 표시가 "실시간 뷰티" 로 바뀌는지, 피부 보정·미백·필터가 미리보기에 바로 보이는지
2. 얼굴을 비추면 "얼굴 인식됨" → 얼굴 슬림/눈 확대/립/블러셔가 미리보기에서 따라오는지
3. 비교 버튼을 누르고 있으면 원본, 떼면 보정 화면
4. 촬영 → 결과 화면에 같은 보정이 적용되는지, 비교 버튼으로 전/후 확인
5. 저장 후 사진 화면에서 편집본/원본 전환, 휴대폰 저장
