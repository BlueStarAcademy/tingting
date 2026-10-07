import AsyncStorage from '@react-native-async-storage/async-storage';

const OFF_KEY = 'tingting.editor.effects-off';
const PENDING_KEY = 'tingting.editor.effect-pending';

export type EditorEffectsOff = { off: boolean; reason?: string };

/**
 * "Effects off" = the editor previews and exports without the beauty/effect shader (color, crop,
 * text, stickers and frames still work). Persisted after the shader failed, ran too slowly or the
 * app died while it was first drawn, so the editor keeps opening on that phone.
 */
export async function loadEditorEffectsOff(): Promise<EditorEffectsOff> {
  try {
    const raw = await AsyncStorage.getItem(OFF_KEY);
    if (raw) return JSON.parse(raw) as EditorEffectsOff;
  } catch {
    // fall through to the default
  }
  return { off: false };
}

export function saveEditorEffectsOff(value: EditorEffectsOff): Promise<void> {
  return AsyncStorage.setItem(OFF_KEY, JSON.stringify(value)).catch(() => {});
}

/** Set while the shader is drawn on screen for the first time; see takeUnfinishedEffectDraw. */
export function markEffectDrawPending(active: boolean): void {
  (active ? AsyncStorage.setItem(PENDING_KEY, String(Date.now())) : AsyncStorage.removeItem(PENDING_KEY)).catch(
    () => {},
  );
}

/** True once if the app died before the previous first on-screen shader draw completed. */
export async function takeUnfinishedEffectDraw(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    await AsyncStorage.removeItem(PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}
