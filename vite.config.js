import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: {
    host: true, // expose on the LAN so you can test from a real phone
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
