// client
// index.ts

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isMainModule = import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  const expressModule = (await import('express')).default
  const app = expressModule()

  // Security headers middleware
  const { securityHeadersMiddleware } = await import('./client/src/js/csp-config.js')

  const port = 3000
  app.use(securityHeadersMiddleware)
  app.use(expressModule.static(path.join(__dirname, 'client/public')))
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'client/public', 'client.htm'))
  })
  app.listen(port, () => {
    console.log(`Client server listening at http://localhost:${port}`)
    console.log('Security headers including CSP are enabled')
  })
}

// Always export the client module as default
const clientModule = await import('./client/index.js')
export default clientModule.default

