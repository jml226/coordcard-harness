import { describe, it, expect } from 'vitest'
import { replyring } from '../src/replyring'
import { suppressor } from '../src/suppressor'
import { ageSignal } from '../src/age'
import { CHANT_LEXICON } from '../src/suppressor/chant-lexicon'
import { normalize } from '../src/normalize'
import type { Cluster, Comment } from '../src/types'

function m(channelId: string, text: string, parentId: string | null): Comment {
  return { id: channelId, channelId, text, relTime: '30 minutes ago', parentId }
}
function clu(members: Comment[]): Cluster {
  return { members, repText: normalize(members[0].text) }
}

const SUB = '구독 하고 가세요 정말 유익한 영상 입니다'
const X = '이 영상 정말 최고예요 꼭 보세요 추천합니다'
const M = '오빠 정국 사랑해 영원히 응원할게 보라해 아미'

describe('replyring R (§4.1, V5)', () => {
  it('R=1.0 for R1 cross-thread spread (>=3 authors, >=2 parents)', () => {
    const c = clu([m('@a', SUB, 'S1'), m('@b', SUB, 'C1'), m('@c', SUB, 'C8')])
    expect(replyring(c)).toBe(1.0)
  })

  it('R=1.0 for R2 seed amplification (>=3 authors under ONE parent)', () => {
    const c = clu([m('@a', SUB, 'S1'), m('@b', SUB, 'S1'), m('@c', SUB, 'S1')])
    expect(replyring(c)).toBe(1.0)
  })

  it('R=0.5 for exactly 2 distinct reply authors', () => {
    const c = clu([m('@a', SUB, 'S1'), m('@b', SUB, 'C1')])
    expect(replyring(c)).toBe(0.5)
  })

  it('R=0 when all members are top-level (no replies)', () => {
    const c = clu([m('@a', X, null), m('@b', X, null), m('@c', X, null)])
    expect(replyring(c)).toBe(0)
  })
})

describe('suppressor SUPP (§4.1, V5)', () => {
  it('fires on fandom-chant lexicon (>=2 tokens) — fixture M cluster', () => {
    expect(suppressor(clu([m('@1', M, null), m('@2', M, null)]))).toBe(true)
  })

  it('does NOT fire on the cluster-X coordinated text', () => {
    expect(suppressor(clu([m('@1', X, null), m('@2', X, null)]))).toBe(false)
  })

  it('does NOT fire on the reply-ring Z text', () => {
    expect(suppressor(clu([m('@1', SUB, 'S1'), m('@2', SUB, 'C1')]))).toBe(false)
  })

  it('fires on RIP / condolence', () => {
    expect(suppressor(clu([m('@1', 'RIP legend rest in peace', null), m('@2', 'RIP legend rest in peace', null)]))).toBe(true)
  })

  it('fires on laughter floods', () => {
    expect(suppressor(clu([m('@1', 'ㅋㅋㅋㅋㅋ', null), m('@2', 'ㅋㅋㅋㅋㅋ', null)]))).toBe(true)
  })

  it('fires on high emoji density (>=0.30)', () => {
    expect(suppressor(clu([m('@1', '🔥🔥🔥 best', null), m('@2', '🔥🔥🔥 best', null)]))).toBe(true)
  })

  it('CHANT_LEXICON has >= 90 tokens and contains the M-cluster words', () => {
    expect(CHANT_LEXICON.length).toBeGreaterThanOrEqual(90)
    for (const w of ['오빠', '정국', '사랑해', '영원히', '응원할게', '보라해', '아미']) {
      expect(CHANT_LEXICON).toContain(w)
    }
  })
})

describe('ageSignal A (§4.1, API-only stub)', () => {
  it('A=0 with no account ages (no-API mode)', () => {
    expect(ageSignal(clu([m('@1', X, null)]))).toBe(0)
  })

  it('A=1.0 when >=2 accounts are <=30 days old', () => {
    const c = clu([m('@1', X, null), m('@2', X, null)])
    const ages = new Map([['@1', 5], ['@2', 12]])
    expect(ageSignal(c, ages)).toBe(1.0)
  })

  it('A=0.5 when >=3 accounts are 31-180 days old', () => {
    const c = clu([m('@1', X, null), m('@2', X, null), m('@3', X, null)])
    const ages = new Map([['@1', 60], ['@2', 90], ['@3', 120]])
    expect(ageSignal(c, ages)).toBe(0.5)
  })
})
