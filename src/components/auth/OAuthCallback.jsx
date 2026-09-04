import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

export const OAuthCallback = () => {
  const { handleOAuthCallback } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const token = params.get('token');
      const error = params.get('error');

      if (error) {
        navigate('/login?error=' + encodeURIComponent(error));
        return;
      }

      if (token) {
        await handleOAuthCallback(token);
        navigate('/');
      } else {
        navigate('/login');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="oauth-callback">
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <p>Completando inicio de sesión…</p>
    </div>
  );
};
