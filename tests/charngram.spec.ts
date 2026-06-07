import { describe, it, expect } from 'vitest'
import { charGrams, jaccard, textSim } from '../src/charngram'

describe('charngram (§4.1)', () => {
  it('builds char-4grams of normalized text', () => {
    const g = charGrams('abcde', 4)
    expect(g.has('abcd')).toBe(true)
    expect(g.has('bcde')).toBe(true)
    expect(g.size).toBe(2)
  })

  it('jaccard of identical sets is 1', () => {
    const a = charGrams('이 영상 정말 최고예요 꼭 보세요 추천합니다')
    const b = charGrams('이 영상 정말 최고예요 꼭 보세요 추천합니다')
    expect(jaccard(a, b)).toBe(1)
  })

  it('identical texts have textSim 1 (>= 0.70 threshold)', () => {
    expect(textSim('구독 하고 가세요 정말 유익한 영상 입니다', '구독 하고 가세요 정말 유익한 영상 입니다')).toBe(1)
  })

  it('catches re-spacing via char-grams (word-gram would miss)', () => {
    expect(textSim('이 영상 정말 최고예요', '이영상 정말최고예요')).toBeGreaterThan(0.7)
  })

  it('different campaigns stay below threshold', () => {
    const sim = textSim('이 영상 정말 최고예요 꼭 보세요 추천합니다', '오빠 정국 사랑해 영원히 응원할게 보라해 아미')
    expect(sim).toBeLessThan(0.7)
  })

  it('empty vs empty is similarity 1, empty vs nonempty is 0', () => {
    expect(jaccard(new Set(), new Set())).toBe(1)
    expect(jaccard(new Set(), charGrams('hello world'))).toBe(0)
  })
})
