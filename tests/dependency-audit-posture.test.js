/**
 * Pins the dependency-audit posture recorded in SECURITY.md:
 *
 * - The lockfile resolves solid-js / seroval / vite at or above the fixed
 *   lines, so a lockfile regeneration cannot silently roll them back.
 * - The package ships no runtime dependencies, which is what makes the
 *   `npm audit --omit=dev` half of scripts/audit-gate.mjs the gate for the
 *   published package.
 * - CI runs the audit gate, not a bare `npm audit --audit-level=high`.
 * - Every allowlisted advisory is assessed in SECURITY.md.
 * - seroval (SSR-only in solid-js) never reaches the browser bundle,
 *   checked against the module graph of an in-memory production build.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), 'utf-8'))

const lock = readJson('package-lock.json')
const pkg = readJson('package.json')

/** Minimum fixed versions; see SECURITY.md advisory sweeps. */
const MINIMUM_VERSIONS = {
  'solid-js': '1.9.16',
  seroval: '1.6.8',
  'seroval-plugins': '1.6.8',
  vite: '8.1.6'
}

function compareVersions(a, b) {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i]
    }
  }
  return 0
}

/** Every resolved version of `name` anywhere in the lockfile tree. */
function resolvedVersions(name) {
  return Object.entries(lock.packages)
    .filter(([key]) => key.endsWith(`node_modules/${name}`))
    .map(([key, entry]) => ({ key, version: entry.version }))
}

describe('dependency audit posture', () => {
  for (const [name, minimum] of Object.entries(MINIMUM_VERSIONS)) {
    it(`lockfile resolves every ${name} at >= ${minimum}`, () => {
      const found = resolvedVersions(name)
      assert.ok(found.length > 0, `${name} missing from package-lock.json`)
      for (const { key, version } of found) {
        assert.ok(
          compareVersions(version, minimum) >= 0,
          `${key} resolves ${version}, below ${minimum}`
        )
      }
    })
  }

  it('declares no runtime dependencies', () => {
    assert.deepStrictEqual(Object.keys(pkg.dependencies ?? {}), [])
    assert.deepStrictEqual(Object.keys(pkg.optionalDependencies ?? {}), [])
    assert.deepStrictEqual(Object.keys(pkg.peerDependencies ?? {}), [])
  })

  it('CI runs the audit gate instead of a bare npm audit', () => {
    const ci = fs.readFileSync(
      path.join(root, '.github/workflows/ci.yml'),
      'utf-8'
    )
    assert.match(ci, /run:\s*node scripts\/audit-gate\.mjs/)
    assert.doesNotMatch(ci, /run:\s*npm audit\b/)
  })

  it('every allowlisted advisory is assessed in SECURITY.md', () => {
    const security = fs.readFileSync(path.join(root, 'SECURITY.md'), 'utf-8')
    const { advisories } = readJson('.audit-allowlist.json')
    for (const entry of advisories) {
      assert.match(entry.id, /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/)
      assert.match(entry.reviewBy, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(
        security.includes(entry.id),
        `${entry.id} has no assessment in SECURITY.md`
      )
    }
  })
})

const clientSrc = path.join(root, 'client/src')

/**
 * Runs the production Vite build in memory (`write: false`, so
 * client/public is untouched) and returns every module id that ends up
 * in an emitted chunk. Minification renames and strips identifiers, so
 * the module graph, not a string search of the output, is the reliable
 * signal. `entry` replaces the app entry, for the positive control.
 */
function bundledModuleIds(entry) {
  const script = `
    import { build } from 'vite'
    const entry = process.argv[1]
    const result = await build({
      configFile: 'vite.config.js',
      mode: 'production',
      logLevel: 'silent',
      build: {
        write: false,
        ...(entry ? { rolldownOptions: { input: { main: entry } } } : {})
      }
    })
    const outputs = (Array.isArray(result) ? result : [result])
      .flatMap((o) => o.output)
      .filter((c) => c.type === 'chunk')
    console.log(JSON.stringify(outputs.flatMap((c) => c.moduleIds)))
  `
  // cwd must be client/src: vite.config.js reads ../../package.json
  const run = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script, entry ?? ''],
    { cwd: clientSrc, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
  )
  assert.strictEqual(run.status, 0, `vite build failed: ${run.stderr}`)
  return JSON.parse(run.stdout.trim().split('\n').pop()).map((id) =>
    id.split(path.sep).join('/')
  )
}

/** seroval itself, or the solid-js SSR build that imports it. */
const SSR_SERIALIZER =
  /\/node_modules\/(?:seroval(?:-plugins)?\/|solid-js\/web\/dist\/server\.)/

describe('production bundle excludes SSR serializer code', () => {
  it('detects seroval in a minified probe bundle (positive control)', (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seroval-probe-'))
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
    const serovalEntry = path.join(root, 'node_modules/seroval/dist/index.js')
    const probe = path.join(dir, 'probe.js')
    fs.writeFileSync(
      probe,
      `import { crossSerialize } from ${JSON.stringify(serovalEntry)}\n` +
        'globalThis.probe = crossSerialize\n'
    )
    const ids = bundledModuleIds(probe)
    assert.ok(
      ids.some((id) => SSR_SERIALIZER.test(id)),
      'probe bundle should list seroval in its module graph'
    )
  })

  it('bundles the browser solid-js build and no seroval modules', () => {
    const ids = bundledModuleIds()
    assert.ok(
      ids.some((id) => id.includes('/node_modules/solid-js/web/dist/web.js')),
      'expected solid-js/web browser build in the bundle'
    )
    const leaked = ids.filter((id) => SSR_SERIALIZER.test(id))
    assert.deepStrictEqual(leaked, [], 'SSR serializer modules in bundle')
  })
})
