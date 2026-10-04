import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ROUTE_MAP_HTML, type RouteMapData } from '@/lib/route-map';
import { theme } from '@/constants/theme';

/** Web: the same Leaflet page as the native WebView, in a sandboxed iframe. */
export function RouteMap({ data, height, onSelectStop }: { data: RouteMapData; height: number; onSelectStop?: (index: number) => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  // Bumped on every (re)load of the page; its "ready" message can beat this listener, `load` cannot.
  const [loads, setLoads] = useState(0);
  const onSelect = useRef(onSelectStop);
  onSelect.current = onSelectStop;

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const msg = (e.data as { __routeMap?: { type: string; index?: number } })?.__routeMap;
      if (msg?.type === 'stop' && typeof msg.index === 'number') onSelect.current?.(msg.index);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    if (loads > 0) frame.current?.contentWindow?.postMessage({ __routeMapData: data }, '*');
  }, [data, loads]);

  return (
    <View style={[styles.wrap, { height }]}>
      {createElement('iframe', {
        ref: frame,
        srcDoc: ROUTE_MAP_HTML,
        title: '여행 동선 지도',
        sandbox: 'allow-scripts',
        onLoad: () => setLoads((n) => n + 1),
        style: { border: 0, width: '100%', height: '100%', display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: theme.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.mapBackground },
});
