import type { Component } from 'solid-js'
import { For, Show, createSignal } from 'solid-js'
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-solid'
import type {
  AlgorithmSet,
  AlgorithmAnalysis,
  CategoryAnalysis
} from '../types/events.d'

interface AlgorithmDebugInfoProps {
  clientAlgorithms?: AlgorithmSet
  serverAlgorithms?: AlgorithmSet
  analysis?: AlgorithmAnalysis
  errorDetails?: string
}

interface AlgorithmGroupProps {
  label: string
  algorithms: string[]
  side: 'client' | 'server'
  categoryAnalysis?: CategoryAnalysis
}

/**
 * Determine CSS class for an algorithm based on whether it has a match
 */
const getAlgorithmClass = (
  algorithm: string,
  side: 'client' | 'server',
  categoryAnalysis?: CategoryAnalysis
): string => {
  if (categoryAnalysis === undefined) {
    return 'text-slate-400'
  }

  // Check if this algorithm is in the common list (has a match)
  if (categoryAnalysis.common.includes(algorithm)) {
    return 'text-emerald-400'
  }

  // Check if it's exclusive to this side (no match)
  const exclusiveList =
    side === 'client'
      ? categoryAnalysis.clientOnly
      : categoryAnalysis.serverOnly

  if (exclusiveList.includes(algorithm)) {
    return 'text-red-400'
  }

  return 'text-slate-400'
}

/**
 * Renders a single algorithm group (e.g., Key Exchange, Cipher)
 */
