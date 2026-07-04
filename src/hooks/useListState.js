import { useCallback, useRef } from 'react';

const STATE_EXPIRY_MS = 30 * 60 * 1000;

export const useListState = (listKey) => {
  const key = `list_state_${listKey}`;
  const scrolledRef = useRef(false);

  const saveState = useCallback((filters, scrollY, selectedRowId) => {
    if (!listKey) return;
    try {
      sessionStorage.setItem(key, JSON.stringify({
        filters, scrollY, selectedRowId, savedAt: Date.now(),
      }));
    } catch {
      // sessionStorage unavailable (e.g. private browsing) — state just won't persist
    }
  }, [key, listKey]);

  const getState = useCallback(() => {
    if (!listKey) return null;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.savedAt > STATE_EXPIRY_MS) {
        sessionStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [key, listKey]);

  const clearState = useCallback(() => {
    if (!listKey) return;
    sessionStorage.removeItem(key);
  }, [key, listKey]);

  const scrollToRow = useCallback((rowId, delay = 100) => {
    if (scrolledRef.current) return;
    scrolledRef.current = true;
    setTimeout(() => {
      const el = document.querySelector(`[data-row-id="${rowId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('row-highlight');
        setTimeout(() => el.classList.remove('row-highlight'), 2000);
      }
    }, delay);
  }, []);

  return { saveState, getState, clearState, scrollToRow };
};
