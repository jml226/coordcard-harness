// Character 4-gram sets + Jaccard similarity (§4.1).
// Char-level grams catch paraphrase, re-spacing, homoglyph, word-reorder
// that word-grams miss.
import { normalize } from './normalize'

/** Build the set of character n-grams of the normalized, space-stripped text.
 * Stripping whitespace makes the grams robust to re-spacing (a single added or
 * removed space would otherwise shift every gram boundary). */
export function charGrams(text: string, n = 4): Set<string> {
  const s = normalize(text).replace(/\s+/gu, '')
  const grams = new Set<string>()
  if (s.length < n) {
    if (s.length > 0) grams.add(s)
    return grams
  }
  for (let i = 0; i + n <= s.length; i++) grams.add(s.slice(i, i + n))
  return grams
}

/** Jaccard similarity of two sets: |A∩B| / |A∪B|. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const g of a) if (b.has(g)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

/** Char-4gram Jaccard similarity between two raw comment texts. */
export function textSim(a: string, b: string, n = 4): number {
  return jaccard(charGrams(a, n), charGrams(b, n))
}
