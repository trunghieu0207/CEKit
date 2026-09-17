import {
  canonicalUrl,
  COPY_FORMATS,
  formatCopyText,
  parseIssuePath,
  titleFromDocumentTitle,
} from '../../shared/github'
import type { CopyFormat, IssueRef } from '../../shared/github'
import { detectProduct } from '../../shared/scope'
import type { Settings } from '../../shared/types'

/**
 * Adds a "Copy" button to GitHub pull request and issue pages. Clicking it
 * opens a small menu offering the title and link together, the title alone, or
 * the link alone:
 *
 *   PROJ-142: Cache the weekly schedule query
 *   https://github.com/example-org/example-app/pull/248
 */

/** The wrapper; the button and the menu live inside it. */
const ROOT_ID = 'cykit-gh-copy'
const STYLE_ID = 'cykit-gh-copy-style'
const MENU_CLASS = 'cykit-gh-menu'

/** How long the button shows its confirmation before going back to "Copy". */
const CONFIRM_MS = 1400

/** GitHub renders client-side, so the header can arrive after we first run. */
const DEBOUNCE_MS = 200

/**
 * Where to read the title, best first.
 *
 * Class names on github.com are CSS-module hashed (`PullRequestHeader-module__
 * inlineTitle__czbud`) and change with every deploy, so none of these may rely
 * on them. `data-component` is Primer's own stable contract; `.js-issue-title`
 * is the pre-React markup, still served by older GitHub Enterprise.
 */
const TITLE_SELECTORS = [
  'h1[data-component="PH_Title"]',
  '.js-issue-title',
  'h1 .markdown-title',
]

/** Preferred spot for the button: Primer's page-header action area. */
const ACTIONS_SELECTOR = '[data-component="PH_Actions"]'

/** The parts of `location` this feature reads. */
export interface PageLocation {
  hostname: string
  pathname: string
  origin: string
}

/**
 * Read through one place rather than touching the global in four spots: the
 * click handler needs the same view of the URL the button was placed for, and
 * it makes the feature testable without a real page URL.
 */
let loc: PageLocation = location

let observer: MutationObserver | null = null
let timer: number | undefined
let enabled = false

/** Set while the menu is open; calling it closes the menu and unbinds. */
let closeMenu: (() => void) | null = null

function readTitle(ref: IssueRef): string | null {
  for (const selector of TITLE_SELECTORS) {
    const el = document.querySelector(selector)
    if (!el) continue

    // The heading also holds a visually hidden " - #248", which must not end
    // up in the copied text. Clone so the page itself is left untouched.
    const clone = el.cloneNode(true) as HTMLElement
    for (const hidden of clone.querySelectorAll('.sr-only')) hidden.remove()

    const text = clone.textContent?.replace(/\s+/g, ' ').trim()
    if (text) return text
  }
  return titleFromDocumentTitle(document.title, ref)
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  // Sized to Primer's medium button (32px tall: 5 + 20 + 5 + 2 border), which
  // is what GitHub's own header buttons use, so it does not read as a bolt-on.
  // Colours come from Primer's variables so it follows GitHub's light/dark
  // theme; the fallbacks cover Enterprise builds that predate them.
  style.textContent = `#${ROOT_ID}{
  position:relative;
  display:inline-flex;
  margin-left:8px;
}
#${ROOT_ID} > button{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:5px 16px;
  border:1px solid var(--borderColor-default, #d1d9e0);
  border-radius:6px;
  background:var(--bgColor-default, #f6f8fa);
  color:var(--fgColor-default, #1f2328);
  font:inherit;
  font-size:14px;
  font-weight:500;
  line-height:20px;
  cursor:pointer;
}
#${ROOT_ID} > button:hover{background:var(--bgColor-muted, #eef1f4)}
#${ROOT_ID} > button[data-copied="true"]{
  border-color:var(--borderColor-success-emphasis, #1a7f37);
  color:var(--fgColor-success, #1a7f37);
}
.${MENU_CLASS}{
  position:fixed;
  z-index:2147483000;
  min-width:172px;
  padding:4px;
  border:1px solid var(--borderColor-default, #d1d9e0);
  border-radius:12px;
  background:var(--overlay-bgColor, var(--bgColor-default, #fff));
  box-shadow:var(--shadow-floating-small, 0 8px 24px rgba(31,35,40,.16));
  font:inherit;
  font-size:14px;
}
.${MENU_CLASS} button{
  display:block;
  width:100%;
  padding:6px 10px;
  border:0;
  border-radius:6px;
  background:none;
  color:var(--fgColor-default, #1f2328);
  font:inherit;
  font-size:14px;
  line-height:20px;
  text-align:left;
  white-space:nowrap;
  cursor:pointer;
}
.${MENU_CLASS} button:hover,
.${MENU_CLASS} button:focus-visible{
  background:var(--bgColor-neutral-muted, #eef1f4);
  outline:none;
}`
  ;(document.head ?? document.documentElement).appendChild(style)
}

