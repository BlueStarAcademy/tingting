import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecommendationPage, RecommendationSource, RecommendedPlace } from '@tingting/shared';

type Loader = (page: number, source?: RecommendationSource) => Promise<RecommendationPage>;
type Status = 'idle' | 'loading' | 'ready' | 'error';
type Meta = { page: number; hasMore: boolean; source?: RecommendationSource; notice?: RecommendationPage['notice'] };

const message = (e: unknown) => (e instanceof Error ? e.message : '불러오지 못했어요');

/** Loads page 1 whenever `key` changes (null = idle); later pages stay on the provider that answered page 1. */
export function usePagedRecommendations(key: string | null, loader: Loader) {
  const [items, setItems] = useState<RecommendedPlace[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<Meta>({ page: 0, hasMore: false });
  const [attempt, setAttempt] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setItems([]);
    setError(null);
    setLoadingMore(false);
    setMeta({ page: 0, hasMore: false });
    if (key === null) {
      setStatus('idle');
      return;
    }
    setStatus('loading');
    loaderRef
      .current(1)
      .then((res) => {
        if (id !== requestId.current) return;
        setItems(res.items);
        setMeta({ page: 1, hasMore: res.hasMore, source: res.source, notice: res.notice });
        setStatus('ready');
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(message(e));
        setStatus('error');
      });
  }, [key, attempt]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !meta.hasMore || status !== 'ready') return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await loaderRef.current(meta.page + 1, meta.source);
      if (id !== requestId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
      });
      setMeta((m) => ({ ...m, page: m.page + 1, hasMore: res.hasMore }));
    } catch (e) {
      if (id === requestId.current) setError(message(e));
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }, [loadingMore, meta, status]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const markSaved = useCallback((id: string, placeId: string) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, savedPlaceId: placeId } : p)));
  }, []);

  return { items, status, error, loadingMore, ...meta, loadMore, retry, markSaved };
}

export type PagedRecommendations = ReturnType<typeof usePagedRecommendations>;
