/**
 * Upload Dropzone Component
 *
 * Provides drag-and-drop file upload functionality.
 *
 * @module components/sftp/UploadDropzone
 */

import type { Component, JSX } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import { CloudUpload } from 'lucide-solid'

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
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-900/50 backdrop-blur-sm"
          role="status"
          aria-live="assertive"
        >
          <div class="flex flex-col items-center gap-2 text-white">
            <CloudUpload class="size-12" aria-hidden="true" />
            <span class="text-lg font-medium">Drop files to upload</span>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default UploadDropzone
