// Shareable blocklist export/import (§F4, V10).
export interface Blocklist {
  version: number
  channelIds: string[]
}

const VERSION = 1

/** Export channel ids as a stable, deduped, sorted blocklist object. */
export function exportBlocklist(channelIds: Iterable<string>): Blocklist {
  const set = new Set<string>()
  for (const id of channelIds) if (id) set.add(id)
  return { version: VERSION, channelIds: [...set].sort() }
}

/** Import a blocklist, merging with existing ids and de-duplicating. */
export function importBlocklist(incoming: Blocklist, existing: Iterable<string> = []): string[] {
  const set = new Set<string>(existing)
  for (const id of incoming.channelIds ?? []) if (id) set.add(id)
  return [...set].sort()
}
