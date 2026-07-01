import { useEffect } from 'react';
import { Platform } from 'react-native';

/** RN Web에서 가로 overflow를 막는 전역 CSS */
export function WebLayoutFix() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const id = 'tingting-web-layout-fix';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      html, body {
        width: 100%;
        max-width: 100vw;
        overflow-x: hidden !important;
        margin: 0;
      }
      #root {
        width: 100%;
        max-width: 100vw;
        overflow-x: hidden !important;
        display: flex;
        flex-direction: column;
      }
      #root > div {
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        flex: 1;
        min-width: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}
