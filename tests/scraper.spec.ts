// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scrapeComments, channelIdFromHref } from '../src/scraper'
import type { Comment } from '../src/types'

function loadFixture(): Document {
  const html = readFileSync(resolve(__dirname, 'fixtures/comments-snapshot.html'), 'utf8')
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('scrapeComments (V2)', () => {
  const doc = loadFixture()
  const comments = scrapeComments(doc)
  const byId = new Map<string, Comment>(comments.map((c) => [c.id, c]))

  it('parses exactly 17 comments from the §5.1 fixture', () => {
    expect(comments.length).toBe(17)
  })

  it('derives @handle channelIds from #author-text href', () => {
    expect(byId.get('C1')?.channelId).toBe('@user8x3k1')
    expect(byId.get('M5')?.channelId).toBe('@borahae_kr')
  })

  it('captures #content-text and .published-time-text per comment', () => {
    expect(byId.get('C1')?.text).toBe('이 영상 정말 최고예요 꼭 보세요 추천합니다')
    expect(byId.get('C1')?.relTime).toBe('2 minutes ago')
    expect(byId.get('C8')?.text).toBe('저는 이 의견에 동의하지 않습니다 근거가 부족해 보이네요')
  })

  it('records parentId as the nearest ancestor thread for replies', () => {
    expect(byId.get('T1')?.parentId).toBe('S1')
    expect(byId.get('T2')?.parentId).toBe('C1')
    expect(byId.get('T3')?.parentId).toBe('C8')
  })

  it('records parentId null for top-level threads', () => {
    expect(byId.get('C1')?.parentId).toBeNull()
    expect(byId.get('S1')?.parentId).toBeNull()
    expect(byId.get('M1')?.parentId).toBeNull()
  })

  it('does not bleed reply fields into the parent thread', () => {
    // C1 owns the cluster-X text, NOT its reply T2's "구독..." text.
    expect(byId.get('C1')?.text).toContain('최고예요')
    expect(byId.get('T2')?.text).toContain('구독')
  })

  it('channelIdFromHref handles /@handle and /channel/UC.. forms', () => {
    expect(channelIdFromHref('/@abc')).toBe('@abc')
    expect(channelIdFromHref('/channel/UC123abc')).toBe('UC123abc')
    expect(channelIdFromHref(null)).toBe('')
  })
})
