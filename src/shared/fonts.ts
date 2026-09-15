import type { FontOption } from './types'

/**
 * Japanese fallback chain. Bundling a CJK face is not viable (Noto Sans JP is
 * ~3 MB across 124 subset files), so Japanese glyphs come from the OS. The
 * order is: macOS, Windows 8.1+, Windows 7, then a Noto install if present.
 */
const JP = [
  '"Hiragino Sans"',
  '"Hiragino Kaku Gothic ProN"',
  '"Yu Gothic UI"',
  '"Yu Gothic"',
  '"Noto Sans JP"',
  'Meiryo',
  '"MS PGothic"',
].join(', ')

const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji"'

const sans = (latin: string) => `${latin}, ${JP}, sans-serif, ${EMOJI}`
const mono = (latin: string) => `${latin}, ${JP}, monospace, ${EMOJI}`

/**
 * Sentinel family: leave the site's own font-family alone. Size, minimum size
 * and weight still apply, so the metric tweaks are usable on their own.
 */
export const KEEP_FAMILY = 'default'

/**
 * The Latin name in each stack must stay byte-identical to the family's real
 * name. IBM Plex Sans, Source Sans 3 and Lexend ship under the OFL with a
 * Reserved Font Name ("Plex", 'Source', "RevReading Lexend"), which a renamed
 * or modified version may not use. We redistribute Google's files unchanged
 * and under their own names, which is what keeps that clause satisfied — so do
 * not rename a family here to dodge a clash with a system font.
 */
export const FONT_OPTIONS: readonly FontOption[] = [
  {
    id: KEEP_FAMILY,
    label: 'Keep current font',
    source: 'system',
    kind: 'sans',
    stack: '',
    note: 'Only apply the size and weight tweaks below',
  },

  // --- bundled sans ---
  {
    id: 'inter',
    label: 'Inter',
    source: 'bundled',
    kind: 'sans',
    stack: sans('Inter'),
    note: 'Neutral UI sans, very legible at small sizes',
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans',
    source: 'bundled',
    kind: 'sans',
    stack: sans('"Noto Sans"'),
    note: 'Closest to kintone’s own look, just cleaner',
  },
  {
    id: 'source-sans-3',
    label: 'Source Sans 3',
    source: 'bundled',
    kind: 'sans',
    stack: sans('"Source Sans 3"'),
    note: 'Humanist, softer than Inter',
  },
  {
    id: 'ibm-plex-sans',
    label: 'IBM Plex Sans',
    source: 'bundled',
    kind: 'sans',
    stack: sans('"IBM Plex Sans"'),
    note: 'Slightly technical, good for dense tables',
  },
  {
    id: 'be-vietnam-pro',
    label: 'Be Vietnam Pro',
    source: 'bundled',
    kind: 'sans',
    stack: sans('"Be Vietnam Pro"'),
    note: 'Drawn for Vietnamese — the most even stacked diacritics here',
  },
  {
    id: 'open-sans',
    label: 'Open Sans',
    source: 'bundled',
    kind: 'sans',
    stack: sans('"Open Sans"'),
    note: 'Familiar and unfussy, reads well at small sizes',
  },
  {
    id: 'roboto',
    label: 'Roboto',
    source: 'bundled',
    kind: 'sans',
    stack: sans('Roboto'),
    note: 'Compact, fits a lot of text into narrow columns',
  },
  {
    id: 'lexend',
    label: 'Lexend',
    source: 'bundled',
    kind: 'sans',
    stack: sans('Lexend'),
    note: 'Wide spacing, designed for reading ease',
  },

  // --- system sans ---
  {
    id: 'system-ui',
    label: 'System UI',
    source: 'system',
    kind: 'sans',
    stack: sans('system-ui, -apple-system, "Segoe UI"'),
    note: 'Matches the rest of your OS, ships nothing',
  },

  // --- mono ---
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    source: 'bundled',
    kind: 'mono',
    stack: mono('"JetBrains Mono"'),
  },
  {
    id: 'system-mono',
    label: 'System monospace',
    source: 'system',
    kind: 'mono',
    stack: mono('ui-monospace, SFMono-Regular, "Cascadia Mono", Consolas'),
  },
]

export const SANS_OPTIONS = FONT_OPTIONS.filter((f) => f.kind === 'sans')
export const MONO_OPTIONS = FONT_OPTIONS.filter((f) => f.kind === 'mono')

export function findFont(id: string): FontOption | undefined {
  return FONT_OPTIONS.find((f) => f.id === id)
}
