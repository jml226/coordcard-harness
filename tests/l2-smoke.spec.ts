import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { scrapeComments } from '../src/scraper'
import { cluster } from '../src/cluster'
import { score } from '../src/score'

// If a captured real-YouTube DOM snapshot exists (written by scripts/l2-capture.mjs),
// assert the live-DOM fallback parses it deterministically — no browser needed.
// Skipped on fresh checkouts where the (gitignored) snapshot is absent.
const SNAPSHOT = resolve(__dirname, '../.l2tmp/live.html')
const hasSnapshot = existsSync(SNAPSHOT)

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
  it.skipIf(!hasSnapshot)('live-DOM fallback parses >=20 real comments from the captured snapshot', () => {
    const dom = new JSDOM(readFileSync(SNAPSHOT, 'utf8'))
    const comments = scrapeComments(
      dom.window.document as unknown as { querySelectorAll(s: string): ArrayLike<Element> },
    )
    expect(comments.length).toBeGreaterThanOrEqual(20)
    expect(comments.every((c) => c.channelId && c.text)).toBe(true)
    expect(() => cluster(comments).map((c) => score(c))).not.toThrow()
  })

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
