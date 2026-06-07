// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scrapeComments } from '../src/scraper'
import { cluster } from '../src/cluster'
import { score } from '../src/score'
import type { Cluster } from '../src/types'

function loadDoc(): Document {
  const html = readFileSync(resolve(__dirname, 'fixtures/comments-snapshot.html'), 'utf8')
  return new DOMParser().parseFromString(html, 'text/html')
}

function ids(c: Cluster): Set<string> {
  return new Set(c.members.map((m) => m.id))
}
function has(c: Cluster, id: string): boolean {
  return ids(c).has(id)
}

describe('L1 full pipeline (§5.1 oracle, §10.A item 4)', () => {
  const comments = scrapeComments(loadDoc())
  const clusters = cluster(comments, { charGram: 4, threshold: 0.7, minTokens: 5 })

  it('scrapes 17 comments', () => {
    expect(comments.length).toBe(17)
  })

  it('forms exactly 3 near-dup clusters (X, Z, M)', () => {
    expect(clusters.length).toBe(3)
  })

  it('drops short comments C6/C7 and singletons C8/S1', () => {
    const allClustered = new Set(clusters.flatMap((c) => c.members.map((m) => m.id)))
    for (const dropped of ['C6', 'C7', 'C8', 'S1']) {
      expect(allClustered.has(dropped)).toBe(false)
    }
  })

  it('Cluster X {C1..C5} -> S=0.80 FLAGGED', () => {
    const X = clusters.find((c) => has(c, 'C1'))!
    expect(ids(X)).toEqual(new Set(['C1', 'C2', 'C3', 'C4', 'C5']))
    const r = score(X)
    expect(r.S).toBe(0.8)
    expect(r.flagged).toBe(true)
  })

  it('Cluster Z {T1,T2,T3} -> S=0.68 NOT flagged (reply-ring)', () => {
    const Z = clusters.find((c) => has(c, 'T1'))!
    expect(ids(Z)).toEqual(new Set(['T1', 'T2', 'T3']))
    const r = score(Z)
    expect(r.S).toBe(0.68)
    expect(r.flagged).toBe(false)
    expect(r.signals.R).toBe(1.0)
  })

  it('Cluster M {M1..M5} -> S=0.80 but SUPPRESSED', () => {
    const M = clusters.find((c) => has(c, 'M1'))!
    expect(M.members.length).toBe(5)
    const r = score(M)
    expect(r.S).toBe(0.8)
    expect(r.suppressed).toBe(true)
    expect(r.flagged).toBe(false)
  })

  it('exactly ONE cluster is flagged across the whole fixture', () => {
    const flaggedCount = clusters.map((c) => score(c)).filter((r) => r.flagged).length
    expect(flaggedCount).toBe(1)
  })
})
