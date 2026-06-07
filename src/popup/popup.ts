// Popup controller. Sends a scan message to the active YouTube tab's content
// script and renders an honest summary of detected clusters.
interface ScanDetail {
  size: number
  S: number
  flagged: boolean
  suppressed: boolean
  label: string
  evidence: string
}
interface ScanSummary {
  totalComments: number
  clusters: number
  flagged: number
  suppressed: number
  badges: number
  details: ScanDetail[]
}

const btn = document.getElementById('scan') as HTMLButtonElement
const out = document.getElementById('out') as HTMLDivElement

function esc(s: string): string {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

function render(summary: ScanSummary): void {
  if (summary.flagged === 0) {
    out.innerHTML =
      `<div class="empty">No coordinated clusters found in visible comments.</div>` +
      `<div class="meta">${summary.totalComments} comments · ${summary.clusters} near-dup clusters · ${summary.suppressed} organic (suppressed)</div>`
    return
  }
  const cards = summary.details
    .filter((d) => d.flagged)
    .map(
      (d) =>
        `<div class="card"><div class="lbl">${esc(d.label)} — ${Math.round(d.S * 100)}%</div>` +
        `<div class="ev">${esc(d.evidence)}</div></div>`,
    )
    .join('')
  out.innerHTML =
    `<div class="hit">${summary.flagged} coordinated cluster(s) red-carded · ${summary.badges} badges</div>` +
    cards +
    `<div class="meta">${summary.totalComments} comments scanned · ${summary.suppressed} organic (suppressed, not flagged)</div>`
}

btn.addEventListener('click', async () => {
  out.textContent = 'Scanning…'
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !/youtube\.com\/watch/u.test(tab.url ?? '')) {
      out.textContent = 'Open a YouTube watch page, then click Scan.'
      return
    }
    const resp = (await chrome.tabs.sendMessage(tab.id, { type: 'coordcard-scan', mode: 'no-api' })) as
      | { ok: true; summary: ScanSummary }
      | { ok: false; error: string }
      | undefined
    if (!resp) {
      out.textContent = 'Could not reach the page. Reload the YouTube tab and retry.'
      return
    }
    if (!resp.ok) {
      out.textContent = 'Scan error: ' + resp.error
      return
    }
    render(resp.summary)
  } catch (e) {
    out.textContent = 'Could not reach the page (reload the tab): ' + String(e)
  }
})
