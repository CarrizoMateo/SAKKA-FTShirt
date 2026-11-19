import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Tienda (index.html) y panel privado (admin/index.html): dos páginas sin framework.
export default defineConfig({
  server: {
    // En desarrollo, /api va al backend local (mismo origen, igual que en producción).
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
})
