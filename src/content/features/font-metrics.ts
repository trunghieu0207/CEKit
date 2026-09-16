import { ICON_SELECTOR } from '../../shared/css'
import { isInScope } from '../../shared/scope'
import type { Settings } from '../../shared/types'

/**
 * Scales font-size and font-weight.
 *
 * This cannot be done in CSS. `* { font-size: 1.1em }` compounds once per DOM
 * level (kintone nests ~20 deep, so 1.1^20 ≈ 6.7x) and a fixed px value
 * flattens every heading and label to the same size.
 *
 * So instead: measure the whole tree, then rewrite only the elements that
 * *declare* their own size or weight. Elements that merely inherit are left
 * untouched and pick up their ancestor's new value, which preserves kintone's
 * original size hierarchy exactly:
 *
 *   - a rule of `font-size: 13px`  ->  13 * scale
 *   - a rule of `font-size: 1.2em` ->  1.2 * (already scaled parent) = correct
 *
 * Reads and writes are kept in separate passes so the browser does not have to
 * re-resolve style between each element.
 */

interface Metrics {
  sizeScale: number
  minSize: number
  weightBump: number
}

/** Elements that carry no text of their own; skipped to save work. */
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'LINK',
  'META',
  'TITLE',
  'HEAD',
  'NOSCRIPT',
  'TEMPLATE',
  'IFRAME',
  'IMG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'BR',
  'HR',
])

/** Warn if a pass gets big enough to be noticeable. */
const SLOW_PASS_ELEMENTS = 15000

/** Top of the bundled variable fonts' weight range. */
const MAX_WEIGHT = 700

/** Above this many mutation roots, one full pass beats per-root passes. */
const MAX_INCREMENTAL_ROOTS = 40

/** Coalesces mutation bursts from kintone's own rendering. */
const DEBOUNCE_MS = 120

let current: Metrics = { sizeScale: 1, minSize: 0, weightBump: 0 }
let observer: MutationObserver | null = null
let timer: number | undefined
let warnedSlow = false
const pendingRoots = new Set<HTMLElement>()

const NEUTRAL: Metrics = { sizeScale: 1, minSize: 0, weightBump: 0 }

function metricsOf(font: Settings['font']): Metrics {
  // Neutral metrics make `pass` restore whatever it changed, so an out-of-scope
  // page cleans itself up rather than keeping stale overrides.
  if (!font.enabled) return NEUTRAL
  if (!isInScope(font.scope, location.hostname, location.pathname)) return NEUTRAL
  return {
    sizeScale: font.sizeScale,
    minSize: font.minSize,
    weightBump: font.weightBump,
  }
}

function isActive(m: Metrics): boolean {
  return m.sizeScale !== 1 || m.minSize > 0 || m.weightBump > 0
}

/**
 * Writes an override, remembering whatever inline value was there before so
 * `restore` can put it back. Only the properties we actually touched are
 * recorded, so restoring never clobbers an inline style we did not set.
 */
function override(el: HTMLElement, prop: 'font-size' | 'font-weight', value: string): void {
  const key = prop === 'font-size' ? 'cykitFs' : 'cykitFw'
  el.dataset.cykitText = '1'
  if (el.dataset[key] === undefined) el.dataset[key] = el.style.getPropertyValue(prop)
  el.style.setProperty(prop, value, 'important')
}

function restore(el: HTMLElement): void {
  for (const [key, prop] of [
    ['cykitFs', 'font-size'],
    ['cykitFw', 'font-weight'],
  ] as const) {
    const saved = el.dataset[key]
    if (saved === undefined) continue
    if (saved) el.style.setProperty(prop, saved)
    else el.style.removeProperty(prop)
    delete el.dataset[key]
  }
  delete el.dataset.cykitText
  if (el.getAttribute('style') === '') el.removeAttribute('style')
}

/**
 * Re-measures `root` and applies the current metrics to it.
 *
 * Overrides inside `root` are removed first so the measurements are kintone's
 * own values rather than our previous output. Elements above `root` keep their
 * overrides, which is what makes the incremental (mutation) path work: a newly
 * inserted node that inherits its size measures equal to its already-scaled
 * parent and is correctly skipped.
 */
