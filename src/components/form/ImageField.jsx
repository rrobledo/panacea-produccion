import { useState, useCallback, useEffect, useRef } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/**
 * Controlled image field: value/onChange carry a raw base64 string (no data: prefix),
 * matching the backend's expected payload shape directly — no separate
 * "convert on submit" step needed, unlike the legacy ClipboardImageItem.
 */
export const ImageField = ({ value, onChange, label }) => {
  const wrapRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const preview = value ? `data:image/png;base64,${value}` : null;

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    onChange(base64);
  }, [onChange]);

  useEffect(() => {
    if (!focused) return;
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (item) handleFile(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [focused, handleFile]);

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="form-group"
      style={{ border: '1px dashed var(--gray-300)', borderRadius: 8, padding: 12, outline: 'none', minWidth: 0 }}
    >
      {label && <label className="form-label">{label}</label>}
      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6 }} />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ position: 'absolute', top: 4, right: 4 }}
            onClick={() => onChange(null)}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 13, marginBottom: 8 }}>
          <ImageIcon size={24} style={{ margin: '0 auto 6px' }} />
          <div>Pegá una imagen (Ctrl+V) o seleccioná un archivo</div>
        </div>
      )}
      <input type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
};
