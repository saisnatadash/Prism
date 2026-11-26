import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Plus } from 'lucide-react'
import Nav from '../components/Nav'
import Pill from '../components/Pill'
import AddEvidenceDialog from '../components/AddEvidenceDialog'
import { useInvestigation } from '../lib/store'
import { statusLabel, statusText } from '../lib/engine'
import { DATASETS } from '../data/demo'
import type { GraphEdge, GraphNode, Hypothesis } from '../data/types'

const nodeStroke = { observation: '#34D399', data: '#2DD4BF', hypothesis: '#F59E0B' }
const stanceWord = { supports: 'Supports', contradicts: 'Contradicts', gap: 'Missing' }
const stanceColor = {
  supports: 'text-[var(--color-emerald)]',
  contradicts: 'text-[var(--color-coral)]',
  gap: 'text-[var(--color-amber)]',
}
const datasetName = (id: string) => DATASETS.find((d) => d.id === id)?.name ?? id

const codeOf = (label: string) => /^Hyp\.\s*([A-Z])/.exec(label)?.[1]

export default function Investigation() {
  const { loading, live, inv, hyps, nodes, edges, sourcesLinked, evidenceGaps, selectedId, select, dirty, reset } =
    useInvestigation()
  const [hover, setHover] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()

  if (loading || !inv) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="p-10 font-mono text-[12px] text-[var(--color-muted)]">Loading investigation…</div>
      </div>
    )
  }

  const selected = hyps.find((h) => h.id === selectedId) ?? hyps[0]
  const nodeById = (id: string) => nodes.find((n) => n.id === id)
  const hypForNode = (n?: GraphNode) => {
    if (!n || n.kind !== 'hypothesis') return undefined
    const code = codeOf(n.label)
    return code ? hyps.find((h) => h.code === code) : undefined
  }
  // a node "belongs" to a hypothesis if it is one, or hangs directly off one
  const ownerOf = (n: GraphNode): Hypothesis | undefined => {
    const self = hypForNode(n)
    if (self) return self
    const parentEdge = edges.find((e) => e.to === n.id && hypForNode(nodeById(e.from)))
    return parentEdge ? hypForNode(nodeById(parentEdge.from)) : undefined
  }
  const edgeContradicts = (e: GraphEdge) => {
    const h = hypForNode(nodeById(e.to))
    if (h && e.from === 'obs') return h.status === 'challenged'
    return e.kind === 'contradicts'
  }
  const edgeOnSelected = (e: GraphEdge) => {
    const a = nodeById(e.from)
    const b = nodeById(e.to)
    return [a, b].some((n) => n && ownerOf(n)?.id === selected.id) && [a, b].some((n) => n?.kind === 'hypothesis' && hypForNode(n)?.id === selected.id)
  }
  const note = hover ? nodeById(hover)?.note : undefined

  return (
    <div className="min-h-screen md:h-screen flex flex-col">
      <Nav />

      <div className="px-6 md:px-8 py-4 border-b border-[var(--color-border)] flex flex-wrap justify-between items-end gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10.5px] text-[var(--color-muted)] mb-1.5">CASE · {inv.location.toUpperCase()}</div>
          <h1 className="font-display text-[24px] md:text-[28px] font-medium leading-tight">{inv.title}</h1>
          <div className="text-[12.5px] text-[var(--color-muted)] mt-1">
            Opened from {inv.openedFrom} &middot; {inv.statusNote}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill>{sourcesLinked} sources linked</Pill>
          <Pill tone={evidenceGaps > 0 ? 'warn' : 'ok'}>
            {evidenceGaps} evidence gap{evidenceGaps === 1 ? '' : 's'}
          </Pill>
          <Pill tone={live ? 'ok' : 'muted'}>{live ? 'Live backend' : 'Demo data, clearly labelled'}</Pill>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* graph */}
        <div className="flex-[1.3] relative border-b md:border-b-0 md:border-r border-[var(--color-border)] min-h-[340px]">
          <div className="noise-grid absolute inset-0 opacity-25 pointer-events-none" />
          <div className="absolute top-4 left-5 z-10 font-mono text-[10.5px] text-[var(--color-muted)]">
            SIGNAL-TO-EVIDENCE GRAPH
          </div>
          <div className="absolute top-4 right-5 z-10 hidden sm:flex gap-3.5 font-mono text-[10px] text-[var(--color-muted)]">
            {(
              [
                ['observation', 'Observation'],
                ['data', 'Source'],
                ['hypothesis', 'Hypothesis'],
              ] as const
            ).map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border-[1.5px]" style={{ borderColor: nodeStroke[k] }} />
                {l}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 border-t border-dashed border-[var(--color-coral)]" />
              Contradicted
            </span>
          </div>

          <svg viewBox="0 0 760 500" className="w-full h-full relative" role="img" aria-label="Signal-to-evidence graph">
            {edges.map((e, i) => {
              const a = nodeById(e.from)
              const b = nodeById(e.to)
              if (!a || !b) return null
              const bad = edgeContradicts(e)
              const on = edgeOnSelected(e)
              return (
                <g key={`${e.from}-${e.to}`}>
                  <motion.line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.07 }}
                    stroke={bad ? 'rgba(248,113,113,0.6)' : 'rgba(143,182,165,0.32)'}
                    strokeWidth={1.6}
                    strokeDasharray={bad ? '5 4' : undefined}
                  />
                  {on && (
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className="flow-line"
                      stroke={bad ? '#F87171' : '#34D399'}
                      strokeWidth={2}
                    />
                  )}
                </g>
              )
            })}
            {nodes.map((n, i) => {
              const h = hypForNode(n)
              const owner = ownerOf(n)
              const isSel = h?.id === selected.id
              const dim = owner && owner.id !== selected.id
              const clickable = !!h
              return (
                <motion.g
                  key={n.id}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: dim ? 0.35 : 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
                  style={{ transformOrigin: `${n.x}px ${n.y}px`, cursor: clickable ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => h && select(h.id)}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? `Inspect hypothesis ${h?.code}` : n.label}
                  onKeyDown={(ev) => clickable && (ev.key === 'Enter' || ev.key === ' ') && h && select(h.id)}
                >
                  {isSel && <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke="#F59E0B" strokeOpacity={0.35} strokeWidth={1.5} />}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={isSel ? 'rgba(245,158,11,0.12)' : '#0E241B'}
                    stroke={nodeStroke[n.kind]}
                    strokeWidth={hover === n.id || isSel ? 3 : 2}
                  />
                  <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={10.5} fill="#EAF6EF" fontFamily="'IBM Plex Mono', monospace">
                    {n.label}
                  </text>
                  {h && (
                    <text
                      x={n.x}
                      y={n.y + n.r + 14}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontFamily="'IBM Plex Mono', monospace"
                      fill={h.status === 'challenged' ? '#F87171' : h.status === 'supported' ? '#34D399' : '#F59E0B'}
                    >
                      {h.status}
                    </text>
                  )}
                </motion.g>
              )
            })}
          </svg>

          <AnimatePresence>
            {note && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-5 right-5 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-[4px] px-4 py-2.5 text-[12.5px] text-[var(--color-muted)]"
              >
                {note}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* hypotheses */}
        <div className="flex-1 p-5 md:p-6 md:overflow-y-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10.5px] text-[var(--color-muted)]">COMPETING HYPOTHESES &middot; CLICK ONE TO INSPECT</div>
            {dirty && (
              <button onClick={reset} className="font-mono text-[10.5px] text-[var(--color-amber)] hover:underline">
                reset what-ifs
              </button>
            )}
          </div>

          {hyps.map((h, i) => {
            const open = h.id === selected.id
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className={`rounded-[6px] border transition-colors ${
                  open ? 'border-[rgba(245,158,11,0.5)] bg-[rgba(245,158,11,0.04)]' : 'border-[var(--color-border)] hover:border-[rgba(52,211,153,0.35)]'
                }`}
              >
                <button
                  onClick={() => select(h.id)}
                  aria-expanded={open}
                  className="w-full text-left p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-[17px] font-medium leading-snug">
                      <span className="font-mono text-[12px] text-[var(--color-muted)] mr-2">{h.code}</span>
                      {h.name}
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-2.5">
                      {h.supporting > 0 && <Pill tone="ok">{h.supporting} supporting</Pill>}
                      {h.contradicting > 0 && <Pill tone="crit">{h.contradicting} contradicting</Pill>}
                      {h.missing > 0 && <Pill tone="warn">{h.missing} missing</Pill>}
                    </div>
                    <div className={`text-[12px] font-semibold mt-2.5 ${statusText[h.status]}`}>{statusLabel[h.status]}</div>
                  </div>
                  <ChevronDown size={16} className={`mt-1 shrink-0 text-[var(--color-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-3">
                        <ul className="flex flex-col gap-2.5">
                          {h.evidence.map((e) => (
                            <li key={e.id} className={`text-[12.5px] leading-relaxed ${e.disabled ? 'opacity-40 line-through' : ''}`}>
                              <span className={`font-mono text-[10.5px] mr-2 ${stanceColor[e.stance]}`}>{stanceWord[e.stance]}</span>
                              {e.text}
                              <span className="block font-mono text-[10px] text-[var(--color-muted)] mt-0.5">
                                {datasetName(e.sourceDatasetId)}
                                {e.userAdded && ' · added this session'}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 text-[12px] text-[var(--color-muted)] border-l-2 border-[var(--color-emerald)] pl-3 leading-relaxed">
                          <span className="font-mono text-[10px] text-[var(--color-emerald)] block mb-0.5">NEXT BEST CHECK</span>
                          {h.recommendedCheck}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="px-6 md:px-8 py-3.5 border-t border-[var(--color-border)] flex flex-wrap gap-3 justify-between items-center">
        <div className="text-[12px] text-[var(--color-muted)] max-w-[520px]">
          Every edge traces to a source record. Nothing here is a confirmed finding.
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] border border-[var(--color-border)] text-[13px] font-semibold hover:bg-white/5 transition-colors"
          >
            <Plus size={14} /> Add new evidence
          </button>
          <button
            onClick={() => navigate(`/counterfactual?h=${selected.id}`)}
            className="px-4 py-2 rounded-[4px] text-[13px] font-semibold bg-[var(--color-emerald)] text-[#06130D] hover:bg-[var(--color-teal)] transition-colors"
          >
            Challenge hypothesis {selected.code}
          </button>
        </div>
      </div>

      <AddEvidenceDialog open={adding} onClose={() => setAdding(false)} defaultHypothesisId={selected.id} />
    </div>
  )
}
