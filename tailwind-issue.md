Short answer, yes. h-screen maps to height: 100vh, and there are a few gotchas that can make it resolve to something like ~400px.

Here is what typically causes it, and the reliable fixes:

Common causes 1. Ancestor without a definite height
h-screen needs the browser’s viewport, but children using h-full need every parent to have a defined height. If any wrapper only sizes to content, the computed height can collapse. 2. Mobile and dynamic toolbars
100vh is unstable on iOS Safari and some Android browsers, the UI chrome changes the measured height. 3. Keyboard and the meta viewport
interactive-widget=resizes-content can change the layout height when the virtual keyboard opens, leading to odd cached values. 4. Scrollbars and overflow on html/body
If html or body have margins, padding, or overflow that adds scroll, some engines report a smaller layout viewport.

Fixes that work in practice
• Give the chain a size
Set html, body, #root to 100 percent height so h-full has something definite to inherit.

/_ global.css _/
html, body, #root { height: 100%; }
body { margin: 0; }

Then on your app shell, prefer h-full instead of h-screen:

<div id="root" class="h-full">
  <div class="h-full flex flex-col">...</div>
</div>

    •	Use dynamic viewport units

Tailwind supports arbitrary values, so you can do:

<div class="h-[100dvh]">...</div>

dvh tracks the visible viewport, better than 100vh on mobile.
• Or Tailwind’s built-in dvh class
If your Tailwind version exposes it, use h-dvh or min-h-dvh.
If not, add a utility:

// tailwind.config.js
theme: { extend: { height: { dvh: '100dvh' }, minHeight: { dvh: '100dvh' } } }

    •	Prefer min-h-screen over h-screen for pages

min-h-screen allows the page to grow past the viewport, avoids odd clipping.
• Avoid mixing h-screen with parents that are auto
If a child uses h-full, every ancestor up to the root must be h-full or h-screen. Inconsistent mixing often yields ~400–500px heights.
• Check for fixed or absolute ancestors
A positioned ancestor with a small height can constrain descendants. Remove the constraint or set it to h-full too.

Minimal, durable layout

<html class="h-full">
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
    >
  </head>
  <body class="h-full">
    <div id="root" class="h-full">
      <main class="min-h-dvh md:h-[100dvh] flex flex-col">
        <!-- terminal container -->
        <section class="flex-1 min-h-0">
          <!-- xterm mounts here -->
        </section>
      </main>
    </div>
  </body>
</html>

Notes: flex-1 min-h-0 lets the terminal section grow and prevents flex overflow. On older Tailwind, replace min-h-dvh with min-h-[100dvh].

Why your fix worked

Switching from h-screen to height: 100% on the App meant the App matched its parent. Since you set html, body, root to 100 percent, the chain was definite, so the terminal could expand to the full viewport rather than a collapsed computed height.

If you want, paste your top-level layout and I will mark exactly which wrappers need h-full, min-h-[100dvh], or flex-1 min-h-0.
