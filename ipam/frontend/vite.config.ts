import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/connect': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      },
      '/ws': {
        target: 'ws://localhost:8888',
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ws/, '')
      }
    }
  }
})
