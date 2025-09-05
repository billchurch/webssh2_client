Accessibility Guide (WCAG 2.2 AA)

Context: This repository is a Vite-based, vanilla TypeScript client for a web SSH terminal UI. The UI is a single HTML page (`client/src/index.html` -> built to `client/public/client.htm`) styled with Tailwind CSS, and runtime behavior is driven by ESM modules in `client/src/js/`. Tests use `node:test` with JSDOM. Use this guide to review and implement accessibility improvements.

Scope

- Include: `client/src/**`, `client/public/**`
- Ignore: `node_modules/**`, `dist/**`, `build/**`, `coverage/**`, `*.min.*`, `*.map`, test snapshots
- File types: `.html`, `.ts`, `.css`, `.svg`

Core Checks (static and semantic)

1. Landmarks and Semantics
   - Use semantic regions: `header`, `main`, `footer`; ensure one `<h1>` per document and logical heading order.
   - Avoid click handlers on non-interactive elements; prefer `<button>` and native controls.
   - Do not emulate lists/tables with generic `div`s for structured data.
   - Provide a skip link to jump to the terminal region (or main content).

2. Roles and ARIA
   - Prefer native semantics; add ARIA only when necessary and valid for the element.
   - Ensure `aria-label`, `aria-labelledby`, `aria-describedby` correctly reference IDs.
   - Do not place `aria-hidden="true"` on focusable or interactive elements.
   - Expose a status region for connection state/errors: add `role="status"` or `aria-live="polite"` to `#status`.

3. Forms (Login and Prompts)
   - Each input has a programmatic label (`<label for>` or `aria-labelledby`). Avoid placeholder-only labeling.
   - Mark required fields and expose required/invalid state programmatically.
   - Use appropriate `autocomplete` tokens (e.g., `username`, `current-password`, `organization`, `url` for host if applicable).
   - Announce errors using `role="alert"` or an `aria-live` region; move focus to the error dialog message.

4. Keyboard and Focus
   - All controls are reachable/operable by keyboard. No positive `tabindex`.
   - Visible focus styling; never remove outlines. Prefer `:focus-visible` for clarity.
   - `<dialog>` usage: trap focus while open, label with a heading, return focus to the invoker on close.
   - Provide a keyboard shortcut summary where terminal shortcuts exist (and ensure they don’t conflict with screen readers or system keys).

5. Page Load and Dynamic Updates
   - Set `document.title` appropriately (already wired to terminal title events) and on major state changes.
   - On load or major UI transitions, move focus to the main heading or the most relevant container (e.g., login form first field).
   - Announce connection, reconnection, and error states via the status live region.

6. Media and Icons
   - `<img>` elements require meaningful `alt` or empty `alt` when decorative.
   - Inline icons (CSS/`<i data-icon>` or SVG) should be hidden from AT when decorative (`aria-hidden="true"`) or labeled when meaningful.

7. Data Tables (none used currently)
   - Use `<th>` with `scope`; include `<caption>` for context. Complex tables map headers with `headers`/`id`.

8. Color and Motion
   - Contrast: 4.5:1 for text; 3:1 for large text and UI components.
   - Do not use color alone for meaning.
   - Respect `prefers-reduced-motion`; minimize flashing effects. For the terminal, consider disabling cursor blink when reduced motion is requested.

9. Language and Direction
   - Set `html[lang]` (e.g., `en`) and `dir` for RTL when needed.

Terminal-Specific Guidance (xterm.js)

- Screen reader mode: consider enabling `screenReaderMode: true` in xterm options or offering it in Settings. Test with VoiceOver/NVDA.
- Terminal region: ensure the terminal container is focusable and named (e.g., `aria-label="Terminal"`). Avoid `role="application"` unless absolutely necessary.
- Live announcements: do not stream terminal output into a live region (it overwhelms AT). Announce discrete status events (connect, disconnect, errors) via `#status`.
- Bell/alerts: when using audible bell (`bellStyle: 'sound'`), provide a visual alternative and respect user motion/sound preferences.
- Shortcuts: document any custom keybindings; provide alternatives when conflicts with AT or browsers occur.

Code Search Heuristics to Flag

- `onclick` on `div/span`, or `role="button"` without keyboard handlers.
- `tabindex>0`, `outline: none`, or `aria-hidden="true"` on focusable elements.
- Missing `alt` on `img`; SVGs with only `title` but missing semantics.
- Use of `innerHTML`, `outerHTML`, `insertAdjacentHTML` for user content (for this repo: prefer `textContent` and xterm APIs).
- `<dialog>` without focus management or labels.

Tooling and Automation

- ESLint: keep current setup; ensure rules continue to forbid unsanitized DOM sinks (`innerHTML` etc.). For a11y patterns not covered by ESLint, rely on runtime checks.
- Axe: run `@axe-core/cli` against built `client/public/client.htm` (served at `http://localhost:3000`) or use `jest-axe` with JSDOM in Node tests.
- Pa11y/Lighthouse: optional for end-to-end checks against the dev server.

Node Test Example (JSDOM + axe)

```js
// tests/a11y-terminal.test.js (node:test)
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import * as jestAxe from 'jest-axe'

describe('Accessibility - terminal UI', () => {
  let dom, document
  before(async () => {
    dom = new JSDOM(
      await import('fs').then((fs) =>
        fs.readFileSync('client/src/index.html', 'utf8')
      ),
      {
        url: 'http://localhost:3000',
        pretendToBeVisual: true
      }
    )
    document = dom.window.document
  })

  it('has a live status region and no critical axe violations', async () => {
    // Ensure status is a live region
    const status = document.getElementById('status')
    assert.ok(status)
    if (!status.getAttribute('aria-live') && !status.getAttribute('role')) {
      status.setAttribute('role', 'status')
    }
    const { axe } = jestAxe
    const results = await axe(document.body)
    const critical = results.violations.filter((v) => v.impact === 'critical')
    assert.equal(
      critical.length,
      0,
      `Critical a11y issues: ${critical.map((v) => v.id).join(', ')}`
    )
  })
})
```

Deliverables

1. Summary
   - Pass, warn, fail counts; top 5 risky patterns observed.
2. Findings Table (sorted by severity)
   - Columns: file, line, rule, finding, suggested fix, snippet.
3. Auto-fixable Diffs
   - Provide unified diffs for safe, mechanical changes (labels, roles, attributes).
4. PR Plan
   - Batch small, scoped commits with test steps and affected areas.

Output Format

- Start with a short executive summary.
- Then a Markdown table of findings.
- Then diffs in fenced blocks labeled `diff`.

Severity

- fail: Blocks WCAG 2.2 AA.
- warn: Improvement recommended.
- info: Nice to have.

Configs to Add (if needed)

- Dev deps: `@axe-core/cli` and/or `jest-axe`, `pa11y` (optional).
- ESLint: keep current DOM sink bans; optionally add checks for `tabindex` > 0 in custom rules/tests.
- Tests: add at least one axe-based Node test for dialogs and terminal page.

Runbook

- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build` (outputs to `client/public/`)
- Quick axe (CLI): `npx axe http://localhost:3000/client.htm` or the dev page
- Node tests: `node --test tests/*.test.js`

Notes for This Repo

- Prefer `textContent` and xterm’s APIs for user-visible text; avoid `innerHTML`.
- Consider adding `lang` on `<html>` and `role="status"` or `aria-live="polite"` on `#status`.
- Offer a terminal screen reader mode toggle in Settings; respect `prefers-reduced-motion` to disable cursor blink by default.
