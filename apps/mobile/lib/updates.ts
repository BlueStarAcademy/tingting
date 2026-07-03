import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/** 앱 실행 시 EAS Update 확인 후 JS 번들 자동 적용 (네이티브 전용) */
export async function checkAndApplyUpdatesOnLaunch(): Promise<void> {
  if (Platform.OS === 'web' || __DEV__) return;
  if (!Updates.isEnabled) return;

  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[updates] check failed:', error);
  }
}
