/**
 * Terminal bell sound using Web Audio API
 * Plays when bellStyle setting is 'sound' and terminal receives BEL character
 */
import { getStoredSettings } from './settings.js'

/** Audio context singleton (created on first use) */
let audioContext: AudioContext | null = null

/** Bell sound configuration */
const BELL_CONFIG = {
  frequency: 800,
  duration: 0.1,
  type: 'sine' as OscillatorType
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
      console.warn('[WebSSH2] Web Audio API not available for bell')
      return null
    }
  }
  return audioContext
}

/**
 * Play the terminal bell sound
 * Checks bellStyle setting before playing
 */
export function playBellSound(): void {
  const settings = getStoredSettings()
  const bellStyle = settings['bellStyle'] as string | undefined

  // Only play if bellStyle is 'sound'
  if (bellStyle !== 'sound') {
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

  try {
    const oscillator = ctx.createOscillator()
    oscillator.type = BELL_CONFIG.type
    oscillator.frequency.setValueAtTime(BELL_CONFIG.frequency, ctx.currentTime)

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + BELL_CONFIG.duration
    )

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + BELL_CONFIG.duration)
  } catch {
    // Ignore audio errors
  }
}
