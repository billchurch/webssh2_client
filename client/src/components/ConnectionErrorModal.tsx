import type { Component } from 'solid-js'
import { Show } from 'solid-js'
import { Modal } from './Modal'
import { AlgorithmDebugInfo } from './AlgorithmDebugInfo'
import { AlertTriangle, RefreshCw, X, Server, Plug } from 'lucide-solid'
import type { ConnectionErrorPayload } from '../types/events.d'

interface ConnectionErrorModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry: () => void
  error: ConnectionErrorPayload | null
}

/**
 * Get icon component based on error type
 */
const getErrorIcon = (errorType: ConnectionErrorPayload['errorType']) => {
  switch (errorType) {
    case 'network':
      return <Plug class="size-12 text-red-400" />
    case 'timeout':
      return <Server class="size-12 text-amber-400" />
    case 'auth':
    case 'algorithm':
    case 'unknown':
    default:
      return <AlertTriangle class="size-12 text-red-400" />
  }
}

/**
 * Get title based on error type if not provided
 */
const getDefaultTitle = (errorType: ConnectionErrorPayload['errorType']): string => {
  switch (errorType) {
    case 'network':
      return 'Connection Failed'
    case 'timeout':
      return 'Connection Timeout'
    case 'auth':
      return 'Authentication Failed'
    case 'algorithm':
      return 'Algorithm Mismatch'
    case 'unknown':
    default:
      return 'Connection Error'
  }
}

/**
 * ConnectionErrorModal - Displays SSH connection errors with debug information.
 * Replaces the server-rendered HTML error page with a client-side modal.
 *
 * Features:
 * - Error type icon and title
 * - User-friendly error message
 * - Host/port information
 * - Collapsible algorithm debug info (when available)
 * - Retry and close buttons
 */
export const ConnectionErrorModal: Component<ConnectionErrorModalProps> = (
  props
) => {
  const error = () => props.error
  const title = () => error()?.title ?? getDefaultTitle(error()?.errorType ?? 'unknown')
  const hasDebugInfo = () => error()?.debugInfo !== undefined

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      showCloseButton={false}
      closeOnBackdropClick={true}
    >
      <Show when={error() !== null}>
        <div
          class={`relative w-80 rounded-lg border border-slate-600 bg-slate-900 p-6 text-slate-100 shadow-xl sm:w-[28rem] ${hasDebugInfo() ? 'md:w-[36rem]' : ''}`}
          role="alertdialog"
          aria-labelledby="connection-error-title"
          aria-describedby="connection-error-message"
        >
          {/* Header with icon */}
          <div class="mb-4 flex flex-col items-center text-center">
            <div class="mb-3">{getErrorIcon(error()!.errorType)}</div>
            <h2
              id="connection-error-title"
              class="text-xl font-semibold text-red-400"
            >
              {title()}
            </h2>
          </div>

          {/* Error message */}
          <p
            id="connection-error-message"
            class="mb-4 break-words text-center text-slate-300"
          >
            {error()!.message}
          </p>

          {/* Connection details */}
          <div class="mb-4 rounded-md bg-slate-800 p-3 font-mono text-sm">
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Host</span>
              <span class="text-cyan-400">{error()!.host}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Port</span>
              <span class="text-cyan-400">{error()!.port}</span>
            </div>
          </div>

          {/* Algorithm Debug Info */}
          <Show when={hasDebugInfo()}>
            {(() => {
              const debugInfo = error()!.debugInfo!
              // Build props object, only including defined values (exactOptionalPropertyTypes compliance)
              const debugProps: Parameters<typeof AlgorithmDebugInfo>[0] = {}
              if (debugInfo.clientAlgorithms !== undefined) {
                debugProps.clientAlgorithms = debugInfo.clientAlgorithms
              }
              if (debugInfo.serverAlgorithms !== undefined) {
                debugProps.serverAlgorithms = debugInfo.serverAlgorithms
              }
              if (debugInfo.analysis !== undefined) {
                debugProps.analysis = debugInfo.analysis
              }
              if (debugInfo.errorDetails !== undefined) {
                debugProps.errorDetails = debugInfo.errorDetails
              }
              return <AlgorithmDebugInfo {...debugProps} />
            })()}
          </Show>

          {/* Action buttons */}
          <div class="mt-6 flex justify-center gap-3">
            <Show when={error()!.canRetry}>
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                onClick={props.onRetry}
                autofocus
              >
                <RefreshCw class="size-4" />
                Try Again
              </button>
            </Show>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-md border border-slate-500 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              onClick={props.onClose}
            >
              <X class="size-4" />
              Close
            </button>
          </div>
        </div>
      </Show>
    </Modal>
  )
}
