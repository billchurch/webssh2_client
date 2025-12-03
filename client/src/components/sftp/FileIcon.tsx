/**
 * File Icon Component
 *
 * Returns appropriate lucide-solid icon based on file type and extension.
 *
 * @module components/sftp/FileIcon
 */

import type { Component } from 'solid-js'
import {
  Folder,
  Link,
  File,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  FileSpreadsheet,
  FileType,
  Terminal,
  Settings,
  BookOpen
} from 'lucide-solid'
import type { SftpFileEntry } from '../../types/sftp.js'

interface FileIconProps {
  entry: SftpFileEntry
  class?: string
}

/**
 * Get the appropriate icon component based on file type and extension
 */
export const FileIcon: Component<FileIconProps> = (props) => {
  const iconClass = () => props.class || 'size-4'

  // Directory
  if (props.entry.type === 'directory') {
    return <Folder class={iconClass()} aria-hidden="true" />
  }

  // Symlink
  if (props.entry.type === 'symlink') {
    return <Link class={iconClass()} aria-hidden="true" />
  }

  // Get file extension
  const ext = props.entry.name.split('.').pop()?.toLowerCase()

  // Match by extension
  switch (ext) {
    // Text files
    case 'txt':
    case 'md':
    case 'log':
    case 'rtf':
      return <FileText class={iconClass()} aria-hidden="true" />

    // Code files
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'rb':
    case 'go':
    case 'rs':
    case 'java':
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
    case 'cs':
    case 'php':
    case 'swift':
    case 'kt':
    case 'scala':
    case 'vue':
    case 'svelte':
      return <FileCode class={iconClass()} aria-hidden="true" />

    // Config/data files
    case 'json':
    case 'jsonc':
      return <FileJson class={iconClass()} aria-hidden="true" />

    case 'xml':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
    case 'conf':
    case 'cfg':
    case 'env':
      return <Settings class={iconClass()} aria-hidden="true" />

    // Images
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
    case 'ico':
    case 'bmp':
    case 'tiff':
    case 'tif':
      return <FileImage class={iconClass()} aria-hidden="true" />

    // Audio
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
    case 'm4a':
    case 'wma':
      return <FileAudio class={iconClass()} aria-hidden="true" />

    // Video
    case 'mp4':
    case 'mkv':
    case 'avi':
    case 'mov':
    case 'webm':
    case 'wmv':
    case 'flv':
    case 'm4v':
      return <FileVideo class={iconClass()} aria-hidden="true" />

    // Archives
    case 'zip':
    case 'tar':
    case 'gz':
    case 'bz2':
    case '7z':
    case 'rar':
    case 'xz':
    case 'tgz':
      return <FileArchive class={iconClass()} aria-hidden="true" />

    // Documents
    case 'pdf':
      return <BookOpen class={iconClass()} aria-hidden="true" />

    case 'doc':
    case 'docx':
    case 'odt':
      return <FileType class={iconClass()} aria-hidden="true" />

    case 'xls':
    case 'xlsx':
    case 'ods':
    case 'csv':
      return <FileSpreadsheet class={iconClass()} aria-hidden="true" />

    case 'ppt':
    case 'pptx':
    case 'odp':
      return <FileType class={iconClass()} aria-hidden="true" />

    // Shell scripts
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
    case 'ps1':
    case 'bat':
    case 'cmd':
      return <Terminal class={iconClass()} aria-hidden="true" />

    // HTML/CSS
    case 'html':
    case 'htm':
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <FileCode class={iconClass()} aria-hidden="true" />

    // Default file icon
    default:
      return <File class={iconClass()} aria-hidden="true" />
  }
}

export default FileIcon
