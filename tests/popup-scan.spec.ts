// Regression for the live "Receiving end does not exist" bug: the popup must
// inject the content script on demand (chrome.scripting) when the tab has no
// listener yet (pre-existing tab or YouTube SPA navigation), then retry.
import { describe, it, expect, vi } from 'vitest'
import { requestScan } from '../src/popup/scan-request'

const OK = { ok: true as const, summary: { totalComments: 5, clusters: 1, flagged: 1, suppressed: 0, badges: 5, details: [] } }

function fakeChrome(opts: { failFirstSend: boolean }) {
  let sendCalls = 0
  const execCalls: unknown[] = []
  return {
    api: {
      runtime: { getManifest: () => ({ content_scripts: [{ js: ['assets/main.ts-ABC.js'] }] }) },
      scripting: {
        executeScript: vi.fn(async (arg: unknown) => {
          execCalls.push(arg)
        }),
      },
      tabs: {
        sendMessage: vi.fn(async () => {
          sendCalls++
          if (opts.failFirstSend && sendCalls === 1) {
            throw new Error('Could not establish connection. Receiving end does not exist.')
          }
          return OK
        }),
      },
    },
    execCalls,
    get sendCalls() {
      return sendCalls
    },
  }
}

describe('requestScan (popup → content script)', () => {
  it('injects the content script and retries when no listener is present', async () => {
    const f = fakeChrome({ failFirstSend: true })
    const res = await requestScan(f.api as never, 123)
    expect(res).toEqual(OK)
    expect(f.api.scripting.executeScript).toHaveBeenCalledTimes(1)
    expect(f.execCalls[0]).toEqual({ target: { tabId: 123 }, files: ['assets/main.ts-ABC.js'] })
    expect(f.sendCalls).toBe(2) // failed, injected, retried
  })

  it('does NOT inject when the content script is already reachable', async () => {
    const f = fakeChrome({ failFirstSend: false })
    const res = await requestScan(f.api as never, 7)
    expect(res).toEqual(OK)
    expect(f.api.scripting.executeScript).not.toHaveBeenCalled()
    expect(f.sendCalls).toBe(1)
  })
})
