// Capture a real YouTube comment-section DOM snapshot for offline analysis, and
// print selector diagnostics so the scraper's live-DOM fallback can be built
// against the ACTUAL structure (not a guess).
import { writeFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const URL = process.env.L2_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
if (!existsSync(EXEC)) { console.log('NO_CHROMIUM'); process.exit(0) }

const browser = await chromium.launch({ headless: true, executablePath: EXEC })
try {
  const ctx = await browser.newContext({ locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 2500); await page.waitForTimeout(1100) }
  try { await page.waitForSelector('ytd-comment-thread-renderer', { timeout: 25000 }) } catch {}

  const diag = await page.evaluate(() => {
    const thread = document.querySelector('ytd-comment-thread-renderer')
    const pick = (root, sel) => {
      const el = root?.querySelector(sel)
      return el ? { tag: el.tagName.toLowerCase(), href: el.getAttribute('href'), text: (el.textContent || '').trim().slice(0, 40) } : null
    }
    return {
      threads: document.querySelectorAll('ytd-comment-thread-renderer').length,
      viewModels: document.querySelectorAll('ytd-comment-view-model').length,
      repliesRenderers: document.querySelectorAll('ytd-comment-replies-renderer').length,
      sample: thread
        ? {
            author: pick(thread, '#author-text'),
            content: pick(thread, '#content-text'),
            time: pick(thread, '.published-time-text'),
            hasViewModelInside: !!thread.querySelector('ytd-comment-view-model'),
            innerVmAttrs: (() => {
              const vm = thread.querySelector('ytd-comment-view-model')
              return vm ? Array.from(vm.attributes).map((a) => a.name) : null
            })(),
            threadAttrs: Array.from(thread.attributes).map((a) => a.name),
          }
        : null,
    }
  })

  const html = await page.content()
  writeFileSync('.l2tmp/live.html', html)
  console.log('DIAG ' + JSON.stringify(diag, null, 2))
  console.log('SAVED .l2tmp/live.html bytes=' + html.length)
  await browser.close()
  process.exit(0)
} catch (e) {
  try { await browser.close() } catch {}
  console.log('ERR ' + String(e))
  process.exit(0)
}
