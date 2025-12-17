/**
 * Optional sound notifications for prompts
 * Uses Web Audio API synthesized tones - no external audio files required
 */
import type { PromptSeverity } from '../types/prompt'
import type { PromptSoundSettings } from '../types/config.d'
import { getStoredSettings, saveTerminalSettings } from './settings.js'
import { defaultSettings } from './index.js'

/** Audio context singleton (created on first use) */
let audioContext: AudioContext | null = null

/** Old localStorage key for migration */
const OLD_SOUND_ENABLED_KEY = 'webssh2_prompt_sounds_enabled'

/**
 * Synthesized sound configurations for each severity
 * Uses simple sine wave tones with different frequencies
 */
const SEVERITY_SOUNDS: Record<
  PromptSeverity,
  { frequency: number; duration: number; type: OscillatorType }
> = {
  info: { frequency: 440, duration: 0.15, type: 'sine' },
  success: { frequency: 523, duration: 0.2, type: 'sine' },
  warning: { frequency: 349, duration: 0.25, type: 'triangle' },
  error: { frequency: 220, duration: 0.3, type: 'square' }
}

/**
 * Get or create the audio context
 * Must be called after user interaction (browser requirement)
 */
function getAudioContext(): AudioContext | null {
  if (audioContext === null) {
    try {
      audioContext = new AudioContext()
    } catch {
      console.warn('[WebSSH2] Web Audio API not available')
      return null
    }
  }
  return audioContext
}

/**
 * Migrate old sound setting to unified settings format
 */
function migrateOldSoundSettings(): void {
  try {
    const oldValue = localStorage.getItem(OLD_SOUND_ENABLED_KEY)
    if (oldValue !== null) {
      const wasEnabled = oldValue === 'true'
      if (wasEnabled) {
        saveTerminalSettings({
          promptSounds: {
            ...defaultSettings.promptSounds,
            enabled: true
          }
        })
      }
      localStorage.removeItem(OLD_SOUND_ENABLED_KEY)
    }
  } catch {
    // Ignore migration errors
  }
}

/**
 * Get prompt sound settings from unified storage
 */
export function getPromptSoundSettings(): PromptSoundSettings {
  // Attempt migration on first access
  migrateOldSoundSettings()

  const stored = getStoredSettings()
  const storedSounds = stored['promptSounds'] as
    | Partial<PromptSoundSettings>
    | undefined

  if (storedSounds && typeof storedSounds === 'object') {
    return {
      enabled: storedSounds.enabled ?? defaultSettings.promptSounds.enabled,
      severities: {
        info:
          storedSounds.severities?.info ??
          defaultSettings.promptSounds.severities.info,
        warning:
          storedSounds.severities?.warning ??
          defaultSettings.promptSounds.severities.warning,
        error:
          storedSounds.severities?.error ??
          defaultSettings.promptSounds.severities.error,
        success:
          storedSounds.severities?.success ??
          defaultSettings.promptSounds.severities.success
      }
    }
  }

  return { ...defaultSettings.promptSounds }
}

/**
 * Check if audio notifications are enabled
 * @deprecated Use getPromptSoundSettings().enabled instead
 */
export function isAudioEnabled(): boolean {
  return getPromptSoundSettings().enabled
}

/**
 * Play a notification sound for a given severity
 * Checks settings for enabled state and severity toggles
 *
 * @param severity - The prompt severity level
 * @param forcePlay - Override the enabled setting (for testing)
 */
export function playPromptSound(
  severity: PromptSeverity,
  forcePlay: boolean = false
): void {
  const settings = getPromptSoundSettings()

  // Check if sounds are globally enabled
  if (!forcePlay && !settings.enabled) {
    return
  }

  // Check if this severity is enabled
  if (!forcePlay && !settings.severities[severity]) {
    return
  }

  const ctx = getAudioContext()
  if (ctx === null) {
    return
  }

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const config = SEVERITY_SOUNDS[severity]
  if (config === undefined) {
    return
  }

  try {
    const oscillator = ctx.createOscillator()
    oscillator.type = config.type
    oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime)

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + config.duration
    )

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + config.duration)
  } catch {
    // Ignore audio errors
  }
}

/**
 * Play a two-tone alert notification (for critical alerts)
 */
export function playAlertSound(): void {
  const settings = getPromptSoundSettings()
  if (!settings.enabled || !settings.severities.error) {
    return
  }

  const ctx = getAudioContext()
  if (ctx === null) {
    return
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  try {
    // First tone
    const osc1 = ctx.createOscillator()
    osc1.type = 'square'
    osc1.frequency.setValueAtTime(440, ctx.currentTime)

    const gain1 = ctx.createGain()
    gain1.gain.setValueAtTime(0.2, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.15)

    // Second tone (slightly lower pitch)
    const osc2 = ctx.createOscillator()
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(349, ctx.currentTime + 0.15)

    const gain2 = ctx.createGain()
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.3)
  } catch {
    // Ignore audio errors
  }
}
