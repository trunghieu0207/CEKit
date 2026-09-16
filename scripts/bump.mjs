/**
 * Raises the version in public/manifest.json, keeping package.json in step.
 *
 * The store rejects an upload whose version is not larger than the published
 * one, and that is only discovered after building and uploading. Bumping here
 * also renames the zip `pnpm package` produces, so a forgotten bump is visible
 * before the upload rather than after.
 *
 * Run with: pnpm bump [patch|minor|major]   (default: patch)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = resolve(ROOT, 'public/manifest.json')
const PACKAGE = resolve(ROOT, 'package.json')

const kind = process.argv[2] ?? 'patch'
if (!['patch', 'minor', 'major'].includes(kind)) {
  console.error(`Unknown bump "${kind}" — use patch, minor or major.`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const parts = manifest.version.split('.').map(Number)
if (parts.length < 3 || parts.some(Number.isNaN)) {
  console.error(`Cannot parse version "${manifest.version}".`)
  process.exit(1)
}

const [major, minor, patch] = parts
const next =
  kind === 'major'
    ? [major + 1, 0, 0]
    : kind === 'minor'
      ? [major, minor + 1, 0]
      : [major, minor, patch + 1]

const from = manifest.version
const to = next.join('.')
manifest.version = to
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

const pkg = JSON.parse(readFileSync(PACKAGE, 'utf8'))
pkg.version = to
writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2) + '\n')

console.log(`${from} -> ${to}  (manifest.json + package.json)`)
console.log(`next: pnpm package  ->  cekit-${to}.zip`)
