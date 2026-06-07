import { describe, it, expect } from 'vitest'
import { exportBlocklist, importBlocklist } from '../src/blocklist'

describe('blocklist export/import (F4)', () => {
  it('exports a versioned, deduped, sorted channelId list', () => {
    const bl = exportBlocklist(['@b', '@a', '@b', '@a'])
    expect(bl.version).toBe(1)
    expect(bl.channelIds).toEqual(['@a', '@b'])
  })

  it('drops empty ids on export', () => {
    expect(exportBlocklist(['@a', '']).channelIds).toEqual(['@a'])
  })

  it('imports and merges with existing, de-duplicating', () => {
    const merged = importBlocklist({ version: 1, channelIds: ['@c', '@a'] }, ['@a', '@b'])
    expect(merged).toEqual(['@a', '@b', '@c'])
  })

  it('handles an empty incoming list gracefully', () => {
    expect(importBlocklist({ version: 1, channelIds: [] }, ['@x'])).toEqual(['@x'])
  })
})
