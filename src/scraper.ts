// Comment scraper: DOM -> Comment[] (§5.1, V2).
// Tag-agnostic by ID/class. Primary path keys on [data-cid] (the §5.1 fixture
// contract). A live-DOM FALLBACK keys on ytd-comment-view-model when no
// [data-cid] is present — real YouTube renderers do NOT expose data-cid
// (verified by the L2 smoke), so the fallback is what makes the extension work
// on live pages. The fallback never triggers on the fixture, so the L1 oracle
// is unaffected.
import type { Comment } from './types'

type Root = { querySelectorAll(sel: string): ArrayLike<Element> }

const TIME_SEL = '.published-time-text, #published-time-text'

/** Derive channelId from an #author-text href: /@handle -> "@handle"; /channel/UC.. -> "UC..". */
export function channelIdFromHref(href: string | null): string {
  if (!href) return ''
  const at = href.match(/\/(@[^/?#]+)/u)
  if (at) return at[1]
  const ch = href.match(/\/channel\/(UC[^/?#]+)/u)
  if (ch) return ch[1]
  return href
}

/** Find the field element whose nearest `unitSel` ancestor is exactly `node`. */
function ownField(node: Element, selector: string, unitSel: string): Element | null {
  const all = Array.from(node.querySelectorAll(selector))
  for (const el of all) {
    if (el.closest(unitSel) === node) return el
  }
  return null
}

/** Read {channelId, text, relTime} for a comment node, scoped to itself. */
function readFields(node: Element, unitSel: string): Pick<Comment, 'channelId' | 'text' | 'relTime'> {
  const authorEl = ownField(node, '#author-text', unitSel)
  const channelId = channelIdFromHref(authorEl?.getAttribute('href') ?? null)
  const contentEl = ownField(node, '#content-text', unitSel)
  const text = (contentEl?.textContent ?? '').trim()
  const timeEl = ownField(node, TIME_SEL, unitSel)
  const relTime = (timeEl?.textContent ?? '').trim()
  return { channelId, text, relTime }
}

/** Primary path: comments identified by the stable data-cid attribute (fixture contract). */
function scrapeByCid(nodes: Element[]): Comment[] {
  const out: Comment[] = []
  for (const node of nodes) {
    const id = node.getAttribute('data-cid') ?? ''
    if (!id) continue
    const ancestor = node.parentElement?.closest('[data-cid]') ?? null
    const parentId = ancestor ? ancestor.getAttribute('data-cid') : null
    out.push({ id, ...readFields(node, '[data-cid]'), parentId })
  }
  return out
}

/** Live-DOM fallback: each ytd-comment-view-model is one comment. */
function scrapeLive(root: Root): Comment[] {
  const units = Array.from(root.querySelectorAll('ytd-comment-view-model'))
  return units.map((node, i) => {
    // A view-model inside a replies renderer is a reply; its parent is the
    // thread's top-level view-model.
    const repliesAncestor = node.parentElement?.closest('ytd-comment-replies-renderer')
    let parentId: string | null = null
    if (repliesAncestor) {
      const thread = repliesAncestor.closest('ytd-comment-thread-renderer')
      const topVm = thread?.querySelector('ytd-comment-view-model') ?? null
      const topIdx = topVm ? units.indexOf(topVm) : -1
      parentId = topIdx >= 0 && topVm !== node ? `live-${topIdx}` : null
    }
    return { id: `live-${i}`, ...readFields(node, 'ytd-comment-view-model'), parentId }
  })
}

/** Scrape all comments from a DOM root into Comment[] (data-cid primary, live fallback). */
export function scrapeComments(root: Root): Comment[] {
  const cidNodes = Array.from(root.querySelectorAll('[data-cid]'))
  if (cidNodes.length > 0) return scrapeByCid(cidNodes)
  return scrapeLive(root)
}
