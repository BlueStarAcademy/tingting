import AsyncStorage from '@react-native-async-storage/async-storage';

const SAFE_KEY = 'tingting.camera.safe-mode';
const SESSION_KEY = 'tingting.camera.live-session';

export type CameraSafeMode = { on: boolean; reason?: string };

/**
 * Safe mode = plain camera preview (no live GL beauty, no live AR stickers); the look is still
 * applied after the shot in the editor. Persisted so a phone that struggles stays on it.
 */
export async function loadCameraSafeMode(): Promise<CameraSafeMode> {
  try {
    const raw = await AsyncStorage.getItem(SAFE_KEY);
    if (raw) return JSON.parse(raw) as CameraSafeMode;
  } catch {
    // fall through to the default
  }
  return { on: false };
}

export async function saveCameraSafeMode(mode: CameraSafeMode): Promise<void> {
  await AsyncStorage.setItem(SAFE_KEY, JSON.stringify(mode)).catch(() => {});
}

/**
 * Marks that the live pipeline is running. If the app dies or is force-closed while this is set
 * (a freeze the JS watchdog could not see), the next camera open starts in safe mode.
 */
export function markLiveSession(active: boolean): void {
  (active ? AsyncStorage.setItem(SESSION_KEY, String(Date.now())) : AsyncStorage.removeItem(SESSION_KEY)).catch(() => {});
}

/** True once if the previous live camera session never ended cleanly. */
export async function takeUnfinishedLiveSession(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    await AsyncStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
