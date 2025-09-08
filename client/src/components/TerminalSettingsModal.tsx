import type { Component } from 'solid-js'
import { createSignal, createEffect } from 'solid-js'
import { Modal } from './Modal'
import type { ITerminalOptions } from '@xterm/xterm'
import { getStoredSettings, saveTerminalSettings } from '../utils/settings.js'
import { defaultSettings } from '../utils/index.js'
import type { TerminalSettings } from '../types/config.d'

interface TerminalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: Partial<ITerminalOptions>) => void
}

interface TerminalSettingsForm {
  fontSize: number
  fontFamily: string
  cursorBlink: boolean
  scrollback: number
  tabStopWidth: number
  bellStyle: 'sound' | 'none'
  clipboardAutoSelectToCopy: boolean
  clipboardEnableMiddleClickPaste: boolean
  clipboardEnableKeyboardShortcuts: boolean
}

export const TerminalSettingsModal: Component<TerminalSettingsModalProps> = (
  props
) => {
  const [settings, setSettings] = createSignal<TerminalSettingsForm>({
    fontSize: defaultSettings.fontSize,
    fontFamily: defaultSettings.fontFamily,
    cursorBlink: defaultSettings.cursorBlink,
    scrollback: defaultSettings.scrollback,
    tabStopWidth: defaultSettings.tabStopWidth,
    bellStyle: 'none',
    clipboardAutoSelectToCopy: defaultSettings.clipboardAutoSelectToCopy,
    clipboardEnableMiddleClickPaste: defaultSettings.clipboardEnableMiddleClickPaste,
    clipboardEnableKeyboardShortcuts: defaultSettings.clipboardEnableKeyboardShortcuts
  })

  // Load current settings when modal opens
  createEffect(() => {
    if (props.isOpen) {
      const stored = getStoredSettings() as Partial<TerminalSettings>
      setSettings({
        fontSize: stored.fontSize || defaultSettings.fontSize,
        fontFamily: stored.fontFamily || defaultSettings.fontFamily,
        cursorBlink: stored.cursorBlink ?? defaultSettings.cursorBlink,
        scrollback: stored.scrollback || defaultSettings.scrollback,
        tabStopWidth: stored.tabStopWidth || defaultSettings.tabStopWidth,
        bellStyle: (stored.bellStyle as 'sound' | 'none') || 'none',
        clipboardAutoSelectToCopy: stored.clipboardAutoSelectToCopy ?? defaultSettings.clipboardAutoSelectToCopy,
        clipboardEnableMiddleClickPaste: stored.clipboardEnableMiddleClickPaste ?? defaultSettings.clipboardEnableMiddleClickPaste,
        clipboardEnableKeyboardShortcuts: stored.clipboardEnableKeyboardShortcuts ?? defaultSettings.clipboardEnableKeyboardShortcuts
      })
    }
  })

  const updateSetting = <K extends keyof TerminalSettingsForm>(
    key: K,
    value: TerminalSettingsForm[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const currentSettings = settings()

    // Convert to ITerminalOptions format
    const terminalOptions: Partial<ITerminalOptions> = {
      fontSize: currentSettings.fontSize,
      fontFamily: currentSettings.fontFamily,
      cursorBlink: currentSettings.cursorBlink,
      scrollback: currentSettings.scrollback,
      tabStopWidth: currentSettings.tabStopWidth
    }

    // Save settings
    saveTerminalSettings(currentSettings as unknown as Record<string, unknown>)

    // Apply to terminal - pass ALL settings including clipboard settings
    props.onSave({
      ...terminalOptions,
      clipboardAutoSelectToCopy: currentSettings.clipboardAutoSelectToCopy,
      clipboardEnableMiddleClickPaste: currentSettings.clipboardEnableMiddleClickPaste,
      clipboardEnableKeyboardShortcuts: currentSettings.clipboardEnableKeyboardShortcuts
    })
    props.onClose()
  }

  const handleCancel = () => {
    props.onClose()
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      showCloseButton={false}
      closeOnBackdropClick={false}
    >
      <div class="relative w-80 rounded-md border border-neutral-300 bg-white p-6 text-slate-800 shadow-md sm:w-[36rem]">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">
          Terminal Settings
        </h2>
        <form onSubmit={handleSubmit} class="space-y-4">
          <fieldset class="grid grid-cols-1 items-center gap-x-4 gap-y-3 sm:grid-cols-[auto,1fr]">
            <legend class="sr-only">Terminal Options</legend>

            {/* Font Size */}
            <label
              for="fontSize"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Font Size
            </label>
            <input
              type="number"
              id="fontSize"
              name="fontSize"
              min="8"
              max="72"
              required
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().fontSize}
              onInput={(e) =>
                updateSetting(
                  'fontSize',
                  parseInt(e.currentTarget.value, 10) ||
                    defaultSettings.fontSize
                )
              }
            />

            {/* Font Family */}
            <label
              for="fontFamily"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Font Family
            </label>
            <input
              type="text"
              id="fontFamily"
              name="fontFamily"
              required
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().fontFamily}
              onInput={(e) =>
                updateSetting('fontFamily', e.currentTarget.value)
              }
            />

            {/* Cursor Blink */}
            <label
              for="cursorBlink"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Cursor Blink
            </label>
            <select
              id="cursorBlink"
              name="cursorBlink"
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().cursorBlink ? 'true' : 'false'}
              onChange={(e) =>
                updateSetting('cursorBlink', e.currentTarget.value === 'true')
              }
            >
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>

            {/* Scrollback */}
            <label
              for="scrollback"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Scrollback
            </label>
            <input
              type="number"
              id="scrollback"
              name="scrollback"
              min="1"
              max="200000"
              required
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().scrollback}
              onInput={(e) =>
                updateSetting(
                  'scrollback',
                  parseInt(e.currentTarget.value, 10) ||
                    defaultSettings.scrollback
                )
              }
            />

            {/* Tab Stop Width */}
            <label
              for="tabStopWidth"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Tab Stop Width
            </label>
            <input
              type="number"
              id="tabStopWidth"
              name="tabStopWidth"
              min="1"
              max="100"
              required
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().tabStopWidth}
              onInput={(e) =>
                updateSetting(
                  'tabStopWidth',
                  parseInt(e.currentTarget.value, 10) ||
                    defaultSettings.tabStopWidth
                )
              }
            />

            {/* Bell Style */}
            <label
              for="bellStyle"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Bell Style
            </label>
            <select
              id="bellStyle"
              name="bellStyle"
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().bellStyle}
              onChange={(e) =>
                updateSetting(
                  'bellStyle',
                  e.currentTarget.value as 'sound' | 'none'
                )
              }
            >
              <option value="sound">Sound</option>
              <option value="none">None</option>
            </select>

            {/* Clipboard Settings Section Header */}
            <div class="col-span-full mt-4 mb-2 border-t pt-2">
              <h3 class="text-sm font-semibold text-slate-900">Clipboard Settings</h3>
            </div>

            {/* Auto-copy Selection */}
            <label
              for="clipboardAutoSelectToCopy"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Auto-copy Selection
            </label>
            <select
              id="clipboardAutoSelectToCopy"
              name="clipboardAutoSelectToCopy"
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().clipboardAutoSelectToCopy ? 'true' : 'false'}
              onChange={(e) =>
                updateSetting('clipboardAutoSelectToCopy', e.currentTarget.value === 'true')
              }
            >
              <option value="true">Enabled (selection to clipboard)</option>
              <option value="false">Disabled</option>
            </select>

            {/* Middle-click Paste */}
            <label
              for="clipboardEnableMiddleClickPaste"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Middle-click Paste
            </label>
            <select
              id="clipboardEnableMiddleClickPaste"
              name="clipboardEnableMiddleClickPaste"
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().clipboardEnableMiddleClickPaste ? 'true' : 'false'}
              onChange={(e) =>
                updateSetting('clipboardEnableMiddleClickPaste', e.currentTarget.value === 'true')
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>

            {/* Keyboard Shortcuts */}
            <label
              for="clipboardEnableKeyboardShortcuts"
              class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right"
            >
              Keyboard Shortcuts
            </label>
            <select
              id="clipboardEnableKeyboardShortcuts"
              name="clipboardEnableKeyboardShortcuts"
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings().clipboardEnableKeyboardShortcuts ? 'true' : 'false'}
              onChange={(e) =>
                updateSetting('clipboardEnableKeyboardShortcuts', e.currentTarget.value === 'true')
              }
              title="Ctrl+Shift+C/V (or Cmd+Shift+C/V on Mac)"
            >
              <option value="true">Enabled (Ctrl+Shift+C/V)</option>
              <option value="false">Disabled</option>
            </select>
          </fieldset>

          {/* Buttons */}
          <div class="flex justify-end gap-2 pt-4">
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
