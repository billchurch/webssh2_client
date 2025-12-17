/**
 * Toast - Non-blocking notification component
 * Features close button, auto-dismiss, and swipe-to-dismiss for touch devices
 */
import type { Component } from 'solid-js'
import { createSignal, onMount, onCleanup } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { X } from 'lucide-solid'
import type { PromptPayload, PromptSeverity } from '../../types/prompt'
import { resolvePromptIcon } from '../../utils/prompt-icons'
import {
  SWIPE_THRESHOLD_PX,
  PROMPT_ANIMATION_DURATION_MS
} from '../../constants.js'

interface ToastProps {
  toast: PromptPayload
  onDismiss: (id: string) => void
}

/** Severity-based styles for toasts */
const severityStyles: Record<PromptSeverity, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800'
}

export const Toast: Component<ToastProps> = (props) => {
  let toastRef: HTMLOutputElement | undefined
  const [swipeOffset, setSwipeOffset] = createSignal(0)
  const [isDismissing, setIsDismissing] = createSignal(false)
  const [touchStartX, setTouchStartX] = createSignal<number | null>(null)

  const severity = () => props.toast.severity ?? 'info'
  const icon = () => resolvePromptIcon(props.toast.icon, severity())
  const styles = () => severityStyles[severity()]

  // Handle touch start
  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (touch === undefined) return
    setTouchStartX(touch.clientX)
  }

  // Handle touch move
  const handleTouchMove = (e: TouchEvent) => {
    const startX = touchStartX()
    if (startX === null) return

    const touch = e.touches[0]
    if (touch === undefined) return

    const currentX = touch.clientX
    const diff = currentX - startX

    // Only allow swiping right (positive diff)
    if (diff > 0) {
      setSwipeOffset(diff)
    }
  }

  // Handle touch end
  const handleTouchEnd = () => {
    const offset = swipeOffset()
    setTouchStartX(null)

    if (offset > SWIPE_THRESHOLD_PX) {
      // Swipe threshold reached - dismiss with animation
      dismissWithAnimation()
    } else {
      // Snap back
      setSwipeOffset(0)
    }
  }

  // Dismiss with slide-out animation
  const dismissWithAnimation = () => {
    setIsDismissing(true)
    setSwipeOffset(300) // Slide off screen

    // Wait for animation then call dismiss
    setTimeout(() => {
      props.onDismiss(props.toast.id)
    }, PROMPT_ANIMATION_DURATION_MS)
  }

  // Handle click dismiss
  const handleDismissClick = () => {
    dismissWithAnimation()
  }

  // Set up touch listeners
  onMount(() => {
    const el = toastRef
    if (el === undefined) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    onCleanup(() => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    })
  })

  return (
    <output
      ref={toastRef}
      class={`flex items-center gap-3 rounded-lg border p-4 shadow-lg ${styles()} ${
        isDismissing() ? 'animate-slide-out' : 'animate-slide-in'
      }`}
      style={{
        transform: `translateX(${swipeOffset()}px)`,
        opacity: isDismissing() ? 0 : 1 - swipeOffset() / 300,
        transition:
          touchStartX() === null
            ? `transform ${PROMPT_ANIMATION_DURATION_MS}ms ease-out, opacity ${PROMPT_ANIMATION_DURATION_MS}ms ease-out`
            : 'none'
      }}
    >
      <Dynamic component={icon()} class="size-5 shrink-0" />
      <p class="flex-1 text-sm">{props.toast.message ?? props.toast.title}</p>
      <button
        onClick={handleDismissClick}
        class="rounded p-1 transition-colors hover:bg-black/10"
        aria-label="Dismiss notification"
        type="button"
      >
        <X class="size-4" />
      </button>
    </output>
  )
}
