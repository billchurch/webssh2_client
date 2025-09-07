import type { Component } from 'solid-js'
import { Show, createEffect, onCleanup } from 'solid-js'
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  ToggleLeft,
  ToggleRight,
  Regex
} from 'lucide-solid'

import {
  isSearchVisible,
  setIsSearchVisible,
  searchTerm,
  setSearchTerm,
  searchOptions,
  setSearchOptions,
  searchResults,
  setSearchResults
} from '../stores/terminal'
import type { TerminalActions } from './Terminal'

interface TerminalSearchProps {
  terminalActions: TerminalActions | undefined
  class?: string
}

export const TerminalSearch: Component<TerminalSearchProps> = (props) => {
  let searchInputRef: HTMLInputElement | undefined
  let searchResultsCleanup: (() => void) | undefined

  const handleSearchInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    setSearchTerm(target.value)
  }

  const handleSearchSubmit = (event: Event) => {
    event.preventDefault()
    performSearch(true)
  }

  const performSearch = (findNext = true) => {
    const actions = props.terminalActions

    if (!actions || !searchTerm().trim()) {
      setSearchResults({ currentIndex: 0, totalMatches: 0 })
      return
    }

    try {
      const searchOptions_ = searchOptions()
      const found = findNext
        ? actions.search.findNext(searchTerm(), searchOptions_)
        : actions.search.findPrevious(searchTerm(), searchOptions_)

      // Note: The search results will be updated via the onDidChangeResults event
      // which is set up in the createEffect below
      if (!found) {
        // If no results found, clear the counter
        setSearchResults({ currentIndex: 0, totalMatches: 0 })
      }
    } catch (error) {
      console.error('Error performing search:', error)
    }
  }

  const handleFindNext = () => {
    performSearch(true)
  }

  const handleFindPrevious = () => {
    performSearch(false)
  }

  const handleCloseSearch = () => {
    setIsSearchVisible(false)
    setSearchTerm('')
    setSearchResults({ currentIndex: 0, totalMatches: 0 })

    const actions = props.terminalActions
    if (actions) {
      // Clear search decorations/highlights
      actions.search.clearDecorations()
      
      // Use requestAnimationFrame to ensure DOM cleanup before focusing
      requestAnimationFrame(() => {
        actions.focus()
      })
    }
  }

  const toggleCaseSensitive = () => {
    setSearchOptions((prev) => ({
      ...prev,
      caseSensitive: !prev.caseSensitive
    }))
  }

  const toggleWholeWord = () => {
    setSearchOptions((prev) => ({ ...prev, wholeWord: !prev.wholeWord }))
  }

  const toggleRegex = () => {
    setSearchOptions((prev) => ({ ...prev, regex: !prev.regex }))
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCloseSearch()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) {
        handleFindPrevious()
      } else {
        handleFindNext()
      }
      return
    }

    if (event.key === 'F3') {
      event.preventDefault()
      if (event.shiftKey) {
        handleFindPrevious()
      } else {
        handleFindNext()
      }
    }
  }

  createEffect(() => {
    if (isSearchVisible() && searchInputRef) {
      searchInputRef.focus()
      searchInputRef.select()
    }
  })

  // Set up search results listener
  createEffect(() => {
    const actions = props.terminalActions
    if (actions && actions.search.onSearchResults) {
      // Clean up previous listener
      if (searchResultsCleanup) {
        searchResultsCleanup()
      }

      // Set up new listener
      searchResultsCleanup = actions.search.onSearchResults((results) => {
        setSearchResults({
          currentIndex: results.resultIndex + 1, // Convert from 0-based to 1-based
          totalMatches: results.resultCount
        })
      })
    }
  })

  createEffect(() => {
    if (searchTerm().trim()) {
      performSearch(true)
    } else {
      setSearchResults({ currentIndex: 0, totalMatches: 0 })
    }
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
    if (searchResultsCleanup) {
      searchResultsCleanup()
    }
  })

  return (
    <Show when={isSearchVisible()}>
      <div
        class={`absolute right-2 top-2 z-50 flex items-center gap-1 rounded-lg border border-neutral-300 bg-white p-2 shadow-lg ${props.class || ''}`}
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSearchSubmit} class="contents">
          <div class="relative">
            <Search class="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm()}
              onInput={handleSearchInput}
              placeholder="Search terminal..."
              class="w-48 rounded border border-neutral-300 bg-white py-1 pl-8 pr-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </form>

        <div class="text-xs text-neutral-600">
          <Show when={searchResults().totalMatches > 0}>
            {searchResults().currentIndex}/{searchResults().totalMatches}
          </Show>
          <Show
            when={searchResults().totalMatches === 0 && searchTerm().trim()}
          >
            0/0
          </Show>
        </div>

        <div class="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFindPrevious}
            disabled={!searchTerm().trim()}
            class="rounded p-1 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp class="size-4" />
          </button>

          <button
            type="button"
            onClick={handleFindNext}
            disabled={!searchTerm().trim()}
            class="rounded p-1 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            title="Next match (Enter)"
          >
            <ChevronDown class="size-4" />
          </button>
        </div>

        <div class="mx-1 h-6 w-px bg-neutral-300"></div>

        <div class="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleCaseSensitive}
            class="rounded p-1 text-neutral-600 hover:bg-neutral-100"
            title="Match case"
          >
            {searchOptions().caseSensitive ? (
              <ToggleRight class="size-4 text-blue-600" />
            ) : (
              <ToggleLeft class="size-4" />
            )}
            <span class="sr-only">Aa</span>
          </button>

          <button
            type="button"
            onClick={toggleWholeWord}
            class="rounded px-2 py-1 font-mono text-xs text-neutral-600 hover:bg-neutral-100"
            classList={{
              'bg-blue-100 text-blue-600': searchOptions().wholeWord
            }}
            title="Match whole word"
          >
            Ab
          </button>

          <button
            type="button"
            onClick={toggleRegex}
            class="rounded p-1 text-neutral-600 hover:bg-neutral-100"
            classList={{
              'bg-blue-100 text-blue-600': searchOptions().regex
            }}
            title="Use regex"
          >
            <Regex class="size-4" />
          </button>
        </div>

        <div class="mx-1 h-6 w-px bg-neutral-300"></div>

        <button
          type="button"
          onClick={handleCloseSearch}
          class="rounded p-1 text-neutral-600 hover:bg-neutral-100"
          title="Close search (Escape)"
        >
          <X class="size-4" />
        </button>
      </div>
    </Show>
  )
}
