// L2 real-YouTube headless smoke (§5.2). NON-BLOCKING. Launches the cached
// chromium, scrolls a real watch page, and runs the REAL pipeline over the live
// DOM via jsdom. Records the parsed-comment count honestly. Exit code is always
// 0 (non-blocking) — the outcome string is what matters.
import { readFileSync, existsSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { chromium } from 'playwright-core'
import { scrapeComments, runScan } from '../.l2tmp/pipeline.mjs'

const URL = process.env.L2_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const EXEC = [
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
].find((p) => existsSync(p))

function out(obj) {
  console.log('L2_RESULT ' + JSON.stringify(obj))
}

if (!EXEC) {
  out({ status: 'skipped', reason: 'no cached chromium executable found' })
  process.exit(0)
}

let browser
try {
  browser = await chromium.launch({ headless: true, executablePath: EXEC })
  const ctx = await browser.newContext({
    locale: 'en-US',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })

  // Best-effort consent dismissal (EU/consent interstitials).
  for (const sel of ['button[aria-label*="Accept"]', 'button[aria-label*="동의"]', 'form[action*="consent"] button']) {
    try {
      const b = await page.$(sel)
      if (b) {
        await b.click({ timeout: 2000 })
        await page.waitForTimeout(1500)
        break
      }
    } catch {}
  }

  // Scroll to lazy-load comments.
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 2500)
    await page.waitForTimeout(1200)
  }

  let renderers = 0
  try {
    await page.waitForSelector('ytd-comment-thread-renderer', { timeout: 25000 })
  } catch {}
  renderers = await page.evaluate(() => document.querySelectorAll('ytd-comment-thread-renderer').length)
  const cidCount = await page.evaluate(() => document.querySelectorAll('[data-cid]').length)

  const html = await page.content()
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const comments = scrapeComments(doc)
  let pipelineThrew = false
  let summary = null
  try {
    summary = runScan(doc, 'no-api')
  } catch (e) {
    pipelineThrew = true
    summary = { error: String(e) }
  }

  const nonNull = comments.filter((c) => c.channelId && c.text).length
  const pass = comments.length >= 20 && nonNull === comments.length && !pipelineThrew

  out({
    status: pass ? 'green' : 'attempted-gap',
    url: URL,
    renderersOnPage: renderers,
    dataCidNodes: cidCount,
    parsedComments: comments.length,
    nonNullFields: nonNull,
    pipelineThrew,
    flagged: summary?.flagged ?? null,
    note: pass
      ? 'real-DOM selectors work + pipeline ran without throwing'
      : cidCount === 0 && renderers > 0
        ? 'live YouTube renderers present but expose NO data-cid attribute; the data-cid-keyed scraper needs a structural fallback for live DOM (L1 fixture oracle unaffected). This is the fixture-vs-live gap L2 exists to surface.'
        : 'fewer than 20 comments parsed (page/consent/network variance)',
  })
  await browser.close()
  process.exit(0)
} catch (e) {
  if (browser) try { await browser.close() } catch {}
  out({ status: 'skipped', reason: 'launch/nav error: ' + String(e) })
  process.exit(0)
}
