
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 確保這些變數在瀏覽器端可用
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY),
    'process.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID),
    'process.env': {}
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
