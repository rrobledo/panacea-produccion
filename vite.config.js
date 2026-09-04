import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Same backend the app's own API calls use (src/services/api.js), so that
  // login/OAuth issue tokens valid against the backend the rest of the app talks to.
  const BACKEND = env.VITE_BACKEND_API_URL || 'https://panacea-produccion-backend.vercel.app'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/auth': {
          target: BACKEND,
          changeOrigin: true,
          // /auth/callback es una ruta del SPA (el redirect_uri que recibe el
          // token del backend), no un endpoint del backend: no la proxyees.
          bypass: (req) => (req.url.startsWith('/auth/callback') ? '/index.html' : undefined),
        },
        '/costos': {
          target: BACKEND,
          changeOrigin: true,
        },
        '/profile': {
          target: BACKEND,
          changeOrigin: true,
        },
      },
    },
  }
})
