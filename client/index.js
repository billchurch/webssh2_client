// client
// client/index.ts
import path from 'path'
import { fileURLToPath } from 'url'
import packageJson from '../package.json' with { type: 'json' }
const __dirname = path.dirname(fileURLToPath(import.meta.url))
export default {
  getPublicPath: () => path.join(__dirname, 'public'),
  version: packageJson.version
}
