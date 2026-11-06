import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || './',
  server: {
    port: 5173,
    host: true,
  },
  // @control-habitacion/shared se publica como CommonJS (lo consume también el backend NestJS);
  // se fuerza su pre-empaquetado y conversión a ESM en dev y en build.
  optimizeDeps: {
    include: ['@control-habitacion/shared'],
  },
  build: {
    commonjsOptions: {
      include: [/packages[\\/]shared/, /node_modules/],
    },
  },
});
