import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './components/auth/LoginPage';
import { OAuthCallback } from './components/auth/OAuthCallback';
import { DashboardPage } from './pages/DashboardPage';
import { PageLoader } from './components/ui';
import { ProveedoresPage } from './pages/proveedores/ProveedoresPage';
import { ProveedorCreatePage } from './pages/proveedores/ProveedorCreatePage';
import { ProveedorEditPage } from './pages/proveedores/ProveedorEditPage';
import { InsumosPage } from './pages/insumos/InsumosPage';
import { InsumoCreatePage } from './pages/insumos/InsumoCreatePage';
import { InsumoEditPage } from './pages/insumos/InsumoEditPage';
import { ProductosPage } from './pages/productos/ProductosPage';
import { ProductoCreatePage } from './pages/productos/ProductoCreatePage';
import { ProductoEditPage } from './pages/productos/ProductoEditPage';
import { FacturasPage } from './pages/facturas/FacturasPage';
import { FacturaCreatePage } from './pages/facturas/FacturaCreatePage';
import { FacturaEditPage } from './pages/facturas/FacturaEditPage';
import { PlanningPage } from './pages/planning/PlanningPage';
import { ProgramacionPage } from './pages/programacion/ProgramacionPage';
import { ProduccionPage } from './pages/reportes/ProduccionPage';
import { VentasPage } from './pages/reportes/VentasPage';
import { PrecioProductosPage } from './pages/reportes/PrecioProductosPage';
import { EstimacionesPage } from './pages/reportes/EstimacionesPage';
import { CostosMateriaPrimaPage } from './pages/reportes/CostosMateriaPrimaPage';
import { CostosMateriaPrimaDetailPage } from './pages/reportes/CostosMateriaPrimaDetailPage';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  return children;
};

const NotFound = () => (
  <div>
    <div className="page-header"><div className="page-title">404 – No encontrado</div></div>
    <div className="card">
      <div className="card-body" style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
        La página que buscás no existe.
      </div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/*" element={
              <PrivateRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />

                    {/* PROVEEDORES */}
                    <Route path="/proveedores"            element={<ProveedoresPage />} />
                    <Route path="/proveedores/create"     element={<ProveedorCreatePage />} />
                    <Route path="/proveedores/:id/edit"   element={<ProveedorEditPage />} />

                    {/* INSUMOS */}
                    <Route path="/insumos"            element={<InsumosPage />} />
                    <Route path="/insumos/create"     element={<InsumoCreatePage />} />
                    <Route path="/insumos/:id/edit"   element={<InsumoEditPage />} />

                    {/* PRODUCTOS */}
                    <Route path="/productos"            element={<ProductosPage />} />
                    <Route path="/productos/create"     element={<ProductoCreatePage />} />
                    <Route path="/productos/:id/edit"   element={<ProductoEditPage />} />

                    {/* FACTURAS/GASTOS (ctacteprov) */}
                    <Route path="/ctacteprov"            element={<FacturasPage />} />
                    <Route path="/ctacteprov/create"     element={<FacturaCreatePage />} />
                    <Route path="/ctacteprov/:id/edit"   element={<FacturaEditPage />} />

                    {/* PLANNING / PROGRAMACION */}
                    <Route path="/planning"      element={<PlanningPage />} />
                    <Route path="/programacion"  element={<ProgramacionPage />} />

                    {/* REPORTES DE COSTOS */}
                    <Route path="/reportes/produccion"              element={<ProduccionPage />} />
                    <Route path="/reportes/ventas"                  element={<VentasPage />} />
                    <Route path="/reportes/precio-productos"        element={<PrecioProductosPage />} />
                    <Route path="/reportes/estimaciones"            element={<EstimacionesPage />} />
                    <Route path="/reportes/costo-materia-prima"     element={<CostosMateriaPrimaPage />} />
                    <Route path="/reportes/costo-materia-prima/:id" element={<CostosMateriaPrimaDetailPage />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </PrivateRoute>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
