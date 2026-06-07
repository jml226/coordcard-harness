import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { FORBIDDEN_TERMS } from '../src/forbidden-terms'

const ROOT = resolve(__dirname, '..')

// The canonical definition site is excluded (a banned-word linter must name the
// words it bans); every other src file and the whole dist bundle ARE scanned.
const SRC_EXCLUDE = new Set(['forbidden-terms.ts'])

function walk(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(p, exts))
    else if (exts.some((e) => ent.name.endsWith(e))) out.push(p)
  }
  return out
}

/** Extract quoted/template string literals from TS source (UI strings live here). */
function extractStringLiterals(code: string): string {
  const matches = code.match(/'[^']*'|"[^"]*"|`[^`]*`/gu) ?? []
  return matches.join('\n')
}

// §4.4 forbidden TERMS are words/labels, not arbitrary substrings. ASCII terms
// are matched with latin-letter boundaries so benign substrings (CSS
// "margin-bottom", "robot") do not false-positive; a standalone slur still trips.
// CJK terms are matched as substrings (latin \b semantics don't apply to them).
function termPattern(t: string): string {
  const esc = t.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return /^[a-z0-9]+$/iu.test(t) ? `(?<![a-z])${esc}(?![a-z])` : esc
}

function buildForbiddenRegex(): RegExp {
  return new RegExp(`(${FORBIDDEN_TERMS.map(termPattern).join('|')})`, 'iu')
}

describe('forbidden-words (§4.4 / §10.A item 6)', () => {
  const re = buildForbiddenRegex()

  it('the canonical list is non-empty (single source of truth)', () => {
    expect(FORBIDDEN_TERMS.length).toBeGreaterThanOrEqual(18)
  })

  it('no forbidden term in any src UI string literal', () => {
    const files = walk(resolve(ROOT, 'src'), ['.ts']).filter(
      (f) => !SRC_EXCLUDE.has(f.split('/').pop() ?? '') && !f.endsWith('.spec.ts'),
    )
    expect(files.length).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const f of files) {
      const literals = extractStringLiterals(readFileSync(f, 'utf8'))
      const hit = literals.match(re)
      if (hit) offenders.push(`${f}: "${hit[0]}"`)
    }
    expect(offenders).toEqual([])
  })

  it('no forbidden term anywhere in the built dist bundle', () => {
    const files = walk(resolve(ROOT, 'dist'), ['.js', '.html', '.json', '.css'])
    expect(files.length).toBeGreaterThan(0) // dist must exist (run pnpm build first)
    const offenders: string[] = []
    for (const f of files) {
      const hit = readFileSync(f, 'utf8').match(re)
      if (hit) offenders.push(`${f}: "${hit[0]}"`)
    }
    expect(offenders).toEqual([])
  })
})
