import type { Component } from 'solid-js'
import { splitProps } from 'solid-js'
import { ICONS } from '../icons.js'

interface IconProps {
  name: string
  class?: string
  [key: string]: unknown
}

export const Icon: Component<IconProps> = (props) => {
  const [local, others] = splitProps(props, ['name', 'class'])

  const svgRaw = ICONS[local.name] || ''

  if (!svgRaw) {
    console.warn(`Icon "${local.name}" not found in ICONS`)
    return null
  }

  // Parse the SVG to extract attributes and content
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgRaw, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')

  if (!svgEl) {
    return null
  }

  // Split classes: apply sizing/animation to SVG, container/layout to wrapper
  const tokens = (local.class || '').split(/\s+/).filter(Boolean)
  const svgClass: string[] = []
  const wrapperClass: string[] = ['icon']

  tokens.forEach((t) => {
    if (
      t.startsWith('w-') ||
      t.startsWith('h-') ||
      t.startsWith('animate-') ||
      t.startsWith('origin-') ||
      t.startsWith('inline-')
    ) {
      svgClass.push(t)
    } else {
      wrapperClass.push(t)
    }
  })

  // Get existing SVG attributes
  const existingSvgClass = svgEl.getAttribute('class') || ''
  const finalSvgClass = `${existingSvgClass} ${svgClass.join(' ')}`.trim()

  // Create the SVG with updated class
  const svgWithClass = svgRaw
    .replace(
      /<svg([^>]*)class="([^"]*)"([^>]*)/,
      `<svg$1class="${finalSvgClass}"$3`
    )
    .replace(/<svg([^>]*)(?!class=)([^>]*)/, `<svg$1class="${finalSvgClass}"$2`)

  return (
    <span class={wrapperClass.join(' ')} {...others} innerHTML={svgWithClass} />
  )
}
