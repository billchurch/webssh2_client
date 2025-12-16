/**
 * Optional sound notifications for prompts
 * Uses Web Audio API - no external audio files required
 */
import type { PromptSeverity } from '../types/prompt'

/** Audio context singleton (created on first use) */
let audioContext: AudioContext | null = null

/** Sound settings key in localStorage */
const SOUND_ENABLED_KEY = 'webssh2_prompt_sounds_enabled'

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
 * Check if audio notifications are enabled in settings
 */
export function isAudioEnabled(): boolean {
  try {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY)
    // Default to false - opt-in for sounds
    return stored === 'true'
  } catch {
    return false
  }
}

/**
 * Enable or disable audio notifications
 */
export function setAudioEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
  } catch {
    // localStorage not available
  }
}

/**
 * Sound configurations for each severity
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
 * Play a notification sound for a given severity
 * Only plays if audio is enabled in settings
 *
 * @param severity - The prompt severity level
 * @param forcePlay - Override the enabled setting (for testing)
 */
export function playPromptSound(
  severity: PromptSeverity,
  forcePlay: boolean = false
): void {
  // Check if sounds are enabled
  if (!forcePlay && !isAudioEnabled()) {
    return
  }

  const ctx = getAudioContext()
  if (ctx === null) {
    return
  }

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      // Ignore resume errors
    })
  }

  const config = SEVERITY_SOUNDS[severity]
  if (config === undefined) {
    return
  }

  try {
    // Create oscillator
    const oscillator = ctx.createOscillator()
    oscillator.type = config.type
    oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime)

    // Create gain node for volume envelope
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + config.duration
    )

    // Connect and play
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + config.duration)
  } catch {
    // Ignore audio errors - sounds are optional
  }
}

/**
 * Play a two-tone notification (for more attention-grabbing alerts)
 * Used for critical errors
 */
export function playAlertSound(): void {
  if (!isAudioEnabled()) {
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
