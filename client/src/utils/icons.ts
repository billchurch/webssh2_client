// client/src/js/icons.ts
// Zero-runtime icon helper using lucide-static inline SVGs

import Menu from 'lucide-static/icons/menu.svg?raw'
import Clipboard from 'lucide-static/icons/clipboard.svg?raw'
import Settings from 'lucide-static/icons/settings.svg?raw'
import Download from 'lucide-static/icons/download.svg?raw'
import Key from 'lucide-static/icons/key.svg?raw'
import Trash2 from 'lucide-static/icons/trash-2.svg?raw'
import Upload from 'lucide-static/icons/upload.svg?raw'

export const ICONS: Record<string, string> = {
  menu: Menu,
  clipboard: Clipboard,
  settings: Settings,
  download: Download,
  key: Key,
  'trash-can': Trash2,
  trash: Trash2,
  upload: Upload
}

// DOM manipulation functions removed - use Icon component instead
