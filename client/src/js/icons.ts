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

export function renderIcon(
  name: string | null,
  extraClasses: string = ''
): string {
  const svg = (name && ICONS[name]) || ''
  return `<span class="icon ${extraClasses}">${svg}</span>`
}

export function replaceIconsIn(root: Document | Element = document): void {
  const candidates = root.querySelectorAll('i[data-icon]')
  candidates.forEach((el) => {
    const name = el.getAttribute('data-icon')
    const extra = el.className
    const html = renderIcon(name, extra)
    const wrapper = document.createElement('span')
    wrapper.innerHTML = html
    const node = (wrapper.firstElementChild || wrapper.firstChild) as
      | Element
      | ChildNode
      | null
    if (node) el.replaceWith(node)
  })
}
