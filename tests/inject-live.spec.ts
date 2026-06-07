// @vitest-environment jsdom
// WAVE D regression: badges must render on LIVE-form DOM (ytd-comment-view-model
// with NO data-cid), not only on the data-cid fixture. The original injectBadges
// looked up nodes by [data-cid="<id>"], which never matches live ids (live-N),
// so detection worked but ZERO badges appeared on real YouTube.
import { describe, it, expect } from 'vitest'
import { runScan } from '../src/scan'
import { injectBadges, BADGE_CLASS, type FlaggedCluster } from '../src/inject'
import { scrapeComments } from '../src/scraper'
import { cluster } from '../src/cluster'
import { score } from '../src/score'
import { HONEST_LABEL } from '../src/labels'

const X = '이 영상 정말 최고예요 꼭 보세요 추천합니다'

// Build a live-form comment section: NO data-cid anywhere.
function liveDom(): Document {
  const authors = ['@a1', '@a2', '@a3', '@a4', '@a5']
  const rows = authors
    .map(
      (a) => `
    <ytd-comment-thread-renderer>
      <ytd-comment-view-model>
        <a id="author-text" class="yt-simple-endpoint" href="/${a}"><span>${a}</span></a>
        <yt-attributed-string id="content-text">${X}</yt-attributed-string>
        <span id="published-time-text">2 minutes ago</span>
      </ytd-comment-view-model>
    </ytd-comment-thread-renderer>`,
    )
    .join('')
  const html = `<!DOCTYPE html><html><body><div id="comments"><div id="contents">${rows}</div></div></body></html>`
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('WAVE D — injectBadges on live-form DOM (no data-cid)', () => {
  it('scrapes live comments with live-N ids and no data-cid', () => {
    const doc = liveDom()
    expect(doc.querySelectorAll('[data-cid]').length).toBe(0)
    const comments = scrapeComments(doc as unknown as { querySelectorAll(s: string): ArrayLike<Element> })
    expect(comments.length).toBe(5)
    expect(comments[0].id).toBe('live-0')
    expect(comments[0].channelId).toBe('@a1')
  })

  it('detects the flagged cluster on live DOM (S=0.80)', () => {
    const doc = liveDom()
    const comments = scrapeComments(doc as unknown as { querySelectorAll(s: string): ArrayLike<Element> })
    const clusters = cluster(comments)
    expect(clusters.length).toBe(1)
    const r = score(clusters[0])
    expect(r.S).toBe(0.8)
    expect(r.flagged).toBe(true)
  })

  it('RENDERS red badges on live DOM (this is the bug: must be > 0)', () => {
    const doc = liveDom()
    const summary = runScan(doc as unknown as Document)
    expect(summary.flagged).toBe(1)
    expect(summary.badges).toBeGreaterThan(0)
    const badges = doc.querySelectorAll(`.${BADGE_CLASS}`)
    expect(badges.length).toBe(5)
    expect(badges[0].textContent).toContain(HONEST_LABEL)
    expect(badges[0].textContent).toContain('80%')
  })

  it('injectBadges is idempotent on live DOM', () => {
    const doc = liveDom()
    const comments = scrapeComments(doc as unknown as { querySelectorAll(s: string): ArrayLike<Element> })
    const clusters = cluster(comments)
    const flagged: FlaggedCluster[] = clusters.map((c) => ({ cluster: c, result: score(c) })).filter((f) => f.result.flagged)
    injectBadges(doc, flagged)
    injectBadges(doc, flagged)
    expect(doc.querySelectorAll(`.${BADGE_CLASS}`).length).toBe(5)
  })
})
