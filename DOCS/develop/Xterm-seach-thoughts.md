# Customizing Xterm.js Search Highlight Styles for Better Contrast

## The Default Search Highlight and Contrast Issue

By default, the Xterm.js search addon highlights matches with a bright background (often yellow) but does not adjust the text color. If your terminal text is light (e.g. white) this results in white text on a yellow background, which is very low contrast and hard to read. This happens because the SearchAddon applies a background-color overlay to matched text but leaves the original text color intact. In other words, the highlighted text remains the same color it was (often white), now sitting on a bright highlight – hence the poor contrast.

## Using SearchAddon Decoration Options for Highlights

Xterm.js’s SearchAddon provides “decorations” options that let you define highlight colors for matches. When calling searchAddon.findNext or findPrevious, you can pass a decorations object to specify colors for matches. For example, you can set a yellow background for all matches and an orange/red background for the currently active match:

```js
// Example: Enable search decorations with custom colors
const searchOptions = {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  decorations: {
    matchBackground: '#ffff00', // Background for all matches (yellow)
    activeMatchBackground: '#ff4500', // Background for the current match (orange-red)
    matchBorder: '#000000', // (Optional) border around matches (black)
    activeMatchBorder: '#000000', // (Optional) border around the active match
    matchOverviewRuler: '#ffff00', // (Optional) marker color in scroll bar for matches
    activeMatchColorOverviewRuler: '#ff4500' // (Optional) marker color for active match
  }
}
searchAddon.findNext(term, searchOptions)
```

In the snippet above, we define distinct colors for normal vs. active match highlights. The matchBackground and activeMatchBackground ensure that all matches are highlighted (yellow) and the currently selected match is highlighted in a different color (orange-red), making it clearly distinguishable. We also included matchBorder and activeMatchBorder as black – this draws a thin outline around highlight blocks to further improve visibility (this is optional, but can help the highlight stand out, especially if the terminal background is similar to the highlight color). The overviewRuler colors are for the mini-map scrollbar indicator (also optional).

Note: Make sure the SearchAddon “decorations” feature is enabled (in recent versions this requires allowProposedApi: true on the Terminal if using the WebGL renderer). Without enabling decorations, you may not get any highlight overlays or result events.

## Ensuring Readable Text with CSS Overrides

Setting custom highlight background colors alone is not enough – as noted, the text will remain its original color (e.g. white). To fix the contrast, you need to force the text color to change when a highlight is applied. The SearchAddon currently doesn’t provide a direct API for changing the text (foreground) color of matches, but we can override it with CSS.

Root Cause: The highlight is rendered as a semi-transparent decoration layer over the text. The actual text is in <span> elements underneath with their original color (e.g. white). The decoration only sets an inline background-color on those spans, not the foreground.

