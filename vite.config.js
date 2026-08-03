import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// No dev proxy, deliberately.
//
// The browser talks to Odoo directly, cross-origin, in every environment —
// so what you debug locally is the same request path that runs in production.
// Two things make that work, and both are already true:
//
//   * every `field_portal` route is declared with `cors=CORS_ORIGIN`
//     (default `*`), and Odoo answers the preflight itself;
//   * the client authenticates with a Bearer token and sends
//     `credentials: 'omit'`, so there are no cookies and no credentialed-CORS
//     restrictions.
//
// The one prerequisite is on the Odoo side: the local server must resolve to a
// single database on its own (`db_name` in odoo.conf — see odoo.conf.example
// in the Nahhas-Group repo). Without that it answers 404 "No database is
// selected" before the route runs, which surfaces in the browser as a CORS
// error. The `X-Odoo-Database` header is NOT a way out: a browser cannot send
// it, which is why a proxy used to be needed here.
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