const AlgorithmGroup: Component<AlgorithmGroupProps> = (props) => {
  return (
    <Show when={props.algorithms.length > 0}>
      <div class="mb-3">
        <div class="mb-1 text-xs font-medium text-slate-500">{props.label}</div>
        <ul class="space-y-0.5 font-mono text-xs">
          <For each={props.algorithms}>
            {(alg) => (
              <li
                class={`break-all ${getAlgorithmClass(alg, props.side, props.categoryAnalysis)}`}
              >
                {alg}
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  )
}

interface AlgorithmColumnProps {
  title: string
  algorithms: AlgorithmSet
  side: 'client' | 'server'
  analysisMap: Map<string, CategoryAnalysis>
}

/**
 * Renders a column showing algorithms from client or server
 */
const AlgorithmColumn: Component<AlgorithmColumnProps> = (props) => {
  const groups: Array<{
    label: string
    category: keyof AlgorithmSet
    items: string[]
  }> = [
    { label: 'Key Exchange', category: 'kex', items: props.algorithms.kex },
    {
      label: 'Host Key',
      category: 'serverHostKey',
      items: props.algorithms.serverHostKey
    },
    { label: 'Cipher', category: 'cipher', items: props.algorithms.cipher },
    { label: 'MAC', category: 'mac', items: props.algorithms.mac },
    {
      label: 'Compression',
      category: 'compress',
      items: props.algorithms.compress
    }
  ]

  return (
    <div>
      <h4 class="mb-3 border-b border-slate-600 pb-2 text-sm font-semibold text-cyan-400">
        {props.title}
      </h4>
      <For each={groups}>
        {(group) => {
          const categoryAnalysis = props.analysisMap.get(group.category)
          return categoryAnalysis !== undefined ? (
            <AlgorithmGroup
              label={group.label}
              algorithms={group.items}
              side={props.side}
              categoryAnalysis={categoryAnalysis}
            />
          ) : (
            <AlgorithmGroup
              label={group.label}
              algorithms={group.items}
              side={props.side}
            />
          )
        }}
      </For>
    </div>
  )
}

interface ConfigSuggestionProps {
  analysis: AlgorithmAnalysis
}

/**
 * Renders configuration suggestions when algorithm mismatches are detected
 */
const ConfigSuggestion: Component<ConfigSuggestionProps> = (props) => {
  const hasPreset = () => props.analysis.suggestedPreset !== null
  const hasEnvVars = () => props.analysis.suggestedEnvVars.length > 0

  return (
    <Show when={hasPreset() || hasEnvVars()}>
      <div class="mt-4 rounded-md border border-cyan-700 bg-cyan-950/50 p-3">
        <h4 class="mb-2 text-sm font-semibold text-cyan-400">Suggested Fix</h4>
        <p class="mb-2 text-xs text-slate-400">
          The server uses algorithms not supported by the current configuration.
        </p>

        <Show when={hasPreset()}>
          <div class="mb-2">
            <code class="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-cyan-300">
              WEBSSH2_SSH_ALGORITHM_PRESET={props.analysis.suggestedPreset}
            </code>
          </div>
        </Show>

        <Show when={hasPreset() && hasEnvVars()}>
          <p class="mb-2 text-xs text-slate-500">
            Or set specific algorithms:
          </p>
        </Show>

        <Show when={hasEnvVars()}>
          <ul class="space-y-1">
            <For each={props.analysis.suggestedEnvVars}>
              {(envVar) => (
                <li>
                  <code class="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-cyan-300">
                    {envVar}
                  </code>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </Show>
  )
}

/**
 * AlgorithmDebugInfo - Displays algorithm comparison information for SSH connection failures.
 * Shows client vs server algorithms with color-coded match/mismatch indicators.
 * Collapsible by default.
 */
export const AlgorithmDebugInfo: Component<AlgorithmDebugInfoProps> = (
  props
) => {
  const [isExpanded, setIsExpanded] = createSignal(false)

  const hasAlgorithms = () =>
    props.clientAlgorithms !== undefined || props.serverAlgorithms !== undefined
  const hasErrorDetails = () =>
    props.errorDetails !== undefined && props.errorDetails !== ''

  // Build analysis map for quick lookup
  const analysisMap = (): Map<string, CategoryAnalysis> => {
    const map = new Map<string, CategoryAnalysis>()
    if (props.analysis !== undefined) {
      for (const categoryAnalysis of props.analysis.categories) {
        map.set(categoryAnalysis.category, categoryAnalysis)
      }
    }
    return map
  }

  // Check if there are any mismatches in the analysis
  const hasMismatches = () => props.analysis?.hasAnyMismatch === true

  return (
    <Show when={hasAlgorithms() || hasErrorDetails()}>
      <div class="mt-4 rounded-md bg-slate-800/50">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-400 hover:text-slate-300"
          onClick={() => setIsExpanded(!isExpanded())}
          aria-expanded={isExpanded()}
        >
          <span class="flex items-center gap-2">
            {isExpanded() ? (
              <ChevronDown class="size-4" />
            ) : (
              <ChevronRight class="size-4" />
            )}
            Debug Information
          </span>
          <Show when={hasMismatches()}>
            <span class="flex items-center gap-1 text-xs text-amber-400">
              <XCircle class="size-3" />
              Algorithm mismatch
            </span>
          </Show>
          <Show when={!hasMismatches() && hasAlgorithms()}>
            <span class="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle class="size-3" />
              Algorithms compatible
            </span>
          </Show>
        </button>

        <Show when={isExpanded()}>
          <div class="border-t border-slate-700 p-3">
            {/* Algorithm Comparison */}
            <Show when={hasAlgorithms()}>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Show when={props.clientAlgorithms !== undefined}>
                  <AlgorithmColumn
                    title="Client Offered"
                    algorithms={props.clientAlgorithms!}
                    side="client"
                    analysisMap={analysisMap()}
                  />
                </Show>
                <Show when={props.serverAlgorithms !== undefined}>
                  <AlgorithmColumn
                    title="Server Offered"
                    algorithms={props.serverAlgorithms!}
                    side="server"
                    analysisMap={analysisMap()}
                  />
                </Show>
              </div>

              {/* Legend */}
              <div class="mt-3 flex gap-4 border-t border-slate-700 pt-3 text-xs">
                <span class="flex items-center gap-1 text-emerald-400">
                  <span class="size-2 rounded-full bg-emerald-400" />
                  Supported by both
                </span>
                <span class="flex items-center gap-1 text-red-400">
                  <span class="size-2 rounded-full bg-red-400" />
                  Not compatible
                </span>
              </div>
            </Show>

            {/* Configuration Suggestion */}
            <Show when={props.analysis !== undefined && hasMismatches()}>
              <ConfigSuggestion analysis={props.analysis!} />
            </Show>

            {/* Error Details */}
            <Show when={hasErrorDetails()}>
              <div class="mt-4 border-t border-slate-700 pt-3">
                <div class="text-xs font-medium text-slate-500">
                  Error Details
                </div>
                <p class="mt-1 break-words font-mono text-xs text-red-400">
                  {props.errorDetails}
                </p>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}
