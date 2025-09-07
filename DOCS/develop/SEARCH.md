# Terminal Search Feature - Developer Guide

This document provides an in-depth technical overview of the terminal search functionality implementation in WebSSH2 Client.

## Overview

The search feature provides real-time search capabilities within the terminal emulator using xterm.js SearchAddon. It follows SolidJS reactive patterns and integrates seamlessly with the existing architecture while maintaining type safety and proper cleanup.

## Architecture

### Component Hierarchy

```
App.tsx
├── TerminalComponent (manages terminal instance)
│   ├── XTerm (xterm-solid wrapper)
│   └── SearchAddon integration
└── TerminalSearch (search UI overlay)
```

### Key Files

| File                                       | Purpose                                            |
| ------------------------------------------ | -------------------------------------------------- |
| `client/src/components/TerminalSearch.tsx` | Search UI component with Tailwind styling          |
| `client/src/components/Terminal.tsx`       | Terminal component with SearchAddon integration    |
| `client/src/components/MenuDropdown.tsx`   | Menu integration with search option                |
| `client/src/utils/os-detection.ts`         | Cross-platform OS detection and keyboard shortcuts |
| `client/src/stores/terminal.ts`            | Reactive state management for search               |
| `client/src/app.tsx`                       | Global keyboard handler and component coordination |

## Technical Implementation

### 1. SearchAddon Integration

The xterm.js SearchAddon is integrated at the terminal level:

```typescript
// In Terminal.tsx
import { SearchAddon } from '@xterm/addon-search'

const searchAddonInstance = new SearchAddon()
setSearchAddon(searchAddonInstance)
terminal.loadAddon(searchAddonInstance)
```

### 2. Reactive State Management

Search state is managed using SolidJS signals in `stores/terminal.ts`:

```typescript
// Search state
export const [isSearchVisible, setIsSearchVisible] = createSignal(false)
export const [searchTerm, setSearchTerm] = createSignal('')
export const [searchOptions, setSearchOptions] = createSignal({
  caseSensitive: false,
  wholeWord: false,
  regex: false
})
export const [searchResults, setSearchResults] = createSignal({
  currentIndex: 0,
  totalMatches: 0
})
```

### 3. Terminal Actions Interface

The search functionality is exposed through the TerminalActions interface:

```typescript
interface TerminalActions {
  // ... other methods
  search: {
    findNext: (term: string, options?: SearchOptions) => boolean
    findPrevious: (term: string, options?: SearchOptions) => boolean
    clearSelection: () => void
    clearDecorations: () => void
    onSearchResults: (
      callback: (results: SearchResultsEvent) => void
    ) => (() => void) | undefined
  }
}
```

### 4. Search Results Event Handling

The SearchAddon provides search results through an event system, but **requires decorations to be enabled**:

```typescript
// Event listener setup (simplified after fix)
const addon = searchAddon()
if (addon && addon.onDidChangeResults) {
  const disposable = addon.onDidChangeResults(callback)
  return () => disposable?.dispose?.()
}

// Search with decorations enabled
const searchOptions = {
  ...options,
  decorations: {
    matchBackground: '#ffff00',
    activeMatchBackground: '#ff6600',
    matchOverviewRuler: '#ffff00',
    activeMatchColorOverviewRuler: '#ff6600'
  }
}
return addon.findNext(term, searchOptions)
```

### 5. OS-Aware Keyboard Shortcuts

Cross-platform keyboard shortcuts are implemented with OS detection:

```typescript
// utils/os-detection.ts
const getSearchShortcut = (): KeyboardShortcut => {
  const os = getOS()

  switch (os) {
    case 'macOS':
      return {
        key: 'f',
        displayText: '⌘F',
        modifierKeys: ['metaKey']
      }
    case 'Windows':
    case 'Linux':
    default:
      return {
        key: 'f',
        displayText: 'Ctrl+F',
        modifierKeys: ['ctrlKey']
      }
  }
}
```

## Component Details

### TerminalSearch Component

The main search UI component (`client/src/components/TerminalSearch.tsx`) features:

#### Key Features

- **Reactive UI**: Auto-focuses input when opened
- **Live Search**: Updates results as user types
- **Match Navigation**: Next/previous buttons and keyboard shortcuts
- **Search Options**: Case sensitive, whole word, regex toggles
- **Results Counter**: Shows current match index and total matches
- **Keyboard Shortcuts**: Enter/Shift+Enter, F3/Shift+F3, Escape

