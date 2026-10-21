/**
 * Guards the GitHub Actions hardening from #159:
 * - every workflow drops the default token scopes (`permissions:` at the
 *   top level) and every job declares its own `permissions:` block;
 * - no `${{ }}` expression is expanded inside a `run:` script, so inputs,
 *   release tags and step outputs reach the shell only through `env:`;
 * - every action is pinned to a full commit SHA.
 *
 * actionlint and zizmor do the full analysis; this is a cheap line-based
 * check that runs with the rest of the suite.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workflowsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.github/workflows'
)

const workflows = fs
  .readdirSync(workflowsDir)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => ({
    name,
    lines: fs.readFileSync(path.join(workflowsDir, name), 'utf8').split('\n')
  }))

const indentOf = (line) => line.length - line.trimStart().length

/** Returns [{ name, body: string[] }] for each job under `jobs:`. */
function jobsOf(lines) {
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line))
  if (start === -1) return []
  const jobs = []
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break
    const header = /^ {2}([\w-]+):\s*$/.exec(line)
    if (header) {
      jobs.push({ name: header[1], body: [] })
    } else if (jobs.length > 0) {
      jobs[jobs.length - 1].body.push(line)
    }
  }
  return jobs
}

/** Returns [{ line, script }] for each `run:` step, inline or block. */
function runScriptsOf(lines) {
  const scripts = []
  lines.forEach((line, i) => {
    const match = /^(\s*)(?:- )?run:\s*(.*)$/.exec(line)
    if (!match) return
    const keyIndent =
      indentOf(line) + (line.trimStart().startsWith('- ') ? 2 : 0)
    const value = match[2]
    if (!/^[|>]/.test(value)) {
      scripts.push({ line: i + 1, script: value })
      return
    }
    const body = []
    for (const next of lines.slice(i + 1)) {
      if (next.trim() !== '' && indentOf(next) <= keyIndent) break
      body.push(next)
    }
    scripts.push({ line: i + 1, script: body.join('\n') })
  })
  return scripts
}

describe('GitHub Actions workflow hardening', () => {
  it('finds the workflows', () => {
    const names = workflows.map((w) => w.name)
    assert.ok(names.includes('release.yml'))
    assert.ok(names.includes('update-webssh2-dependency.yml'))
  })

  for (const { name, lines } of workflows) {
    describe(name, () => {
      it('sets top-level permissions', () => {
        assert.ok(
          lines.some((line) => /^permissions:/.test(line)),
          `${name} has no top-level permissions: block`
        )
      })

      it('declares permissions on every job', () => {
        const jobs = jobsOf(lines)
        assert.ok(jobs.length > 0, `${name} has no jobs`)
        for (const job of jobs) {
          assert.ok(
            job.body.some((line) => /^ {4}permissions:/.test(line)),
            `${name}: job "${job.name}" has no permissions: block`
          )
        }
      })

      it('passes expressions to run: scripts through env', () => {
        for (const { line, script } of runScriptsOf(lines)) {
          assert.ok(
            !script.includes('${{'),
            `${name}:${line}: run: script expands a \${{ }} expression; ` +
              'pass it through env: and quote the variable'
          )
        }
      })

      it('pins every action to a commit SHA', () => {
        lines.forEach((line, i) => {
          const match = /^\s*(?:- )?uses:\s*([^\s#]+)/.exec(line)
          if (!match || match[1].startsWith('./')) return
          assert.match(
            match[1],
            /@[0-9a-f]{40}$/,
            `${name}:${i + 1}: ${match[1]} is not pinned to a commit SHA`
          )
        })
      })
    })
  }
})

describe('workflow scanner self-check', () => {
  it('extracts block and inline run: scripts', () => {
    const lines = [
      'jobs:',
      '  a:',
      '    steps:',
      '      - name: x',
      '        run: |',
      '          echo "${{ inputs.v }}"',
      '',
      '          echo done',
      '      - run: echo ${{ github.ref }}',
      '      - name: y',
      '        env:',
      '          V: ${{ inputs.v }}'
    ]
    const scripts = runScriptsOf(lines)
    assert.strictEqual(scripts.length, 2)
    assert.ok(scripts[0].script.includes('${{ inputs.v }}'))
    assert.ok(scripts[0].script.includes('echo done'))
    assert.ok(!scripts[0].script.includes('V:'))
    assert.strictEqual(scripts[1].script, 'echo ${{ github.ref }}')
  })

  it('splits jobs and their bodies', () => {
    const jobs = jobsOf([
      'jobs:',
      '  a:',
      '    permissions: {}',
      '  b:',
      '    runs-on: ubuntu-latest'
    ])
    assert.deepStrictEqual(
      jobs.map((j) => j.name),
      ['a', 'b']
    )
    assert.ok(jobs[0].body.some((l) => /^ {4}permissions:/.test(l)))
    assert.ok(!jobs[1].body.some((l) => /^ {4}permissions:/.test(l)))
  })
})

describe('update-webssh2-dependency.yml version step', () => {
  const { lines } = workflows.find(
    (w) => w.name === 'update-webssh2-dependency.yml'
  )
  const idLine = lines.findIndex((line) => /id: get-version\s*$/.test(line))
  const step = runScriptsOf(lines).find(({ line }) => line > idLine + 1)

  /** Runs the step's own script as a workflow_dispatch with `version`. */
  function runStep(version) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-version-'))
    const output = path.join(dir, 'output')
    fs.writeFileSync(output, '')
    try {
      const result = spawnSync('bash', ['-e', '-c', step.script], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          EVENT_NAME: 'workflow_dispatch',
          RELEASE_TAG: '',
          INPUT_VERSION: version,
          GITHUB_OUTPUT: output
        }
      })
      return { status: result.status, output: fs.readFileSync(output, 'utf8') }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  for (const [input, expected] of [
    ['5.4.3', '5.4.3'],
    ['v5.4.3', '5.4.3'],
    ['6.0.0-alpha.1', '6.0.0-alpha.1'],
    ['6.0.0-x-y.1', '6.0.0-x-y.1'],
    ['5.4.3+build.1', '5.4.3+build.1'],
    ['6.0.0-rc.1+sha-abc123', '6.0.0-rc.1+sha-abc123']
  ]) {
    it(`accepts ${input}`, () => {
      const { status, output } = runStep(input)
      assert.strictEqual(status, 0)
      assert.strictEqual(output, `version=${expected}\n`)
    })
  }

  for (const input of [
    'main',
    '5.4',
    '5.4.3-',
    '5.4.3+',
    '5.4.3-a..b',
    '1.0.0"; touch pwned; "',
    '1.0.0 $(id)',
    '1.0.0\nversion=9.9.9'
  ]) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      const { status, output } = runStep(input)
      assert.notStrictEqual(status, 0)
      assert.strictEqual(output, '')
    })
  }
})
