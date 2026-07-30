# Security Practices for WebSSH2 Client

This document summarizes the client-side security measures in this repository and how they relate to xterm.js guidance and web security best practices.

## XSS Defense in Depth

- No innerHTML for untrusted data: All remote terminal output is written via `xterm.write()`. UI text updates use `textContent`, never `innerHTML`.
- Sanitized styles: When updating banner/status colors, user-supplied values are validated. We do not accept arbitrary CSS.
- No linkifying add-ons: We do not enable WebLinks or custom link providers. If added in the future, only `http/https` URLs will be allowed, and `javascript:`/`data:`/`file:` will be rejected.

## Content Security Policy (CSP)

The client does not serve a CSP itself — the `Content-Security-Policy`
response header is owned by the webssh2 gateway that serves these assets.
The client is kept compatible with a strict policy:

- `script-src 'self'` compatible: Runtime config is injected by the gateway
  into an inert `<script type="application/json" id="webssh2-config">` data
  block, read by `client/src/utils/injected-config.ts`. A legacy inline
  `window.webssh2Config = null;` script remains for older gateways; under a
  strict policy it is blocked harmlessly and the JSON block takes over. No
  `eval()` or string-based timers are used.
- `style-src 'self' 'unsafe-inline'` required: xterm.js sets inline style
  attributes, so inline styles must be allowed. No untrusted CSS is injected.
- `connect-src`: Should be pinned to the gateway origin (e.g., only
  `/ssh/socket.io`) to limit exfiltration channels.
- Other directives (frames/objects/fonts/images, report-only rollout) are a
  gateway concern.

## xterm.js Considerations

- Terminal output is plain text: xterm renders characters, not HTML. We never render terminal output with HTML, preventing script injection vectors.
- OSC 8/52 features: We do not explicitly enable features that expose privileged capabilities. If adopted, they will include user prompts and allowlists.
- Addon hygiene: No xterm link/clipboard addons are enabled by default. Any future add-ons will be reviewed for security.

## UI/DOM Hygiene

- Safe DOM APIs: All dynamic UI text uses `textContent`. Icons are sourced from trusted `lucide-static` SVGs only.
- Event handlers: No inline JavaScript event attributes are used in HTML; handlers are attached via JS.
- URL parameters: Inputs from URL are validated and sanitized before use.

## Build/Tooling Safeguards

- TypeScript strict mode with no `any` policy; unknown/narrowing used for untrusted data.
- ESLint + Prettier:
  - no-unsanitized plugin blocks unsanitized DOM sinks (innerHTML, outerHTML, insertAdjacentHTML, document.write).
  - Custom lint bans `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and string-based timers/new Function.
  - CI-amenable rules enforce safe patterns and flag risky constructs.
- Tests: JSDOM-based tests focus on XSS and DOM safety.

## Release Artifact Integrity

The npm package ships a pre-built browser bundle (`client/public/**`) that is
not committed to git, so its integrity rests on the release pipeline. The
following controls apply (red-team review 2026-06-10, SC2/SC4):

- **No lifecycle scripts at build time:** CI and the release build both
  install with `npm ci --ignore-scripts`, so no transitive dependency can run
  code on the build runner and tamper with the bundle before it is published.
- **npm provenance:** Releases are published with
  `npm publish --provenance` via OIDC (no long-lived npm tokens). Consumers
  can verify with:

```bash
npm audit signatures
```

- **Published checksums:** Each GitHub release attaches `checksums.txt`
  (SHA-256 of `client-public.zip` and every file in `client/public/`) and
  repeats the hashes in the release notes. To verify an npm-installed copy
  against the GitHub release:

```bash
cd node_modules/webssh2_client/client
curl -fsSL "https://github.com/billchurch/webssh2_client/releases/download/<tag>/checksums.txt" \
  | grep '^[0-9a-f]*  public/' | sha256sum -c -
```

A mismatch means the npm artifact and the GitHub release disagree — treat
as a compromise indicator until explained. Note that release assets and
notes are mutable by anyone with repo write access; the tamper-evident
anchors are npm provenance and the artifact attestations below — the
checksums exist to make cross-channel comparison practical.

- **Artifact attestations:** `client-public.zip` and `checksums.txt` are
  signed with sigstore via `actions/attest-build-provenance`, recording in
  a public transparency log which workflow and commit produced them. This
  makes the checksum file itself tamper-evident. Verify with:

```bash
gh attestation verify checksums.txt --repo billchurch/webssh2_client
gh attestation verify client-public.zip --repo billchurch/webssh2_client
```

- **Reproducible banner:** The bundle banner embeds the git commit date
  (not the build time), so rebuilding the same tag yields byte-for-byte identical
  output. **Note:** As of v5.4.0, the toolchain migrated to Vite 8 with Rolldown
  and Oxc, so hashes are not comparable across the 5.3.x → 5.4.0 boundary. Within
  a given version, rebuild verification proceeds by comparing checksums of
  `webssh2-*.js` and `webssh2-*.css`.
- **`.npmrc`:** Intentionally committed and limited to `sign-git-tag=true`.
  Never add registry tokens to it; publishing uses OIDC.

## Operational Guidance

- HTTPS recommended: Use `wss:` in production.
- Limit CSP `connect-src`: In production, consider pinning the exact WebSocket endpoint/domain.
- Review changes to CSP and DOM updates in PRs.
