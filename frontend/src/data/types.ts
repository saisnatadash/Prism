export type EvidenceStance = 'supports' | 'contradicts' | 'gap'

export interface SourceDataset {
  id: string
  name: string
  publisher: string
  licence: string
  coverage: string
  cadence: string
  status: 'connected' | 'planned'
  recordCount: number
  description: string
}

export interface EvidenceItem {
  id: string
  text: string
  stance: EvidenceStance
  sourceDatasetId: string
}

export interface Hypothesis {
  id: string
  code: string
  name: string
  status: 'supported' | 'challenged' | 'insufficient'
  supporting: number
  contradicting: number
  missing: number
  evidence: EvidenceItem[]
  assumptions: string[]
  recommendedCheck: string
}

export interface Investigation {
  id: string
  title: string
  location: string
  openedFrom: string
  statusNote: string
  sourcesLinked: number
  evidenceGaps: number
  hypotheses: Hypothesis[]
}

export interface GraphNode {
  id: string
  label: string
  kind: 'observation' | 'data' | 'hypothesis'
  x: number
  y: number
  r: number
  note?: string
}

export interface GraphEdge {
  from: string
  to: string
  kind?: 'normal' | 'contradicts'
}
