import { buildFontCss } from '../../shared/css'
import { isInScope } from '../../shared/scope'
import type { Settings } from '../../shared/types'

const STYLE_ID = 'cykit-font'

let styleEl: HTMLStyleElement | null = null

/**
 * Inserts the style element as early as possible. At document_start
 * document.head does not exist yet, so we attach to documentElement — the
 * stylesheet applies either way.
 */
function ensureStyleEl(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID)
  if (existing instanceof HTMLStyleElement) styleEl = existing

  const el = styleEl ?? document.createElement('style')
  el.id = STYLE_ID
  styleEl = el

  // Keep it last in <head>: kintone appends its own stylesheets after
  // document_start, and later rules of equal importance would otherwise win.
  const parent = document.head ?? document.documentElement
  if (el.parentNode !== parent || parent.lastChild !== el) parent.appendChild(el)

  return el
}

export function applyFont(settings: Settings): void {
  // One Cybozu host serves kintone, Garoon and the portal, so the manifest
  // globs cannot tell them apart — the check has to happen here, per page.
  const inScope = isInScope(settings.font.scope, location.hostname, location.pathname)
  const css = inScope ? buildFontCss(settings.font) : ''

  if (!css) {
    // Remove by id, not just via `styleEl`. After the extension is reloaded the
    // previous content script is orphaned and can no longer clean up, so a new
    // instance can meet a stylesheet it never created — and `styleEl` would be
    // null, leaving the old font stuck on the page.
    document.getElementById(STYLE_ID)?.remove()
    styleEl?.remove()
    styleEl = null
    return
  }

  const el = ensureStyleEl()
  if (el.textContent !== css) el.textContent = css
}
