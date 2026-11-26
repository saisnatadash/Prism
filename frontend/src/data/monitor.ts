// Scripted case for the Live monitor: Mahanadi sector 4, Odisha.
// Every report and sensor reading here is SYNTHETIC. Wording, times and station
// names are written to look like real citizen reports and CPCB / IMD / India-WRIS
// feeds, nothing more. The UI says so on screen.

export type Lang = 'EN' | 'HI' | 'OR' | 'SYS'
export type Tag = 'noise' | 'supports' | 'escalation' | 'spread' | 'contradicts'

export interface Report {
  id: number
  time: string
  /** SYS marks an automated data feed (CPCB, IMD, India-WRIS) rather than a citizen report. */
  lang: Lang
  ward: string
  text: string
  /** English rendering, shown for Hindi and Odia reports. */
  translation?: string
  tag: Tag
}

export const WARDS = ['Sector 4', 'Sector 2', 'Ward 12', 'Ward 7', 'Ward 9', 'Kharavela Nagar'] as const

export const REPORTS: Report[] = [
  { id: 1, time: '08:05', lang: 'EN', ward: 'Ward 12', tag: 'noise', text: 'Tap water ran slightly cloudy this morning, cleared in a few minutes.' },
  {
    id: 2, time: '08:20', lang: 'HI', ward: 'Ward 7', tag: 'noise',
    text: 'आज सुबह नल में पानी का दबाव थोड़ा कम था।',
    translation: 'Water pressure from the tap was a little low this morning.',
  },
  { id: 3, time: '09:10', lang: 'EN', ward: 'Sector 4', tag: 'supports', text: 'Strange chemical smell near the river bank this morning, much stronger than usual.' },
  { id: 4, time: '09:40', lang: 'EN', ward: 'Ward 9', tag: 'noise', text: 'Drain near the school smells again, same as every monsoon.' },
  {
    id: 5, time: '10:15', lang: 'OR', ward: 'Sector 4', tag: 'supports',
    text: 'ନଦୀ ପାଣିରୁ ଖରାପ ଗନ୍ଧ ଆସୁଛି।',
    translation: 'A bad smell is coming from the river water.',
  },
  { id: 6, time: '10:40', lang: 'EN', ward: 'Sector 2', tag: 'noise', text: 'Roadworks near the market cut our water supply for a couple of hours.' },
  { id: 7, time: '10:55', lang: 'EN', ward: 'Ward 12', tag: 'noise', text: 'Slight chlorine smell in the tap water today, probably routine cleaning.' },
  { id: 8, time: '11:15', lang: 'SYS', ward: 'Sector 4', tag: 'supports', text: 'CPCB station 14 (synthetic feed): reading 3.1 standard deviations above its 90-day mean.' },
  { id: 9, time: '12:00', lang: 'EN', ward: 'Sector 4', tag: 'supports', text: 'Fishermen at the ghat say the water looks grey and foamy today.' },
  {
    id: 10, time: '12:50', lang: 'HI', ward: 'Sector 4', tag: 'supports',
    text: 'नदी के किनारे का पानी आज काला और झागदार दिख रहा है।',
    translation: 'The water at the river bank looks dark and foamy today.',
  },
  { id: 11, time: '13:40', lang: 'EN', ward: 'Sector 4', tag: 'escalation', text: 'Found dozens of dead fish floating near the downstream bank.' },
  {
    id: 12, time: '14:20', lang: 'OR', ward: 'Sector 4', tag: 'escalation',
    text: 'ଆମ ଗାଁରେ ଗାଈମାନେ ନଦୀ ପାଣି ପିଇ ଅସୁସ୍ଥ ହୋଇଛନ୍ତି।',
    translation: 'Cows in our village have fallen ill after drinking river water.',
  },
  { id: 13, time: '15:00', lang: 'EN', ward: 'Kharavela Nagar', tag: 'spread', text: 'A friend downstream at Kharavela Nagar reports the same smell near the water today.' },
  { id: 14, time: '16:10', lang: 'SYS', ward: 'Sector 4', tag: 'supports', text: 'IMD district record (synthetic feed): no unusual rainfall in the last 72 hours.' },
  { id: 15, time: '17:30', lang: 'SYS', ward: 'Kharavela Nagar', tag: 'supports', text: 'India-WRIS gauge, 6 km downstream (synthetic feed): level normal, no matching pattern.' },
  { id: 16, time: '19:45', lang: 'SYS', ward: 'Sector 4', tag: 'contradicts', text: 'CPCB calibration log received (synthetic feed): station 14 sensor drifted, readings from the last 3 to 5 days are suspect.' },
]

