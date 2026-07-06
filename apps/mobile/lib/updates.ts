import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { loadPublicConfig } from './public-config';

export type AppUpdateStatus = 'disabled' | 'upToDate' | 'available' | 'error';

export function getAppVersionLabel(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

export function isAppUpdateEnabled(): boolean {
  return Platform.OS !== 'web' && !__DEV__ && Updates.isEnabled;
}

/** 앱 실행 시 EAS Update 확인 후 JS 번들 자동 적용 (네이티브 전용) */
export async function checkAndApplyUpdatesOnLaunch(): Promise<void> {
  if (!isAppUpdateEnabled()) return;

  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[updates] check failed:', error);
  }
}

export async function checkForAppUpdate(): Promise<{ status: AppUpdateStatus; message?: string }> {
  if (!isAppUpdateEnabled()) return { status: 'disabled' };
  try {
    const result = await Updates.checkForUpdateAsync();
    return result.isAvailable ? { status: 'available' } : { status: 'upToDate' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Update check failed',
    };
  }
}

export async function applyAppUpdate(): Promise<void> {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}

export async function openLatestApkDownload(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const config = await loadPublicConfig();
  if (!config.apkDownloadUrl) return false;
  await Linking.openURL(config.apkDownloadUrl);
  return true;
}
