import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AUTH_STORAGE_KEY } from '../services/api';

const AuthContext = createContext(null);

const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = useCallback(async (base) => {
    try {
      const res = await api.get('/profile/me');
      const merged = { ...base, ...res.data };
      setUser(merged);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Keep the session from the token even if the profile fetch fails.
      setUser(base);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          if (parsed?.access_token) await fetchProfile(parsed);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginWithGoogle = useCallback(() => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const url = new URL('/auth/google', window.location.origin);
    url.searchParams.set('redirect_uri', redirectUri);
    window.location.href = url.toString();
  }, []);

  const loginWithCredentials = useCallback(async (email, password) => {
    setAuthError(null);
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Credenciales incorrectas.');
    }
    const { access_token, user_id, role } = await res.json();
    const base = { access_token, id: user_id, role, email };
    setUser(base);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(base));
    await fetchProfile(base);
  }, [fetchProfile]);

  const handleOAuthCallback = useCallback(async (token) => {
    setAuthError(null);
    const payload = decodeJwt(token);
    if (!payload) {
      setAuthError('Token inválido.');
      return;
    }
    const base = { access_token: token, email: payload.email, id: payload.sub, role: payload.role };
    setUser(base);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(base));
    await fetchProfile(base);
  }, [fetchProfile]);

  const logout = useCallback(() => {
    setUser(null);
    setAuthError(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, authError,
      isAuthenticated: !!user,
      loginWithGoogle, loginWithCredentials, handleOAuthCallback, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
