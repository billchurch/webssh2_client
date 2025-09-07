import type { Terminal, ITerminalAddon } from '@xterm/xterm'
import type { AddonDefinition } from '../types'

export class AddonManager {
  private loadedAddons = new Map<string, ITerminalAddon>()

  private addonDisposables = new Map<string, () => void>()

  /**
   * Load addons into the terminal
   * Supports both constructor functions and instances
   */
  loadAddons(terminal: Terminal, addons: AddonDefinition[]): void {
    addons.forEach((addonDef, index) => {
      try {
        const addon = this.createAddonInstance(addonDef)
        const addonKey = this.getAddonKey(addon, index)

        terminal.loadAddon(addon)
        this.loadedAddons.set(addonKey, addon)

        // Store cleanup function if the addon provides one
        if ('dispose' in addon && typeof addon.dispose === 'function') {
          this.addonDisposables.set(addonKey, () => addon.dispose())
        }
      } catch (error) {
        console.error(`Failed to load addon at index ${index}:`, error)
      }
    })
  }

  /**
   * Get a loaded addon by its constructor name or index
   */
  getAddon<T extends ITerminalAddon>(
    addonConstructor: new (...args: unknown[]) => T
  ): T | undefined {
    const addonName = addonConstructor.name
    for (const [key, addon] of this.loadedAddons) {
      if (key.startsWith(addonName) || addon.constructor.name === addonName) {
        return addon as T
      }
    }
    return undefined
  }

  /**
   * Check if a specific addon type is loaded
   */
  hasAddon(
    addonConstructor: new (...args: unknown[]) => ITerminalAddon
  ): boolean {
    return this.getAddon(addonConstructor) !== undefined
  }

  /**
   * Get all loaded addons
   */
  getAllAddons(): ITerminalAddon[] {
    return Array.from(this.loadedAddons.values())
  }

  /**
   * Clean up all loaded addons
   */
  dispose(): void {
    // Dispose all addons that support disposal
    this.addonDisposables.forEach((dispose) => {
      try {
        dispose()
      } catch (error) {
        console.error('Error disposing addon:', error)
      }
    })

    this.loadedAddons.clear()
    this.addonDisposables.clear()
  }

  private createAddonInstance(addonDef: AddonDefinition): ITerminalAddon {
    if (typeof addonDef === 'function') {
      // Constructor function
      return new (addonDef as new () => ITerminalAddon)()
    }
    if (typeof addonDef === 'object' && 'addon' in addonDef) {
      // Object with addon and optional args
      const { addon, args = [] } = addonDef
      if (typeof addon === 'function') {
        return new (addon as new (...args: unknown[]) => ITerminalAddon)(
          ...args
        )
      }
      return addon
    }
    // Already an instance
    return addonDef as ITerminalAddon
  }

  private getAddonKey(addon: ITerminalAddon, index: number): string {
    const name = addon.constructor.name || 'UnknownAddon'
    return `${name}-${index}`
  }
}
