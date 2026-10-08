import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { PIN_MAP_HTML, type PinMapData, type PinMapMessage } from '@/lib/pin-map';
import { theme } from '@/constants/theme';

const BASE_URL = 'https://tingting.local/';

/** Leaflet street map of one municipality with the folder's place pins. */
export function PinMap({ data, height, onMessage }: { data: PinMapData; height: number; onMessage: (msg: PinMapMessage) => void }) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.__setData && window.__setData(${JSON.stringify(data)}); true;`);
  }, [data, ready]);

  const handle = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as PinMapMessage;
      if (msg.type === 'ready') setReady(true);
      onMessage(msg);
    } catch {
      // ignore non-JSON messages
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={ref}
        source={{ html: PIN_MAP_HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onMessage={handle}
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
