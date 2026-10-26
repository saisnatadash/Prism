// Thin API client. If VITE_API_URL is set and reachable, PRISM talks to the
// live FastAPI backend. Otherwise it falls back to the bundled demo dataset
// so the UI is always inspectable even as a backend-less static deploy.

import { DATASETS, INVESTIGATION, GRAPH_NODES, GRAPH_EDGES } from '../data/demo'
import type { SourceDataset, Investigation, GraphNode, GraphEdge } from '../data/types'

const API_URL = import.meta.env.VITE_API_URL as string | undefined

async function tryFetch<T>(path: string): Promise<T | null> {
  if (!API_URL) return null
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function getDatasets(): Promise<{ data: SourceDataset[]; live: boolean }> {
  const live = await tryFetch<SourceDataset[]>('/api/datasets')
  return live ? { data: live, live: true } : { data: DATASETS, live: false }
}

export async function getInvestigation(id: string): Promise<{ data: Investigation; live: boolean }> {
  const live = await tryFetch<Investigation>(`/api/investigations/${id}`)
  return live ? { data: live, live: true } : { data: INVESTIGATION, live: false }
}

export async function getGraph(id: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; live: boolean }> {
  const live = await tryFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/api/investigations/${id}/graph`)
  return live ? { ...live, live: true } : { nodes: GRAPH_NODES, edges: GRAPH_EDGES, live: false }
}

export async function challengeHypothesis(investigationId: string, hypothesisId: string) {
  const live = await tryFetch(`/api/investigations/${investigationId}/hypotheses/${hypothesisId}/challenge`)
  return live
}
