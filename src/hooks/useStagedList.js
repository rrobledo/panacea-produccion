import { useState, useCallback, useMemo } from 'react';

let tempIdSeq = -1;
const nextTempId = () => tempIdSeq--;

/**
 * Stages add/edit/remove operations against a server-fetched list without
 * calling the backend — the caller decides when to actually persist them
 * (typically alongside a parent "Guardar"), via `commit()`.
 */
export const useStagedList = (existingRows, { idField = 'id' } = {}) => {
  const [creates, setCreates] = useState([]); // [{ tempId, data }]
  const [edits, setEdits] = useState({});     // { [id]: patch }
  const [removals, setRemovals] = useState(new Set());

  const items = useMemo(() => {
    const kept = (existingRows || [])
      .filter(row => !removals.has(row[idField]))
      .map(row => edits[row[idField]] ? { ...row, ...edits[row[idField]], _pending: true } : row);
    const added = creates.map(({ tempId, data }) => ({ ...data, [idField]: tempId, _pending: true }));
    return [...kept, ...added];
  }, [existingRows, edits, removals, creates, idField]);

  const isDirty = creates.length > 0 || Object.keys(edits).length > 0 || removals.size > 0;

  const add = useCallback((data) => {
    setCreates(prev => [...prev, { tempId: nextTempId(), data }]);
  }, []);

  const edit = useCallback((id, patch) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const remove = useCallback((id) => {
    setCreates(prev => prev.filter(c => c.tempId !== id));
    setEdits(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRemovals(prev => new Set(prev).add(id));
  }, []);

  const commit = useCallback(async ({ create, update, remove: doRemove }) => {
    const results = await Promise.allSettled([
      ...creates.map(c => create(c.data).then(() => ({ type: 'create', tempId: c.tempId }))),
      ...Object.entries(edits).map(([id, patch]) =>
        update(id, patch).then(() => ({ type: 'edit', id }))),
      ...[...removals].map(id =>
        doRemove(id).then(() => ({ type: 'remove', id }))),
    ]);

    const failed = results.filter(r => r.status === 'rejected');
    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);

    setCreates(prev => prev.filter(c => !succeeded.some(s => s.type === 'create' && s.tempId === c.tempId)));
    setEdits(prev => {
      const next = { ...prev };
      for (const s of succeeded) if (s.type === 'edit') delete next[s.id];
      return next;
    });
    setRemovals(prev => {
      const next = new Set(prev);
      for (const s of succeeded) if (s.type === 'remove') next.delete(s.id);
      return next;
    });

    if (failed.length > 0) {
      const error = new Error(`${failed.length} cambio(s) no se pudieron guardar`);
      error.causes = failed.map(f => f.reason);
      throw error;
    }
  }, [creates, edits, removals]);

  return { items, isDirty, add, edit, remove, commit };
};
