import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PIN_MAP_HTML, type PinMapData, type PinMapMessage } from '@/lib/pin-map';
import { theme } from '@/constants/theme';

/** Web: the same Leaflet page as the native WebView, in a sandboxed iframe. */
export function PinMap({ data, height, onMessage }: { data: PinMapData; height: number; onMessage: (msg: PinMapMessage) => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [loads, setLoads] = useState(0);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const msg = (e.data as { __pinMap?: PinMapMessage })?.__pinMap;
      if (msg) handler.current(msg);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    if (loads > 0) frame.current?.contentWindow?.postMessage({ __pinMapData: data }, '*');
  }, [data, loads]);

  return (
    <View style={[styles.wrap, { height }]}>
      {createElement('iframe', {
        ref: frame,
        srcDoc: PIN_MAP_HTML,
        title: '여행 장소 지도',
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
