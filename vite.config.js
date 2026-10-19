import { env } from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwarded as-is (same Origin header the backend's origin check expects),
      // so the API only ever sees same-origin requests from the SPA.
      "/api": { target: env.API_PROXY_TARGET ?? "http://localhost:5000", changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
