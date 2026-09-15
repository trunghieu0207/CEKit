/**
 * Pure helpers for the GitHub copy feature. No DOM access, so they can be
 * tested on their own; the DOM side lives in content/features/github-copy.ts.
 */

export interface IssueRef {
  owner: string
  repo: string
  /** `pull` or `issues`, as it appears in the path. */
  kind: 'pull' | 'issues'
  number: string
}

/**
 * Recognises a pull request or issue page and normalises it.
 *
 * Sub-tabs, query strings and anchors are dropped, so `/pull/248/files` and
 * `/pull/248#issuecomment-1` both yield the same canonical reference.
 * A list page such as `/owner/repo/issues` has no number and is not a match.
 */
export function parseIssuePath(pathname: string): IssueRef | null {
  const m = /^\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)(?:\/|$)/.exec(pathname)
  if (!m) return null
  const [, owner, repo, kind, number] = m
  return { owner: owner!, repo: repo!, kind: kind as IssueRef['kind'], number: number! }
}

/** The canonical page URL, free of sub-tab, query and hash. */
export function canonicalUrl(origin: string, ref: IssueRef): string {
  return `${origin}/${ref.owner}/${ref.repo}/${ref.kind}/${ref.number}`
}

/** The text placed on the clipboard: title on the first line, link on the second. */
export function formatCopyText(title: string, url: string): string {
  return `${title}\n${url}`
}

/**
 * Last-resort title source, used when the heading cannot be found in the DOM.
 * GitHub's `document.title` looks like:
 *
 *   "PROJ-142: Cache the weekly schedule query by a-teammate · Pull Request #248 · owner/repo · GitHub"
 *   "Some bug · Issue #42 · owner/repo · GitHub"
 *
 * The suffix is anchored on the issue number, so it can be stripped without
 * guessing where the title ends. The trailing " by <author>" only exists on
 * pull requests.
 */
export function titleFromDocumentTitle(docTitle: string, ref: IssueRef): string | null {
  const marker = ` · ${ref.kind === 'pull' ? 'Pull Request' : 'Issue'} #${ref.number} · `
  const cut = docTitle.indexOf(marker)
  if (cut === -1) return null

  let title = docTitle.slice(0, cut)
  if (ref.kind === 'pull') title = title.replace(/ by [^ ]+$/, '')
  return title.trim() || null
}
