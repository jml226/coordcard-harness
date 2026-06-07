import { describe, it, expect } from 'vitest'
import { normalize, tokenCount } from '../src/normalize'

describe('normalize (§4.1)', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalize('  Hello   WORLD  ')).toBe('hello world')
  })

  it('strips URLs', () => {
    expect(normalize('check https://youtu.be/x now')).toBe('check now')
  })

  it('strips emoji', () => {
    expect(normalize('love it 😂🤣')).toBe('love it')
  })

  it('strips punctuation but keeps Hangul letters', () => {
    expect(normalize('정말, 최고!!! (추천)')).toBe('정말 최고 추천')
  })

  it('is idempotent', () => {
    const once = normalize('Hi, THERE!! 😀')
    expect(normalize(once)).toBe(once)
  })
})

describe('tokenCount (§5.1 tokenizer)', () => {
  it('counts the fixture cluster-X text as 7 tokens', () => {
    expect(tokenCount('이 영상 정말 최고예요 꼭 보세요 추천합니다')).toBe(7)
  })

  it('counts a short comment below the minTokens guard', () => {
    expect(tokenCount('good video')).toBe(2)
  })

  it('returns 0 for empty/punctuation-only text', () => {
    expect(tokenCount('!!! ???')).toBe(0)
  })
})
