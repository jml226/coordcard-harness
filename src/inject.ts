// Red-card DOM injector (§4.4 / V7). Inserts an evidence badge onto each
// comment node belonging to a FLAGGED cluster. Idempotent on re-run.
import type { Cluster, ScoreResult } from './types'
import { scrapeEntries } from './scraper'

export interface FlaggedCluster {
  cluster: Cluster
  result: ScoreResult
}

export const BADGE_CLASS = 'coordcard-badge'

type DocLike = {
  querySelector(sel: string): Element | null
  createElement(tag: string): Element
}

/** Resolve the owning document from a root node. */
function ownerDoc(root: Element | Document): DocLike {
  const anyRoot = root as unknown as { ownerDocument?: DocLike } & DocLike
  return anyRoot.ownerDocument ?? anyRoot
}

/**
 * Insert a red-card badge into each comment node of every flagged cluster.
 * Badge text = honest label + percent + evidence. Idempotent: re-running does
 * not duplicate badges (keyed by data-cid).
 * Returns the number of badge nodes present after injection.
 */
export function injectBadges(root: Element | Document, flagged: FlaggedCluster[]): number {
  const doc = ownerDoc(root)
  // Resolve each comment id to its source node using the SAME scrape pass that
  // assigned the ids — works for both the data-cid fixture and live (live-N) DOM.
  const nodeById = new Map<string, Element>()
  for (const { comment, node } of scrapeEntries(root as unknown as { querySelectorAll(s: string): ArrayLike<Element> })) {
    nodeById.set(comment.id, node)
  }

  let count = 0
  for (const { cluster, result } of flagged) {
    if (!result.flagged) continue
    const percent = Math.round(result.S * 100)
    for (const member of cluster.members) {
      const node = nodeById.get(member.id)
      if (!node) continue
      const existing = node.querySelector(`.${BADGE_CLASS}`)
      if (existing) {
        count++
        continue
      }
      const badge = doc.createElement('div')
      badge.className = BADGE_CLASS
      ;(badge as Element).setAttribute('data-coordcard', '1')
      badge.textContent = `${result.label} — ${percent}% · ${result.evidence}`
      node.insertBefore(badge, node.firstChild)
      count++
    }
  }
  return count
}
