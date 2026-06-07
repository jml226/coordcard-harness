// Organic-burst suppressor (§4.1 SUPP) — deterministic false-positive guard.
// NON-NEGOTIABLE: only the four exact, codeable rules below. No fuzzy judgment.
import type { Cluster } from '../types'
import { normalize } from '../normalize'
import { CHANT_LEXICON } from './chant-lexicon'

// Normalize lexicon entries through the SAME pipeline as comment tokens so
// NFKC-affected entries (e.g. compatibility jamo ㅋㅋㅋ) compare equal.
const LEXICON_SET = new Set(CHANT_LEXICON.map((t) => normalize(t)))
const RIP_RE = /\b(rip|r\.?i\.?p)\b/iu
const RIP_LITERALS = ['삼가 고인', '고인의 명복', 'rest in peace']
const FLOOD_RE = /^(ㅋ{3,}|ㅎ{3,}|(lol)+|(haha)+|😂|🤣)+$/u
const STOP_CHANT = new Set(['goat', 'legend', 'first', 'w', 'l', 'real', 'facts'])
const EMOJI_RE = /\p{Extended_Pictographic}/u

/**
 * SUPP = true iff ANY organic-burst rule matches (§4.1). When true the cluster
 * is re-labeled "mass repetition (likely organic)" and is NEVER flagged.
 */
export function suppressor(cluster: Cluster): boolean {
  const tRaw = cluster.members[0]?.text ?? ''
  const tNorm = cluster.repText || normalize(tRaw)
  const rawLower = tRaw.toLowerCase()

  // Rule 1: condolence.
  if (RIP_RE.test(tRaw) || RIP_RE.test(tNorm)) return true
  if (RIP_LITERALS.some((l) => rawLower.includes(l) || tNorm.includes(l))) return true

  // Rule 2: laughter / reaction floods + single-token stop-chants.
  // Flood check runs on the raw (lowercased, space-stripped) text so literal
  // compatibility-jamo (ㅋ/ㅎ) in the regex match before NFKC rewrites them.
  const rawNoSpace = tRaw.toLowerCase().replace(/\s+/gu, '')
  if (rawNoSpace && FLOOD_RE.test(rawNoSpace)) return true
  if (STOP_CHANT.has(tNorm.trim())) return true

  // Rule 3: fandom-chant lexicon — >= 2 tokens from CHANT_LEXICON.
  const tokens = tNorm.split(' ').filter(Boolean)
  let hits = 0
  for (const tok of tokens) if (LEXICON_SET.has(tok)) hits++
  if (hits >= 2) return true

  // Rule 4: emoji density >= 0.30 of total codepoints (on raw text).
  const cps = [...tRaw]
  if (cps.length > 0) {
    const emoji = cps.filter((c) => EMOJI_RE.test(c)).length
    if (emoji / cps.length >= 0.3) return true
  }

  return false
}
