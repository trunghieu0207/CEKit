/**
 * Zips dist/ into an archive ready for the Chrome Web Store, then checks the
 * archive for the mistakes that get an upload rejected.
 *
 * Run with: pnpm package
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')

/** The store rejects packages over 2 GB, but anything near this is a mistake. */
const WARN_MB = 20

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

if (!existsSync(resolve(DIST, 'manifest.json'))) {
  fail('dist/manifest.json is missing — run `pnpm build` first.')
}

const manifest = JSON.parse(readFileSync(resolve(DIST, 'manifest.json'), 'utf8'))
const zipPath = resolve(ROOT, `cekit-${manifest.version}.zip`)

rmSync(zipPath, { force: true })

// Zip the *contents* of dist, not the directory itself: Chrome looks for
// manifest.json at the archive root and rejects the package if it is nested.
execFileSync(
  'zip',
  ['-r', '-X', '-q', zipPath, '.', '-x', '.DS_Store', '*/.DS_Store', '__MACOSX/*'],
  { cwd: DIST },
)

const listing = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8' })
const entries = listing
  .split('\n')
  .slice(3, -3)
  .map((line) => line.trim().split(/\s+/).slice(3).join(' '))
  .filter(Boolean)
  .map((name) => name.replace(/^\.\//, ''))

const problems = []
if (!entries.includes('manifest.json')) {
  problems.push('manifest.json is not at the archive root')
}
const maps = entries.filter((e) => e.endsWith('.map'))
if (maps.length) problems.push(`source maps included: ${maps.join(', ')}`)
const junk = entries.filter((e) => e.includes('node_modules/') || e.includes('.DS_Store'))
if (junk.length) problems.push(`junk included: ${junk.slice(0, 3).join(', ')}`)
if (!entries.some((e) => e.startsWith('fonts/licenses/'))) {
  problems.push('font licences are missing — the OFL requires them to ship')
}
if (problems.length) {
  rmSync(zipPath, { force: true })
  fail(`Package rejected before upload:\n  - ${problems.join('\n  - ')}`)
}

const mb = statSync(zipPath).size / 1024 / 1024
console.log(`${manifest.name} ${manifest.version}`)
console.log(`  ${zipPath.replace(ROOT + '/', '')}`)
console.log(`  ${entries.length} files, ${mb.toFixed(2)} MB`)
console.log(`  manifest.json at root ✓   no source maps ✓   licences included ✓`)
if (mb > WARN_MB) console.log(`  note: ${mb.toFixed(1)} MB is large for an extension`)
