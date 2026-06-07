// CoordCard content script. Runs the detection pipeline on demand (popup -> Scan)
// over the live YouTube comment DOM and injects red-card badges (V7).
import { runScan, type ScanSummary } from '../scan'
import { BADGE_CLASS } from '../inject'

declare global {
  interface Window {
    __coordcardReady?: boolean
  }
}

// Guard: the popup may re-inject this script on demand (chrome.scripting) when a
// pre-existing/SPA tab had no listener. Register the listener at most once so
// re-injection never produces duplicate responders.
if (!window.__coordcardReady) {
  window.__coordcardReady = true
  installCoordCard()
}

function installCoordCard(): void {
  console.info('[CoordCard] content script loaded on', location.href)

const STYLE_ID = 'coordcard-style'

/** Inject the red-card stylesheet once. */
function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent =
    `.${BADGE_CLASS}{display:block;margin:6px 0;padding:6px 10px;border-left:4px solid #ff3b3b;` +
    `background:#2a0f12;color:#ffd7d7;font:600 12px/1.4 system-ui,sans-serif;border-radius:6px}`
  document.documentElement.appendChild(style)
}

  chrome.runtime.onMessage.addListener(
    (msg: { type?: string; mode?: 'no-api' | 'api' }, _sender, sendResponse: (r: unknown) => void) => {
      if (msg?.type !== 'coordcard-scan') return undefined
      try {
        ensureStyle()
        const summary: ScanSummary = runScan(document, msg.mode ?? 'no-api')
        sendResponse({ ok: true, summary })
      } catch (e) {
        sendResponse({ ok: false, error: String(e) })
      }
      return true
    },
  )
}
