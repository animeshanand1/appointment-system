import { env } from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Content Security Policy for the built app. Scripts only from our own
// origin (no inline or eval), styles and fonts from Google Fonts, API calls
// to our own origin only. Dev mode can't use it because Vite's HMR injects
// inline scripts.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

// Headers that must come from the server (frame-ancestors is ignored in a
// <meta> tag). The production API that serves the SPA should send the same set;
// see SECURITY.md.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

function securityMeta() {
  return {
    name: 'security-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head' },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), securityMeta()],
  build: {
    // Don't publish source maps alongside the production bundle.
    sourcemap: false,
  },
  server: {
    headers: SECURITY_HEADERS,
    proxy: {
      // Forwarded as-is (same Origin header the backend's origin check expects),
      // so the API only ever sees same-origin requests from the SPA.
      "/api": { target: env.API_PROXY_TARGET ?? "http://localhost:5000", changeOrigin: true },
    },
  },
  preview: {
    headers: {
      ...SECURITY_HEADERS,
      'Content-Security-Policy': `${CSP}; frame-ancestors 'none'`,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
