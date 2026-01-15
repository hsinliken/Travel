
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 優先捕獲環境變數，若無則設為 null 避免 "undefined" 字串問題
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || null),
    'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY || null),
    'process.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID || null),
    // 不要直接定義 process.env: {} 否則會覆蓋掉上面的具體定義
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
