// client
// client/index.ts
import path from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
) as { version: string }

export default {
  getPublicPath: (): string => path.join(__dirname, 'public'),
  version: packageJson.version
}

