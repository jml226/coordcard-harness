import { describe, it, expect } from 'vitest'
import { score } from '../src/score'
import { normalize } from '../src/normalize'
import { HONEST_LABEL, SUPPRESSED_LABEL } from '../src/labels'
import type { Cluster, Comment } from '../src/types'

const X = '이 영상 정말 최고예요 꼭 보세요 추천합니다'
const SUB = '구독 하고 가세요 정말 유익한 영상 입니다'
const M = '오빠 정국 사랑해 영원히 응원할게 보라해 아미'

function mk(rows: Array<[string, string, string, string | null]>): Cluster {
  const members: Comment[] = rows.map(([channelId, text, relTime, parentId]) => ({
    id: channelId, channelId, text, relTime, parentId,
  }))
  return { members, repText: normalize(members[0].text) }
}

// Cluster X — 5 top-level identical-text authors, all "2 minutes ago".
const clusterX = mk([
  ['@user8x3k1', X, '2 minutes ago', null],
  ['@k9m2x7q', X, '2 minutes ago', null],
  ['@zz1p4w8', X, '2 minutes ago', null],
  ['@x7q2k9m1', X, '2 minutes ago', null],
  ['@q7w8e9r2', X, '2 minutes ago', null],
])

// Cluster Z — 3 replies, identical text, under 3 DIFFERENT parents, "30 minutes ago".
const clusterZ = mk([
  ['@dup_a4f9q', SUB, '30 minutes ago', 'S1'],
  ['@dup_b7k2w', SUB, '30 minutes ago', 'C1'],
  ['@dup_c1x8z', SUB, '30 minutes ago', 'C8'],
])

// Cluster M — 5 identical chant-text authors, all "4 minutes ago".
const clusterM = mk([
  ['@bts_fan_kr', M, '4 minutes ago', null],
  ['@army4ever', M, '4 minutes ago', null],
  ['@purplelove7', M, '4 minutes ago', null],
  ['@jk_world', M, '4 minutes ago', null],
  ['@borahae_kr', M, '4 minutes ago', null],
])

describe('score() — §5.1 v2 BINDING oracle (no-API)', () => {
  it('Cluster X: S=0.80, FLAGGED (T=1, B=1, R=0)', () => {
    const r = score(clusterX, { mode: 'no-api' })
    expect(r.signals).toEqual({ T: 1, B: 1, R: 0, A: 0 })
    expect(r.S).toBe(0.8)
    expect(r.suppressed).toBe(false)
    expect(r.flagged).toBe(true)
    expect(r.label).toBe(HONEST_LABEL)
    expect(r.evidence).toContain('near-duplicate comments')
  })

  it('Cluster Z: S=0.68, NOT flagged (reply-ring sub-threshold)', () => {
    const r = score(clusterZ, { mode: 'no-api' })
    expect(r.signals.T).toBe(0.6)
    expect(r.signals.B).toBe(0.6)
    expect(r.signals.R).toBe(1.0)
    expect(r.S).toBe(0.68)
    expect(r.flagged).toBe(false)
    expect(r.suppressed).toBe(false)
  })

  it('Cluster M: WOULD score 0.80 but SUPPRESSED -> not flagged', () => {
    const r = score(clusterM, { mode: 'no-api' })
    expect(r.S).toBe(0.8) // would-flag score
    expect(r.suppressed).toBe(true)
    expect(r.flagged).toBe(false)
    expect(r.label).toBe(SUPPRESSED_LABEL)
    expect(r.evidence).toContain('NOT flagged as coordinated')
  })

  it('percent rendering matches round(S*100)', () => {
    expect(Math.round(score(clusterX).S * 100)).toBe(80)
    expect(Math.round(score(clusterZ).S * 100)).toBe(68)
  })

  it('flag predicate needs >=3 distinct authors', () => {
    const small = mk([['@a', X, '2 minutes ago', null], ['@b', X, '2 minutes ago', null]])
    const r = score(small)
    expect(r.size).toBe(2)
    expect(r.flagged).toBe(false)
  })

  it('honest label never contains a forbidden term', () => {
    expect(HONEST_LABEL).toBe('Matches coordinated-posting patterns in this video')
  })
})
