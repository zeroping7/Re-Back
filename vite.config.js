import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // La versión la pone el CI (1.0.<nº de ejecución>), igual que en el APK; en local sale "dev"
  define: { __APP_VERSION__: JSON.stringify(process.env.VERSION_NAME || 'dev') },
  build: { target: 'es2020', chunkSizeWarningLimit: 4000 },
});