#### Implementation Highlights

```typescript
// Auto-focus when search becomes visible
createEffect(() => {
  if (isSearchVisible() && searchInputRef) {
    searchInputRef.focus()
    searchInputRef.select()
  }
})

// Search results listener setup
createEffect(() => {
  const actions = props.terminalActions
  if (actions && actions.search.onSearchResults) {
    searchResultsCleanup = actions.search.onSearchResults((results) => {
      setSearchResults({
        currentIndex: results.resultIndex + 1, // Convert from 0-based to 1-based
        totalMatches: results.resultCount
      })
    })
  }
})

// Live search on term change
createEffect(() => {
  if (searchTerm().trim()) {
    performSearch(true)
  } else {
    setSearchResults({ currentIndex: 0, totalMatches: 0 })
  }
})
```

### Styling and Design

The search UI uses Tailwind CSS for styling:

```typescript
<div class="absolute right-2 top-2 z-50 flex items-center gap-1 rounded-lg border border-neutral-300 bg-white p-2 shadow-lg">
  <div class="relative">
    <Search class="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
    <input
      type="text"
      value={searchTerm()}
      onInput={handleSearchInput}
      placeholder="Search terminal..."
      class="w-48 rounded border border-neutral-300 bg-white py-1 pl-8 pr-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  </div>
  {/* Navigation buttons, options, etc. */}
</div>
```

## State Flow

### Search Activation Flow

1. **Trigger**: User presses Ctrl+F/⌘F or clicks menu item
2. **State Update**: `setIsSearchVisible(true)` in app.tsx
3. **UI Response**: TerminalSearch component becomes visible
4. **Focus**: Search input auto-focuses and selects existing text
5. **Ready**: User can type search term

### Search Execution Flow

1. **Input**: User types in search field
2. **State Update**: `setSearchTerm(value)` triggers reactive effect
3. **Search Call**: `actions.search.findNext(term, options)` called
4. **Event Fired**: SearchAddon fires `onDidChangeResults` event
5. **Results Update**: Event listener updates `searchResults` signal
6. **UI Update**: Match counter displays updated results

### Navigation Flow

1. **Input**: User presses Enter/Shift+Enter or clicks buttons
2. **Search Call**: `findNext()` or `findPrevious()` method called
3. **Terminal Update**: SearchAddon highlights next/previous match
4. **Results Update**: Event listener updates current index
5. **UI Refresh**: Counter shows new position

## Memory Management

### Cleanup Strategy

The implementation ensures proper memory management through multiple cleanup mechanisms:

```typescript
// Component cleanup
onCleanup(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (searchResultsCleanup) {
    searchResultsCleanup()
  }
})

// Event listener disposal
const disposable = eventHandler(callback)
return () => disposable?.dispose?.()
```

### Reactive Effect Cleanup

SolidJS automatically handles cleanup for createEffect, but explicit cleanup is provided for external listeners.

## Cross-Platform Considerations

### Keyboard Shortcuts

The implementation handles OS-specific keyboard conventions:

- **Windows/Linux**: Ctrl+F
- **macOS**: ⌘F (Cmd+F)

### Browser Compatibility

The search feature prevents browser's native search from interfering:

```typescript
// Prevent browser search
event.preventDefault()
event.stopPropagation()
```

### Platform Detection

OS detection is performed using navigator.platform and navigator.userAgent:

```typescript
const getOS = (): OSType => {
  if (typeof window === 'undefined' || !window.navigator) {
    return 'Unknown'
  }

  const { userAgent, platform } = window.navigator

  if (
    /Mac|iPhone|iPod|iPad/i.test(platform) ||
    /Mac|iPhone|iPod|iPad/i.test(userAgent)
  ) {
    return 'macOS'
  }
  // ... other platform checks
}
```

## Integration Points

### Menu Integration

Search is accessible through the menu dropdown:

```typescript
// MenuDropdown.tsx
<button
  type="button"
  class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
  onClick={handleMenuItemClick(props.onSearch || (() => {}))}
  role="menuitem"
  title={`Search terminal (${getSearchShortcut().displayText})`}
>
  <Search class="inline-block size-5" /> Search ({getSearchShortcut().displayText})
</button>
```

