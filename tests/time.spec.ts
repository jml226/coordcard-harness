import { describe, it, expect } from 'vitest'
import { parseRelMinutes } from '../src/time'

describe('parseRelMinutes (§4.1, V4)', () => {
  it('parses English minutes', () => {
    expect(parseRelMinutes('2 minutes ago')).toBe(2)
    expect(parseRelMinutes('30 minutes ago')).toBe(30)
  })

  it('parses 한국어 minutes', () => {
    expect(parseRelMinutes('2분 전')).toBe(2)
  })

  it('treats seconds and "just now" / 방금 as 0', () => {
    expect(parseRelMinutes('45 seconds ago')).toBe(0)
    expect(parseRelMinutes('just now')).toBe(0)
    expect(parseRelMinutes('방금 전')).toBe(0)
    expect(parseRelMinutes('30초 전')).toBe(0)
  })

  it('parses hours into minutes', () => {
    expect(parseRelMinutes('1 hour ago')).toBe(60)
    expect(parseRelMinutes('3시간 전')).toBe(180)
  })

  it('parses days into minutes', () => {
    expect(parseRelMinutes('1 day ago')).toBe(1440)
    expect(parseRelMinutes('2일 전')).toBe(2880)
  })

  it('parses weeks/months/years coarsely', () => {
    expect(parseRelMinutes('1 week ago')).toBe(1440 * 7)
    expect(parseRelMinutes('6년 전')).toBe(1440 * 365 * 6)
  })

  it('returns null for unparseable strings', () => {
    expect(parseRelMinutes('')).toBeNull()
    expect(parseRelMinutes('Pinned by creator')).toBeNull()
  })

  it('parses bare numeric edited forms', () => {
    expect(parseRelMinutes('5 minutes ago (edited)')).toBe(5)
  })
})
