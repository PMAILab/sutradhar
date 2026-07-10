import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Mirrors netlify.toml's prod proxy: /api/* calls stay relative and get
    // forwarded to the backend, so the browser only ever talks to this dev
    // server's own origin — same-origin session cookie, no CORS involved,
    // in dev exactly as in prod.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
})
