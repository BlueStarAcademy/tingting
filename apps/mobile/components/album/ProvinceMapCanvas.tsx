import { memo } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { SEA_GRADIENT_ID, SEA_STOPS, type SceneNode } from '@/lib/city-map-scene';
import type { Viewport } from '@/lib/city-map';

function renderNode(n: SceneNode) {
  switch (n.t) {
    case 'path':
      return (
        <Path
          key={n.k}
          d={n.d}
          fill={n.fill}
          stroke={n.stroke}
          strokeWidth={n.sw}
          strokeDasharray={n.dash}
          strokeLinejoin="round"
          fillRule="evenodd"
        />
      );
    case 'rect':
      return (
        <Rect
          key={n.k}
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          rx={n.rx}
          fill={n.fill}
          stroke={n.stroke}
          strokeWidth={n.sw}
          strokeDasharray={n.dash}
        />
      );
    case 'circle':
      return <Circle key={n.k} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={n.sw} />;
    case 'text':
      return (
        <SvgText key={n.k} x={n.x} y={n.y} fill={n.fill} fontSize={n.size} fontWeight={n.weight} textAnchor="middle">
          {n.text}
        </SvgText>
      );
  }
}

export const ProvinceMapCanvas = memo(function ProvinceMapCanvas({
  nodes,
  viewport,
  width,
  height,
}: {
  nodes: SceneNode[];
  viewport: Viewport;
  width: number;
  height: number;
}) {
  return (
    <Svg width={width} height={height} viewBox={`${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`}>
      <Defs>
        <LinearGradient id={SEA_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={SEA_STOPS[0]} />
          <Stop offset="1" stopColor={SEA_STOPS[1]} />
        </LinearGradient>
      </Defs>
      {nodes.map(renderNode)}
    </Svg>
  );
});
