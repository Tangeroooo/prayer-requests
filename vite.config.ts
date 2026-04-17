import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const APP_BASE_PATH = '/prayer-requests/'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const buildId = command === 'serve' ? 'dev' : new Date().toISOString()

  return {
    plugins: [
      react(),
      {
        name: 'build-version-metadata',
        transformIndexHtml(html) {
          return html
            .replaceAll('__APP_BUILD_ID__', buildId)
            .replaceAll('__APP_VERSION_ENDPOINT__', `${APP_BASE_PATH}build-info.json`)
        },
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'build-info.json',
            source: JSON.stringify({ buildId }, null, 2),
          })
        },
      },
      {
        name: 'trailing-slash-redirect',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // /prayer-requests 로 접속 시 /prayer-requests/ 로 리다이렉트
            if (req.url === APP_BASE_PATH.slice(0, -1)) {
              res.writeHead(301, { Location: APP_BASE_PATH })
              res.end()
              return
            }
            next()
          })
        },
      },
    ],
    base: APP_BASE_PATH,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