Solution: Add global CSS rules that target the highlighted spans and override their color. We can use attribute selectors to match the inline style that Xterm applies. For example, if we used yellow (#ffff00) as our match background and orange-red (#ff4500) for the active match, we can do:

```css
/* Force black text for spans highlighted with yellow background */
.xterm-rows span[style*='background-color: #ffff00'] {
  color: #000000 !important;
}

/* Force white text for spans highlighted with orange-red background */
.xterm-rows span[style*='background-color: #ff4500'] {
  color: #ffffff !important;
}
```

The above CSS looks for any <span> within the terminal output (.xterm-rows) whose inline style contains that specific background-color, and then applies a high-contrast text color (#000 or #fff) with !important to override Xterm’s own styling ￼. After adding these rules, regular matches will appear as black text on a yellow background, and the active match as white text on an orange-red background, providing much better readability.

This method essentially catches the highlight overlay via its inline style and fixes the text color accordingly. It’s a bit of a hack, but until Xterm provides a direct way to style the foreground of search matches, this CSS approach is effective. (The Xterm team has used a similar strategy in examples to improve contrast.)

Targeting Both Active and Inactive Matches: We included two separate CSS rules – one for all matches (yellow background) and one for the active match (orange-red background). This ensures both types of highlights get an appropriate foreground color. If you use different highlight colors, adjust the selectors to match those. Also note, in newer versions the active match decoration uses a class .xterm-find-active-result-decoration on the overlay; if needed, ensure you target the correct class or inline style for your version (the CSS approach above is robust since it targets the inline color directly).

## Integrating the Fix with Tailwind CSS and SolidJS

In a Tailwind + SolidJS project, you typically have a global CSS (or Tailwind’s base layer) where you can put these custom styles. Since Tailwind is a utility-first framework, there isn’t a built-in utility for “highlighted text in xterm,” but we can still integrate our fix easily:
• Option 1: Add to Global CSS – Simply put the CSS override rules in a global stylesheet (e.g. app.css or wherever you include global styles in your SolidJS app). This file can be processed by Tailwind (you might already @import "tailwind.css"; in it). The example above shows adding it to an app.css file. You can write the CSS as shown; Tailwind will pass it through since it’s plain CSS. Ensure this file is included in your build so the styles apply to the .xterm-rows elements.
• Option 2: Use Tailwind’s @apply (if desired) – If you prefer to stay within Tailwind’s utility system, you could incorporate the same rules using Tailwind classes. For instance, in your Tailwind CSS file, you can use the @layer base or @layer utilities to append custom CSS:

```css
@layer base {
  .xterm-rows span[style*='background-color: #ffff00'] {
    @apply text-black !important;
  }
  .xterm-rows span[style*='background-color: #ff4500'] {
    @apply text-white !important;
  }
}
```

This uses Tailwind’s text-black and text-white utilities to apply the colors. (Note: The !important may need to be handled carefully; Tailwind can’t directly apply !important through @apply, so you might instead write the CSS color as shown earlier. Alternatively, you can configure Tailwind’s important flag globally or use !text-black in your HTML if you had a way to add a class to those spans, which in this case you do not. The plain CSS approach is often simpler.)

Either way, the key is that these styles need to be global, since the Xterm content is outside of React/Solid’s component scope and is rendered by the Xterm library. Ensure your stylesheet is loaded after the Xterm.js default styles so that your overrides take precedence. The !important in the rules helps guarantee your color wins over any inline or default styling.

## Alternative Approach: Minimum Contrast Ratio Setting

Xterm.js has a built-in option minimumContrastRatio which can automatically adjust text color for legibility. For example, setting minimumContrastRatio: 4.5 (WCAG AA) or higher will cause Xterm to dynamically change the foreground text color if the current background/foreground contrast is below that threshold. In theory, this means if a white piece of text ends up on a bright yellow highlight (low contrast), Xterm would lighten or darken the text to meet the ratio (likely turning it black in this case).

To use this, you would configure your Terminal instance like:

```js
const term = new Terminal({
  theme: {
    /*...your theme...*/
  },
  minimumContrastRatio: 7 // for example, enforce very high contrast (AAA standard)
})
```

This is a more global solution – it will affect all text rendering in the terminal, not just search highlights. It can be useful for accessibility as it ensures no combination of text/background falls below the given contrast ratio. However, be cautious: it might alter colors in other scenarios (for example, dim text on certain backgrounds might get boosted). If your only issue is the search highlight contrast, you might prefer the targeted CSS fix above. But it’s good to know this setting exists as a complementary approach to improve text visibility.

## Summary

To achieve proper contrast for search results in an Xterm.js terminal (Tailwind + SolidJS environment or otherwise), you should use a combination of custom highlight colors and CSS overrides for text color. Use the SearchAddon’s decorations options to set distinct background colors for matches (e.g. yellow for matches, orange/red for the current match), and then override the span styles via CSS so that the text on those highlights is readable (black or white as needed). If integrating with Tailwind, simply incorporate these CSS rules in your global styles (using Tailwind’s utilities if you like), since Tailwind will ultimately output them as standard CSS.

With these changes, your terminal search highlights will go from “white text on yellow” (hard to read) to “black text on yellow” (or an equivalently high-contrast combination) for normal results, and a clear inverted color for the active result – vastly improving readability. This ensures that search hits are visually prominent and accessible, even in a dark-themed terminal UI.

Sources: The solution above is informed by the Xterm.js documentation and community examples. In particular, the WebSSH2 project’s implementation of search highlights provided guidance on fixing contrast (using CSS selectors on .xterm-rows span styles), and the Xterm.js API docs were referenced for the minimumContrastRatio feature. These approaches will help you achieve a much more legible search highlighting in your terminal emulator setup.
