# CLAUDE.md

## Project

**CyKit Extension** (CyKit) — a Manifest V3 Chrome extension with quality-of-life tweaks for
kintone. See README.md for architecture and how to add a feature.

Two Vite builds, because MV3 content scripts cannot be ES modules:
`pnpm build:pages` (popup, owns `emptyOutDir`) then `pnpm build:content`
(single IIFE). Always run them in that order — `pnpm build` does.

Load the extension from `dist/`, not the repo root.

`public/fonts/` and `public/icons/` are generated (`pnpm fonts`, `pnpm icons`);
`src/shared/generated/` is generated too. Never edit those by hand.

Content-script features must be **idempotent** and must **undo themselves when
disabled** — they run at `document_start`, again on every settings change, again
on `load`, and with everything switched off on out-of-scope pages.

One Cybozu host serves kintone (`/k/…`), Garoon (`/g/…`) and the portal, so
product detection is by path in `src/shared/scope.ts`, not by manifest glob.
Keep the globs broad and gate at apply time. Scope is **per feature**
(`font.scope`), and its checkboxes belong in that feature's own panel.

The content script also runs on **github.com**. `detectProduct` is host-aware
and returns `github`; `isInScope` rejects it, so Cybozu features never follow
the script onto GitHub. github.com markup is React with hashed CSS-module class
names — match on `data-component` / `data-testid`, never on a class. The rule
runs both ways: any element the extension injects needs a `cykit-`-namespaced
class and a defensive reset, or the host page's own CSS styles it.

## Package manager: pnpm (required)

This project uses **pnpm exclusively**. Never use `npm` or `yarn`.

### Rules

- **Never** run `npm install`, `npm i`, `npm ci`, `yarn`, `yarn add`, or `bun install`.
- Only `pnpm-lock.yaml` is committed. If `package-lock.json` or `yarn.lock` appears, delete it.
- Never hand-edit `pnpm-lock.yaml` — always let pnpm regenerate it.
- Don't install packages globally for this project; use `pnpm dlx` for one-off tools.
- When suggesting commands in answers, docs, or scripts, always write the pnpm form.

### Command reference

| Task | Command |
| --- | --- |
| Install all dependencies | `pnpm install` |
| Install exactly per lockfile (CI) | `pnpm install --frozen-lockfile` |
| Add a dependency | `pnpm add <pkg>` |
| Add a devDependency | `pnpm add -D <pkg>` |
| Add a peerDependency | `pnpm add --save-peer <pkg>` |
| Remove a package | `pnpm remove <pkg>` |
| Update a package | `pnpm update <pkg>` (interactive: `pnpm update -i -L`) |
| Run a script | `pnpm <script>` (e.g. `pnpm dev`, `pnpm build`) |
| Run a local binary | `pnpm exec <bin>` |
| Run a one-off tool (instead of `npx`) | `pnpm dlx <pkg>` |
| Check outdated versions | `pnpm outdated` |

### Monorepo / workspace

- Install into a specific package: `pnpm --filter <package-name> add <pkg>`
- Install at the workspace root: `pnpm add -w <pkg>` (shared tooling only: eslint, prettier, typescript, …)
- Run a script in one package: `pnpm --filter <package-name> <script>`
- Run across all packages: `pnpm -r <script>`

### Version pinning

- Runtime dependencies: keep pnpm's default range (`^`) unless there's a clear reason to pin.
- Build-affecting tooling (typescript, eslint, bundler): pin exact versions (`pnpm add -E <pkg>`) so local and CI stay in sync.

### Troubleshooting install failures

Work through these in order; don't skip steps:

1. Re-run `pnpm install` once.
2. `pnpm store prune`, then `pnpm install`.
3. Delete `node_modules` (`rm -rf node_modules`), then `pnpm install`.
4. **Only as a last resort**, delete `pnpm-lock.yaml` — and tell the user first, since this can bump many packages at once.

### Environment

- Enable pnpm via Corepack: `corepack enable`.
- The pnpm version is declared in the `packageManager` field of `package.json`; don't install pnpm with `npm i -g pnpm`.
