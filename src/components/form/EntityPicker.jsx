import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Modal } from '../ui';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks';

const MIN_QUERY_LENGTH = 2;

/**
 * Searchable entity picker: shows the selected item's label read-only,
 * with a button that opens a search modal over `resource`.
 * Replaces the legacy antd+ag-Grid InputListSearch.
 */
export const EntityPicker = ({
  value,
  onChange,
  onSelectRow,        // optional: (row) => void, for callers that need more than the id
  resource,          // e.g. '/costos/proveedores'
  searchField = 'nombre',
  labelField,
  idField = 'id',
  placeholder = 'Buscar…',
  disabled = false,
}) => {
  const displayField = labelField || searchField;
  const [label, setLabel] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    let cancelled = false;
    // Deferred to a microtask so the fetch (and its setState) happens as a
    // reaction to the resolved value, not synchronously during the effect.
    Promise.resolve().then(async () => {
      if (value == null || value === '') {
        if (!cancelled) setLabel('');
        return;
      }
      try {
        const res = await api.get(`${resource}/${value}`);
        if (!cancelled) setLabel(res.data?.[displayField] ?? '');
      } catch {
        // unresolved reference — leave the label blank
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resource]);

  const queryTooShort = debouncedQuery.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (!open || queryTooShort) {
        setResults([]);
        return;
      }
      setLoading(true);
      api.get(resource, { params: { [searchField]: debouncedQuery } })
        .then(res => { if (!cancelled) setResults(res.data || []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [open, queryTooShort, debouncedQuery, resource, searchField]);

  const select = useCallback((row) => {
    onChange(row[idField]);
    onSelectRow?.(row);
    setLabel(row[displayField]);
    setOpen(false);
  }, [onChange, onSelectRow, idField, displayField]);

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          readOnly
          className="form-input"
          value={label}
          placeholder={placeholder}
          onClick={() => !disabled && setOpen(true)}
          style={{ cursor: disabled ? 'default' : 'pointer', background: 'var(--gray-50)' }}
        />
        {label && !disabled && (
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => { onChange(null); setLabel(''); }}>
            <X size={14} />
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => setOpen(true)}>
          <Search size={14} />
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Buscar" size="lg">
        <input
          autoFocus
          className="form-input"
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr><th>{displayField}</th></tr>
            </thead>
            <tbody>
              {queryTooShort ? (
                <tr><td style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
                  Escribí al menos {MIN_QUERY_LENGTH} letras para buscar
                </td></tr>
              ) : loading ? (
                <tr><td style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : results.length === 0 ? (
                <tr><td style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Sin resultados</td></tr>
              ) : (
                results.map(row => (
                  <tr key={row[idField]} onClick={() => select(row)} style={{ cursor: 'pointer' }}>
                    <td>{row[displayField]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
};
