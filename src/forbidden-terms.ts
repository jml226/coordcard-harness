// §4.4 FORBIDDEN-TERMS canonical list — the ONE place these are defined
// (single source of truth, referenced by §9 and forbidden-words.spec).
//
// This file is the DEFINITION site. It is deliberately excluded from the
// forbidden-words scan (a banned-word linter must name the words it bans);
// every OTHER src file and the entire dist bundle ARE scanned against it.
// These terms never reach any rendered/user-facing string.

export const FORBIDDEN_TERMS: string[] = [
  'bot',
  'foreign',
  'foreigner',
  'chinese',
  '중국',
  'korean',
  '한국인',
  'russian',
  '러시아',
  'agent',
  '공작',
  '요원',
  'manipulator',
  '조작범',
  'propaganda',
  'propagandist',
  '간첩',
  'spy',
]