### Global Keyboard Handler

The app.tsx manages global keyboard shortcuts:

```typescript
const handleKeydown = (event: KeyboardEvent) => {
  const searchShortcut = getSearchShortcut()

  if (matchesShortcut(event, searchShortcut)) {
    event.preventDefault()
    event.stopPropagation()

    const wasVisible = isSearchVisible()
    setIsSearchVisible(!wasVisible)

    // Focus terminal if closing search
    if (wasVisible) {
      const actions = terminalActions()
      if (actions) {
        actions.focus()
      }
    }
  }
}
```

## Performance Considerations

### Debouncing

Search operations are triggered on input change without explicit debouncing, relying on the SearchAddon's internal efficiency.

### Memory Usage

- Event listeners are properly disposed
- Reactive effects are automatically cleaned up by SolidJS
- SearchAddon instance is shared across the terminal lifecycle

### Search Performance

The xterm.js SearchAddon is optimized for terminal content searching and handles large scrollback buffers efficiently.

## Testing Strategy

### Manual Testing Checklist

- [x] Keyboard shortcuts work on all platforms
- [x] Search opens with proper focus
- [x] Live search updates match counter (**FIXED**: Now shows accurate X/Y counts)
- [x] Navigation buttons work correctly
- [ ] Search options (case, whole word, regex) function properly
- [x] Escape closes search and returns focus to terminal (**FIXED**: Focus properly returns to terminal)
- [x] Menu item displays correct keyboard shortcut
- [x] Search works with various terminal content
- [x] **Search highlighting contrast** (**FIXED**: Border-only approach with gold borders for matches, orange-red for active)
- [x] **Active match differentiation** (**FIXED**: Active match clearly distinguishable with different border colors)
- [x] **Decoration cleanup** (**FIXED**: Search highlights properly cleared when search is closed)
- [x] **No rendering errors** (**FIXED**: Removed background properties to avoid "css.toColor" errors)

### Platform Testing

- [ ] Windows: Ctrl+F shortcut
- [ ] macOS: ⌘F shortcut
- [ ] Linux: Ctrl+F shortcut
- [ ] Mobile: Menu access

## Future Enhancements

### Potential Improvements

1. **Search History**: Remember recent search terms
2. **Highlight All**: Option to highlight all matches simultaneously
3. **Search Scope**: Limit search to visible area vs. entire scrollback
4. **Performance**: Debounce search input for very large terminals
5. **Accessibility**: Enhanced screen reader support
6. **Export**: Save search results or highlighted content

### API Extensions

The current TerminalActions interface could be extended with:

```typescript
interface EnhancedSearchActions {
  highlightAll: (term: string, options?: SearchOptions) => void
  clearHighlights: () => void
  getSearchHistory: () => string[]
  setSearchScope: (scope: 'visible' | 'all') => void
}
```

## Troubleshooting

### Common Issues

1. **Search not opening**: Check if keyboard event is being captured by other handlers
2. **No results found**: Verify SearchAddon is properly loaded on terminal
3. **Results counter showing 0/0**: **FIXED** - The `onDidChangeResults` event only fires when decorations are enabled. The search implementation now includes decoration options to trigger the event properly.
4. **Focus issues**: **FIXED** - When closing search, focus now properly returns to terminal using `requestAnimationFrame` to ensure DOM cleanup before focusing.

### Search Results Counter Fix

**Root Cause**: The xterm.js SearchAddon `onDidChangeResults` event only fires when decorations are enabled. Without decorations, the event listener never receives results updates, causing the counter to remain at 0/0.

**Solution**: Enable decorations in the search options:

```typescript
// In Terminal.tsx - findNext/findPrevious methods
const searchOptions = {
  ...options,
  decorations: {
    matchBackground: '#ffff00',
    activeMatchBackground: '#ff4500',
    matchBorder: '#000000',
    activeMatchBorder: '#000000',
    matchOverviewRuler: '#ffff00',
    activeMatchColorOverviewRuler: '#ff4500'
  }
}
return addon.findNext(term, searchOptions)
```

This enables visual highlighting of matches while also making the result counter functional.

### Search Highlighting Solution: Border-Only Approach

