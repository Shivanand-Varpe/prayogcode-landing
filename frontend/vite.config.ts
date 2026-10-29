import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/ws': {
        target: process.env.VITE_WS_PROXY_TARGET || 'ws://localhost:3001',
        ws: true,
      },
    },
  },
})
