// Text normalization + tokenization (§4.1 cluster-construction preamble).
// Deterministic and pure so the §5.1 oracle is reproducible.

const URL_RE = /https?:\/\/\S+|www\.\S+/gu
// Extended_Pictographic covers emoji; we strip them before clustering.
const EMOJI_RE = /\p{Extended_Pictographic}/gu
// Strip Unicode punctuation + symbols, but keep letters/marks/numbers
// (Hangul syllables are letters, so they survive).
const PUNCT_RE = /[\p{P}\p{S}]/gu

/**
 * Normalize a comment per §4.1: NFKC, lowercase, strip URLs, strip emoji,
 * strip punctuation, collapse whitespace.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(URL_RE, ' ')
    .replace(EMOJI_RE, ' ')
    .replace(PUNCT_RE, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/** Whitespace-split token count of the normalized text (§5.1 tokenizer). */
export function tokenCount(text: string): number {
  const n = normalize(text)
  return n.length === 0 ? 0 : n.split(' ').length
}
