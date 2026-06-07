// Account-new signal A (§4.1) — API-mode only. Stub for no-API mode.
import type { Cluster } from './types'

/**
 * A = account-new signal. Requires Data API account ages (days since creation).
 * Without a key (no ages), A = 0 — the flag relies on T+B+R.
 *   A = 1.0 if >= 2 cluster accounts created <= 30 days ago;
 *   A = 0.5 if >= 3 created 31-180 days ago; else 0.
 */
export function ageSignal(cluster: Cluster, accountAgeDays?: Map<string, number>): number {
  if (!accountAgeDays || accountAgeDays.size === 0) return 0
  let veryNew = 0
  let recent = 0
  for (const m of cluster.members) {
    const age = accountAgeDays.get(m.channelId)
    if (age === undefined) continue
    if (age <= 30) veryNew++
    else if (age <= 180) recent++
  }
  if (veryNew >= 2) return 1.0
  if (recent >= 3) return 0.5
  return 0
}
