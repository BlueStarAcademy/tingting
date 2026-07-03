import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

export type PublicConfig = {
  apkDownloadUrl: string;
  siteUrl: string;
};

function trimUrl(value: string | undefined): string {
  return (value ?? '').replace(/\/$/, '');
}

const buildConfig: PublicConfig = {
  apkDownloadUrl: trimUrl(process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL),
  siteUrl: trimUrl(process.env.EXPO_PUBLIC_SITE_URL),
};

let cached: PublicConfig | null = null;
let inflight: Promise<PublicConfig> | null = null;

function mergeRuntimeConfig(data: Record<string, unknown>): PublicConfig {
  return {
    apkDownloadUrl: trimUrl(
      String(data.apkDownloadUrl ?? data.EXPO_PUBLIC_APK_DOWNLOAD_URL ?? buildConfig.apkDownloadUrl),
    ),
    siteUrl: trimUrl(String(data.siteUrl ?? data.EXPO_PUBLIC_SITE_URL ?? buildConfig.siteUrl)),
  };
}

export function loadPublicConfig(): Promise<PublicConfig> {
  if (cached) return Promise.resolve(cached);
  if (Platform.OS !== 'web' || typeof fetch === 'undefined') {
    cached = buildConfig;
    return Promise.resolve(buildConfig);
  }

  if (inflight) return inflight;

  inflight = fetch('/app-config.json')
    .then((response) => (response.ok ? response.json() : {}))
    .then((data) => {
      cached = mergeRuntimeConfig(data as Record<string, unknown>);
      return cached;
    })
    .catch(() => {
      cached = buildConfig;
      return buildConfig;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function usePublicConfig(): PublicConfig & { loaded: boolean } {
  const [config, setConfig] = useState<PublicConfig>(buildConfig);
  const [loaded, setLoaded] = useState(Platform.OS !== 'web');

  useEffect(() => {
    let active = true;
    loadPublicConfig().then((next) => {
      if (!active) return;
      setConfig(next);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return { ...config, loaded };
}
