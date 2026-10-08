import { createElement, memo } from 'react';
import { SEA_GRADIENT_ID, SEA_STOPS, type SceneNode } from '@/lib/city-map-scene';
import type { Viewport } from '@/lib/city-map';

function renderNode(n: SceneNode) {
  switch (n.t) {
    case 'path':
      return createElement('path', {
        key: n.k,
        d: n.d,
        fill: n.fill,
        stroke: n.stroke,
        strokeWidth: n.sw,
        strokeDasharray: n.dash,
        strokeLinejoin: 'round',
        fillRule: 'evenodd',
      });
    case 'rect':
      return createElement('rect', {
        key: n.k,
        x: n.x,
        y: n.y,
        width: n.w,
        height: n.h,
        rx: n.rx,
        fill: n.fill,
        stroke: n.stroke,
        strokeWidth: n.sw,
        strokeDasharray: n.dash,
      });
    case 'circle':
      return createElement('circle', { key: n.k, cx: n.cx, cy: n.cy, r: n.r, fill: n.fill, stroke: n.stroke, strokeWidth: n.sw });
    case 'text':
      return createElement(
        'text',
        { key: n.k, x: n.x, y: n.y, fill: n.fill, fontSize: n.size, fontWeight: n.weight, textAnchor: 'middle' },
        n.text,
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
  return createElement(
    'svg',
    {
      width,
      height,
      viewBox: `${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`,
      style: { display: 'block', pointerEvents: 'none', userSelect: 'none' },
    },
    createElement(
      'defs',
      { key: 'defs' },
      createElement(
        'linearGradient',
        { id: SEA_GRADIENT_ID, x1: '0', y1: '0', x2: '1', y2: '1' },
        createElement('stop', { key: 's0', offset: '0', stopColor: SEA_STOPS[0] }),
        createElement('stop', { key: 's1', offset: '1', stopColor: SEA_STOPS[1] }),
      ),
    ),
    nodes.map(renderNode),
  );
});
