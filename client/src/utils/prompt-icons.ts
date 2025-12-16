/**
 * Static icon registry for prompt system
 * SECURITY: Icons are imported statically to prevent dynamic import attacks
 * Never use dynamic imports or string concatenation for icon paths
 */
import {
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Key,
  KeyRound,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  UserCheck,
  UserX,
  File,
  FileText,
  FileQuestion,
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
  HelpCircle,
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
  Edit,
  Pencil,
  Plus,
  Minus,
  X,
  Check,
  Ban,
  Loader2
} from 'lucide-solid'
import type { Component } from 'solid-js'
import type { LucideProps } from 'lucide-solid'
import type { PromptSeverity } from '../types/prompt'

/**
 * Static icon registry - SECURITY: Only these icons can be rendered
 * Icons are imported statically to prevent dynamic import attacks
 *
 * This list should match ALLOWED_PROMPT_ICONS on the server
 */
export const PROMPT_ICON_REGISTRY: Record<string, Component<LucideProps>> = {
  // Severity/Status icons (defaults)
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  // Authentication & Security
  Key,
  KeyRound,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  UserCheck,
  UserX,
  // File operations
  File,
  FileText,
  FileQuestion,
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
  HelpCircle,
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
  Edit,
  Pencil,
  Plus,
  Minus,
  X,
  Check,
  Ban,
  Loader2
}

/** Default icons for each severity level */
const SEVERITY_DEFAULT_ICONS: Record<PromptSeverity, Component<LucideProps>> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle
}

/**
 * Resolve an icon by name with graceful fallback
 * SECURITY: Only returns icons from the static registry
 *
 * @param iconName - The icon name from the server (optional)
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
