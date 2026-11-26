import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getGraph, getInvestigation } from './api'
import { computeStatus, countOf, type Status } from './engine'
import type { EvidenceItem, GraphEdge, GraphNode, Hypothesis, Investigation } from '../data/types'

const INV_ID = 'inv-mahanadi-s4'

interface Store {
  loading: boolean
  live: boolean
  inv: Investigation | null
  hyps: Hypothesis[]
  baseline: Record<string, Status>
  nodes: GraphNode[]
  edges: GraphEdge[]
  sourcesLinked: number
  evidenceGaps: number
  dirty: boolean
  selectedId: string | null
  select: (id: string) => void
  toggleEvidence: (hypId: string, evId: string) => void
  addEvidence: (hypId: string, item: Omit<EvidenceItem, 'id' | 'userAdded'>) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [inv, setInv] = useState<Investigation | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [evidence, setEvidence] = useState<Record<string, EvidenceItem[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getInvestigation(INV_ID), getGraph(INV_ID)]).then(([i, g]) => {
      if (cancelled) return
      setInv(i.data)
      setLive(i.live)
      setNodes(g.nodes)
      setEdges(g.edges)
      setEvidence(Object.fromEntries(i.data.hypotheses.map((h) => [h.id, h.evidence])))
      setSelectedId(i.data.hypotheses[0]?.id ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const hyps = useMemo<Hypothesis[]>(() => {
    if (!inv) return []
    return inv.hypotheses.map((h) => {
      const ev = evidence[h.id] ?? h.evidence
      return {
        ...h,
        evidence: ev,
        status: computeStatus(ev),
        supporting: countOf(ev, 'supports'),
        contradicting: countOf(ev, 'contradicts'),
        missing: countOf(ev, 'gap'),
      }
    })
  }, [inv, evidence])

  const baseline = useMemo(() => {
    const out: Record<string, Status> = {}
    inv?.hypotheses.forEach((h) => {
      out[h.id] = computeStatus(h.evidence)
    })
    return out
  }, [inv])

  const sourcesLinked = useMemo(() => {
    const ids = new Set<string>()
    hyps.forEach((h) => h.evidence.filter((e) => !e.disabled).forEach((e) => ids.add(e.sourceDatasetId)))
    return ids.size
  }, [hyps])

  const evidenceGaps = useMemo(() => hyps.reduce((n, h) => n + h.missing, 0), [hyps])

  const dirty = useMemo(
    () => hyps.some((h) => h.evidence.some((e) => e.disabled || e.userAdded)),
    [hyps],
  )

  const toggleEvidence = useCallback((hypId: string, evId: string) => {
    setEvidence((prev) => ({
      ...prev,
      [hypId]: (prev[hypId] ?? []).map((e) => (e.id === evId ? { ...e, disabled: !e.disabled } : e)),
    }))
  }, [])

  const addEvidence = useCallback((hypId: string, item: Omit<EvidenceItem, 'id' | 'userAdded'>) => {
    setEvidence((prev) => ({
      ...prev,
      [hypId]: [...(prev[hypId] ?? []), { ...item, id: `u-${Date.now()}`, userAdded: true }],
    }))
  }, [])

  const reset = useCallback(() => {
    if (!inv) return
    setEvidence(Object.fromEntries(inv.hypotheses.map((h) => [h.id, h.evidence])))
  }, [inv])

  const value: Store = {
    loading,
    live,
    inv,
    hyps,
    baseline,
    nodes,
    edges,
    sourcesLinked,
    evidenceGaps,
    dirty,
    selectedId,
    select: setSelectedId,
    toggleEvidence,
    addEvidence,
    reset,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useInvestigation() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useInvestigation must be used inside InvestigationProvider')
  return v
}
