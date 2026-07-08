import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const serviceWorkerBootstrap = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#312E81" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TingTing" />
        <meta name="application-name" content="TingTing" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/icon-192.png" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerBootstrap }} />
        <script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js" crossOrigin="anonymous" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                width: 100%;
                max-width: 100vw;
                margin: 0;
                padding: 0;
                overflow-x: hidden;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              body {
                overflow: hidden;
                display: flex;
                background-color: #EEF1F5;
                -webkit-tap-highlight-color: transparent;
                overscroll-behavior: none;
              }
              #root {
                display: flex;
                flex: 1;
                min-height: 0;
                min-width: 0;
              }
              /* Hide browser chrome leftovers when installed / standalone */
              @media (display-mode: standalone), (display-mode: fullscreen) {
                body {
                  background-color: #EEF2F8;
                }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
