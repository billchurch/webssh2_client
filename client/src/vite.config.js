import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load package.json
const packageJson = JSON.parse(fs.readFileSync('../../package.json', 'utf-8'))

// Get git commit hash
const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// Generate banner string
const bannerString = `Version ${packageJson.version} - ${new Date().toISOString()} - ${commitHash}`

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
      const faviconSource = path.resolve(__dirname, 'favicon.ico')
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

      const webssh2Config = isDevelopment
        ? JSON.stringify({
            socket: { url: 'http://localhost:2222', path: '/ssh/socket.io' },
            ssh: { port: 22 }
          })
        : 'null'

      html = html.replace(
        'window.webssh2Config = <%= htmlWebpackPlugin.options.webssh2Config %>;',
        `window.webssh2Config = ${webssh2Config};`
      )

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

    plugins: [bannerPlugin(), htmlTemplatePlugin(), copyAssetsPlugin()],

    build: {
      outDir: '../public',
      emptyOutDir: true,

      rollupOptions: {
        input: 'index.html',
        output: {
          entryFileNames: 'webssh2.bundle.js',
          chunkFileNames: '[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (
              assetInfo.name === 'style.css' ||
              assetInfo.name === 'index.css'
            ) {
              return 'webssh2.css'
            }
            return '[name][extname]'
          }
        }
      },

      // Production optimizations
      minify: !isDevelopment ? 'terser' : false,
      terserOptions: !isDevelopment
        ? {
            format: {
              comments: false
            },
            compress: {
              drop_console: false,
              drop_debugger: false,
              passes: 1,
              dead_code: false,
              unused: false
            },
            mangle: {
              properties: false
            }
          }
        : undefined,

      cssMinify: !isDevelopment,

      // Performance hints
      chunkSizeWarningLimit: 500,

      // Source maps
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
        '@': path.resolve(__dirname, './client/src')
      }
    },

    optimizeDeps: {
      include: [
        'debug',
        '@xterm/xterm',
        '@xterm/addon-fit',
        'socket.io-client'
      ]
    }
  }
})
