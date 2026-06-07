// @vitest-environment jsdom
// WAVE D edge cases: empty section, all-short, paraphrase, and the US-11
// performance budget (<2s for ~300 comments). Robustness regression net.
import { describe, it, expect } from 'vitest'
import { runScan } from '../src/scan'
import { cluster } from '../src/cluster'
import { score } from '../src/score'
import { scrapeComments } from '../src/scraper'
import type { Comment } from '../src/types'

const X = '이 영상 정말 최고예요 꼭 보세요 추천합니다'

function emptyDoc(): Document {
  return new DOMParser().parseFromString(
    '<!DOCTYPE html><html><body><div id="comments"><div id="contents"></div></div></body></html>',
    'text/html',
  )
}

function c(id: string, ch: string, text: string, rel = '2 minutes ago', parentId: string | null = null): Comment {
  return { id, channelId: ch, text, relTime: rel, parentId }
}

describe('WAVE D edge cases', () => {
  it('empty comment section -> 0 comments, 0 flagged, 0 badges, no throw', () => {
    const doc = emptyDoc()
    let summary
    expect(() => {
      summary = runScan(doc as unknown as Document)
    }).not.toThrow()
    expect(summary!.totalComments).toBe(0)
    expect(summary!.flagged).toBe(0)
    expect(summary!.badges).toBe(0)
  })

  it('all-short comments are skipped -> no clusters', () => {
    const cs = Array.from({ length: 8 }, (_, i) => c(`s${i}`, `@s${i}`, 'lol nice'))
    expect(cluster(cs)).toEqual([])
  })

  it('paraphrase / re-spacing still clusters (char-gram)', () => {
    const cs = [
      c('1', '@a', '이 영상 정말 최고예요 꼭 보세요 추천'),
      c('2', '@b', '이영상 정말 최고예요 꼭보세요 추천'),
      c('3', '@cc', '이 영상정말 최고예요 꼭 보세요추천'),
    ]
    expect(cluster(cs).length).toBe(1)
  })

  it('mixed section flags exactly the coordinated cluster, not the rest', () => {
    const cs = [
      ...Array.from({ length: 5 }, (_, i) => c(`x${i}`, `@x${i}`, X)),
      c('u1', '@u1', '저는 이 의견에 동의하지 않습니다 근거가 부족해 보이네요', '1 day ago'),
      c('s1', '@s1', 'lol'),
    ]
    const flagged = cluster(cs).map((cl) => score(cl)).filter((r) => r.flagged)
    expect(flagged.length).toBe(1)
    expect(flagged[0].S).toBe(0.8)
  })

  it('performance: 300 comments cluster()+score() completes well under 2s (US-11)', () => {
    const cs: Comment[] = []
    for (let i = 0; i < 270; i++) cs.push(c(`n${i}`, `@n${i}`, `unique opinion number ${i} about this topic here`))
    for (let i = 0; i < 30; i++) cs.push(c(`d${i}`, `@d${i}`, X)) // a planted 30-author cluster
    const t0 = performance.now()
    const clusters = cluster(cs)
    const results = clusters.map((cl) => score(cl))
    const ms = performance.now() - t0
    expect(ms).toBeLessThan(2000)
    expect(results.some((r) => r.flagged)).toBe(true)
  })

  it('scraper returns [] on a doc with no comment nodes', () => {
    expect(scrapeComments(emptyDoc() as unknown as { querySelectorAll(s: string): ArrayLike<Element> })).toEqual([])
  })
})
