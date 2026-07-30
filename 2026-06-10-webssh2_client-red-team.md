# Red Team Review: webssh2_client

**Date:** 2026-06-10
**Scope reviewed:** `webssh2_client` package only (`/Users/bill/Documents/GitHub/webssh/webssh2_client`)
**Out of scope:** `webssh2` gateway server, `webssh2_cli`
**Lenses:** Security, Availability, Supply-chain/Build, Performance

## Disposition (last updated 2026-07-30)

Reviewed with the maintainer. Tracking state at a glance:

| ID                          | Severity   | Tracking                                                                                                                           | Status                                                                                                                        |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| S1                          | HIGH       | [#112](https://github.com/billchurch/webssh2_client/issues/112) + [PR #120](https://github.com/billchurch/webssh2_client/pull/120) | **Fixed** — masking helper + regression tests (PR #120, merged 2026-06-10)                                                    |
| S2                          | MEDIUM→LOW | [#113](https://github.com/billchurch/webssh2_client/issues/113) + [PR #122](https://github.com/billchurch/webssh2_client/pull/122) | **Fixed** — filename sanitized + requested-name authoritative (assumed merged to main)                                        |
| A1                          | MEDIUM     | [#114](https://github.com/billchurch/webssh2_client/issues/114) + [PR #122](https://github.com/billchurch/webssh2_client/pull/122) | **Fixed** — byte limit + chunk-index bounds, abort surfaces as failed transfer (assumed merged to main)                       |
| SC1                         | ~~HIGH~~   | [#115](https://github.com/billchurch/webssh2_client/issues/115)                                                                    | **Fixed** — `@xterm/addon-search` moved to devDependencies (assumed merged to main)                                           |
| SC5                         | MEDIUM     | [#117](https://github.com/billchurch/webssh2_client/issues/117) + [PR #125](https://github.com/billchurch/webssh2_client/pull/125) | **Fixed** — JSON config block + dead `csp-config.ts` ref fixed (merged 2026-06-10); gateway CSP header shipped in webssh2#546 |
| SC6                         | LOW        | [#116](https://github.com/billchurch/webssh2_client/issues/116) + [PR #124](https://github.com/billchurch/webssh2_client/pull/124) | **Fixed** — action version comments pinned to exact released versions (merged 2026-06-10)                                     |
| SC7                         | LOW        | [#118](https://github.com/billchurch/webssh2_client/issues/118) + [PR #119](https://github.com/billchurch/webssh2_client/pull/119) | **Merged** — `no-unsafe-*` shipped (PR #119, merged 2026-06-10); SBE ratchet → #118                                           |
| A4                          | LOW        | [#143](https://github.com/billchurch/webssh2_client/issues/143) + [PR #144](https://github.com/billchurch/webssh2_client/pull/144) | **Fixed** — orphaned `@rollup/rollup-linux-x64-gnu` optionalDependency removed (rollup left the tree with Vite 8)             |
| S3, S4, A2, A3, SC2–SC4, P1 | MED–LOW    | —                                                                                                                                  | Tabled, documented below, no issue yet                                                                                        |

Notes on the contextualised items:

- **S1** — fixed in [PR #120](https://github.com/billchurch/webssh2_client/pull/120) (merged 2026-06-10): new `sanitizeClientAuthPayloadForLogging()` in `client/src/stores/config.ts` wraps sanitization with `maskObject()`; both sibling objects in the `Auth credentials check` debug call now go through it. Regression tests in `tests/auth-log-masking.test.js` assert no cleartext password/private key/passphrase appears in the logged payload. All other `sanitizeClientAuthPayload()` call sites audited — they feed transport/state, not logs.
- **S2 / A1** — the gateway serves this client and is a trusted origin, so these are defensive "verify the server behaves as expected" hardenings, not external-attacker threats. Both fixed in [PR #122](https://github.com/billchurch/webssh2_client/pull/122) (assumed merged to main 2026-06-10): `sanitizeDownloadFilename()` + `computeDownloadByteLimit()` in `client/src/utils/download-assembler.ts`, requested-name preference and `abortDownload()` in `client/src/services/sftp-service.ts`, regression tests in `tests/sftp-download-hardening.test.js`.
- **SC1** — the package ships a self-contained pre-built bundle; published entrypoints use only Node built-ins and never resolve the UI libs at runtime, so `devDependencies` is correct. Only residual was the lone `@xterm/addon-search` in `dependencies` (#115).
- **SC7** — type-aware ESLint wired for `client/src`; the five `no-unsafe-*` rules enabled at error and the 10 violations fixed (`.eslintrc.json`, `lib/xterm-solid/`) in PR #119 (lint/typecheck/tests green). `strict-boolean-expressions` (218 violations across 36 files) deferred to the #118 ratchet.

## Trust model assumed

The browser client treats both the **SSH server** and the **WebSSH2 gateway** as
untrusted input sources. Server banners, error text, host-key fingerprints/comments,
SFTP file/dir names, prompt text, terminal titles, OSC sequences, download
filenames, and chunk streams all cross into the browser. The gateway is the SSH
relay (already in a MITM position over the SSH session), so findings focus on harm
to the client **beyond** the SSH session itself: credential leakage, browser
memory DoS, forced/spoofed downloads, and weakened supply-chain integrity.

## Headline

The codebase is unusually disciplined on the classic browser-XSS surface — no
`innerHTML`/`document.write` anywhere, SolidJS text-interpolation auto-escaping is
used consistently, host-key TOFU is **fail-closed**, and ESLint `no-unsanitized`
is enforced at error level. The real outstanding issues are: **(1) cleartext SSH
credentials reaching the debug console** (since fixed — PR #120), **(2) secrets
left in the URL**, and a
cluster of **malicious-gateway client-side DoS / download-spoofing** gaps in the
SFTP path. Supply-chain posture is mostly strong (OIDC publish, SHA-pinned
actions, lockfile v3) with a few packaging/lifecycle gaps.

---

## Security

### S1. Cleartext SSH password + private key + passphrase logged to debug console (HIGH) — [#112](https://github.com/billchurch/webssh2_client/issues/112) — FIXED in [PR #120](https://github.com/billchurch/webssh2_client/pull/120)

> **Resolved 2026-06-10:** `sanitizeClientAuthPayloadForLogging()` (sanitize → `maskObject()`) added to `client/src/stores/config.ts` and used for both sibling objects in the `Auth credentials check` debug call. Regression tests (`tests/auth-log-masking.test.js`) assert no cleartext password, private key, or passphrase appears in the logged payload; remaining `sanitizeClientAuthPayload()` call sites audited as non-logging. Original finding retained below for the record.

**File:** `client/src/services/socket.ts:357-365` (`authenticate()`)

Line 355 masks the primary payload (`maskObject(authCredentials)`), but the next
`debug()` call logs two sibling objects that are **never** passed through jsmasker:

```ts
debug('Auth credentials check', {
  host: authCredentials.host,
  username: authCredentials.username,
  hasSocket: !!socket(),
  effectiveFormData: effectiveFormData
    ? sanitizeClientAuthPayload(effectiveFormData) // cleartext secrets
    : null,
  baseCredentials: sanitizeClientAuthPayload(baseCredentials) // cleartext secrets
})
```

`sanitizeClientAuthPayload` (`client/src/stores/config.ts:94-131`) only _deletes_
credentials for **disallowed** auth methods — for allowed methods it returns
`password`, `privateKey`, and `passphrase` in cleartext (verified). So whenever the
`webssh2-client:socket-service` debug namespace is enabled
(`localStorage.debug=...`, a documented user-toggleable switch), every connection
attempt prints the SSH password and full private key + passphrase to the console,
where any other in-page script can read it and where it persists in console history.
The masking on line 355 creates a false sense of safety.

**Fix:** Mask before logging, or drop the sensitive fields entirely (host/username
are already covered by the masked log on line 356):

```ts
effectiveFormData: effectiveFormData
  ? maskObject(sanitizeClientAuthPayload(effectiveFormData))
  : null,
baseCredentials: maskObject(sanitizeClientAuthPayload(baseCredentials))
```

Add a regression test asserting no string matching the secret value appears in
captured debug output.

### S2. SFTP download filename used directly as `anchor.download` — verify it matches expectations (MEDIUM→LOW) — [#113](https://github.com/billchurch/webssh2_client/issues/113) — FIXED in [PR #122](https://github.com/billchurch/webssh2_client/pull/122)

> **Resolved 2026-06-10 (assumed merged to main):** `sanitizeDownloadFilename()` (basename only, control/bidi chars stripped, leading dots removed, 255-char clamp, `download` fallback) is applied at both `anchor.download` sinks — the `DownloadAssembler` constructor and `downloadBlob()`. The user-clicked basename is now authoritative: `downloadFile()` threads it through the download-ready FIFO and `handleDownloadReady()` prefers it over the server-echoed `fileName`, debug-logging any mismatch. Regression tests in `tests/sftp-download-hardening.test.js`. Original finding retained below.
>
> **Re-scoped:** the gateway serves this client and legitimately controls the filename, so this is not an external-MITM threat. Retained as defensive verification that the saved name matches what the user requested and is free of display-spoofing characters.

**File:** `client/src/utils/download-assembler.ts:239` (and `downloadBlob` ~`:316`);
filename originates from `SftpDownloadReadyResponse.fileName` in
`client/src/services/sftp-service.ts:354-359` (`handleDownloadReady`).

A malicious/compromised gateway fully controls `response.fileName`, which flows
unvalidated into `anchor.download` and an auto-triggered `anchor.click()` on the
last chunk. Vectors:

- **RTLO/extension spoofing:** `"invoice‮gpj.exe"` displays as `invoice exe.jpg`
  but saves an executable.
- **Decoupled name:** the user clicks "download `report.txt`" but the server returns
  a different `fileName` (e.g. `setup.exe`); the save fires without a second
  confirmation.
- Path components (`../../x`) — modern browsers strip separators, but the displayed
  save name is still attacker-chosen.

**Fix:** Sanitize before assigning to `anchor.download`: take `split(/[/\\]/).pop()`,
strip control + bidi chars (` -‎‏‪-‮⁦-⁩`),
strip leading dots, clamp to 255 chars. Prefer the **user-clicked** `entry.name`
(already held client-side in the transfer) as the authoritative download name over
the server-echoed `fileName`.

### S3. SSH credentials in URL query string are never scrubbed from the address bar / history (MEDIUM)

**Files:** `client/src/stores/config.ts:152-274` (`configWithUrlOverrides`),
`client/src/services/socket.ts:194-207`

The client reads `password`, `privateKey`, and `passphrase` from
`window.location.search` and forwards the whole query string to the gateway. There
is **no** `history.replaceState`/`pushState` anywhere (verified) to remove them after
consumption. Secrets therefore remain visible in the address bar (shoulder-surf /
screen-share), persist in browser + synced history, leak via `Referer` on any
cross-origin sub-resource, and are captured by bookmarking. They are consumed once
at startup, so retention is pointless.

**Fix:** Immediately after config consumes the params, strip them and
`history.replaceState({}, '', url)` while keeping the in-memory values:

```ts
const url = new URL(window.location.href)
let mutated = false
for (const k of ['password', 'privateKey', 'passphrase']) {
  if (url.searchParams.has(k)) {
    url.searchParams.delete(k)
    mutated = true
  }
}
if (mutated) window.history.replaceState({}, '', url.toString())
```

### S4. `config.socket.url` host trusted as-is with `withCredentials: true` — gateway redirection / credential exfiltration (MEDIUM)

**File:** `client/src/services/socket.ts:324-334` (`getWebSocketUrl`), connect at `:202`

When `config.socket.url` is set, only the scheme is forced (ws→wss); the host/port
are used verbatim, and the Socket.IO client connects with `withCredentials: true`.
`config.socket.url` comes from server-injected `window.webssh2Config`
(`vite.config.js:77-87`) so it is "trusted by design," but there is no same-origin /
allow-list check. Any path that lets a URL param or injected value influence that
host would send cookies/credentials to an arbitrary origin.

**Fix:** Validate `config.socket.url` against an allow-list or constrain to
same-origin (`new URL(config.socket.url).host === window.location.host`); reject and
fall back to same-origin otherwise. Document the `withCredentials` + arbitrary-host
risk.

### S5. All inbound URL query params forwarded verbatim to the gateway Socket.IO handshake (MEDIUM)

**File:** `client/src/services/socket.ts:194-207`

Every `window.location.search` param is copied into the Socket.IO connection `query`
with no validation, length cap, or allow-list — even though `validateUrlParameters`
exists in `input-validator.ts` and is used for the auth form. A crafted link can
stuff arbitrary/oversized keys into the WebSocket handshake (header bloat,
server-side log injection, parser abuse).

**Fix:** Build `query` from an explicit allow-list, run each value through the
existing `input-validator.ts` validators, and cap key/value counts and lengths
before `io(...)`.

### S6. No client-side independent host-key fingerprint recomputation (LOW / informational)

**File:** `client/src/services/socket.ts:682`, shown in `HostKeyPromptModal`

The displayed fingerprint is the gateway-supplied `data.fingerprint`, not recomputed
client-side from `data.key`. Acceptable under the current trust model (gateway is
already the relay), but for true client-side TOFU independence, compute the SHA-256
fingerprint from `data.key` in the browser and display that.

**Note — host-key TOFU itself is CORRECT and fail-closed:** on `mismatch` the client
emits `{action:'reject'}` _before_ showing the modal (`socket.ts:650`); the mismatch
modal has no accept button; dismiss only reopens login (no silent re-store); new keys
persist only on explicit user action with "Remember" checked (`app.tsx:740-747`). No
auto-accept path exists. No finding here.

---

## Availability (client-side DoS — malicious/compromised gateway)

### A1. Download assembler has no size bound — sanity-check against advertised size (MEDIUM) — [#114](https://github.com/billchurch/webssh2_client/issues/114) — FIXED in [PR #122](https://github.com/billchurch/webssh2_client/pull/122)

> **Resolved 2026-06-10 (assumed merged to main):** `addChunk()` now enforces `computeDownloadByteLimit()` = `min(expectedSize + 5% slack (min 64 KiB), server maxFileSize, 512 MiB hard cap)`, self-cancelling (chunks released) and throwing on overflow; negative/non-integer/absurd chunk indices (> 1,000,000) are rejected. `handleDownloadChunk()` surfaces the abort: transfer marked `failed`, `sftp-download-cancel` emitted to the gateway, pending promises rejected. The server-advertised `maxFileSize` from `SftpStatusResponse` feeds the limit via `setServerMaxFileSize()`. Regression tests in `tests/sftp-download-hardening.test.js`. Original finding retained below.
>
> **Re-scoped:** the gateway is a trusted origin (it serves this client), so this is a defensive bound to fail fast on a buggy/runaway transfer rather than an external-attacker DoS.

**File:** `client/src/utils/download-assembler.ts:146-181` (`addChunk`),
`client/src/services/sftp-service.ts:363-391` (`handleDownloadChunk`)

`addChunk` accumulates every chunk into an in-memory `Map<number, Uint8Array>` with
**no upper bound** and **no comparison to `expectedSize`**. A malicious gateway can
advertise `fileSize: 1024` in `sftp-download-ready` (UI shows a tiny transfer) then
stream gigabytes of `sftp-download-chunk` with `isLast:false` indefinitely —
`bytesReceived` is never checked against `expectedSize` and `isLast` need never
arrive. The 10-minute timeout doesn't stop accumulation. Result: tab/browser OOM
crash triggered by the gateway.

**Fix:** Enforce a hard cap in `addChunk` — abort once `bytesReceived` exceeds
`min(expectedSize * 1.05, serverConfig.maxFileSize ?? HARD_CAP)` (the client already
receives `maxFileSize` in `SftpStatusResponse`); use a few-hundred-MB absolute
`HARD_CAP`. Also bound `chunkIndex` to reject absurd values used as Map keys.

### A2. No client-side cap on SFTP directory listing size / entry count (MEDIUM)

**Files:** `client/src/services/sftp-service.ts:570-581` (`listDirectory`),
`client/src/stores/sftp-store.ts:233`, rendered via `<For>` in
`client/src/components/sftp/FileBrowser.tsx:208`

A malicious gateway can return a `sftp-directory` response with millions of entries
(each with long `name`/`path`/`owner` strings). The client copies the whole array
into the store, renders every row, and re-sorts (`localeCompare` over the full set)
on each reactive read — freezing or OOM-ing the tab. No `maxEntries` guard, no
per-field length clamp.

**Fix:** Cap entry count in `listDirectory` (e.g. 10,000) with a "listing truncated"
notice, clamp string fields to sane lengths, and consider virtualized rendering.

### A3. Failed-integrity downloads are silently dropped (LOW)

**File:** `client/src/services/sftp-service.ts:384-390`

`assembler.download()` is wrapped in a `try/catch` that only `debug()`s the error.
If the server sends `isLast` with chunks missing, `assemble()` throws
("Missing chunk at index i"), the store still shows the transfer "completed," but no
file and no error reach the user — masking tampering/corruption.

**Fix:** On assembly failure set the transfer `status: 'failed'` with the error
instead of only logging.

### A4. Manual rollup native-binary pin can drift from resolved rollup version (LOW)

**Files:** `package.json:111-113` (`optionalDependencies`), `package-lock.json`

`optionalDependencies` pins `@rollup/rollup-linux-x64-gnu` to `^4.53.3` while the
lockfile resolves rollup to `4.59.0`. Manually pinning one platform's native binary
is fragile (version-skew "Cannot find module @rollup/rollup-\*" failures) and only
covers Linux x64. Build fragility, not security.

**Fix:** Remove the manual entry and let rollup manage its own platform binaries via
the lockfile; if a CI arch needs a guaranteed binary, pin it to the exact resolved
rollup version and bump both together.

**Status:** Resolved 2026-07-30 (#143) — the `optionalDependencies` block was
removed. Rollup left the dependency tree entirely with the Vite 8 / Rolldown
migration (#140), so no replacement pin is needed.

---

## Supply-chain / Build

### SC1. ~~Runtime dependencies misclassified as devDependencies~~ — WITHDRAWN (not a bug)

**File:** `package.json`

**Original claim (HIGH):** the UI libs (`@xterm/xterm`, `@xterm/addon-fit`,
`socket.io-client`, `solid-js`, `lucide-solid`, `debug`) in `devDependencies` were a
misclassification.

**Why withdrawn:** `webssh2_client` publishes a **self-contained pre-built bundle**.
The `files` whitelist ships `client/public/**/*` (the compiled `webssh2-*.js`) plus
tiny entrypoints. The published runtime API (`index.js` → `client/index.js`) only
exposes `getPublicPath()` + `version` using Node built-ins (`path`, `url`) and never
imports the UI libs at runtime; the gateway consumes it via
`import webssh2Client from 'webssh2_client'` → `getPublicPath()` to statically serve
the bundle. The UI libs exist only as compiled bytes inside the bundle, so they are
build-time inputs, not consumer-resolved runtime deps. `devDependencies` is the
correct field — promoting them would only bloat the consumer's `node_modules` with
unused packages, and `npm audit` / Dependency Review scan devDependencies anyway, so
no scrutiny is lost.

**Residual (LOW housekeeping) — FIXED:** `@xterm/addon-search` moved from `dependencies`
to `devDependencies` alongside its siblings; empty `dependencies` block removed.
[#115](https://github.com/billchurch/webssh2_client/issues/115) (assumed merged to main).

### SC2. Published `client/public/` bundle is excluded from VCS — no reviewable source-of-truth for shipped bytes (MEDIUM)

**Files:** `package.json:21-26` (`files` whitelist ships `client/public/**/*`),
`.gitignore:107` (excludes `client/public`)

The npm artifact ships the built bundle (`webssh2-*.js`, CSS, `client.htm`), but it
is gitignored — so the exact JS that runs in every operator's browser handling SSH
keystrokes/credentials is **never reviewable in a PR**. A compromised release runner
or tampered local build would publish malicious bundle code that code review and
Dependency Review cannot catch. `npm publish --provenance` (release.yml:129)
partially mitigates by attesting CI origin.

**Fix:** Keep provenance; additionally (1) run `npm ci --ignore-scripts` in the
release build (see SC4), (2) publish a checksum/SRI of the bundle in the GitHub
release, and (3) make the build reproducible (or commit output) so the diff is
reviewable. At minimum document that bundle integrity rests entirely on
provenance + the release pipeline.

### SC3. `.npmrc` is committed but `.gitignore` claims to ignore it (MEDIUM)

**Files:** `.npmrc:1`, `.gitignore:56`

`.gitignore` lists `.npmrc`, yet it is tracked (`git ls-files` confirms). Current
contents (`sign-git-tag=true`) are benign, but the gitignore entry creates a
false sense of safety: a future edit adding `//registry.npmjs.org/:_authToken=...`
would not stand out the way a normally-ignored file would, and reviewers grepping
`.gitignore` will wrongly assume npmrc is never committed.

**Fix:** Remove `.npmrc` from `.gitignore` (the project intentionally commits a
tag-signing npmrc) and add a pre-commit secret scan for `_authToken`/`_password` in
`.npmrc`. Never place a registry token here — publishing uses OIDC.

### SC4. Release/publish jobs run lifecycle scripts; only CI uses `--ignore-scripts` (MEDIUM)

**Files:** `.github/workflows/release.yml:42-43`, `update-webssh2-dependency.yml:56`
vs `ci.yml:23`

CI correctly uses `npm ci --ignore-scripts`, but the **release** `build` job (which
produces the exact published artifact) runs plain `npm ci` with lifecycle scripts
enabled. A malicious `postinstall` in any transitive dep (or a typosquat past the
quarantine) runs in the release context and can tamper with the bundle _before_ it is
published with provenance — laundering it through the attestation. `update-webssh2-
dependency.yml` uses plain `npm install` too.

**Fix:** Use `npm ci --ignore-scripts` in the release build/publish jobs (allowlist
any dep that genuinely needs a build step). Apply the same to the dependency-update
workflow.

### SC5. No Content-Security-Policy in the client; stale rule references a non-existent `csp-config.ts` (MEDIUM) — [#117](https://github.com/billchurch/webssh2_client/issues/117)

**Files:** `client/src/index.html`, `client/src/client.htm`,
`.claude/rules/security.md` ("Follow policies in `csp-config.ts`")

There is **no CSP** anywhere in the client (no meta tag, no `csp-config.ts`, no grep
hit), yet `security.md` instructs following a `csp-config.ts` that does not exist.
Good news: the shipped bundle does **not** require `unsafe-eval` (no `eval(`/
`new Function` in `client/public/webssh2-*.js`) — xterm v6 + compiled SolidJS run
without it. CSP is normally a server header, but the client ships its own HTML
(`client.htm`), and the dangling rule reference is misleading.

**Fix:** Add a CSP `<meta>` to the shipped HTML (or document that the gateway must
send the header) with at least `default-src 'self'; script-src 'self';
object-src 'none'; base-uri 'none'; frame-ancestors 'none'`. Verify xterm/Solid run
under it (they should, no `unsafe-eval` needed). Remove or fix the `csp-config.ts`
reference in `security.md`.

**Status:** Resolved 2026-06-10 (#117, PR #125) — JSON config block adopted and
the dead `csp-config.ts` reference fixed. The deferred gateway-side CSP header
shipped separately in billchurch/webssh2#546 (closed 2026-06-17).

### SC6. GitHub Actions pinned to SHAs but with imprecise version comments (LOW) — [#116](https://github.com/billchurch/webssh2_client/issues/116)

**Files:** `.github/workflows/ci.yml`, `release.yml`, `update-webssh2-dependency.yml`

All actions are pinned to 40-char commit SHAs (meets policy). Minor gap: version
comments are bare majors (`# v5`, `# v4`, `# v3`) instead of exact patch versions
(`# v4.2.2`), making it hard to verify a SHA matches a specific release.

**Fix:** Use exact released versions in comments and verify each SHA against the
action's releases page when updating.

**Status:** Resolved 2026-06-10 (#116, PR #124) — action version comments pinned
to exact released versions.

### SC7. TypeScript `no-unsafe-*` / `strict-boolean-expressions` not enabled (LOW)

**File:** `.eslintrc.json:132-143`

`no-unsanitized` and the DOM-API bans are correctly enforced at error level
(verified via `eslint --print-config`). However, the org server-policy
`@typescript-eslint` rules — `no-unsafe-assignment/call/member-access/return/argument`
and `strict-boolean-expressions` — are absent; only `no-explicit-any` is error.

**Fix:** Add those rules where type-checked linting is feasible.

---

## Performance

### P1. Full re-sort of directory listing on every reactive read (LOW)

**File:** `client/src/stores/sftp-store.ts` (`getSortedEntries`)

`getSortedEntries` runs `localeCompare` over the entire entry set on each reactive
read rather than memoizing. Combined with A2 (no entry cap) this amplifies the DoS,
but even for benign large directories it is wasteful.

**Fix:** Memoize the sorted list with `createMemo` keyed on entries + sort field/
direction so re-sort happens only when inputs change.

---

## Categories verified clean (no findings)

- **DOM-based XSS:** zero `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/
  `dangerouslySetInnerHTML`/`eval`/`new Function`/string-`setTimeout` in `client/src`.
  All server-driven strings (banners, errors, fingerprints, file names, titles,
  prompt text) render via SolidJS `{}` text interpolation (auto-escaped).
  `document.title` (Terminal.tsx:215) and `toast.textContent` are text sinks.
- **Server header background color:** flows through `validateHeaderBackground`
  (regex + `background-color`-only binding) — `url()`/image injection blocked.
- **`<Dynamic component={icon()}>`** with server-controlled icon name: safe — name
  resolved only against a static registry with a real-component fallback.
- **OSC 8 hyperlinks / OSC 52 clipboard:** no `WebLinksAddon`/`linkHandler`
  registered; no server-driven hyperlink or clipboard-write sink.
- **Paste / bracketed-paste:** routed through xterm `terminal.paste()`; never injected
  into DOM; no bypass.
- **`window.postMessage`:** no receivers exist (no missing-origin-check issue).
- **Host-key TOFU:** fail-closed and correct (see S6 note).
- **Credential storage:** no password/privateKey/passphrase written to localStorage,
  sessionStorage, or cookies; password/passphrase fields use `type=password` +
  appropriate `autocomplete`.
- **Private-key validation:** structural only; no key material logged or retained on
  `window`; no ReDoS-prone patterns.
- **Reconnection storms:** `io(...)` created with `reconnection: false`.
- **Mixed content:** `getWebSocketUrl` forces `wss:` on `https:` pages.
- **Source maps in prod:** `build.sourcemap: false` in production; no `.map` shipped;
  dev-only proxy/config gated on `mode === 'development'`.
- **keyboard-capture / terminalResize / debounce:** no keystroke exfiltration;
  dimensions clamped (1–9999) and debounced.
- **Upload path (file-chunker):** streams via `File.slice()`, ack-gated; no
  client-memory blowup (no client-side size/type pre-check, but enforcement is
  delegated to the gateway — acceptable for the trust model, worth a UX pre-check).
- **npm audit:** 0 HIGH/CRITICAL.
- **Workflow permissions:** least-privilege; OIDC publish with `--provenance` and no
  long-lived npm token.

---

## Summary

| ID  | Category     | Severity   | Status                                                                                                                                                                                                                                                                                  |
| --- | ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Security     | HIGH       | **Fixed** [PR #120](https://github.com/billchurch/webssh2_client/pull/120) (merged 2026-06-10) — `sanitizeClientAuthPayloadForLogging()` masks both debug payloads; regression tests added ([#112](https://github.com/billchurch/webssh2_client/issues/112))                            |
| S2  | Security     | MEDIUM→LOW | **Fixed** [PR #122](https://github.com/billchurch/webssh2_client/pull/122) (assumed merged to main) — `sanitizeDownloadFilename()` at both `anchor.download` sinks; user-clicked name authoritative; regression tests ([#113](https://github.com/billchurch/webssh2_client/issues/113)) |
| A1  | Availability | MEDIUM     | **Fixed** [PR #122](https://github.com/billchurch/webssh2_client/pull/122) (assumed merged to main) — byte limit vs expectedSize/maxFileSize/512 MiB cap, chunk-index bounds, abort surfaces as failed transfer ([#114](https://github.com/billchurch/webssh2_client/issues/114))       |
| SC1 | Supply-chain | ~~HIGH~~   | Withdrawn (not a bug) — bundled-output package; **addon-search housekeeping fixed** — moved to devDeps ([#115](https://github.com/billchurch/webssh2_client/issues/115), assumed merged to main)                                                                                        |
| S3  | Security     | MEDIUM     | Open — `history.replaceState` to scrub secrets from URL                                                                                                                                                                                                                                 |
| S4  | Security     | MEDIUM     | Open — allow-list / same-origin check on `config.socket.url`                                                                                                                                                                                                                            |
| S5  | Security     | MEDIUM     | Open — allow-list + validate forwarded handshake query params                                                                                                                                                                                                                           |
| A2  | Availability | MEDIUM     | Open — cap SFTP listing entry count + field lengths                                                                                                                                                                                                                                     |
| SC2 | Supply-chain | MEDIUM     | Open — make shipped bundle reviewable/checksummed                                                                                                                                                                                                                                       |
| SC3 | Supply-chain | MEDIUM     | Open — resolve `.npmrc` committed-vs-gitignored contradiction                                                                                                                                                                                                                           |
| SC4 | Supply-chain | MEDIUM     | Open — `--ignore-scripts` in release/publish jobs                                                                                                                                                                                                                                       |
| SC5 | Supply-chain | MEDIUM     | Filed [#117](https://github.com/billchurch/webssh2_client/issues/117) — fix stale `csp-config.ts` ref + `webssh2Config` CSP-readiness (header = gateway work)                                                                                                                           |
| S6  | Security     | LOW        | Open — optional client-side fingerprint recompute                                                                                                                                                                                                                                       |
| A3  | Availability | LOW        | Open — surface failed-integrity downloads to user                                                                                                                                                                                                                                       |
| A4  | Availability | LOW        | Resolved (#143) — orphaned optionalDependencies entry removed                                                                                                                                                                                                                           |
| SC6 | Supply-chain | LOW        | Filed [#116](https://github.com/billchurch/webssh2_client/issues/116) — exact-version comments on SHA-pinned actions                                                                                                                                                                    |
| SC7 | Supply-chain | LOW        | Merged [PR #119](https://github.com/billchurch/webssh2_client/pull/119) — type-aware lint + `no-unsafe-*` at error, 10 fixed; SBE ratchet → [#118](https://github.com/billchurch/webssh2_client/issues/118)                                                                             |
| P1  | Performance  | LOW        | Open — memoize sorted directory listing                                                                                                                                                                                                                                                 |
