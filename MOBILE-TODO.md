# Mobile & PWA Enhancements — TODOs

This file tracks upcoming work to improve mobile UX and prepare a PWA path for the WebSSH2 client. Prioritize high‑impact, low‑risk steps first; group changes behind small PRs.

## 0) Short-Term Wins (No PWA)

- Menu tap UX: done — keep hover for desktop, tap/click for mobile; close on outside/Esc.
- Terminal fit: done — ResizeObserver on `#terminalContainer`, safe‑area bottom padding, `interactive-widget=resizes-content`.
- Inputs: done — autocomplete hints, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint`.
- Follow‑ups:
  - Add `overscroll-behavior: contain` and `touch-action: pan-y` to any future scrollable panels.
  - Verify iOS/Safari with hardware keyboard attached (no VK resize issues).

## 1) On‑Screen Terminal Controls (Mobile)

Goal: Provide an optional, compact keypad for modifier/special keys.

- Keys: Esc, Tab, Ctrl, Alt/Opt, Meta/Cmd, Arrows (◀︎▲▼▶︎), Home, End, PgUp, PgDn.
- Modes:
  - Tap: Send single key (e.g., Esc).
  - Sticky modifiers: Tap Ctrl/Alt/Meta to “arm” next keypress; show visual state; auto‑off after one key.
  - Hold‑to‑repeat for arrows (long‑press = repeat at interval).
- Placement/behavior:
  - Toggle button in footer menu to show/hide keypad.
  - Responsive row that does not overlap terminal last row (respect safe‑area padding).
  - A11y: `role="toolbar"`, focusable buttons with labels, visible focus.
- Implementation notes:
  - Use existing socket/xterm event path (emitData) to send control sequences (e.g., Ctrl + C, arrows).
  - Map keys to xterm: `term?.textarea?.dispatchEvent(new KeyboardEvent(...))` or prefer `emitData` with correct control chars (e.g., Ctrl+<key> = `String.fromCharCode(keyCode - 64)`). Arrows use CSI: `\x1B[A/B/C/D`.
  - Provide a small settings modal to choose “send as control char” vs “compose with modifier”.

## 2) PWA Planning

- Manifest:
  - `manifest.webmanifest` with `name`, `short_name`, `start_url: ./client.htm`, `display: standalone`, `theme_color`, `background_color`, `icons` (192/512 png, maskable variant).
  - Link from HTML: `<link rel="manifest" href="manifest.webmanifest">`.
- iOS support:
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="WebSSH2">`
  - Apple touch icons (180x180).
- Service Worker (later milestone):
  - Online‑first; cache static assets (`webssh2.bundle.js`, `webssh2.css`, `client.htm`, icons).
  - No offline for terminal sessions; show friendly offline page for the shell UI only.
  - Consider Workbox (vite-plugin-pwa) with explicit CSP.
- Install prompts:
  - Listen for `beforeinstallprompt` and show non‑blocking UI.
  - Document iOS “Add to Home Screen” manual path.
- CSP updates:
  - Allow service worker (`worker-src 'self'`) and `manifest-src 'self'`.
  - Keep `connect-src` restricted to same‑origin ws/wss and the socket path.

## 3) Keyboard & Viewport Enhancements

- Virtual Keyboard API (Android):
  - Optionally set `navigator.virtualKeyboard.overlaysContent = false` (prefer resize) or `true` (overlay) based on user setting.
  - When overlaying, increase bottom padding while the keyboard is visible (track `visualViewport` delta).
- Orientation polish:
  - On rotate, if terminal had focus or was at bottom, call `scrollToBottom` after fit (already guarded).
- Prevent accidental swipe‑back:
  - Optional small left/right gutters that absorb horizontal pans while touching terminal (retain two‑finger swipe for system back if present).

## 4) Accessibility & Input

- Screen reader mode:
  - Expose `screenReaderMode` toggle for xterm; test with VoiceOver/NVDA.
  - Keep status updates in `#status` live region; never stream terminal output into live region.
- Focus/labels:
  - Ensure keypad buttons have clear names, and that focus does not jump unexpectedly when keypad toggles.
  - Respect `prefers-reduced-motion` (e.g., cursorBlink off).

## 5) Clipboard & Paste (Mobile)

- Add “Paste” to menu using Async Clipboard API (`navigator.clipboard.readText()`), with permission handling and error UI.
- For iOS, document that paste may require user action due to platform prompts.

## 6) Fullscreen Option

- Add “Enter Fullscreen” menu item:
  - `document.documentElement.requestFullscreen()`; toggle to `exitFullscreen()`.
  - Show only if supported; fall back to PWA recommendation in tooltip.

## 7) Resilience & Perf

- Reconnect heuristics tuning for flaky mobile networks (backoff + UI feedback).
- Ensure ResizeObserver disconnects on unload; guard for low‑memory devices.
- Verify battery impact of frequent fits; avoid redundant fits (coalesce with rAF).

## 8) Testing & CI (Manual for now)

- Real device smoke on iOS Safari and Android Chrome:
  - Menu tap, rotate with keyboard open/closed, terminal refit at bottom.
  - Keypad: send Esc, arrows, Ctrl+C with sticky modifier.
  - Install PWA and launch — check no URL bar, safe‑area behavior.
- Optional: add Playwright scripts for device emulation (no network needed) to validate DOM toggles and layout classes.

## 9) Deliverables & Rollout

- Phase 1 (UI): keypad toolbar, fullscreen toggle, clipboard paste.
- Phase 2 (PWA): manifest, icons, theme, basic SW cache, install prompts.
- Phase 3 (tuning): Virtual Keyboard option, overlay padding, reconnect tweaks.

## References

- MDN: Progressive Web Apps, Web App Manifest, Service Workers.
- Virtual Keyboard API (Chrome/Android): overlaysContent.
- xterm.js: screenReaderMode and key handling.

