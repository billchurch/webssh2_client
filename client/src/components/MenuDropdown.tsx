import type { Component } from 'solid-js'
import { createSignal, Show, onMount, onCleanup } from 'solid-js'
import { state } from '../stores/terminal.js'
import { hasLogData } from '../services/logging.js'
import { Menu, Trash2, Settings, Clipboard, Download, Key } from 'lucide-solid'

interface MenuDropdownProps {
  onClearLog?: () => void
  onStartLog?: () => void
  onStopLog?: () => void
  onDownloadLog?: () => void
  onReplayCredentials?: () => void
  onReauth?: () => void
  onTerminalSettings?: () => void
}

export const MenuDropdown: Component<MenuDropdownProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false)
  let menuRef: HTMLDivElement | undefined
  let buttonRef: HTMLButtonElement | undefined

  const toggleMenu = () => {
    setIsOpen(!isOpen())
  }

  const openMenu = () => {
    setIsOpen(true)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  // Handle clicks outside the menu
  const handleOutsideClick = (event: MouseEvent) => {
    if (
      menuRef &&
      !menuRef.contains(event.target as Node) &&
      buttonRef &&
      !buttonRef.contains(event.target as Node)
    ) {
      closeMenu()
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeMenu()
      buttonRef?.focus()
    }
  }

  onMount(() => {
    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    document.removeEventListener('click', handleOutsideClick)
    document.removeEventListener('keydown', handleKeyDown)
  })

  const handleMenuItemClick = (action: () => void) => {
    return () => {
      action()
      closeMenu()
    }
  }

  return (
    <div class="group relative px-2" onMouseLeave={closeMenu}>
      <button
        ref={buttonRef}
        type="button"
        aria-controls="dropupContent"
        aria-expanded={isOpen()}
        class="inline-flex select-none items-center gap-1 rounded p-1 text-neutral-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={toggleMenu}
        onMouseEnter={openMenu}
      >
        <Menu class="inline-block size-5" /> Menu
      </button>

      <Show when={isOpen()}>
        <div
          ref={menuRef}
          class="absolute bottom-full left-0 z-[101] min-w-56 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 text-base text-neutral-700 shadow-md"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Clear Log Button */}
          <Show when={hasLogData()}>
            <button
              type="button"
              class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
              onClick={handleMenuItemClick(props.onClearLog || (() => {}))}
              role="menuitem"
            >
              <Trash2 class="inline-block size-5" /> Clear Log
            </button>
          </Show>

          {/* Stop Log Button */}
          <Show when={state.sessionLogEnable}>
            <button
              type="button"
              class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
              onClick={handleMenuItemClick(props.onStopLog || (() => {}))}
              role="menuitem"
            >
              <Settings class="inline-block size-5 origin-center animate-spin" />
              Stop Log
            </button>
          </Show>

          {/* Start Log Button */}
          <Show when={!state.sessionLogEnable}>
            <button
              type="button"
              class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
              onClick={handleMenuItemClick(props.onStartLog || (() => {}))}
              role="menuitem"
            >
              <Clipboard class="inline-block size-5" /> Start Log
            </button>
          </Show>

          {/* Download Log Button */}
          <Show when={hasLogData()}>
            <button
              type="button"
              class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
              onClick={handleMenuItemClick(props.onDownloadLog || (() => {}))}
              role="menuitem"
            >
              <Download class="inline-block size-5" /> Download Log
            </button>
          </Show>

          {/* Replay Credentials Button */}
          <Show when={state.allowReplay}>
            <button
              type="button"
              class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
              onClick={handleMenuItemClick(
                props.onReplayCredentials || (() => {})
              )}
              role="menuitem"
            >
              <Key class="inline-block size-5" /> Credentials
            </button>
          </Show>

          {/* Reauth Button */}
          <Show when={state.allowReauth}>
            <button
              type="button"
              class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
              onClick={handleMenuItemClick(props.onReauth || (() => {}))}
              role="menuitem"
            >
              <Key class="inline-block size-5" /> Switch User
            </button>
          </Show>

          {/* Terminal Settings Button */}
          <button
            type="button"
            class="inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-left hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
            onClick={handleMenuItemClick(
              props.onTerminalSettings || (() => {})
            )}
            role="menuitem"
          >
            <Settings class="inline-block size-5" /> Settings
          </button>
        </div>
      </Show>
    </div>
  )
}
