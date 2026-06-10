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

## Operational Guidance

- HTTPS recommended: Use `wss:` in production.
- Limit CSP `connect-src`: In production, consider pinning the exact WebSocket endpoint/domain.
- Review changes to CSP and DOM updates in PRs.