function pass(root: HTMLElement, m: Metrics): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-cykit-text]')) restore(el)
  if (root.dataset.cykitText) restore(root)
  if (!isActive(m)) return

  // SVG elements are not HTMLElement, so they drop out here along with their
  // subtrees — which is what we want, they are icons.
  const scalable: HTMLElement[] = []
  const iconLike: HTMLElement[] = []

  const classify = (el: HTMLElement) => {
    if (SKIP_TAGS.has(el.tagName)) return
    if (el.matches(ICON_SELECTOR)) iconLike.push(el)
    else scalable.push(el)
  }

  classify(root)
  for (const el of root.querySelectorAll('*')) {
    if (el instanceof HTMLElement) classify(el)
  }

  const total = scalable.length + iconLike.length
  if (total > SLOW_PASS_ELEMENTS && !warnedSlow) {
    warnedSlow = true
    console.debug(`[CyKit] font metrics pass over ${total} elements`)
  }

  // Read pass — no writes, so style is resolved once. Icon-like elements are
  // measured too, so their children are still recognised as inheriting.
  const sizes = new Map<Element, number>()
  const weights = new Map<Element, number>()
  for (const el of [...scalable, ...iconLike]) {
    const cs = getComputedStyle(el)
    sizes.set(el, Number.parseFloat(cs.fontSize))
    weights.set(el, Number.parseInt(cs.fontWeight, 10))
  }

  /**
   * A value equal to the parent's was inherited, so the parent's override
   * already covers it. An unmeasured parent (skipped, or above `root`) counts
   * as declared — correct, because every measurement here predates our writes.
   */
  const declaresOwn = (el: HTMLElement, map: Map<Element, number>): boolean => {
    const parent = el.parentElement
    return !(parent && map.get(parent) === map.get(el))
  }

  // Write pass.
  for (const el of scalable) {
    const size = sizes.get(el)
    if (size !== undefined && Number.isFinite(size) && declaresOwn(el, sizes)) {
      // `font-size: 0` is a layout trick for killing inline-block whitespace,
      // still used in parts of kintone. Applying the floor to it would push
      // that whitespace back in, so tiny sizes only get the scale.
      const next = size >= 1 ? Math.max(size * m.sizeScale, m.minSize) : size * m.sizeScale
      if (Math.abs(next - size) > 0.01) {
        override(el, 'font-size', `${Math.round(next * 100) / 100}px`)
      }
    }

    if (m.weightBump === 0) continue
    const weight = weights.get(el)
    if (weight === undefined || !Number.isFinite(weight)) continue
    if (!declaresOwn(el, weights)) continue

    // Written even when the value does not change. `<b>` and `<strong>` use
    // `font-weight: bolder`, which re-resolves against the parent — so a body
    // bumped to 600 would drag them from 700 to 900 and trigger a synthetic
    // fake bold. Writing the resolved number pins them where they were.
    //
    // Clamped at 700, the top of the bundled variable fonts' range, which also
    // keeps already-bold headings from outrunning body text.
    override(el, 'font-weight', String(Math.min(MAX_WEIGHT, weight + m.weightBump)))
  }

  // Icon fonts usually ship a single weight, so inheriting the bump would make
  // Chrome fake-bold the glyphs. Pin them at their original weight.
  if (m.weightBump > 0) {
    for (const el of iconLike) {
      const weight = weights.get(el)
      if (weight !== undefined && Number.isFinite(weight)) {
        override(el, 'font-weight', String(weight))
      }
    }
  }
}

function flush(): void {
  timer = undefined
  const roots = [...pendingRoots].filter((el) => el.isConnected)
  pendingRoots.clear()
  if (!isActive(current) || roots.length === 0) return

  // Deduping roots is O(n^2) in `contains`, so past a point a single pass over
  // the document is both simpler and cheaper.
  if (roots.length > MAX_INCREMENTAL_ROOTS) {
    if (document.body) pass(document.body, current)
    return
  }

  // Drop roots already covered by an ancestor in the same batch.
  for (const root of roots) {
    if (roots.some((other) => other !== root && other.contains(root))) continue
    pass(root, current)
  }
}

function startObserver(): void {
  if (observer || !document.body) return
  observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) pendingRoots.add(node)
      }
    }
    if (pendingRoots.size > 0 && timer === undefined) {
      timer = window.setTimeout(flush, DEBOUNCE_MS)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

function stopObserver(): void {
  observer?.disconnect()
  observer = null
  pendingRoots.clear()
  if (timer !== undefined) window.clearTimeout(timer)
  timer = undefined
}

export function applyFontMetrics(settings: Settings): void {
  current = metricsOf(settings.font)

  // At document_start there is nothing to measure yet; index.ts calls us again
  // on DOMContentLoaded and on load.
  if (!document.body) return

  pass(document.body, current)

  if (isActive(current)) startObserver()
  else stopObserver()
}
