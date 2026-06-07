// Reply-ring / amplification signal R (§4.1, V5) — replaces handle-randomness.
// Computed from the comment parentId tree; coordination-shaped and cheap.
import type { Cluster, Comment } from './types'

/**
 * R = reply-ring signal.
 * Consider cluster members that are replies (parentId != null):
 *   R1 cross-thread spread: replies under >= 2 DIFFERENT top-level comments.
 *   R2 seed amplification:  >= 3 distinct authors replying under ONE seed.
 * R = 1.0 if (R1 or R2) with >= 3 distinct reply authors;
 * R = 0.5 if exactly 2 distinct reply authors show the pattern; else 0.
 *
 * allComments is accepted for API symmetry / future thread-walk needs.
 */
export function replyring(cluster: Cluster, _allComments: Comment[] = []): number {
  const replies = cluster.members.filter((m) => m.parentId !== null)
  const replyAuthors = new Set(replies.map((r) => r.channelId))
  if (replyAuthors.size === 0) return 0

  const parents = new Set(replies.map((r) => r.parentId as string))

  // R2: any single parent with >= 3 distinct reply authors.
  const byParent = new Map<string, Set<string>>()
  for (const r of replies) {
    const p = r.parentId as string
    if (!byParent.has(p)) byParent.set(p, new Set())
    byParent.get(p)!.add(r.channelId)
  }
  const r2 = [...byParent.values()].some((a) => a.size >= 3)
  const r1 = parents.size >= 2

  if ((r1 || r2) && replyAuthors.size >= 3) return 1.0
  if (replyAuthors.size === 2) return 0.5
  return 0
}
