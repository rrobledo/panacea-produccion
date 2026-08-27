import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

// Etiqueta de identificación para pegar en bandejas/carros — deliberadamente
// sin insumos (ver design.md Decision 7): solo fecha de fabricación, código,
// responsable/área, y el/los producto(s) que rinde la orden.
export const OblejaPrint = ({ orden }) => {
  const contentRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef, documentTitle: `Oblea-${orden.codigo}` });

  const nombres = orden.productos.map(p => p.producto?.nombre).filter(Boolean);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <h3 className="card-title">Oblea</h3>
        <button type="button" className="btn btn-secondary btn-sm no-print" onClick={handlePrint}>
          <Printer size={14} /> Imprimir Oblea
        </button>
      </div>
      <div className="card-body">
        <div
          ref={contentRef}
          style={{
            maxWidth: 360, margin: '0 auto', padding: 24, border: '2px solid var(--gray-900)',
            borderRadius: 8, textAlign: 'center', background: 'white',
          }}
        >
          <style>{`@media print { @page { size: 10cm 10cm; margin: 6mm; } body { font-family: Arial, sans-serif; } }`}</style>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Fecha de Fabricación
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{orden.fecha_fabricacion}</div>

          <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Código
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{orden.codigo}</div>

          <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Responsable / Área
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{orden.responsable}</div>

          <hr className="divider" />

          <div style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Producto(s)
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{nombres.join(' · ')}</div>
        </div>
      </div>
    </div>
  );
};
