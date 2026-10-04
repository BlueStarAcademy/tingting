import { useCallback, useState } from 'react';

/** Multi-select state: long-press starts selecting, `done` leaves the mode. */
export function useSelection() {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const start = useCallback((id: string) => {
    setSelecting(true);
    setSelected(new Set([id]));
  }, []);

  const enter = useCallback(() => setSelecting(true), []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setAll = useCallback((ids: string[]) => setSelected(new Set(ids)), []);

  const done = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  /** Drop ids that are no longer on screen (after a move/delete or reload). */
  const retain = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const keep = new Set(ids);
      const next = new Set([...prev].filter((id) => keep.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, []);

  return { selecting, selected, start, enter, toggle, setAll, done, retain };
}
