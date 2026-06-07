// Robustly request a scan from the active tab's content script.
//
// Declarative content_scripts only inject on a fresh document load matching the
// pattern. If the YouTube tab was open BEFORE the extension loaded, or the user
// reached /watch via YouTube's SPA navigation (History API, no document load),
// the content-script listener is absent and chrome.tabs.sendMessage rejects with
// "Could not establish connection. Receiving end does not exist."
//
// Fix: on that failure, inject the content script on demand via chrome.scripting
// (the `scripting` permission + activeTab cover this), then retry once. The
// content script guards its own init so re-injection never double-registers.
import type { Mode } from '../types'
import type { ScanSummary } from '../scan'

export type ScanResponse = { ok: true; summary: ScanSummary } | { ok: false; error: string }

interface ScanChrome {
  runtime: { getManifest(): { content_scripts?: Array<{ js?: string[] }> } }
  scripting: { executeScript(opts: { target: { tabId: number }; files: string[] }): Promise<unknown> }
  tabs: { sendMessage(tabId: number, msg: unknown): Promise<ScanResponse> }
}

export async function requestScan(api: ScanChrome, tabId: number, mode: Mode = 'no-api'): Promise<ScanResponse> {
  const msg = { type: 'coordcard-scan', mode }
  try {
    return await api.tabs.sendMessage(tabId, msg)
  } catch (firstErr) {
    // No listener yet — inject the content script, then retry once.
    const file = api.runtime.getManifest().content_scripts?.[0]?.js?.[0]
    if (!file) throw firstErr
    await api.scripting.executeScript({ target: { tabId }, files: [file] })
    return await api.tabs.sendMessage(tabId, msg)
  }
}
