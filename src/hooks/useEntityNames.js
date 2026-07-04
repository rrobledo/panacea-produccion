import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

/**
 * Resolves a display field for a set of ids one-by-one (GET resource/{id}),
 * caching results — used when a list endpoint returns bare ids with no
 * denormalized name and fetching the entire resource just to look up a
 * handful of names would mean retrieving the whole table.
 */
export const useEntityNames = (resource, ids, displayField = 'nombre') => {
  const [names, setNames] = useState({});
  const cacheRef = useRef({});
  const idsKey = [...new Set((ids || []).filter(id => id != null))].sort().join(',');

  useEffect(() => {
    const missing = idsKey ? idsKey.split(',').filter(id => !(id in cacheRef.current)) : [];
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(id =>
      api.get(`${resource}/${id}`)
        .then(res => [id, res.data?.[displayField]])
        .catch(() => [id, undefined])
    )).then(entries => {
      if (cancelled) return;
      for (const [id, name] of entries) cacheRef.current[id] = name;
      setNames({ ...cacheRef.current });
    });
    return () => { cancelled = true; };
  }, [resource, displayField, idsKey]);

  return names;
};
