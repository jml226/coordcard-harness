// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scrapeComments } from '../src/scraper'
import { cluster } from '../src/cluster'
import { score } from '../src/score'
import { injectBadges, BADGE_CLASS, type FlaggedCluster } from '../src/inject'
import { HONEST_LABEL } from '../src/labels'

function loadHtml(): string {
  return readFileSync(resolve(__dirname, 'fixtures/comments-snapshot.html'), 'utf8')
}

function buildFlagged(doc: Document): FlaggedCluster[] {
  const comments = scrapeComments(doc)
  const clusters = cluster(comments, { charGram: 4, threshold: 0.7, minTokens: 5 })
  return clusters.map((c) => ({ cluster: c, result: score(c) })).filter((f) => f.result.flagged)
}

describe('injectBadges (V7, §10.A item 5)', () => {
  let doc: Document

  beforeEach(() => {
    doc = new DOMParser().parseFromString(loadHtml(), 'text/html')
  })

  it('inserts a red-card badge on each flagged-cluster comment', () => {
    const flagged = buildFlagged(doc)
    expect(flagged.length).toBe(1) // only cluster X
    const inserted = injectBadges(doc, flagged)
    expect(inserted).toBe(5) // C1..C5
    expect(doc.querySelectorAll(`.${BADGE_CLASS}`).length).toBe(5)
  })

  it('badge text === honest label + percent + evidence', () => {
    injectBadges(doc, buildFlagged(doc))
    const badge = doc.querySelector(`.${BADGE_CLASS}`)!
    expect(badge.textContent).toContain(HONEST_LABEL)
    expect(badge.textContent).toContain('80%')
    expect(badge.textContent).toContain('near-duplicate comments')
  })

  it('is idempotent: re-running does not duplicate badges', () => {
    const flagged = buildFlagged(doc)
    injectBadges(doc, flagged)
    injectBadges(doc, flagged)
    expect(doc.querySelectorAll(`.${BADGE_CLASS}`).length).toBe(5)
  })

  it('does not badge suppressed (M) or sub-threshold (Z) clusters', () => {
    injectBadges(doc, buildFlagged(doc))
    for (const id of ['M1', 'T1', 'C8']) {
      const node = doc.querySelector(`[data-cid="${id}"]`)!
      expect(node.querySelector(`.${BADGE_CLASS}`)).toBeNull()
    }
  })
})
