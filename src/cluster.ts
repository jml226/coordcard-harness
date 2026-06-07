// Near-duplicate clustering via union-find over char-4gram Jaccard edges (§4.1, V3).
import type { Comment, Cluster } from './types'
import { charGrams, jaccard } from './charngram'
import { normalize, tokenCount } from './normalize'

export interface ClusterOpts {
  charGram?: number
  threshold?: number
  minTokens?: number
}

class UnionFind {
  private parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }
  union(a: number, b: number): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[ra] = rb
  }
}

/**
 * Cluster comments by char-4gram Jaccard near-duplication (§4.1).
 * - Skips comments with < minTokens normalized tokens (short = noise).
 * - Pairwise edge if sim >= threshold; union-find groups them.
 * - Returns only groups with >= 2 distinct authors (singletons excluded).
 */
export function cluster(comments: Comment[], opts: ClusterOpts = {}): Cluster[] {
  const n = opts.charGram ?? 4
  const threshold = opts.threshold ?? 0.7
  const minTokens = opts.minTokens ?? 5

  const eligible = comments.filter((c) => tokenCount(c.text) >= minTokens)
  const grams = eligible.map((c) => charGrams(c.text, n))
  const uf = new UnionFind(eligible.length)

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      if (jaccard(grams[i], grams[j]) >= threshold) uf.union(i, j)
    }
  }

  const groups = new Map<number, Comment[]>()
  for (let i = 0; i < eligible.length; i++) {
    const root = uf.find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(eligible[i])
  }

  const clusters: Cluster[] = []
  for (const members of groups.values()) {
    const distinctAuthors = new Set(members.map((m) => m.channelId))
    if (distinctAuthors.size < 2) continue // singletons are never clusters
    clusters.push({ members, repText: normalize(members[0].text) })
  }
  return clusters
}
