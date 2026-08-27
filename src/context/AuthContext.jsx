import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AUTH_STORAGE_KEY } from '../services/api';

const AuthContext = createContext(null);

const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const decodeJwt = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
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

  const loginWithGoogle = useCallback(async (credential) => {
    setAuthError(null);
    const payload = decodeJwt(credential);
    const email = payload?.email?.toLowerCase();
    if (!email || !ALLOWED_EMAILS.includes(email)) {
      throw new Error('no_autorizado');
    }
    const base = { email: payload.email, name: payload.name, picture: payload.picture };
    setUser(base);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(base));
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

  const logout = useCallback(() => {
    setUser(null);
    setAuthError(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.google?.accounts.id.disableAutoSelect();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, authError,
      isAuthenticated: !!user,
      loginWithGoogle, loginWithCredentials, logout,
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