/** The step at which the signal is strong enough to open an investigation. */
export const FORMED_AT = 12

export const BASELINE_PER_DAY = 2

export interface HypothesisDef {
  id: 'discharge' | 'seasonal' | 'sensor'
  name: string
  /** Confidence after each report from FORMED_AT onward (scripted in this preview). */
  scores: number[]
  assumptions: string[]
  evidence: { text: string; kind: 'supports' | 'contradicts'; at: number }[]
  predictions: { text: string; resolvesAt: number; result: 'confirmed' | 'failed' }[]
}

export const HYPOTHESES: HypothesisDef[] = [
  {
    id: 'discharge',
    name: 'Upstream discharge event',
    scores: [44, 51, 57, 61, 33],
    assumptions: [
      'The sensor reading and the citizen reports refer to the same river stretch within 48 hours',
      'No unrelated discharge or sensor fault explains the spike',
    ],
    evidence: [
      { text: 'Chemical smell and foamy water reported on the river bank', kind: 'supports', at: 3 },
      { text: 'CPCB station 14 reading far above its normal range', kind: 'supports', at: 8 },
      { text: 'Dead fish found on the downstream bank', kind: 'supports', at: 11 },
      { text: 'Cattle fell ill after drinking river water', kind: 'supports', at: 12 },
      { text: 'Same smell reported further downstream', kind: 'supports', at: 13 },
      { text: 'No unusual rainfall to explain it', kind: 'supports', at: 14 },
      { text: 'Calibration log shows station 14 drifted', kind: 'contradicts', at: 16 },
    ],
    predictions: [
      { text: 'Physical signs should appear along the bank', resolvesAt: 11, result: 'confirmed' },
      { text: 'Reports should appear further downstream', resolvesAt: 13, result: 'confirmed' },
      { text: 'Rainfall should not explain the reading', resolvesAt: 14, result: 'confirmed' },
      { text: 'Station 14 should be working correctly', resolvesAt: 16, result: 'failed' },
    ],
  },
  {
    id: 'seasonal',
    name: 'Seasonal rainfall variation',
    scores: [26, 24, 14, 8, 8],
    assumptions: ['Rainfall alone can produce this reading', 'The pattern matches earlier seasonal anomalies at this station'],
    evidence: [
      { text: 'Mild seasonal variation seen at this station in earlier years', kind: 'supports', at: 8 },
      { text: 'No unusual rainfall in the last 72 hours', kind: 'contradicts', at: 14 },
      { text: 'A reading 6 km downstream shows no matching pattern', kind: 'contradicts', at: 15 },
    ],
    predictions: [
      { text: 'Rainfall should be unusual in the last 72 hours', resolvesAt: 14, result: 'failed' },
      { text: 'The pattern should show downstream as well', resolvesAt: 15, result: 'failed' },
    ],
  },
  {
    id: 'sensor',
    name: 'Sensor or sampling issue',
    scores: [12, 10, 9, 9, 40],
    assumptions: ['The station 14 calibration log would show a deviation', 'People would not see physical signs if only the sensor failed'],
    evidence: [
      { text: 'No calibration record available for station 14', kind: 'supports', at: 8 },
      { text: 'Physical signs reported by people, independent of the sensor', kind: 'contradicts', at: 11 },
      { text: 'Calibration log confirms sensor drift', kind: 'supports', at: 16 },
    ],
    predictions: [
      { text: 'People should not see physical signs if only the sensor failed', resolvesAt: 11, result: 'failed' },
      { text: 'Calibration log should show a deviation', resolvesAt: 16, result: 'confirmed' },
    ],
  },
]
