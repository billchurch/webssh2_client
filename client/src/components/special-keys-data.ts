export interface SpecialKey {
  label: string
  sequence: string
  description: string
  browserReserved?: boolean
}

export interface KeyCategory {
  name: string
  keys: SpecialKey[]
}

export const keyCategories: KeyCategory[] = [
  {
    name: 'Terminal Control',
    keys: [
      {
        label: 'Ctrl+C',
        sequence: '\x03',
        description: 'Interrupt (SIGINT)'
      },
      {
        label: 'Ctrl+D',
        sequence: '\x04',
        description: 'End of input (EOF)'
      },
      {
        label: 'Ctrl+Z',
        sequence: '\x1a',
        description: 'Suspend process (SIGTSTP)'
      },
      {
        label: 'Ctrl+\\',
        sequence: '\x1c',
        description: 'Quit (SIGQUIT)'
      },
      {
        label: 'Ctrl+S',
        sequence: '\x13',
        description: 'Pause output (XOFF)'
      },
      {
        label: 'Ctrl+Q',
        sequence: '\x11',
        description: 'Resume output (XON)'
      }
    ]
  },
  {
    name: 'Line Editing',
    keys: [
      {
        label: 'Ctrl+A',
        sequence: '\x01',
        description: 'Move to start of line'
      },
      {
        label: 'Ctrl+E',
        sequence: '\x05',
        description: 'Move to end of line'
      },
      {
        label: 'Ctrl+U',
        sequence: '\x15',
        description: 'Delete line before cursor'
      },
      {
        label: 'Ctrl+K',
        sequence: '\x0b',
        description: 'Delete line after cursor'
      },
      {
        label: 'Ctrl+W',
        sequence: '\x17',
        description: 'Delete word before cursor',
        browserReserved: true
      },
      {
        label: 'Ctrl+Y',
        sequence: '\x19',
        description: 'Paste deleted text (yank)'
      },
      {
        label: 'Ctrl+L',
        sequence: '\x0c',
        description: 'Clear screen'
      },
      {
        label: 'Ctrl+R',
        sequence: '\x12',
        description: 'Reverse search history'
      }
    ]
  },
  {
    name: 'Special Keys',
    keys: [
      {
        label: 'Escape',
        sequence: '\x1b',
        description: 'Escape key'
      },
      {
        label: 'Tab',
        sequence: '\x09',
        description: 'Tab / autocomplete'
      },
      {
        label: 'Ctrl+B',
        sequence: '\x02',
        description: 'tmux prefix / move back one char',
        browserReserved: true
      },
      {
        label: 'Ctrl+N',
        sequence: '\x0e',
        description: 'Next history / down',
        browserReserved: true
      },
      {
        label: 'Ctrl+T',
        sequence: '\x14',
        description: 'Transpose characters',
        browserReserved: true
      }
    ]
  },
  {
    name: 'Network Equipment',
    keys: [
      {
        label: 'Ctrl+^',
        sequence: '\x1e',
        description: 'Cisco IOS abort (Ctrl+Shift+6)'
      },
      {
        label: 'Ctrl+^ x',
        sequence: '\x1ex',
        description: 'Cisco IOS escape to previous session'
      }
    ]
  },
  {
    name: 'Function Keys',
    keys: [
      { label: 'F1', sequence: '\x1bOP', description: 'Function key F1' },
      { label: 'F2', sequence: '\x1bOQ', description: 'Function key F2' },
      { label: 'F3', sequence: '\x1bOR', description: 'Function key F3' },
      { label: 'F4', sequence: '\x1bOS', description: 'Function key F4' },
      { label: 'F5', sequence: '\x1b[15~', description: 'Function key F5' },
      { label: 'F6', sequence: '\x1b[17~', description: 'Function key F6' },
      { label: 'F7', sequence: '\x1b[18~', description: 'Function key F7' },
      { label: 'F8', sequence: '\x1b[19~', description: 'Function key F8' },
      { label: 'F9', sequence: '\x1b[20~', description: 'Function key F9' },
      { label: 'F10', sequence: '\x1b[21~', description: 'Function key F10' },
      { label: 'F11', sequence: '\x1b[23~', description: 'Function key F11' },
      { label: 'F12', sequence: '\x1b[24~', description: 'Function key F12' }
    ]
  }
]
