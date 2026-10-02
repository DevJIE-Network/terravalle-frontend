import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Permite importar con "@/..." en lugar de rutas relativas largas.
      // Ej.: import { Button } from '@/components/ui';
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
