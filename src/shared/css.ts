import { FONT_FACES } from './generated/font-faces'
import { findFont, KEEP_FAMILY } from './fonts'
import type { FontSettings } from './types'

/**
 * Elements we must never restyle. Icon fonts declare font-family on the
 * element itself, so an `!important` override would replace glyphs with
 * tofu. We exclude them instead of trying to re-declare them, because
 * `revert` would drop the site's own declaration too.
 */
const ICON_EXCLUDES = [
  'i',
  '[class*="icon" i]',
  '[class*="fa-" i]',
  '[class*="material-symbols" i]',
  '[class*="material-icons" i]',
  '[data-icon]',
  'svg',
  'svg *',
]

/** The same exclusions as a single selector, for `Element.matches`. */
export const ICON_SELECTOR = ICON_EXCLUDES.join(', ')

/**
 * Matches a class token at the start of the attribute or after a space, so
 * `ace_` cannot also match `space_left`.
 */
const classToken = (prefix: string) => [
  `[class^="${prefix}" i]`,
  `[class*=" ${prefix}" i]`,
]

/**
 * Elements that are monospace by intent.
 *
 * `pre` and `tt` are deliberately absent, both because legacy enterprise markup
 * uses them for prose rather than code — Garoon puts message bodies in
 * `pre.format_contents` and attachment names in `tt`. A conforming code block
 * is `<pre><code>`, which `code` already covers, and dropping `pre` costs
 * nothing else: whitespace comes from `white-space`, not from the font.
 *
 * Code editors do not use `code` at all, so they are matched by class instead:
 * CodeMirror (kintone's JS/CSS customisation screen) renders each line as
 * `pre.CodeMirror-line`.
 */
const MONO_SELECTORS = [
  'code',
  'kbd',
  'samp',
  ...classToken('codemirror'),
  ...classToken('ace_'),
  ...classToken('monaco'),
]
const MONO_DESCENDANTS = MONO_SELECTORS.map((s) => `${s} *`)

/** Selector for `@font-face` sources; works in content scripts and pages. */
function fontUrl(file: string): string {
  return chrome.runtime.getURL(file)
}

function fontFaceCss(ids: readonly string[]): string {
  const wanted = new Set(ids)
  return FONT_FACES.filter((f) => wanted.has(f.id))
    .map(
      (f) => `@font-face{
  font-family:'${f.family}';
  font-style:${f.style};
  font-weight:${f.weight};${f.stretch ? `\n  font-stretch:${f.stretch};` : ''}
  font-display:swap;
  src:url("${fontUrl(f.file)}") format('woff2');
  unicode-range:${f.unicodeRange};
}`,
    )
    .join('\n')
}

/**
 * Builds the full stylesheet for the font feature. Returns an empty string
 * when the feature is off or the configured font is unknown.
 */
export function buildFontCss(settings: FontSettings): string {
  if (!settings.enabled) return ''

  // Size and weight are handled in JS (see content/features/font-metrics.ts),
  // so with KEEP_FAMILY the only thing left for CSS is the smoothing hint.
  if (settings.family === KEEP_FAMILY) {
    return settings.smoothing
      ? `*:not(${ICON_SELECTOR}){
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
}`
      : ''
  }

  const sans = findFont(settings.family)
  if (!sans) return ''

  const monoRequested = settings.applyToMonospace
  const mono = monoRequested ? findFont(settings.monoFamily) : undefined
  const applyMono = Boolean(mono)

  const bundled = [sans, ...(applyMono && mono ? [mono] : [])]
    .filter((f) => f.source === 'bundled')
    .map((f) => f.id)

  // When we are not touching monospace text, keep those elements out of the
  // general rule entirely so they inherit kintone's original font.
  const excludes = [
    ...ICON_EXCLUDES,
    ...(applyMono ? [] : [...MONO_SELECTORS, ...MONO_DESCENDANTS]),
  ].join(', ')

  const smoothing = settings.smoothing
    ? '\n  -webkit-font-smoothing:antialiased;\n  -moz-osx-font-smoothing:grayscale;'
    : ''

  const rules = [
    fontFaceCss(bundled),
    `*:not(${excludes}){
  font-family:${sans.stack} !important;${smoothing}
}`,
  ]

  if (applyMono && mono) {
    rules.push(`${[...MONO_SELECTORS, ...MONO_DESCENDANTS]
      .map((s) => `${s}:not(${ICON_EXCLUDES.join(', ')})`)
      .join(',\n')}{
  font-family:${mono.stack} !important;
}`)
  }

  return rules.filter(Boolean).join('\n')
}

/** `@font-face` rules only — used by the popup to render live previews. */
export function buildPreviewFontCss(): string {
  return fontFaceCss([...new Set(FONT_FACES.map((f) => f.id))])
}
