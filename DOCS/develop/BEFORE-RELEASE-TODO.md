# Before Release we need to fix

## Accessibility

- When `Menu` has focus, you should be able to use arrow keys to navigate to menu items (accessibility)
- Ensure all elements have proper accessibility tags

## Quality of Life

### Clipboard integration ()

- Selecting text immedately puts into clipboard
- Option in settings to control that behaivor (on/off, defaults to on, devision stored in with browser localStorage)
- <https://github.com/xtermjs/xterm.js/tree/master/addons/addon-clipboard>
- Use solidjs patterns to implement, ensure proper integration with our lib/xterm-solid

### Darkmode

- Implement darkmode feature using native tailwind and any solidjs components and patterns
- Section in options panel/modal to enable/disable

### Display Settings / Settings Panel Enhancements

- settings modal should have tabbed interface, different settings broken out see `/Users/bc/Documents/GitHub/alt-webtop/src/components/organisms/OptionsModal.tsx` for an example.
- Limited ability to change screen colors / display settings, see `/Users/bc/Documents/GitHub/alt-webtop/src/components/organisms/settings/DisplaySettings.tsx` for an example from another project.
- This should mainly be terminal foreground and background (single color).
- There can be options for both dark/light mode.
- A sample mock terminal showing the effects as you change should be available.
- changing of search highlighting foreground/background (should also be reflected in mock terminal)
- Use of tailwindcss and solidjs patterns only

### Help system

- Help menu item
- Help displaying tabbed information about interacting with the application
- searching
- display settings
- keyboard commands
- helpful URL parameters
- troubleshooting tips

### Reactive Window / Tab Title

- Browser tab / title should reflect the hostname/port we're connected to
- OSC
