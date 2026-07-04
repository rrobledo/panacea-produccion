import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'https://panacea-produccion-backend.vercel.app'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: BACKEND,
        changeOrigin: true,
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
})
