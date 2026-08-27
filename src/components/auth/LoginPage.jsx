import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import './auth.css';

export const LoginPage = () => {
  const { isAuthenticated, loginWithGoogle, loginWithCredentials, authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const btnRef = useRef(null);
  const gisInitialized = useRef(false);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading]   = useState(false);

  const redirectTo = searchParams.get('redirect') || '/';
  const urlError = searchParams.get('error');
  const error = submitError || (urlError && decodeURIComponent(urlError)) || authError;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
      return;
    }

    const initGis = () => {
      if (gisInitialized.current || !window.google || !btnRef.current) return;
      gisInitialized.current = true;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await loginWithGoogle(response.credential);
            navigate(redirectTo, { replace: true });
          } catch (err) {
            setSubmitError(
              err.message === 'no_autorizado'
                ? 'Usuario no autorizado. Contactá al administrador.'
                : 'Error al iniciar sesión. Intentá nuevamente.'
            );
          }
        },
        auto_select: false,
      });

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale: 'es',
        width: 300,
      });
    };

    if (window.google) {
      initGis();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener('load', initGis);
        return () => script.removeEventListener('load', initGis);
      }
    }
  }, [isAuthenticated, loginWithGoogle, navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setLoading(true);
    try {
      await loginWithCredentials(email, password);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 22 }}>P</div>
          <h1>Panacea Producción</h1>
        </div>

        <h2 className="auth-title">Iniciar sesión</h2>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div ref={btnRef} />
        </div>

        <div className="auth-divider"><span>o continuá con tu email</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <LogIn size={16} />}
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};
