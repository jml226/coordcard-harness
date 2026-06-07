// Mode-split composite scorer + flag predicate + honest label (§4.2-4.4, V6).
import type { Cluster, Mode, ScoreResult } from './types'
import { burst } from './burst'
import { replyring } from './replyring'
import { suppressor } from './suppressor'
import { ageSignal } from './age'
import { HONEST_LABEL, SUPPRESSED_LABEL } from './labels'

const round2 = (x: number) => Math.round(x * 100) / 100

/** T — text-duplicate strength: min(1, distinctAuthors/5). */
function textSignal(distinctAuthors: number): number {
  return Math.min(1, distinctAuthors / 5)
}

/** Evidence-only: does a handle look auto-generated (random alnum)? Never scored. */
function autoStyleHandle(channelId: string): boolean {
  const h = channelId.replace(/^@/, '')
  return /\d/u.test(h) && /^[a-z0-9]+$/iu.test(h) && h.length >= 6
}

export interface ScoreOpts {
  mode?: Mode
  accountAgeDays?: Map<string, number>
}

/**
 * Score one cluster (§4.2 composite, §4.3 flag predicate, §4.4 honest label).
 * No-API: S = 0.50T + 0.30B + 0.20R. API: S = 0.40T + 0.25B + 0.20A + 0.15R.
 */
export function score(cluster: Cluster, opts: ScoreOpts = {}): ScoreResult {
  const mode: Mode = opts.mode ?? 'no-api'
  const distinctAuthors = new Set(cluster.members.map((m) => m.channelId)).size

  const T = textSignal(distinctAuthors)
  const B = burst(cluster)
  const R = replyring(cluster, cluster.members)
  const A = mode === 'api' ? ageSignal(cluster, opts.accountAgeDays) : 0

  const S =
    mode === 'api'
      ? round2(0.4 * T + 0.25 * B + 0.2 * A + 0.15 * R)
      : round2(0.5 * T + 0.3 * B + 0.2 * R)

  const suppressed = suppressor(cluster)

  const modeSignals = mode === 'api' ? [T, B, A, R] : [T, B, R]
  const positive = modeSignals.filter((s) => s > 0).length

  const flagged = S >= 0.7 && distinctAuthors >= 3 && positive >= 2 && !suppressed

  const label = suppressed ? SUPPRESSED_LABEL : HONEST_LABEL
  const evidence = composeEvidence(cluster, { S, suppressed, flagged, R, A, distinctAuthors })

  return { S, flagged, suppressed, signals: { T, B, R, A }, size: distinctAuthors, label, evidence }
}

function composeEvidence(
  cluster: Cluster,
  ctx: { S: number; suppressed: boolean; flagged: boolean; R: number; A: number; distinctAuthors: number },
): string {
  const n = ctx.distinctAuthors
  if (ctx.suppressed) {
    return `${n} repeated comments — looks like a common reaction/chant, NOT flagged as coordinated.`
  }
  const parts = [`${n} near-duplicate comments in the same recent window.`]
  if (ctx.R >= 1.0) parts.push('same text replied across multiple threads.')
  else if (ctx.R > 0) parts.push('reply pattern observed (sub-threshold).')
  if (ctx.A > 0) parts.push('multiple accounts recently created.')
  const autoCount = cluster.members.filter((m) => autoStyleHandle(m.channelId)).length
  if (autoCount > cluster.members.length / 2) parts.push('(note: auto-style handles)')
  return parts.join(' ')
}
