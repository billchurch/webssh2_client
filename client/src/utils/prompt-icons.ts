/**
 * Static icon registry for prompt system
 * SECURITY: Icons are imported statically to prevent dynamic import attacks
 * Never use dynamic imports or string concatenation for icon paths
 */
import {
  Info,
  TriangleAlert,
  CircleAlert,
  CircleCheckBig,
  CircleX,
  Key,
  KeyRound,
  Lock,
  LockOpen,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FingerprintPattern,
  UserCheck,
  UserX,
  File,
  FileText,
  FileQuestionMark,
  FilePlus,
  FileMinus,
  FileX,
  Folder,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Save,
  Copy,
  Clipboard,
  Wifi,
  WifiOff,
  Globe,
  Server,
  Database,
  Link,
  Unlink,
  RefreshCw,
  RotateCcw,
  Settings,
  CircleQuestionMark,
  MessageSquare,
  Bell,
  BellOff,
  Clock,
  Timer,
  Terminal,
  Code,
  Zap,
  Power,
  LogOut,
  LogIn,
  Eye,
  EyeOff,
  Search,
  SquarePen,
  Pencil,
  Plus,
  Minus,
  X,
  Check,
  Ban,
  LoaderCircle
} from 'lucide-solid'
import type { Component } from 'solid-js'
import type { LucideProps } from 'lucide-solid'
import type { PromptSeverity } from '../types/prompt'

/**
 * Static icon registry - SECURITY: Only these icons can be rendered
 * Icons are imported statically to prevent dynamic import attacks
 *
 * Icon names use exact PascalCase matching lucide-solid exports.
 * This list should match ALLOWED_PROMPT_ICONS on the server.
 */
export const PROMPT_ICON_REGISTRY: Record<string, Component<LucideProps>> = {
  // Severity/Status icons (defaults)
  Info,
  TriangleAlert,
  CircleAlert,
  CircleCheckBig,
  CircleX,
  // Authentication & Security
  Key,
  KeyRound,
  Lock,
  LockOpen,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FingerprintPattern,
  UserCheck,
  UserX,
  // File operations
  File,
  FileText,
  FileQuestionMark,
  FilePlus,
  FileMinus,
  FileX,
  Folder,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Save,
  Copy,
  Clipboard,
  // Connection & Network
  Wifi,
  WifiOff,
  Globe,
  Server,
  Database,
  Link,
  Unlink,
  RefreshCw,
  RotateCcw,
  // Actions & UI
  Settings,
  CircleQuestionMark,
  MessageSquare,
  Bell,
  BellOff,
  Clock,
  Timer,
  Terminal,
  Code,
  Zap,
  Power,
  LogOut,
  LogIn,
  // Misc
  Eye,
  EyeOff,
  Search,
  SquarePen,
  Pencil,
  Plus,
  Minus,
  X,
  Check,
  Ban,
  LoaderCircle
}

/** Default icons for each severity level */
const SEVERITY_DEFAULT_ICONS: Record<PromptSeverity, Component<LucideProps>> = {
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
  success: CircleCheckBig
}

/**
 * Resolve an icon by name with graceful fallback
 * SECURITY: Only returns icons from the static registry
 *
 * @param iconName - The icon name from the server (exact PascalCase match)
 * @param severity - The severity level for fallback
 * @returns The icon component, or default based on severity
 */
export function resolvePromptIcon(
  iconName: string | undefined,
  severity: PromptSeverity = 'info'
): Component<LucideProps> {
  // If icon specified, look it up in registry
  if (iconName !== undefined) {
    const icon = PROMPT_ICON_REGISTRY[iconName]
    if (icon !== undefined) {
      return icon
    }
    // Icon not found - log warning and fallback gracefully
    console.warn(
      `[WebSSH2] Unknown prompt icon: '${iconName}'. ` +
        `Icon not in PROMPT_ICON_REGISTRY. Falling back to severity default. ` +
        `This may indicate a server/client version mismatch.`
    )
  }

  // Return severity-based default
  return SEVERITY_DEFAULT_ICONS[severity] ?? Info
}
