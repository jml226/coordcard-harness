// Burst / temporal-coordination signal B (§4.1, V4).
// Relative time is COARSE ORDERING evidence only; B is bucketed conservatively.
import type { Cluster } from './types'
import { parseRelMinutes } from './time'

/**
 * B = burst signal from same-bucket distinct authors.
 * Group cluster members by coarse-minute bucket; take the largest group's
 * distinct-author count: <3 -> 0; 3-4 -> 0.6; >=5 -> 1.0.
 */
export function burst(cluster: Cluster): number {
  const bucketAuthors = new Map<number, Set<string>>()
  for (const m of cluster.members) {
    const mins = parseRelMinutes(m.relTime)
    if (mins === null) continue
    if (!bucketAuthors.has(mins)) bucketAuthors.set(mins, new Set())
    bucketAuthors.get(mins)!.add(m.channelId)
  }

  let maxAuthors = 0
  for (const authors of bucketAuthors.values()) {
    if (authors.size > maxAuthors) maxAuthors = authors.size
  }

  if (maxAuthors >= 5) return 1.0
  if (maxAuthors >= 3) return 0.6
  return 0
}
