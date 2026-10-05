import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs';
import path from 'node:path';

const keyPath = '/app/certs/localhost-key.pem';
const certPath = '/app/certs/localhost.pem';
const https = fs.existsSync(keyPath) && fs.existsSync(certPath)
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : undefined;

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    https,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
