import { describe, it, expect } from 'vitest'
import { scrapeComments } from '../src/scraper'
import { cluster } from '../src/cluster'
import { score } from '../src/score'

// L2 (§5.2): real-YouTube headless smoke. NON-BLOCKING and non-deterministic.
// Runs only when `playwright` is importable; otherwise SKIPPED-with-log (the
// standalone scripts/l2-smoke.mjs records the attempt outcome in SHIP.md).
let hasPlaywright = false
try {
  await import('playwright')
  hasPlaywright = true
} catch {
  hasPlaywright = false
  // eslint-disable-next-line no-console
  console.log('[L2] playwright not importable in vitest — L2 smoke SKIPPED (see scripts/l2-smoke.mjs + SHIP.md)')
}

const L2_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

describe('L2 real-YouTube smoke (§5.2, non-blocking)', () => {
  it('pipeline runs without throwing on an empty DOM (sanity)', () => {
    expect(() => {
      const comments = scrapeComments({ querySelectorAll: () => [] })
      const clusters = cluster(comments)
      clusters.map((c) => score(c))
    }).not.toThrow()
  })

  it.skipIf(!hasPlaywright)('parses >=20 real comment nodes and the pipeline does not throw', async () => {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(L2_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
      // scroll to lazy-load comments
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, 3000)
        await page.waitForTimeout(1200)
      }
      await page.waitForSelector('ytd-comment-thread-renderer', { timeout: 30000 })
      const html = await page.content()
      const { JSDOM } = await import('jsdom')
      const dom = new JSDOM(html)
      const comments = scrapeComments(dom.window.document as unknown as { querySelectorAll(s: string): ArrayLike<Element> })
      expect(comments.length).toBeGreaterThanOrEqual(20)
      for (const c of comments) {
        expect(c.channelId).toBeTruthy()
        expect(c.text).toBeTruthy()
      }
      expect(() => cluster(comments).map((c) => score(c))).not.toThrow()
    } finally {
      await browser.close()
    }
  }, 120000)
})
