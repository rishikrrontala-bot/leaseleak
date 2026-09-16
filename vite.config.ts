import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1000 },
  // Local dev: the AI functions run under `vercel dev --listen 3000`; the app runs here on 5173.
  server: { proxy: { '/api': { target: process.env.API_PROXY ?? 'http://localhost:3000', changeOrigin: false } } },
})
