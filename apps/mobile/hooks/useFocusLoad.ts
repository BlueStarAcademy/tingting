import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Loads data on every screen focus; `refresh` drives pull-to-refresh. */
export function useFocusLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했어요');
    } finally {
      if (pull) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, setData, error, refreshing, refresh: () => reload(true), reload: () => reload() };
}
