export type OSType = 'macOS' | 'Windows' | 'Linux' | 'Unknown'

export interface KeyboardShortcut {
  key: string
  displayText: string
  modifierKeys: string[]
}

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

  if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
    return 'Windows'
  }

  if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
    return 'Linux'
  }

  return 'Unknown'
}

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

const matchesShortcut = (
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean => {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false
  }

  return shortcut.modifierKeys.every((modifier) => {
    switch (modifier) {
      case 'ctrlKey':
        return event.ctrlKey && !event.metaKey
      case 'metaKey':
        return event.metaKey && !event.ctrlKey
      case 'shiftKey':
        return event.shiftKey
      case 'altKey':
        return event.altKey
      default:
        return false
    }
  })
}

export { getOS, getSearchShortcut, matchesShortcut }
