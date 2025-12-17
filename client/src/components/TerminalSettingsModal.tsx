import type { Component } from 'solid-js'
import { createSignal, createEffect, Show } from 'solid-js'
import { Modal } from './Modal'
import { ChevronDown, ChevronUp } from 'lucide-solid'
import type { ITerminalOptions } from '@xterm/xterm'
import { getStoredSettings, saveTerminalSettings } from '../utils/settings.js'
import { defaultSettings } from '../utils/index.js'
import { playPromptSound } from '../utils/prompt-sounds.js'
import type {
  TerminalSettings,
  KeyboardCaptureSettings,
  PromptSoundSettings
} from '../types/config.d'

interface TerminalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    settings: Partial<ITerminalOptions> & Partial<TerminalSettings>
  ) => void
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
  keyboardCapture: KeyboardCaptureSettings
  promptSounds: PromptSoundSettings
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
    clipboardEnableMiddleClickPaste:
      defaultSettings.clipboardEnableMiddleClickPaste,
    clipboardEnableKeyboardShortcuts:
      defaultSettings.clipboardEnableKeyboardShortcuts,
    keyboardCapture: defaultSettings.keyboardCapture,
    promptSounds: defaultSettings.promptSounds
  })

  const [clipboardExpanded, setClipboardExpanded] = createSignal(false)
  const [keyboardExpanded, setKeyboardExpanded] = createSignal(false)
  const [soundsExpanded, setSoundsExpanded] = createSignal(false)

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
        clipboardAutoSelectToCopy:
          stored.clipboardAutoSelectToCopy ??
          defaultSettings.clipboardAutoSelectToCopy,
        clipboardEnableMiddleClickPaste:
          stored.clipboardEnableMiddleClickPaste ??
          defaultSettings.clipboardEnableMiddleClickPaste,
        clipboardEnableKeyboardShortcuts:
          stored.clipboardEnableKeyboardShortcuts ??
          defaultSettings.clipboardEnableKeyboardShortcuts,
        keyboardCapture:
          stored.keyboardCapture || defaultSettings.keyboardCapture,
        promptSounds: stored.promptSounds
          ? {
              enabled:
                stored.promptSounds.enabled ??
                defaultSettings.promptSounds.enabled,
              severities: {
                info:
                  stored.promptSounds.severities?.info ??
                  defaultSettings.promptSounds.severities.info,
                warning:
                  stored.promptSounds.severities?.warning ??
                  defaultSettings.promptSounds.severities.warning,
                error:
                  stored.promptSounds.severities?.error ??
                  defaultSettings.promptSounds.severities.error,
                success:
                  stored.promptSounds.severities?.success ??
                  defaultSettings.promptSounds.severities.success
              }
            }
          : defaultSettings.promptSounds
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

    // Apply to terminal - pass ALL settings including clipboard, keyboard capture, and prompt sounds
    props.onSave({
      ...terminalOptions,
      clipboardAutoSelectToCopy: currentSettings.clipboardAutoSelectToCopy,
      clipboardEnableMiddleClickPaste:
        currentSettings.clipboardEnableMiddleClickPaste,
      clipboardEnableKeyboardShortcuts:
        currentSettings.clipboardEnableKeyboardShortcuts,
      keyboardCapture: currentSettings.keyboardCapture,
      promptSounds: currentSettings.promptSounds
    } as Partial<ITerminalOptions> & Partial<TerminalSettings>)
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
            <label class="contents">
              <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                Font Size
              </span>
              <input
                type="number"
                name="fontSize"
                min="8"
                max="72"
                required
                class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings().fontSize}
                onInput={(e) =>
                  updateSetting(
                    'fontSize',
                    Number.parseInt(e.currentTarget.value, 10) ||
                      defaultSettings.fontSize
                  )
                }
              />
            </label>

            {/* Font Family */}
            <label class="contents">
              <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                Font Family
              </span>
              <input
                type="text"
                name="fontFamily"
                required
                class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings().fontFamily}
                onInput={(e) =>
                  updateSetting('fontFamily', e.currentTarget.value)
                }
              />
            </label>

            {/* Cursor Blink */}
            <label class="contents">
              <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                Cursor Blink
              </span>
              <select
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
            </label>

            {/* Scrollback */}
            <label class="contents">
              <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                Scrollback
              </span>
              <input
                type="number"
                name="scrollback"
                min="1"
                max="200000"
                required
                class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings().scrollback}
                onInput={(e) =>
                  updateSetting(
                    'scrollback',
                    Number.parseInt(e.currentTarget.value, 10) ||
                      defaultSettings.scrollback
                  )
                }
              />
            </label>

            {/* Tab Stop Width */}
            <label class="contents">
              <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                Tab Stop Width
              </span>
              <input
                type="number"
                name="tabStopWidth"
                min="1"
                max="100"
                required
                class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings().tabStopWidth}
                onInput={(e) =>
                  updateSetting(
                    'tabStopWidth',
                    Number.parseInt(e.currentTarget.value, 10) ||
                      defaultSettings.tabStopWidth
                  )
                }
              />
            </label>

            {/* Bell Style */}
            <label class="contents">
              <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                Bell Style
              </span>
              <select
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
            </label>

            {/* Clipboard Settings Section Header */}
            <div class="col-span-full mb-2 mt-4 border-t pt-2">
              <button
                type="button"
                class="flex w-full items-center justify-between text-sm font-semibold text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setClipboardExpanded(!clipboardExpanded())}
                aria-expanded={clipboardExpanded()}
              >
                <span>Clipboard Settings</span>
                {clipboardExpanded() ? (
                  <ChevronUp class="size-4" />
                ) : (
                  <ChevronDown class="size-4" />
                )}
              </button>
            </div>

            <Show when={clipboardExpanded()}>
              {/* Auto-copy Selection */}
              <label class="contents">
                <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                  Auto-copy Selection
                </span>
                <select
                  name="clipboardAutoSelectToCopy"
                  class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={
                    settings().clipboardAutoSelectToCopy ? 'true' : 'false'
                  }
                  onChange={(e) =>
                    updateSetting(
                      'clipboardAutoSelectToCopy',
                      e.currentTarget.value === 'true'
                    )
                  }
                >
                  <option value="true">Enabled (selection to clipboard)</option>
                  <option value="false">Disabled</option>
                </select>
              </label>

              {/* Middle-click Paste */}
              <label class="contents">
                <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                  Middle-click Paste
                </span>
                <select
                  name="clipboardEnableMiddleClickPaste"
                  class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={
                    settings().clipboardEnableMiddleClickPaste
                      ? 'true'
                      : 'false'
                  }
                  onChange={(e) =>
                    updateSetting(
                      'clipboardEnableMiddleClickPaste',
                      e.currentTarget.value === 'true'
                    )
                  }
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>

              {/* Keyboard Shortcuts */}
              <label class="contents">
                <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                  Keyboard Shortcuts
                </span>
                <select
                  name="clipboardEnableKeyboardShortcuts"
                  class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={
                    settings().clipboardEnableKeyboardShortcuts
                      ? 'true'
                      : 'false'
                  }
                  onChange={(e) =>
                    updateSetting(
                      'clipboardEnableKeyboardShortcuts',
                      e.currentTarget.value === 'true'
                    )
                  }
                  title="Ctrl+Shift+C/V (or Cmd+Shift+C/V on Mac)"
                >
                  <option value="true">Enabled (Ctrl+Shift+C/V)</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
            </Show>

            {/* Keyboard Capture Settings Section Header */}
            <div class="col-span-full mb-2 mt-4 border-t pt-2">
              <button
                type="button"
                class="flex w-full items-center justify-between text-sm font-semibold text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setKeyboardExpanded(!keyboardExpanded())}
                aria-expanded={keyboardExpanded()}
              >
                <span>Keyboard Capture Settings</span>
                {keyboardExpanded() ? (
                  <ChevronUp class="size-4" />
                ) : (
                  <ChevronDown class="size-4" />
                )}
              </button>
              <Show when={keyboardExpanded()}>
                <p class="mt-1 text-xs text-slate-600">
                  Control which keys are sent to the terminal instead of being
                  handled by the UI
                </p>
              </Show>
            </div>

            <Show when={keyboardExpanded()}>
              {/* Capture Escape */}
              <label class="contents">
                <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                  Capture Escape
                </span>
                <select
                  name="keyboardCaptureEscape"
                  class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={
                    settings().keyboardCapture.captureEscape ? 'true' : 'false'
                  }
                  onChange={(e) =>
                    updateSetting('keyboardCapture', {
                      ...settings().keyboardCapture,
                      captureEscape: e.currentTarget.value === 'true'
                    })
                  }
                  title="Prevent Escape from closing modals/search, send to terminal instead"
                >
                  <option value="true">Enabled (fixes vi Escape issue)</option>
                  <option value="false">Disabled (default)</option>
                </select>
              </label>

              {/* Capture Ctrl+B */}
              <label class="contents">
                <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                  Capture Ctrl+B
                </span>
                <select
                  name="keyboardCaptureCtrlB"
                  class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={
                    settings().keyboardCapture.captureCtrlB ? 'true' : 'false'
                  }
                  onChange={(e) =>
                    updateSetting('keyboardCapture', {
                      ...settings().keyboardCapture,
                      captureCtrlB: e.currentTarget.value === 'true'
                    })
                  }
                  title="Prevent Ctrl+B from opening browser bookmarks, send to terminal instead"
                >
                  <option value="true">Enabled (for tmux)</option>
                  <option value="false">Disabled (default)</option>
                </select>
              </label>

              {/* Custom Capture Keys */}
              <label class="contents">
                <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                  Custom Keys
                </span>
                <input
                  type="text"
                  name="keyboardCaptureCustomKeys"
                  placeholder="e.g., F11, Ctrl+T, Alt+D"
                  class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={settings().keyboardCapture.customCaptureKeys.join(
                    ', '
                  )}
                  onInput={(e) => {
                    const value = e.currentTarget.value
                    const keys = value
                      .split(',')
                      .map((k) => k.trim())
                      .filter((k) => k.length > 0)
                    updateSetting('keyboardCapture', {
                      ...settings().keyboardCapture,
                      customCaptureKeys: keys
                    })
                  }}
                  title="Comma-separated list of keys to capture (e.g., F11, Ctrl+T, Alt+D)"
                />
              </label>
            </Show>

            {/* Prompt Sounds Settings Section Header */}
            <div class="col-span-full mb-2 mt-4 border-t pt-2">
              <button
                type="button"
                class="flex w-full items-center justify-between text-sm font-semibold text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setSoundsExpanded(!soundsExpanded())}
                aria-expanded={soundsExpanded()}
              >
                <span>Prompt Sounds</span>
                {soundsExpanded() ? (
                  <ChevronUp class="size-4" />
                ) : (
                  <ChevronDown class="size-4" />
                )}
              </button>
              <Show when={soundsExpanded()}>
                <p class="mt-1 text-xs text-slate-600">
                  Configure audio notifications for server prompts
                </p>
              </Show>
            </div>

            <Show when={soundsExpanded()}>
              {/* Enable Sounds */}
              <label class="contents">
                <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                  Enable Sounds
                </span>
                <select
                  name="promptSoundsEnabled"
                  class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={settings().promptSounds.enabled ? 'true' : 'false'}
                  onChange={(e) => {
                    const enabled = e.currentTarget.value === 'true'
                    updateSetting('promptSounds', {
                      ...settings().promptSounds,
                      enabled
                    })
                  }}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>

              {/* Per-severity toggles - only show when sounds enabled */}
              <Show when={settings().promptSounds.enabled}>
                <div class="col-span-full mt-2">
                  <span class="text-xs font-medium text-slate-600">
                    Severity Levels:
                  </span>
                </div>

                {/* Info Toggle */}
                <label class="contents">
                  <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                    Info
                  </span>
                  <div class="flex items-center gap-2">
                    <select
                      class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={
                        settings().promptSounds.severities.info
                          ? 'true'
                          : 'false'
                      }
                      onChange={(e) =>
                        updateSetting('promptSounds', {
                          ...settings().promptSounds,
                          severities: {
                            ...settings().promptSounds.severities,
                            info: e.currentTarget.value === 'true'
                          }
                        })
                      }
                    >
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                    <button
                      type="button"
                      class="shrink-0 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      onClick={() => playPromptSound('info', true)}
                      title="Test info sound"
                    >
                      Test
                    </button>
                  </div>
                </label>

                {/* Warning Toggle */}
                <label class="contents">
                  <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                    Warning
                  </span>
                  <div class="flex items-center gap-2">
                    <select
                      class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={
                        settings().promptSounds.severities.warning
                          ? 'true'
                          : 'false'
                      }
                      onChange={(e) =>
                        updateSetting('promptSounds', {
                          ...settings().promptSounds,
                          severities: {
                            ...settings().promptSounds.severities,
                            warning: e.currentTarget.value === 'true'
                          }
                        })
                      }
                    >
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                    <button
                      type="button"
                      class="shrink-0 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      onClick={() => playPromptSound('warning', true)}
                      title="Test warning sound"
                    >
                      Test
                    </button>
                  </div>
                </label>

                {/* Error Toggle */}
                <label class="contents">
                  <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                    Error
                  </span>
                  <div class="flex items-center gap-2">
                    <select
                      class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={
                        settings().promptSounds.severities.error
                          ? 'true'
                          : 'false'
                      }
                      onChange={(e) =>
                        updateSetting('promptSounds', {
                          ...settings().promptSounds,
                          severities: {
                            ...settings().promptSounds.severities,
                            error: e.currentTarget.value === 'true'
                          }
                        })
                      }
                    >
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                    <button
                      type="button"
                      class="shrink-0 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      onClick={() => playPromptSound('error', true)}
                      title="Test error sound"
                    >
                      Test
                    </button>
                  </div>
                </label>

                {/* Success Toggle */}
                <label class="contents">
                  <span class="whitespace-nowrap pr-3 text-sm font-medium text-slate-700 sm:text-right">
                    Success
                  </span>
                  <div class="flex items-center gap-2">
                    <select
                      class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={
                        settings().promptSounds.severities.success
                          ? 'true'
                          : 'false'
                      }
                      onChange={(e) =>
                        updateSetting('promptSounds', {
                          ...settings().promptSounds,
                          severities: {
                            ...settings().promptSounds.severities,
                            success: e.currentTarget.value === 'true'
                          }
                        })
                      }
                    >
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                    <button
                      type="button"
                      class="shrink-0 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      onClick={() => playPromptSound('success', true)}
                      title="Test success sound"
                    >
                      Test
                    </button>
                  </div>
                </label>
              </Show>
            </Show>
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
