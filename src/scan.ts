// Scan orchestrator: DOM -> scrape -> cluster -> score -> inject badges.
// Shared by the content script (live page) and exercised by the pipeline tests.
import { scrapeComments } from './scraper'
import { cluster } from './cluster'
import { score } from './score'
import { injectBadges, type FlaggedCluster } from './inject'
import type { Mode } from './types'

type Root = Document | Element

export interface ScanDetail {
  size: number
  S: number
  flagged: boolean
  suppressed: boolean
  label: string
  evidence: string
}

export interface ScanSummary {
  totalComments: number
  clusters: number
  flagged: number
  suppressed: number
  badges: number
  details: ScanDetail[]
}

/** Run the full detection pipeline over a DOM root and inject red cards. */
export function runScan(root: Root, mode: Mode = 'no-api'): ScanSummary {
  const queryRoot = root as unknown as { querySelectorAll(s: string): ArrayLike<Element> }
  const comments = scrapeComments(queryRoot)
  const clusters = cluster(comments, { charGram: 4, threshold: 0.7, minTokens: 5 })
  const scored = clusters.map((c) => ({ cluster: c, result: score(c, { mode }) }))
  const flaggedClusters: FlaggedCluster[] = scored.filter((s) => s.result.flagged)
  const badges = injectBadges(root, flaggedClusters)
  return {
    totalComments: comments.length,
    clusters: clusters.length,
    flagged: flaggedClusters.length,
    suppressed: scored.filter((s) => s.result.suppressed).length,
    badges,
    details: scored.map((s) => ({
      size: s.result.size,
      S: s.result.S,
      flagged: s.result.flagged,
      suppressed: s.result.suppressed,
      label: s.result.label,
      evidence: s.result.evidence,
    })),
  }
}
