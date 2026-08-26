import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    https: {
      key: fs.readFileSync('/app/certs/localhost-key.pem'),
      cert: fs.readFileSync('/app/certs/localhost.pem'),
    },
  },
    resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
