import { FORMED_AT, HYPOTHESES, REPORTS, WARDS } from '../data/monitor'
import type { Tag } from '../data/monitor'

export type WardState = 'none' | 'normal' | 'emerging' | 'high' | 'anomaly'
export type BannerTone = 'calm' | 'watch' | 'alert' | 'revised'
export type PredictionState = 'pending' | 'confirmed' | 'failed'

export const TOTAL = REPORTS.length

const RELATED: Tag[] = ['supports', 'escalation']

export function wardStateLabel(s: WardState): string {
  return { none: 'No data', normal: 'Normal activity', emerging: 'Emerging', high: 'High confidence', anomaly: 'Anomaly detected' }[s]
}

export function tagLabel(tag: Tag, formed: boolean): string | null {
  if (tag === 'noise') return null
  if (tag === 'spread') return 'spread'
  if (tag === 'escalation') return 'escalation'
  if (tag === 'contradicts') return 'contradicts hypothesis'
  return formed ? 'supports hypothesis' : 'related signal'
}

export function deriveMonitor(n: number) {
  const seen = REPORTS.slice(0, n)

  const wards = WARDS.map((name) => {
    const mine = seen.filter((r) => r.ward === name)
    const related = mine.filter((r) => RELATED.includes(r.tag)).length
    const spread = mine.some((r) => r.tag === 'spread')
    let state: WardState = 'none'
    if (mine.length > 0) {
      if (related >= 7) state = 'high'
      else if (related >= 3) state = 'emerging'
      else if (spread) state = 'anomaly'
      else state = 'normal'
    }
    return { name, count: mine.length, related, state }
  })

  const lead = [...wards].sort((a, b) => b.related - a.related)[0]
  const formed = n >= FORMED_AT
  const revised = seen.some((r) => r.tag === 'contradicts')
  const anyHigh = wards.some((w) => w.state === 'high')
  const anyEmerging = wards.some((w) => w.state === 'emerging')

  let banner: { tone: BannerTone; text: string }
  if (n === 0) banner = { tone: 'calm', text: 'No active alerts. Monitoring normal chatter.' }
  else if (revised) banner = { tone: 'revised', text: 'Confidence revised down. The station 14 calibration log shows the sensor drifted.' }
  else if (n > FORMED_AT) banner = { tone: 'alert', text: 'High-confidence emerging event. Supporting evidence processed.' }
  else if (anyHigh) banner = { tone: 'alert', text: `High-confidence emerging event. River-bank pollution signal in ${lead.name}.` }
  else if (anyEmerging) banner = { tone: 'watch', text: `Emerging signal. Early weak signals noted in ${lead.name}.` }
  else banner = { tone: 'calm', text: 'No active alerts. Monitoring normal chatter.' }

  let caption: string
  if (n === 0) caption = 'Click to begin the report stream.'
  else if (n < FORMED_AT) caption = `Reports ingested: ${n} / ${FORMED_AT}`
  else if (n === FORMED_AT) caption = 'Hypotheses formed. Check the Investigation tab. Keep clicking to release held-back evidence.'
  else if (n < TOTAL) caption = 'Supporting evidence processed. Confidence updated. See the Investigation tab.'
  else caption = 'End of the report stream. Click Reset to replay.'

  const wardsActive = wards.filter((w) => w.count > 0).length
  const window = n === 0 ? '—' : seen[n - 1].time

  const related = lead.related
  const anomaly = Math.round(100 * (1 - Math.exp(-0.255 * related)))

  const nextCheck =
    n < TOTAL
      ? 'Request the calibration log for CPCB station 14 before escalating. It is the one check most likely to separate a real discharge from a sensor fault.'
      : 'Collect an independent water sample at the river bank near the dead fish and send it to an accredited lab. The station 14 readings can no longer be trusted on their own, but people still saw physical signs.'

  const idx = Math.min(Math.max(n, FORMED_AT), TOTAL) - FORMED_AT
  const hypotheses = HYPOTHESES.map((h) => ({
    id: h.id,
    name: h.name,
    score: h.scores[idx],
    assumptions: h.assumptions,
    evidence: h.evidence.filter((e) => e.at <= n),
    predictions: h.predictions.map((p) => ({
      text: p.text,
      state: (n >= p.resolvesAt ? p.result : 'pending') as PredictionState,
    })),
  }))
  const leadingId = [...hypotheses].sort((a, b) => b.score - a.score)[0].id

  const history = formed
    ? HYPOTHESES[0].scores.slice(0, idx + 1).map((score, i) => ({ step: FORMED_AT + i, score }))
    : []

  return {
    seen,
    wards,
    banner,
    caption,
    formed,
    wardsActive,
    window,
    leadWard: lead.name,
    related,
    anomaly,
    nextCheck,
    trackedName: HYPOTHESES[0].name,
    hypotheses,
    leadingId,
    history,
    done: n >= TOTAL,
  }
}
