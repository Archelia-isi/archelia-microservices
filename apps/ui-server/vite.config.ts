import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/chat/stream': {
        target: 'http://localhost:8004',
        changeOrigin: true,
      }
    }
  },
  preview: {
    allowedHosts: true,
    proxy: {
      '/api/chat/stream': {
        target: process.env.VITE_AI_CHATBOT_URL || 'http://localhost:8004',
        changeOrigin: true,
      }
    }
  }
})
