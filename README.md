# WebSSH2 Client - Web SSH Client

[![CI](https://github.com/billchurch/webssh2_client/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/billchurch/webssh2_client/actions/workflows/ci.yml)
[![Release](https://github.com/billchurch/webssh2_client/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/billchurch/webssh2_client/actions/workflows/release.yml)

![Orthrus Mascot](images/orthrus.png)

WebSSH2 Client is an HTML5 web-based terminal emulator and SSH client component. It uses WebSockets to communicate with a WebSSH2 server, which in turn uses SSH2 to connect to SSH servers.

![WebSSH2 demo](https://user-images.githubusercontent.com/1668075/182425293-acc8741e-cc92-4105-afdc-9538e1685d4b.gif)

# Important Notice

This package contains only the browser-side client component of WebSSH2. It requires a compatible WebSSH2 server to function. The server component is available at [webssh2 server](https://github.com/billchurch/webssh2/tree/bigip-server). This package is intended for advanced users who want to customize or integrate the client component independently.

# Status

This is an experimental refactor of the WebSSH2 v0.2.x client to function as a standalone component. It has been separated from the server-side code to facilitate customization and integration with different frameworks.

## Requirements

- Modern web browser with JavaScript enabled
- Compatible WebSSH2 server instance (v0.2.x or compatible)
- Socket.IO v2.2.0 compatibility (due to server requirements)

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/billchurch/webssh2_client.git
   cd webssh2_client
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the client:

   ```
   npm run build
   ```

4. The built client files will be in the `client/public` directory.

## Server Requirements

The WebSSH2 client requires a compatible server that provides:

- WebSocket endpoint for SSH communication
- Authentication handling
- SSH connection management
- Socket.IO v2.2.0 compatibility

For server setup instructions, refer to the [WebSSH2 server documentation](https://github.com/billchurch/webssh2/tree/bigip-server).

## Client Features

- Web-based SSH client with xterm.js terminal emulation
- Customizable terminal settings:
  - Font size and family
  - Color schemes
  - Cursor behavior
  - Scrollback buffer size
- Session logging with download capability
- Copy and paste functionality
- Terminal mouse support
- Keyboard shortcuts
- Responsive design
- Multi-factor authentication support (when supported by server)
- Support for credential replay and reauthentication

## Security and Lint Rules

- No innerHTML: The client never uses `innerHTML` for user content. All text uses `textContent` and safe DOM building helpers.
- CSP: Strict `script-src 'self'` (no inline scripts). Inline styles allowed for xterm DOM renderer and safe color updates.
- ESLint guardrails:
  - `no-unsanitized` plugin blocks unsanitized DOM sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`).
  - Additional bans via `no-restricted-properties` for those sinks, and `no-restricted-syntax` for string-based timers and `new Function`.
- Xterm integration: Terminal output is rendered with `xterm.write()`; no HTML rendering of remote data.

## Configuration

The client can be configured through:

1. URL parameters
2. Configuration object
3. User interface settings

### URL Parameters

Supported URL parameters include:

- `host` - SSH server hostname
- `port` - SSH server port (default: 22)
- `header` - Optional header text
- `headerStyle` - Complete header styling with Tailwind CSS classes or CSS (recommended)
- `headerBackground` - Header background styling only (legacy, see Advanced Header Styling below)
- `sshterm` - Terminal type (default: xterm-color)

#### Advanced Header Styling

WebSSH2 Client supports comprehensive header styling through two approaches: **enhanced headerStyle** (recommended) and **legacy headerBackground** (maintained for backward compatibility).

##### Enhanced Header Styling (headerStyle)

The `headerStyle` parameter provides complete control over header appearance using Tailwind CSS classes or CSS properties:

**Basic Examples:**

```
# Enhanced background with custom height and text
?header=Production&headerStyle=bg-red-600%20h-10%20text-xl%20font-bold

# Gradient with custom styling
?header=Staging&headerStyle=bg-gradient-to-r%20from-blue-500%20to-purple-500%20h-8%20text-lg

# Custom text colors and shadows
?header=Development&headerStyle=bg-green-500%20text-black%20font-semibold%20shadow-lg
```

**Advanced Styling Capabilities:**

**Backgrounds & Gradients:**

```
# Multi-directional gradients
?headerStyle=bg-gradient-to-br%20from-purple-600%20via-pink-500%20to-yellow-400%20h-12

# Solid colors with transparency
?headerStyle=bg-blue-500%20h-8%20shadow-blue-500/50

# Complex gradient patterns
?headerStyle=bg-gradient-to-r%20from-red-500%20via-yellow-500%20to-green-500%20h-10
```

**Typography & Layout:**

```
# Large headers with custom fonts
?headerStyle=bg-slate-700%20h-16%20text-3xl%20font-black%20flex%20items-center%20justify-center

# Compact headers
?headerStyle=bg-indigo-600%20h-5%20text-xs%20font-medium

# Custom text alignment and colors
?headerStyle=bg-gradient-to-r%20from-cyan-400%20to-blue-500%20text-left%20text-yellow-100%20px-4
```

**Borders & Effects:**

```
# Styled borders
?headerStyle=bg-purple-500%20border-2%20border-white%20border-dashed%20h-8

# Shadow effects
?headerStyle=bg-green-500%20shadow-xl%20shadow-green-500/50%20rounded-lg%20h-10

# Rounded corners
?headerStyle=bg-gradient-to-r%20from-pink-400%20to-rose-500%20rounded-xl%20h-12%20mx-2
```

**Animations:**

```
# Pulsing effect for alerts
?headerStyle=bg-red-600%20animate-pulse%20h-8%20font-bold

# Bouncing for urgent notifications
?headerStyle=bg-yellow-500%20animate-bounce%20h-10%20text-black%20font-semibold
```

**Production Examples:**

```
# Critical system warning
?header=🚨%20PRODUCTION%20-%20CRITICAL%20🚨&headerStyle=bg-gradient-to-r%20from-red-600%20to-red-700%20h-12%20text-2xl%20font-bold%20animate-pulse%20shadow-lg

# Development environment
?header=🛠️%20Development%20Environment&headerStyle=bg-gradient-to-r%20from-green-400%20to-emerald-600%20h-8%20text-white%20font-medium

# Staging deployment
?header=🚀%20Staging%20Deployment&headerStyle=bg-gradient-to-r%20from-yellow-400%20to-orange-500%20h-10%20text-black%20font-semibold%20border-b-2%20border-orange-600

# Secure connection
?header=🔐%20Encrypted%20Connection&headerStyle=bg-gradient-to-r%20from-emerald-500%20to-teal-600%20h-8%20text-white%20shadow-md
```

##### Legacy Header Styling (headerBackground)

For backward compatibility, the original `headerBackground` parameter is still supported:

**Basic Colors:**

```
?header=Production&headerBackground=red
?header=Custom&headerBackground=%23ff6b35
```

**Tailwind Classes:**

```
?header=Server%20Alpha&headerBackground=bg-blue-500
?header=Critical%20System&headerBackground=bg-red-600
```

**Simple Gradients:**

```
?header=Gradient%20Demo&headerBackground=bg-gradient-to-r%20from-blue-500%20to-purple-500
```

##### Header Styling Reference

**Essential Styling Categories:**

**🎨 Background Colors & Gradients**

```
# Solid Colors
bg-red-600, bg-blue-500, bg-green-500, bg-yellow-500, bg-purple-500
bg-slate-700, bg-gray-800

# Gradients (Direction + Colors)
bg-gradient-to-r from-red-600 to-red-700
bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-400
bg-gradient-to-tl from-blue-400 to-cyan-500
```

**📝 Text Styling**

```
# Sizes: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl
# Weights: font-normal, font-medium, font-semibold, font-bold, font-black
# Colors: text-white, text-black, text-yellow-100, text-red-100, text-blue-100

# Examples
text-2xl font-bold text-white
text-sm font-medium text-black
text-4xl font-black text-yellow-100
```

**📏 Header Heights**

```
# Available: h-4, h-5, h-6, h-7, h-8, h-10, h-12, h-14, h-16
# Default was h-6 (24px), now customizable

h-8     # Compact header
h-12    # Standard header
h-16    # Prominent header
```

**✨ Visual Effects**

```
# Animations
animate-pulse    # Pulsing effect for alerts
animate-bounce   # Bouncing for urgent notifications

# Shadows
shadow-md, shadow-lg, shadow-xl

# Borders
border-2 border-white border-dashed
rounded-lg, rounded-xl
```

**📍 Layout & Positioning**

```
# Text Alignment
text-left, text-center, text-right

# Spacing
px-4, px-6 (horizontal padding)
py-2, py-3 (vertical padding)

# Flexbox (for complex layouts)
flex items-center justify-center
```

**Common Use Cases:**

**🚨 Production/Critical Systems:**

```
# Red gradient with large text and pulsing animation
bg-gradient-to-r from-red-600 to-red-700 h-12 text-2xl font-bold animate-pulse

# Solid red with white border
bg-red-600 border-2 border-white h-10 text-xl font-bold
```

**🚀 Staging/Development:**

```
# Yellow-orange gradient for staging
bg-gradient-to-r from-yellow-400 to-orange-500 h-10 text-black font-semibold

# Green for development
bg-gradient-to-r from-green-400 to-emerald-600 h-8 text-white font-medium
```

**🔒 Secure/Special Connections:**

```
# Blue gradient with shadow
bg-gradient-to-r from-blue-500 to-cyan-500 h-8 shadow-lg

# Purple with rounded corners
bg-purple-600 rounded-lg h-10 font-semibold
```

**⚡ Quick Reference:**

- **Colors**: red, blue, green, yellow, purple, pink, cyan, emerald, slate, gray
- **Shades**: 400 (lighter), 500 (medium), 600 (darker), 700 (darkest common)
- **Text sizes**: xs, sm, base, lg, xl, 2xl, 3xl, 4xl
- **Heights**: 4-16 (h-4 = 16px, h-16 = 64px)
- **Combine freely**: `bg-blue-500 h-12 text-xl font-bold animate-pulse shadow-lg`

##### Styling System Features

**Automatic Detection:**
The system automatically detects whether you're using:

- Tailwind CSS classes (applied as CSS classes)
- CSS color values (applied as inline styles)

**Complete Tailwind Support:**

- **Backgrounds:** Solid colors, gradients, transparency
- **Typography:** Font sizes, weights, colors, alignment
- **Layout:** Heights, padding, margins, flexbox
- **Borders:** Styles, colors, radius
- **Effects:** Shadows, animations
- **Bundle Optimized:** Curated safelist keeps CSS file size reasonable (~38KB)

**Backward Compatibility:**

- Existing `headerBackground` URLs continue to work
- Mixed usage supported (header + headerBackground or headerStyle)
- Graceful fallback to CSS for non-Tailwind values

### Configuration Object

You can configure the client by setting `window.webssh2Config`:

```javascript
window.webssh2Config = {
  socket: {
    url: null, // WebSocket URL (auto-detected if null)
    path: '/ssh/socket.io' // Socket.IO path
  },
  ssh: {
    host: null, // SSH server hostname
    port: 22, // SSH server port
    username: null,
    sshterm: 'xterm-color'
  },
  header: {
    text: null,
    background: 'green'
  },
  autoConnect: false
}
```

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md).

## Support

If you find this project helpful, consider supporting the developer:

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/billchurch)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- [Xterm.js](https://xtermjs.org/) for terminal emulation
- [Socket.IO](https://socket.io/) for WebSocket communication
- [Vite](https://vitejs.dev/) for development and bundling
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) for code quality
- [lucide-static](https://github.com/lucide-icons/lucide) for SVG icons