async function copy(text: string): Promise<boolean> {
  try {
    // Works from a content script because the click is a user gesture.
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers, and pages where the Clipboard API is blocked.
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('aria-hidden', 'true')
    area.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/**
 * Copies in the chosen format, then confirms on the button.
 *
 * The title and URL are read here rather than when the button was built:
 * GitHub navigates without reloading, and the title can be edited in place.
 */
function runCopy(button: HTMLButtonElement, format: CopyFormat): void {
  const ref = parseIssuePath(loc.pathname)
  if (!ref) return
  const title = readTitle(ref)
  if (!title) return

  const text = formatCopyText(title, canonicalUrl(loc.origin, ref), format)
  void copy(text).then((ok) => {
    button.textContent = ok ? 'Copied' : 'Failed'
    button.dataset.copied = String(ok)
    window.setTimeout(() => {
      button.textContent = 'Copy'
      delete button.dataset.copied
    }, CONFIRM_MS)
  })
}

/**
 * Opens the format menu under the button.
 *
 * The menu is `position: fixed` and positioned from the button's rect rather
 * than absolutely inside the wrapper, so an ancestor with `overflow: hidden`
 * in GitHub's header cannot clip it. The trade-off is that it does not follow
 * the page, so scrolling closes it.
 */
function openMenu(root: HTMLElement, button: HTMLButtonElement): void {
  closeMenu?.()

  const menu = document.createElement('div')
  menu.className = MENU_CLASS
  menu.setAttribute('role', 'menu')

  for (const { id, label } of COPY_FORMATS) {
    const item = document.createElement('button')
    item.type = 'button'
    item.textContent = label
    item.setAttribute('role', 'menuitem')
    item.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      close()
      runCopy(button, id)
    })
    menu.appendChild(item)
  }

  root.appendChild(menu)

  const rect = button.getBoundingClientRect()
  menu.style.top = `${rect.bottom + 4}px`
  // Right-aligned with the button, clamped so it cannot hang off the viewport.
  const width = menu.offsetWidth
  menu.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`

  function close(): void {
    menu.remove()
    button.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('scroll', close, true)
    window.removeEventListener('resize', close)
    closeMenu = null
  }

  function onPointerDown(event: Event): void {
    // Clicks on the button itself are left to the button, which toggles.
    if (!root.contains(event.target as Node)) close()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      close()
      button.focus()
    }
  }

  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
  closeMenu = close

  button.setAttribute('aria-expanded', 'true')
  menu.querySelector('button')?.focus()
}

function buildRoot(): HTMLElement {
  const root = document.createElement('span')
  root.id = ROOT_ID

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Copy'
  button.title = 'Copy the title, the link, or both (CyKit)'
  button.setAttribute('aria-haspopup', 'menu')
  button.setAttribute('aria-expanded', 'false')

  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (closeMenu && root.contains(document.querySelector(`.${MENU_CLASS}`))) closeMenu()
    else openMenu(root, button)
  })

  root.appendChild(button)
  return root
}

/** Idempotent: places the button if this is an issue/PR page and it is missing. */
function place(): void {
  const existing = document.getElementById(ROOT_ID)

  if (!enabled || !parseIssuePath(loc.pathname)) {
    closeMenu?.()
    existing?.remove()
    document.getElementById(STYLE_ID)?.remove()
    return
  }

  const anchor =
    document.querySelector(ACTIONS_SELECTOR) ??
    document.querySelector(TITLE_SELECTORS[0]!)?.parentElement
  if (!anchor) return

  if (existing) {
    // Client-side navigation can swap the header out from under the button.
    if (anchor.contains(existing)) return
    closeMenu?.()
    existing.remove()
  }

  ensureStyle()
  anchor.appendChild(buildRoot())
}

function schedule(): void {
  if (timer !== undefined) return
  timer = window.setTimeout(() => {
    timer = undefined
    place()
  }, DEBOUNCE_MS)
}

function startObserver(): void {
  if (observer || !document.body) return
  // GitHub renders and navigates client-side, so there is no load event to hang
  // this on. Watching for the header to appear is the reliable signal.
  observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
}

function stopObserver(): void {
  closeMenu?.()
  observer?.disconnect()
  observer = null
  if (timer !== undefined) window.clearTimeout(timer)
  timer = undefined
}

export function applyGithubCopy(settings: Settings, page: PageLocation = location): void {
  loc = page
  const onGithub = detectProduct(page.hostname, page.pathname) === 'github'
  enabled = settings.github.enabled && onGithub

  if (!document.body) return

  place()
  if (enabled) startObserver()
  else stopObserver()
}
