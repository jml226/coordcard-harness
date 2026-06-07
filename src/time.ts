// Relative-time parser (§4.1 B-signal preamble, V4).
// DOM gives only relative time; parse to COARSE minutes (ordering evidence, not exact).

/**
 * Parse a relative-time string to coarse minutes.
 * 방금/just now/n초/n seconds -> 0; n분/n minutes -> n;
 * n시간/n hours -> n*60; n일/n days -> n*1440. Returns null if unparseable.
 */
export function parseRelMinutes(raw: string): number | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null

  // "just now" / "방금" / "방금 전"
  if (/just now|방금/u.test(s)) return 0

  const num = s.match(/(\d+)/u)
  const n = num ? parseInt(num[1], 10) : null

  // seconds -> 0 (within-minute)
  if (/초|second/u.test(s)) return 0
  if (n === null) return null

  if (/분|minute|min\b/u.test(s)) return n
  if (/시간|hour|hr\b/u.test(s)) return n * 60
  if (/일|day/u.test(s)) return n * 1440
  if (/주|week/u.test(s)) return n * 1440 * 7
  if (/달|개월|month/u.test(s)) return n * 1440 * 30
  if (/년|year/u.test(s)) return n * 1440 * 365

  return null
}
