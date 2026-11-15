// Client-side mirror of backend/app/core/engine.py so what-if changes in the
// browser recompute with exactly the same transparent rules as the API:
//   any contradicting evidence -> challenged
//   else any supporting evidence -> supported
//   else -> insufficient
import type { EvidenceItem, EvidenceStance, Hypothesis } from '../data/types'

export type Status = Hypothesis['status']

export function active(ev: EvidenceItem[]) {
  return ev.filter((e) => !e.disabled)
}

export function computeStatus(ev: EvidenceItem[]): Status {
  const a = active(ev)
  if (a.some((e) => e.stance === 'contradicts')) return 'challenged'
  if (a.some((e) => e.stance === 'supports')) return 'supported'
  return 'insufficient'
}

export function countOf(ev: EvidenceItem[], stance: EvidenceStance) {
  return active(ev).filter((e) => e.stance === stance).length
}

export const statusLabel: Record<Status, string> = {
  supported: 'Supported by available evidence',
  challenged: 'Challenged by contradictory evidence',
  insufficient: 'Insufficient evidence',
}

export const statusShort: Record<Status, string> = {
  supported: 'Supported',
  challenged: 'Challenged',
  insufficient: 'Insufficient',
}

export const statusTone: Record<Status, 'ok' | 'crit' | 'warn'> = {
  supported: 'ok',
  challenged: 'crit',
  insufficient: 'warn',
}

export const statusText: Record<Status, string> = {
  supported: 'text-[var(--color-emerald)]',
  challenged: 'text-[var(--color-coral)]',
  insufficient: 'text-[var(--color-amber)]',
}

export function verdictText(h: Hypothesis) {
  if (h.status === 'challenged') {
    return `Contradicting evidence weakens hypothesis ${h.code}. It should not be acted on until that contradiction is resolved.`
  }
  if (h.status === 'supported') {
    return h.missing > 0
      ? `Available evidence supports hypothesis ${h.code}, but ${h.missing} gap${h.missing === 1 ? '' : 's'} must be closed before this counts as a finding.`
      : `Available evidence supports hypothesis ${h.code} and no gaps are recorded. Still not a confirmed finding until verified in the field.`
  }
  return `There is not enough evidence yet to support or challenge hypothesis ${h.code}.`
}
