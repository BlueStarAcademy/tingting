# 뷰티 카메라 · 사진 편집기

## 구성

| 부분 | 구현 |
|------|------|
| 촬영 | `expo-camera` (`components/beauty/BeautyCameraScreen.tsx`). 전/후면, 플래시, 타이머, 격자, 1x/2x/3x. 고른 뷰티 프리셋·필터는 `/editor?beauty=&filter=` 로 넘겨 촬영 직후 적용 |
| 얼굴 인식 | `@react-native-ml-kit/face-detection` (`lib/editor/faces.ts`). 한 장에서 최대 3명, 눈·코·입·볼 랜드마크 사용 |
| 보정 렌더링 | Skia RuntimeEffect 셰이더 하나 (`lib/editor/shader-source.ts`) — 얼굴형/턱/광대/코/눈 워프, 피부 톤 마스크 + 양방향(bilateral) 스무딩, 미백, 메이크업, 톤/효과 |
| 색감 | `lib/editor/color.ts` ColorMatrix (필터 강도는 항등 행렬과 보간) |
| 텍스트·스티커·렌즈·프레임 | Skia Paragraph/도형으로 같은 장면에 그림 (`components/editor/EditorScene.tsx`) |
| 저장 | `drawAsImage` 로 원본 해상도(긴 변 최대 2560px) 렌더 → JPEG. 원본은 항상 따로 보관 |

미리보기와 저장은 같은 `EditorScene` 을 그리므로 화면에 보이는 그대로 저장됩니다.

## 네이티브 빌드

ML Kit 은 네이티브 모듈이라 **새 APK 빌드가 필요**합니다 (`eas build --profile preview --platform android`).
이전 APK 에 OTA 로 새 JS 가 들어가면 얼굴 인식만 꺼지고(편집기에 안내 문구 표시) 나머지 편집 기능은 동작합니다.

## 확인 목록

1. 카메라 탭 → 뷰티 카메라 촬영 → 편집기에서 프리셋이 바로 적용되는지
2. 뷰티 탭 상단에 "얼굴 N명 인식" 이 뜨는지, 얼굴 슬림/눈 확대가 얼굴 위치에서만 움직이는지
3. 자르기(자유 비율 포함)·회전·반전 후에도 얼굴 보정이 다시 맞는지
4. 텍스트/스티커: 탭 선택, 드래그 이동, 두 손가락 크기·회전, 되돌리기/다시하기
5. 저장 후 사진 화면에서 편집본/원본 전환, 휴대폰 저장