**Previous Problem**: The xterm.js SearchAddon decorations with background colors obscured the text, making search results unreadable due to poor contrast between white terminal text and light background colors.

**Implemented Solution**: Switched to a border-only highlighting approach that completely eliminates text contrast issues while maintaining clear visual indicators for search results.

#### Failed Approaches

**Attempt 1: CSS Attribute Selectors (Original Documentation)**
The original documentation suggested using CSS rules to target text spans by their background color:

```css
.xterm-rows span[style*='background-color: rgb(255, 255, 0)'] {
  color: #000000 !important;
}
```

**Result**: This approach did not work as expected. The CSS selectors may not have sufficient specificity or the DOM structure may be different than anticipated.

**Attempt 2: Lighter Background Colors**
Changed decoration colors from high-contrast dark colors to lighter, more subtle colors:

- Original: `#ffff00` (yellow) and `#ff4500` (orange-red)
- Updated: `#4da6ff` (light blue) and `#ff6b9d` (light pink)

```typescript
decorations: {
  matchBackground: '#4da6ff',        // Light blue instead of yellow
  activeMatchBackground: '#ff6b9d',   // Light pink instead of orange-red
  matchBorder: '#0066cc',
  activeMatchBorder: '#e6005c',
  matchOverviewRuler: '#4da6ff',
  activeMatchColorOverviewRuler: '#ff6b9d'
}
```

**Result**: While the DOM inspection confirmed the new colors were applied correctly, the text visibility issue persisted. The white terminal text is still obscured by the background colors, regardless of the specific colors chosen.

#### Final Solution: Border-Only Highlighting

The border-only approach was successfully implemented to solve all text visibility issues:

**Implementation Details:**

```typescript
// In Terminal.tsx
decorations: {
  // Border-only approach - no background properties to avoid xterm.js color parsing issues
  // Background properties are omitted entirely (not set to 'transparent')
  matchBorder: '#FFD700', // Gold border for regular matches
  activeMatchBorder: '#FF4500', // Orange-red border for active match
  matchOverviewRuler: '#FFD700', // Gold in scrollbar
  activeMatchColorOverviewRuler: '#FF4500' // Orange-red in scrollbar
}
```

**Important Note**: The background properties (`matchBackground` and `activeMatchBackground`) must be omitted entirely, not set to `'transparent'` or any other invalid value. Setting them to `'transparent'` causes xterm.js to throw "css.toColor: Unsupported css format" errors.

**CSS Enhancement:**

```css
/* Optional glow effects for better visibility */
.xterm-decoration.xterm-find-result-decoration {
  box-shadow: 0 0 3px rgba(255, 215, 0, 0.8); /* Subtle gold glow */
}

.xterm-decoration.xterm-find-result-decoration.xterm-find-active-result-decoration {
  box-shadow: 0 0 5px rgba(255, 69, 0, 1); /* Stronger orange-red glow for active match */
}
```

**Benefits of Border-Only Approach:**

1. **Perfect Accessibility**: No text contrast issues with any terminal theme
2. **Clear Visual Distinction**: Gold borders for matches, orange-red for active match
3. **Universal Compatibility**: Works with both dark and light terminal themes
4. **Performance**: Lighter rendering than background fills
5. **Clean Implementation**: No complex CSS hacks needed

The search functionality (counter, navigation, highlighting) now works perfectly with excellent readability.

### Focus Issue Fix

**Root Cause**: When closing the search bar, focus was shifting to the Menu button instead of the terminal because the DOM cleanup wasn't complete before the focus call.

**Solution**: Use `requestAnimationFrame` to defer focus until after DOM updates:

```typescript
// In TerminalSearch.tsx - handleCloseSearch method
const actions = props.terminalActions
if (actions) {
  actions.search.clearDecorations()

  requestAnimationFrame(() => {
    actions.focus()
  })
}
```

### Debug Information

Enable debug logging in browser console:

```javascript
localStorage.setItem('debug', 'webssh2-client:*')
```

This will show debug information from the terminal component and search functionality.

## Conclusion

The terminal search feature provides a comprehensive, accessible, and performant search experience that integrates seamlessly with the WebSSH2 Client architecture. The implementation follows SolidJS best practices, maintains type safety, and provides proper cross-platform support while ensuring excellent user experience across different devices and operating systems.
