import { describe, it, expect } from 'vitest'
import { cluster } from '../src/cluster'
import type { Comment } from '../src/types'

function c(id: string, channelId: string, text: string, relTime = '2 minutes ago', parentId: string | null = null): Comment {
  return { id, channelId, text, relTime, parentId }
}

const X = '이 영상 정말 최고예요 꼭 보세요 추천합니다'
const M = '오빠 정국 사랑해 영원히 응원할게 보라해 아미'

describe('cluster (§4.1 char-4gram union-find, V3)', () => {
  it('groups identical-text distinct authors into one cluster', () => {
    const cs = [c('1', '@a', X), c('2', '@b', X), c('3', '@cc', X)]
    const out = cluster(cs)
    expect(out.length).toBe(1)
    expect(out[0].members.length).toBe(3)
  })

  it('keeps distinct campaigns in separate clusters', () => {
    const cs = [c('1', '@a', X), c('2', '@b', X), c('3', '@cc', M), c('4', '@d', M)]
    const out = cluster(cs)
    expect(out.length).toBe(2)
  })

  it('skips comments below minTokens (short = noise)', () => {
    const cs = [c('1', '@a', 'good video'), c('2', '@b', 'good video')]
    expect(cluster(cs)).toEqual([])
  })

  it('excludes singletons (no near-dup partner)', () => {
    const cs = [c('1', '@a', X), c('2', '@b', '저는 이 의견에 동의하지 않습니다 근거가 부족해')]
    expect(cluster(cs)).toEqual([])
  })

  it('catches paraphrase/re-spacing via char-grams', () => {
    const cs = [c('1', '@a', '이 영상 정말 최고예요 꼭 보세요'), c('2', '@b', '이영상 정말 최고예요 꼭 보세요')]
    expect(cluster(cs).length).toBe(1)
  })

  it('strips URLs/emoji before comparison so they still cluster', () => {
    const cs = [
      c('1', '@a', '이 영상 정말 최고예요 꼭 보세요 추천합니다 😂'),
      c('2', '@b', '이 영상 정말 최고예요 꼭 보세요 추천합니다 https://x.io'),
    ]
    expect(cluster(cs).length).toBe(1)
  })

  it('does not merge two comments from the SAME author into a multi-author cluster', () => {
    const cs = [c('1', '@a', X), c('2', '@a', X)]
    // same author repeated -> < 2 distinct authors -> not a cluster
    expect(cluster(cs)).toEqual([])
  })
})
