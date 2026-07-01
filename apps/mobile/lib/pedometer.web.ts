type StepCallback = (result: { steps: number }) => void;

export const Pedometer = {
  async isAvailableAsync() {
    return false;
  },
  watchStepCount(_callback: StepCallback) {
    return { remove: () => {} };
  },
  async getStepCountAsync(_start: Date, _end: Date) {
    return { steps: 0 };
  },
};
