import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'trailing-slash-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // /prayer-requests 로 접속 시 /prayer-requests/ 로 리다이렉트
          if (req.url === '/prayer-requests') {
            res.writeHead(301, { Location: '/prayer-requests/' })
            res.end()
            return
          }
          next()
        })
      },
    },
  ],
  base: '/prayer-requests/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
