import type { Scope } from './types'

/**
 * Which site a page belongs to.
 *
 * Cybozu serves several products from one host, told apart by the first path
 * segment:
 *   https://example.cybozu.com/k/123/                -> kintone
 *   https://example.cybozu.com/g/schedule/index.csp  -> garoon
 *   https://example.cybozu.com/portal/               -> other
 *
 * GitHub is a separate site entirely and is never part of a Cybozu scope.
 */
export type Product = keyof Scope | 'github'

export function detectProduct(hostname: string, pathname: string): Product {
  if (hostname === 'github.com' || hostname.endsWith('.github.com')) return 'github'
  if (pathname === '/k' || pathname.startsWith('/k/')) return 'kintone'
  if (pathname === '/g' || pathname.startsWith('/g/')) return 'garoon'
  return 'other'
}

/**
 * True when this page's Cybozu product is switched on for the given scope.
 *
 * GitHub is deliberately excluded rather than defaulted: the content script now
 * runs there too, and a Cybozu feature such as the font override must never
 * follow it onto github.com.
 */
export function isInScope(scope: Scope, hostname: string, pathname: string): boolean {
  const product = detectProduct(hostname, pathname)
  return product === 'github' ? false : scope[product]
}

/** Checkboxes, in display order. */
export const SCOPE_OPTIONS: readonly { key: keyof Scope; label: string; hint: string }[] = [
  { key: 'kintone', label: 'kintone', hint: '/k/ paths' },
  { key: 'garoon', label: 'Garoon', hint: '/g/ paths' },
  { key: 'other', label: 'Other pages', hint: 'Portal, login, admin' },
]
