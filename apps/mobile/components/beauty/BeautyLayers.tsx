import { Text, View, StyleSheet } from 'react-native';
import type { BeautyParams, FaceLandmarks, MakeupParams } from '@/lib/beauty-engine';
import {
  buildBeautyOverlays,
  buildLensOverlays,
  buildMakeupOverlays,
  buildReshapeShadeOverlays,
} from '@/lib/beauty-engine';

type Props = {
  beauty: BeautyParams;
  makeup: MakeupParams;
  lensId: string | null;
  face: FaceLandmarks | null;
};

export function BeautyLayers({ beauty, makeup, lensId, face }: Props) {
  const layers = [
    ...buildBeautyOverlays(beauty),
    ...buildReshapeShadeOverlays(beauty, face),
    ...buildMakeupOverlays(makeup, face, beauty),
    ...buildLensOverlays(lensId, face, beauty),
  ];

  return (
    <>
      {layers.map((layer) => (
        <View
          key={layer.key}
          pointerEvents="none"
          style={[
            styles.layer,
            layer.style,
            layer.color !== 'transparent' ? { backgroundColor: layer.color, opacity: layer.opacity } : null,
          ]}
        >
          {layer.text ? (
            <Text style={[styles.emoji, layer.textStyle]}>{layer.text}</Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    overflow: 'hidden',
  },
  emoji: {
    textAlign: 'center',
  },
});
