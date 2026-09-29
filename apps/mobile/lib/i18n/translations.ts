const ko: Record<string, string> = {
  appName: 'TingTing',

  'common.alert': '알림',
  'common.back': '뒤로',
  'common.error': '오류',
  'common.ok': '확인',
  'common.cancel': '취소',

  'header.settings': '설정',
  'header.logout': '로그아웃',
  'header.logoutConfirm': '로그아웃 하시겠어요?',
  'header.cancel': '취소',

  'auth.tagline': '우리 둘만의 전국일주 기록',
  'auth.email': '이메일',
  'auth.password': '비밀번호',
  'auth.login': '로그인',
  'auth.loginFailed': '로그인 실패',
  'auth.unknownError': '알 수 없는 오류가 발생했어요',

  'map.nationalProgressTitle': '전국일주 진행도',
  'map.nationalProgressSub': '{{visited}}/{{total}} 지역 방문',
  'map.zoomIn': '확대',
  'map.zoomOut': '축소',

  'visits.cameraPermissionTitle': '카메라 권한 필요',
  'visits.cameraPermissionMessage': '카메라 접근을 허용해 주세요',
  'visits.permissionTitle': '사진 권한 필요',
  'visits.permissionMessage': '갤러리 접근을 허용해 주세요',

  'editor.filters': '필터',
  'editor.stickers': '스티커',
  'editor.ai': '원터치 보정',
  'editor.text': '텍스트',
  'editor.crop': '자르기',

  'photos.beauty': '뷰티',
  'photos.makeup': '메이크업',
  'photos.lens': '렌즈',
  'photos.adjust': '보정',
  'photos.frames': '프레임',
  'photos.effects': '효과',
  'photos.emptyTitle': '사진 편집 스튜디오',
  'photos.emptySub': '촬영하거나 갤러리 사진을 골라 뷰티·메이크업·렌즈·필터·스티커로 마음껏 꾸며 보세요.',
  'photos.pickFromGallery': '갤러리에서 선택',
  'photos.shoot': '뷰티 촬영',
  'photos.beautyCamera': '뷰티 카메라',
  'photos.beautyIntensity': '뷰티 강도',
  'photos.makeupIntensity': '메이크업 강도',
  'photos.cameraPermissionNeeded': '뷰티 촬영을 위해 카메라 권한이 필요해요.',
  'photos.grantCamera': '카메라 허용',
  'photos.liveCameraDevClient': '실시간 뷰티 카메라는 앱(APK)에서만 동작해요.',
  'photos.pickAnother': '다른 사진 선택',
  'photos.saveToGallery': '갤러리에 저장',
  'photos.saveSheetTitle': '사진 저장',
  'photos.saveFilenameLabel': '파일 이름',
  'photos.saveFilenameHintWeb': '저장을 누르면 브라우저에서 파일 이름을 고를 수 있어요.',
  'photos.saveFilenameHintNative': '사진 앱 갤러리에 아래 파일 이름으로 저장돼요.',
  'photos.savedTitle': '저장 완료',
  'photos.savedMessage': '편집한 사진을 갤러리에 저장했어요',
  'photos.savedMessageNamed': '"{{name}}" 저장이 완료됐어요',
  'photos.saveFailed': '사진 저장에 실패했어요',
  'photos.savePermissionTitle': '저장 권한 필요',
  'photos.savePermissionMessage': '편집한 사진을 갤러리에 저장하려면 접근을 허용해 주세요',
  'photos.webUnsupported': '웹에서는 파일 다운로드로 저장돼요.',
  'photos.applyEdits': '적용',
  'photos.applyFailed': '편집 적용에 실패했어요',
  'photos.stickerHint': '스티커를 눌러 추가하세요. 끌어서 옮기고, 오른쪽 아래 손잡이로 크기를 바꿀 수 있어요.',
  'photos.selectedSticker': '선택한 스티커',
  'photos.stickerScale': '크기',
  'photos.stickerRotate': '회전',
  'photos.stickerDelete': '삭제',
  'photos.adjustIntensity': '강도',
  'photos.adjustReset': '초기화',

  'settings.title': '설정',
  'settings.appUpdate': '앱 업데이트',
  'settings.appVersion': '버전 {{version}}',
  'settings.updateUpToDate': '최신 버전이에요',
  'settings.updateUpToDateMessage': '앱이 최신 상태예요.',
  'settings.updateApplied': '업데이트 적용 중',
  'settings.updateAppliedMessage': '잠시 후 앱이 다시 시작돼요.',
  'settings.updateFailed': '업데이트 확인에 실패했어요',
  'settings.updateDisabled': '이 빌드에서는 앱 내 업데이트를 사용할 수 없어요',
  'settings.changePassword': '비밀번호 변경',
  'settings.currentPassword': '현재 비밀번호',
  'settings.newPassword': '새 비밀번호',
  'settings.pwChanged': '변경 완료',
  'settings.pwChangedMessage': '비밀번호가 변경됐어요',
};

export function translate(key: string, params?: Record<string, string | number>): string {
  let text = ko[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), String(value));
    }
  }
  return text;
}
