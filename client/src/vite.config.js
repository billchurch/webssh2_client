import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync } from 'fs'
import solid from 'vite-plugin-solid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load package.json
const packageJson = JSON.parse(fs.readFileSync('../../package.json', 'utf-8'))

// Get git commit hash
const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// Commit date, not build time: keeps the build reproducible so the
// published bundle can be byte-compared against a rebuild of the tag.
const commitDate = execSync('git log -1 --format=%cI').toString().trim()

// Generate banner string
const bannerString = `Version ${packageJson.version} - ${commitDate} - ${commitHash}`

// Custom plugin to inject banner into files
function bannerPlugin() {
  return {
    name: 'banner-plugin',
    generateBundle(options, bundle) {
      const banner = `/* ${bannerString} */\n`

      for (const fileName in bundle) {
        const chunk = bundle[fileName]

        if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
          chunk.code = banner + chunk.code
        } else if (chunk.type === 'asset' && fileName.endsWith('.css')) {
          chunk.source = banner + chunk.source
        }
      }
    }
  }
}

// Plugin to copy favicon and fix HTML output
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    writeBundle() {
      // Copy favicon
      const faviconSource = path.resolve(__dirname, './favicon.ico')
      const faviconDest = path.resolve(__dirname, '../public/favicon.ico')

      if (fs.existsSync(faviconSource)) {
        copyFileSync(faviconSource, faviconDest)
      }

      // Rename index.html to client.htm
      const sourceHtml = path.resolve(__dirname, '../public/index.html')
      const destHtml = path.resolve(__dirname, '../public/client.htm')

      if (fs.existsSync(sourceHtml)) {
        fs.renameSync(sourceHtml, destHtml)
      }
    }
  }
}

// Custom plugin to handle HTML template processing
function htmlTemplatePlugin() {
  return {
    name: 'html-template-plugin',
    transformIndexHtml(html, { mode }) {
      const isDevelopment = mode === 'development'

      // Replace template variables
      html = html.replace(
        '<!-- Version <%= htmlWebpackPlugin.options.version %> -->',
        `<!-- Version ${bannerString} -->`
      )

      // In development, inject dev config into the JSON data block so the
      // CSP-compatible read path is exercised. In production both injection
      // points keep their `null` placeholders for the gateway to replace.
      if (isDevelopment) {
        const webssh2Config = JSON.stringify({
          socket: { url: 'http://localhost:2222', path: '/ssh/socket.io' },
          ssh: { port: 22 }
        })

        html = html.replace(
          '<script type="application/json" id="webssh2-config">null</script>',
          `<script type="application/json" id="webssh2-config">${webssh2Config}</script>`
        )
      }

      return html
    }
  }
}

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'

  return {
    root: path.resolve(__dirname, './'),
    base: './',

    define: {
      BANNER_STRING: JSON.stringify(bannerString)
    },

    plugins: [
      solid(),
      bannerPlugin(),
      htmlTemplatePlugin(),
      copyAssetsPlugin()
    ],

    build: {
      outDir: '../public',
      emptyOutDir: true,

      // Vite 8: Rolldown replaces Rollup
      rolldownOptions: {
        input: {
          main: 'index.html'
        },
        output: {
          hashCharacters: 'hex',
          entryFileNames: (chunkInfo) => {
            return chunkInfo.name === 'main'
              ? 'webssh2-[hash].js'
              : '[name]-[hash].js'
          },
          chunkFileNames: '[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Rolldown follows Rollup's `names` array API; keep `name`
            // as fallback for compatibility. favicon.ico keeps a stable
            // name (server contract; see #109).
            const assetName =
              assetInfo.names?.[0] ?? assetInfo.name ?? ''
            if (assetName === 'favicon.ico') {
              return 'favicon.ico'
            }
            if (assetName === 'style.css' || assetName === 'index.css') {
              return 'webssh2-[hash].css'
            }
            if (assetName.startsWith('main') && assetName.endsWith('.css')) {
              return 'webssh2-[hash].css'
            }
            return '[name]-[hash][extname]'
          }
        }
      },

      // Vite 8 default minifier (Oxc) in prod, off in dev.
      // NOTE: Oxc performs dead-code/unused elimination (the old
      // terserOptions disabled it). Gate on the functional smoke test;
      // `minify: 'terser'` is the escape hatch if behavior is lost.
      minify: !isDevelopment,

      cssMinify: !isDevelopment,

      chunkSizeWarningLimit: 500,

      sourcemap: isDevelopment ? 'inline' : false
    },

    server: {
      port: 3000,
      open: false,
      host: true,
      proxy: {
        '/ssh/socket.io': {
          target: 'http://localhost:2222',
          ws: true,
          changeOrigin: true
        }
      }
    },

    publicDir: false,

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './')
      }
    },

    optimizeDeps: {
      include: ['debug', '@xterm/xterm', '@xterm/addon-fit', 'socket.io-client']
    }
  }
})
