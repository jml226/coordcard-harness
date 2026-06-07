import { describe, it, expect } from 'vitest'
import { burst } from '../src/burst'
import type { Cluster, Comment } from '../src/types'

function m(channelId: string, relTime: string): Comment {
  return { id: channelId, channelId, text: 'x', relTime, parentId: null }
}
function clu(members: Comment[]): Cluster {
  return { members, repText: 'x' }
}

describe('burst signal B (§4.1, V4)', () => {
  it('B=1.0 for >=5 distinct authors in the same bucket', () => {
    const c = clu([m('@1', '2 minutes ago'), m('@2', '2 minutes ago'), m('@3', '2 minutes ago'), m('@4', '2 minutes ago'), m('@5', '2 minutes ago')])
    expect(burst(c)).toBe(1.0)
  })

  it('B=0.6 for 3 distinct authors in the same bucket', () => {
    const c = clu([m('@1', '30 minutes ago'), m('@2', '30 minutes ago'), m('@3', '30 minutes ago')])
    expect(burst(c)).toBe(0.6)
  })

  it('B=0.6 for exactly 4 distinct authors in the same bucket', () => {
    const c = clu([m('@1', '4 minutes ago'), m('@2', '4 minutes ago'), m('@3', '4 minutes ago'), m('@4', '4 minutes ago')])
    expect(burst(c)).toBe(0.6)
  })

  it('B=0 for fewer than 3 in any bucket', () => {
    const c = clu([m('@1', '2 minutes ago'), m('@2', '2 minutes ago')])
    expect(burst(c)).toBe(0)
  })

  it('buckets by coarse minute: scattered times do not aggregate', () => {
    const c = clu([m('@1', '2 minutes ago'), m('@2', '10 minutes ago'), m('@3', '1 hour ago')])
    expect(burst(c)).toBe(0)
  })

  it('takes the largest same-bucket group', () => {
    const c = clu([
      m('@1', '4 minutes ago'), m('@2', '4 minutes ago'), m('@3', '4 minutes ago'),
      m('@4', '1 day ago'),
    ])
    expect(burst(c)).toBe(0.6)
  })

  it('counts DISTINCT authors only (same author repeated does not inflate)', () => {
    const c = clu([m('@1', '2 minutes ago'), m('@1', '2 minutes ago'), m('@1', '2 minutes ago')])
    expect(burst(c)).toBe(0)
  })

  it('cluster X fixture timing -> B=1.0', () => {
    const c = clu(['@user8x3k1', '@k9m2x7q', '@zz1p4w8', '@x7q2k9m1', '@q7w8e9r2'].map((h) => m(h, '2 minutes ago')))
    expect(burst(c)).toBe(1.0)
  })
})
