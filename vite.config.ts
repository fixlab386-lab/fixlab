import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import electron from 'vite-plugin-electron/simple'
import { readFileSync } from 'node:fs'
import { resolve } from 'path'

const isElectron = process.env.ELECTRON === 'true'
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string }

function emitVersionJson(version: string): Plugin {
  return {
    name: 'emit-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version }),
      })
    },
  }
}

export default defineConfig({
  base: isElectron ? './' : '/',
  resolve: isElectron
    ? {
        alias: {
          'virtual:pwa-register': resolve(__dirname, 'src/lib/pwaRegister.stub.ts'),
        },
      }
    : undefined,
  define: {
    'import.meta.env.VITE_ELECTRON': JSON.stringify(isElectron ? 'true' : 'false'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(isElectron ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-32.png', 'favicon-192.png', 'apple-touch-icon.png', 'icon-512.png'],
      manifest: {
        name: 'FIXLab',
        short_name: 'FIXLab',
        display: 'standalone',
        lang: 'it',
        start_url: '/',
        scope: '/',
        theme_color: '#0d0b21',
        background_color: '#0d0b21',
        icons: [
          { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // JSZip è caricato solo con "Scarica ZIP" (`import('jszip')`); non precaricarlo nel SW per alleggerire install/update.
        globIgnores: ['**/jszip*.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/assets\//],
      },
      devOptions: { enabled: false },
    }), emitVersionJson(pkg.version)]),
    ...(isElectron
      ? [
          electron({
            main: {
              entry: 'electron/main.ts',
              vite: {
                build: {
                  rollupOptions: {
                    external: ['electron-updater'],
                  },
                },
              },
            },
            preload: {
              input: resolve(__dirname, 'electron/preload.ts'),
            },
          }),
        ]
      : []),
  ],
  optimizeDeps: {
    exclude: ['eslint-plugin-react', 'typescript-eslint']
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      external: ['eslint-plugin-react']
    }
  }
})