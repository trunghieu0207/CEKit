import {
  canonicalUrl,
  formatCopyText,
  parseIssuePath,
  titleFromDocumentTitle,
} from '../../shared/github'
import type { IssueRef } from '../../shared/github'
import { detectProduct } from '../../shared/scope'
import type { Settings } from '../../shared/types'

/**
 * Adds a "Copy" button to GitHub pull request and issue pages that puts
 *
 *   PROJ-142: Cache the weekly schedule query
 *   https://github.com/example-org/example-app/pull/248
 *
 * on the clipboard.
 */

const BUTTON_ID = 'cykit-gh-copy'
const STYLE_ID = 'cykit-gh-copy-style'

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
  style.textContent = `#${BUTTON_ID}{
  display:inline-flex;
  align-items:center;
  gap:4px;
  margin-left:8px;
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
#${BUTTON_ID}:hover{background:var(--bgColor-muted, #eef1f4)}
#${BUTTON_ID}[data-copied="true"]{
  border-color:var(--borderColor-success-emphasis, #1a7f37);
  color:var(--fgColor-success, #1a7f37);
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

function buildButton(): HTMLButtonElement {
  const button = document.createElement('button')
  button.id = BUTTON_ID
  button.type = 'button'
  button.textContent = 'Copy'
  button.title = 'Copy title and link (CyKit)'

  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()

    // Re-read on click rather than at insert time: GitHub navigates without a
    // reload, and the title can be edited in place.
    const ref = parseIssuePath(loc.pathname)
    if (!ref) return
    const title = readTitle(ref)
    if (!title) return

    void copy(formatCopyText(title, canonicalUrl(loc.origin, ref))).then((ok) => {
      button.textContent = ok ? 'Copied' : 'Failed'
      button.dataset.copied = String(ok)
      window.setTimeout(() => {
        button.textContent = 'Copy'
        delete button.dataset.copied
      }, CONFIRM_MS)
    })
  })

  return button
}

/** Idempotent: places the button if this is an issue/PR page and it is missing. */
function place(): void {
  const existing = document.getElementById(BUTTON_ID)

  if (!enabled || !parseIssuePath(loc.pathname)) {
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
    existing.remove()
  }

  ensureStyle()
  anchor.appendChild(buildButton())
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
