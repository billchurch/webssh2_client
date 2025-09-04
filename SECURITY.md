# Security Practices for WebSSH2 Client

This document summarizes the client-side security measures in this repository and how they relate to xterm.js guidance and web security best practices.

## XSS Defense in Depth

- No innerHTML for untrusted data: All remote terminal output is written via `xterm.write()`. UI text updates use `textContent`, never `innerHTML`.
- Sanitized styles: When updating banner/status colors, user-supplied values are validated. We do not accept arbitrary CSS.
- No linkifying add-ons: We do not enable WebLinks or custom link providers. If added in the future, only `http/https` URLs will be allowed, and `javascript:`/`data:`/`file:` will be rejected.

## Content Security Policy (CSP)

The app serves a strict CSP via `client/src/js/csp-config.ts`:

- `script-src 'self'`: Disallows inline scripts. Our HTML contains no inline scripts.
- `style-src 'self' 'unsafe-inline'`: Allows inline styles required by xterm DOM renderer and small style updates (e.g., banner color). No untrusted CSS is injected.
- `connect-src 'self' ws: wss:`: Allows WebSocket traffic to the current host. In production, consider pinning the exact origin and path (e.g., only `/ssh/socket.io`).
- Other directives: Disallow frames/objects; set safe defaults for fonts, images, referrer policy, and permissions policy.

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
