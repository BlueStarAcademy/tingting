import { Platform } from 'react-native';
import { Pedometer as ExpoPedometer } from 'expo-sensors';

const unavailablePedometer = {
  async getPermissionsAsync() {
    return { granted: false, status: 'denied', canAskAgain: false, expires: 'never' };
  },
  async requestPermissionsAsync() {
    return { granted: false, status: 'denied', canAskAgain: false, expires: 'never' };
  },
  async isAvailableAsync() {
    return false;
  },
  watchStepCount(_callback: (result: { steps: number }) => void) {
    return { remove: () => {} };
  },
  async getStepCountAsync(_start: Date, _end: Date) {
    return { steps: 0 };
  },
} as typeof ExpoPedometer;

export const Pedometer = Platform.OS === 'web' ? unavailablePedometer : ExpoPedometer;
