import { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import type { SkiaBeautyCanvasHandle } from './skia-beauty-types';

export type { SkiaBeautyCanvasHandle } from './skia-beauty-types';

type Props = {
  uri: string;
  width: number;
  height: number;
  [key: string]: unknown;
};

/** Web stub — Skia native module is not used in static web export. */
export const SkiaBeautyCanvas = forwardRef<SkiaBeautyCanvasHandle, Props>(
  function SkiaBeautyCanvasWeb(props, ref) {
    useImperativeHandle(ref, () => ({
      exportJpeg: async () => {
        throw new Error('Skia export is not available on web');
      },
    }));
    return (
      <View
        style={[
          styles.fallback,
          { width: props.width || '100%', height: props.height || 300 },
        ]}
      />
    );
  },
);

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#111' },
});
