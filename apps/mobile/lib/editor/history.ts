import { useCallback, useState } from 'react';

type History<T> = { past: T[]; committed: T; present: T; future: T[] };

const LIMIT = 60;

/** Past list including the pending live change (if any) as its own step. */
function settledPast<T>(h: History<T>): T[] {
  return h.present === h.committed ? h.past : [...h.past, h.committed];
}

/**
 * `update` changes the live state (slider drags); `commit` records it as one undo step;
 * `apply` changes and commits in one go (taps on presets, stickers, crop...).
 */
export function useEditHistory<T>(initial: T) {
  const [h, setH] = useState<History<T>>({ past: [], committed: initial, present: initial, future: [] });

  const update = useCallback((fn: (prev: T) => T) => {
    setH((prev) => ({ ...prev, present: fn(prev.present) }));
  }, []);

  const commit = useCallback(() => {
    setH((prev) => {
      if (prev.present === prev.committed) return prev;
      return { past: settledPast(prev).slice(-LIMIT), committed: prev.present, present: prev.present, future: [] };
    });
  }, []);

  const apply = useCallback((fn: (prev: T) => T) => {
    setH((prev) => {
      const next = fn(prev.present);
      if (next === prev.present) return prev;
      const past = [...settledPast(prev), prev.present].slice(-LIMIT);
      return { past, committed: next, present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setH((prev) => {
      const past = settledPast(prev);
      if (past.length === 0) return prev;
      const previous = past[past.length - 1];
      return { past: past.slice(0, -1), committed: previous, present: previous, future: [prev.present, ...prev.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setH((prev) => {
      if (prev.future.length === 0) return prev;
      const [next, ...rest] = prev.future;
      return { past: [...prev.past, prev.present].slice(-LIMIT), committed: next, present: next, future: rest };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setH({ past: [], committed: value, present: value, future: [] });
  }, []);

  return {
    state: h.present,
    update,
    commit,
    apply,
    undo,
    redo,
    reset,
    canUndo: h.past.length > 0 || h.present !== h.committed,
    canRedo: h.future.length > 0,
  };
}
