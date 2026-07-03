import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_AD_FREE = '@tingting/ad-free-purchased';

export async function isAdFreePurchased(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEY_AD_FREE);
  return val === 'true';
}

export async function setAdFreePurchased(): Promise<void> {
  await AsyncStorage.setItem(KEY_AD_FREE, 'true');
}
