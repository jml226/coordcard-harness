// Comment scraper: DOM -> Comment[] (§5.1, V2).
// Tag-agnostic: selects by ID/class only (robust to YouTube DOM churn).
import type { Comment } from './types'

/** A minimal DOM root that supports querySelectorAll (Document or Element). */
type Root = { querySelectorAll(sel: string): ArrayLike<Element> }

const COMMENT_SEL = '[data-cid]'

/** Derive channelId from an #author-text href: /@handle -> "@handle"; /channel/UC.. -> "UC..". */
export function channelIdFromHref(href: string | null): string {
  if (!href) return ''
  const at = href.match(/\/(@[^/?#]+)/u)
  if (at) return at[1]
  const ch = href.match(/\/channel\/(UC[^/?#]+)/u)
  if (ch) return ch[1]
  return href
}

/** Find the field element whose nearest [data-cid] ancestor is exactly `node`. */
function ownField(node: Element, selector: string): Element | null {
  const all = Array.from(node.querySelectorAll(selector))
  for (const el of all) {
    if (el.closest(COMMENT_SEL) === node) return el
  }
  return null
}

/** Scrape all comments (top-level + replies) from a DOM root into Comment[]. */
export function scrapeComments(root: Root): Comment[] {
  const nodes = Array.from(root.querySelectorAll(COMMENT_SEL))
  const out: Comment[] = []
  for (const node of nodes) {
    const id = node.getAttribute('data-cid') ?? ''
    if (!id) continue

    const authorEl = ownField(node, '#author-text')
    const channelId = channelIdFromHref(authorEl?.getAttribute('href') ?? null)

    const contentEl = ownField(node, '#content-text')
    const text = (contentEl?.textContent ?? '').trim()

    const timeEl = ownField(node, '.published-time-text')
    const relTime = (timeEl?.textContent ?? '').trim()

    // parentId = nearest ANCESTOR thread's data-cid (exclude self), null if top-level.
    const ancestor = node.parentElement?.closest(COMMENT_SEL) ?? null
    const parentId = ancestor ? ancestor.getAttribute('data-cid') : null

    out.push({ id, channelId, text, relTime, parentId })
  }
  return out
}
