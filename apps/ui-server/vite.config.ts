import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
    renderer(),
  ],
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
