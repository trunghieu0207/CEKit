/**
 * Downloads the bundled webfonts from Google Fonts into public/fonts/ and
 * generates src/shared/generated/font-faces.ts.
 *
 * Only Latin-ish subsets are bundled (latin, latin-ext, vietnamese). Japanese
 * is deliberately NOT bundled: Noto Sans JP alone is ~3 MB across 124 subset
 * files. CJK text falls back to the system Japanese fonts declared in the
 * font stacks in src/shared/fonts.ts.
 *
 * Run with: pnpm fonts
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FONT_DIR = resolve(ROOT, 'public/fonts')
const LICENSE_DIR = resolve(FONT_DIR, 'licenses')
const OUT_TS = resolve(ROOT, 'src/shared/generated/font-faces.ts')

/** Subsets we ship. Everything else (cyrillic, greek) is dropped. */
const KEEP_SUBSETS = new Set(['latin', 'latin-ext', 'vietnamese'])

/** Chrome UA so the API returns woff2 rather than ttf. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * id must match the ids in src/shared/fonts.ts.
 *
 * Most of these are variable fonts, so `wght@400..700` fetches one file per
 * subset covering the whole range. Be Vietnam Pro is NOT variable, so its
 * weights have to be listed one by one — the Weight feature needs a real 500
 * and 600, otherwise the browser falls back to a synthetic bold.
 */
const FAMILIES = [
  { id: 'inter', query: 'Inter:ital,wght@0,400..700;1,400..700' },
  { id: 'noto-sans', query: 'Noto+Sans:ital,wght@0,400..700;1,400..700' },
  { id: 'source-sans-3', query: 'Source+Sans+3:ital,wght@0,400..700;1,400..700' },
  { id: 'ibm-plex-sans', query: 'IBM+Plex+Sans:ital,wght@0,400..700;1,400..700' },
  { id: 'lexend', query: 'Lexend:wght@400..700' },
  { id: 'open-sans', query: 'Open+Sans:ital,wght@0,400..700;1,400..700' },
  { id: 'roboto', query: 'Roboto:ital,wght@0,400..700;1,400..700' },
  {
    id: 'be-vietnam-pro',
    query: 'Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700',
  },
  { id: 'jetbrains-mono', query: 'JetBrains+Mono:ital,wght@0,400..700;1,400..700' },
]

/**
 * Where the licences live in github.com/google/fonts. Tried in order; the run
 * fails if none of them exist, so a font can never ship without its licence.
 */
const LICENSE_PATHS = [
  (slug) => `ofl/${slug}/OFL.txt`,
  (slug) => `apache/${slug}/LICENSE.txt`,
  (slug) => `ufl/${slug}/UFL.txt`,
]

/** Parses the `@font-face` blocks out of a Google Fonts CSS2 response. */
function parseCss(css) {
  const faces = []
  // Each block is preceded by a `/* subset */` comment.
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g
  for (const [, subset, body] of css.matchAll(re)) {
    const pick = (prop) => body.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1]?.trim()
    const url = body.match(/url\(([^)]+)\)/)?.[1]
    if (!url) continue
    faces.push({
      subset,
      url,
      family: pick('font-family')?.replace(/^['"]|['"]$/g, ''),
      style: pick('font-style') ?? 'normal',
      weight: pick('font-weight') ?? '400',
      // Present on families with a `wdth` axis (Open Sans, Roboto). Dropping it
      // would leave the declaration describing a font it does not match.
      stretch: pick('font-stretch'),
      unicodeRange: pick('unicode-range') ?? '',
    })
  }
  return faces
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return res.text()
}

/**
 * The OFL and the Apache licence both require the notice to travel with the
 * font, so the extension cannot ship the woff2 files on their own.
 */
async function fetchLicense(id, family) {
  const slug = family.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const path of LICENSE_PATHS) {
    const url = `https://raw.githubusercontent.com/google/fonts/main/${path(slug)}`
    const res = await fetch(url)
    if (!res.ok) continue
    const text = await res.text()
    await writeFile(
      resolve(LICENSE_DIR, `${id}.txt`),
      `${family} — from ${url}\n\n${text}`,
    )
    return path(slug)
  }
  throw new Error(
    `No licence found for "${family}" (tried slug "${slug}"). ` +
      `Refusing to bundle a font without its licence.`,
  )
}

async function main() {
  await rm(FONT_DIR, { recursive: true, force: true })
  await mkdir(LICENSE_DIR, { recursive: true })
  await mkdir(dirname(OUT_TS), { recursive: true })

  const entries = []
  const licenses = []
  let totalBytes = 0

  for (const { id, query } of FAMILIES) {
    const css = await fetchText(
      `https://fonts.googleapis.com/css2?family=${query}&display=swap`,
    )
    const faces = parseCss(css).filter((f) => KEEP_SUBSETS.has(f.subset))
    if (faces.length === 0) throw new Error(`No usable subsets for ${id}`)

    for (const face of faces) {
      // The weight belongs in the name: a static family such as Be Vietnam Pro
      // returns one file per weight, and without it they overwrite each other.
      const weight = face.weight.replace(/\s+/g, '-')
      const style = face.style === 'italic' ? 'italic-' : ''
      const name = `${id}-${weight}-${style}${face.subset}.woff2`
      const bytes = new Uint8Array(
        await (await fetch(face.url, { headers: { 'User-Agent': UA } })).arrayBuffer(),
      )
      await writeFile(resolve(FONT_DIR, name), bytes)
      totalBytes += bytes.byteLength

      entries.push({
        id,
        family: face.family,
        file: `fonts/${name}`,
        style: face.style,
        weight: face.weight,
        ...(face.stretch ? { stretch: face.stretch } : {}),
        unicodeRange: face.unicodeRange,
      })
      console.log(`  ${name}  ${(bytes.byteLength / 1024).toFixed(1)} KB`)
    }

    const family = faces[0].family
    const path = await fetchLicense(id, family)
    licenses.push({ id, family, path })
    console.log(`${id}: ${faces.length} files, licence ${path}`)
  }

  const ts = `// GENERATED by scripts/fetch-fonts.mjs — do not edit by hand.
// Run \`pnpm fonts\` to regenerate.
import type { FontFace } from '../types'

export const FONT_FACES: readonly FontFace[] = ${JSON.stringify(entries, null, 2)}
`
  await writeFile(OUT_TS, ts)

  const index =
    'Fonts bundled with Cybozu Extension Kit\n' +
    '=======================================\n\n' +
    'Each font is redistributed under its own licence, reproduced in full in\n' +
    'this directory. Sources are the families as published on Google Fonts.\n\n' +
    licenses
      .map((l) => `${l.family}\n  licence: ${l.id}.txt  (google/fonts ${l.path})`)
      .join('\n\n') +
    '\n'
  await writeFile(resolve(LICENSE_DIR, 'README.txt'), index)

  console.log(
    `\n${entries.length} files, ${(totalBytes / 1024).toFixed(0)} KB total -> public/fonts/` +
      `\n${licenses.length} licences -> public/fonts/licenses/`,
  )
}

await main()
