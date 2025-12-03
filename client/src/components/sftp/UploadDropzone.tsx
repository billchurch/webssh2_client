/**
 * Upload Dropzone Component
 *
 * Provides drag-and-drop file upload functionality.
 *
 * @module components/sftp/UploadDropzone
 */

import type { Component, JSX } from 'solid-js'
import { createSignal, Show } from 'solid-js'

interface UploadDropzoneProps {
  onDrop: (files: File[]) => void
  disabled?: boolean
  children: JSX.Element
}

export const UploadDropzone: Component<UploadDropzoneProps> = (props) => {
  const [isDragOver, setIsDragOver] = createSignal(false)
  const [dragCounter, setDragCounter] = createSignal(0)

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (props.disabled) return

    setDragCounter((c) => c + 1)
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter((c) => c - 1)
    if (dragCounter() <= 1) {
      setIsDragOver(false)
      setDragCounter(0)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragOver(false)
    setDragCounter(0)

    if (props.disabled) return

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      props.onDrop(Array.from(files))
    }
  }

  return (
    <div
      class="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {props.children}

      {/* Drag overlay */}
      <Show when={isDragOver()}>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-900/50 backdrop-blur-sm">
          <div class="flex flex-col items-center gap-2 text-white">
            <svg
              class="size-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span class="text-lg font-medium">Drop files to upload</span>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default UploadDropzone
