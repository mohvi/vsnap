import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Mantém o prefixo REACT_APP_ herdado do CRA para não ser preciso
  // renomear as variáveis de ambiente já configuradas na Vercel.
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: { port: 3000 },
  build: {
    // Mesma pasta que o CRA usava — o deploy continua a funcionar.
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    // Teste antigo do CRA ("learn react") — por remover, ver README.
    exclude: ['src/App.test.js', 'node_modules/**'],
  },
});
