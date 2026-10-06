#!/usr/bin/env node
/**
 * npm audit gate (supply-chain policy: fail on HIGH / CRITICAL).
 *
 * 1. Production tree (`--omit=dev`): any HIGH or CRITICAL advisory fails.
 *    No exceptions.
 * 2. Full tree: any HIGH or CRITICAL advisory fails unless its GHSA id is
 *    listed in `.audit-allowlist.json` with a `reviewBy` date that has not
 *    passed. Expired entries fail, forcing a re-review.
 *
 * Allowlisted advisories must be dev-only, have no upstream fix, and be
 * assessed in SECURITY.md. Stale entries (no longer reported) are flagged
 * so they can be removed.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BLOCKING = new Set(['high', 'critical'])
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const allowlistPath = path.join(root, '.audit-allowlist.json')

function runAudit(extraArgs) {
  const result = spawnSync('npm', ['audit', '--json', ...extraArgs], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  if (result.stdout === null || result.stdout === '') {
    throw new Error(`npm audit produced no output: ${result.stderr ?? ''}`)
  }
  return JSON.parse(result.stdout)
}

/** Blocking advisories as Map<ghsaId, { pkg, severity, title }>. */
function blockingAdvisories(report) {
  const found = new Map()
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) {
        continue
      }
      const id = String(via.url).split('/').pop()
      found.set(id, { pkg: via.name, severity: via.severity, title: via.title })
    }
  }
  return found
}

function loadAllowlist() {
  const raw = JSON.parse(readFileSync(allowlistPath, 'utf8'))
  return new Map(raw.advisories.map((entry) => [entry.id, entry]))
}

const failures = []
const today = new Date().toISOString().slice(0, 10)

const prod = blockingAdvisories(runAudit(['--omit=dev']))
for (const [id, adv] of prod) {
  failures.push(`production: ${adv.severity} ${adv.pkg} ${id} — ${adv.title}`)
}

const allowlist = loadAllowlist()
const all = blockingAdvisories(runAudit([]))
for (const [id, adv] of all) {
  if (prod.has(id)) {
    continue
  }
  const entry = allowlist.get(id)
  if (entry === undefined) {
    failures.push(
      `dev: ${adv.severity} ${adv.pkg} ${id} — ${adv.title} (not allowlisted)`
    )
  } else if (entry.reviewBy < today) {
    failures.push(
      `dev: ${id} allowlist entry expired on ${entry.reviewBy}; re-review it`
    )
  } else {
    console.log(
      `accepted: ${adv.severity} ${adv.pkg} ${id} (review by ${entry.reviewBy})`
    )
  }
}

for (const id of allowlist.keys()) {
  if (!all.has(id)) {
    console.warn(
      `stale: ${id} is allowlisted but no longer reported; remove it`
    )
  }
}

if (failures.length > 0) {
  console.error(`\naudit gate FAILED (${failures.length}):`)
  for (const failure of failures) {
    console.error(`  - ${failure}`)
  }
  process.exit(1)
}
console.log('audit gate passed')
