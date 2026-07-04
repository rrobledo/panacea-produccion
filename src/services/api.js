import axios from 'axios';

export const AUTH_STORAGE_KEY = 'panacea_produccion_auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const { access_token } = JSON.parse(stored);
      if (access_token) config.headers.Authorization = `Bearer ${access_token}`;
    }
  } catch {
    // malformed/missing stored session — send the request unauthenticated
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Generic CRUD factory ─────────────────────────────────────────────────────
export const createCrudService = (resource) => ({
  list:   (params) => api.get(`/${resource}`, { params }),
  get:    (id)    => api.get(`/${resource}/${id}`),
  create: (data)  => api.post(`/${resource}`, data),
  update: (id, data) => api.put(`/${resource}/${id}`, data),
  patch:  (id, data) => api.patch(`/${resource}/${id}`, data),
  remove: (id)    => api.delete(`/${resource}/${id}`),
});
