import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { ROUTE_MAP_HTML, type RouteMapData } from '@/lib/route-map';
import { theme } from '@/constants/theme';

const BASE_URL = 'https://tingting.local/';

/** Leaflet route map in a WebView: works in any APK without a Google Maps key. */
export function RouteMap({ data, height, onSelectStop }: { data: RouteMapData; height: number; onSelectStop?: (index: number) => void }) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.__setData && window.__setData(${JSON.stringify(data)}); true;`);
  }, [data, ready]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; index?: number };
      if (msg.type === 'ready') setReady(true);
      if (msg.type === 'stop' && typeof msg.index === 'number') onSelectStop?.(msg.index);
    } catch {
      // ignore non-JSON messages
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={ref}
        source={{ html: ROUTE_MAP_HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onLoadStart={() => setReady(false)}
        onLoadEnd={() => setReady(true)}
        applicationNameForUserAgent="TingTing/1.0"
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith(BASE_URL) || req.url === 'about:blank') return true;
          void Linking.openURL(req.url);
          return false;
        }}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: theme.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.mapBackground },
  web: { flex: 1, backgroundColor: theme.colors.mapBackground },
});
