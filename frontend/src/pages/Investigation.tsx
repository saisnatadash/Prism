import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Nav from '../components/Nav'
import Pill from '../components/Pill'
import { getInvestigation, getGraph } from '../lib/api'
import type { Investigation, GraphNode, GraphEdge, Hypothesis } from '../data/types'
import { Circle, Diamond, Square, Star, Triangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const statusColor: Record<Hypothesis['status'], string> = {
  supported: 'text-[var(--color-emerald)]',
  challenged: 'text-[var(--color-coral)]',
  insufficient: 'text-[var(--color-amber)]',
}
const statusLabel: Record<Hypothesis['status'], string> = {
  supported: 'Supported by available evidence',
  challenged: 'Challenged by contradictory evidence',
  insufficient: 'Insufficient evidence',
}

const nodeColor = { observation: '#34D399', data: '#2DD4BF', hypothesis: '#F59E0B' }

export default function Investigation() {
  const [inv, setInv] = useState<Investigation | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [live, setLive] = useState(false)
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getInvestigation('inv-mahanadi-s4').then(({ data, live }) => {
      setInv(data)
      setLive(live)
    })
    getGraph('inv-mahanadi-s4').then(({ nodes, edges }) => {
      setNodes(nodes)
      setEdges(edges)
    })
  }, [])

  if (!inv) return <div className="min-h-screen" />

  const find = (id: string) => nodes.find((n) => n.id === id)!

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="flex flex-1 min-h-0">
        {/* rail */}
        <div className="w-16 border-r border-[var(--color-border)] flex flex-col items-center gap-5 pt-6 bg-black/10 hidden md:flex">
          {[Circle, Star, Diamond, Triangle, Square].map((Icon, i) => (
            <button
              key={i}
              className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition ${
                i === 0
                  ? 'bg-[rgba(52,211,153,0.14)] text-[var(--color-emerald)] border border-[rgba(52,211,153,0.3)]'
                  : 'text-[var(--color-muted)] hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 md:px-8 py-5 border-b border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
            <div>
              <h1 className="text-[19px] font-bold">{inv.title}</h1>
              <div className="text-[12.5px] text-[var(--color-muted)] mt-1">
                Opened from {inv.openedFrom} &middot; Status: {inv.statusNote}
              </div>
            </div>
            <div className="flex gap-2.5">
              <Pill>{inv.sourcesLinked} sources linked</Pill>
              <Pill tone="warn">{inv.evidenceGaps} evidence gap</Pill>
              <Pill tone={live ? 'ok' : 'muted'}>{live ? 'Live backend' : 'Demo data, clearly labelled'}</Pill>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* graph */}
            <div className="flex-[1.3] relative border-b md:border-b-0 md:border-r border-[var(--color-border)] min-h-[320px]">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(52,211,153,0.06), transparent 40%), radial-gradient(circle at 70% 70%, rgba(45,212,191,0.06), transparent 40%)',
                }}
              />
              <div className="absolute top-4 left-5 text-[12px] font-bold tracking-[0.1em] text-[var(--color-emerald)] z-10">
                SIGNAL-TO-EVIDENCE GRAPH
              </div>
              <svg viewBox="0 0 760 460" className="w-full h-full relative z-0">
                {edges.map((e, i) => {
                  const a = find(e.from)
                  const b = find(e.to)
                  if (!a || !b) return null
                  return (
                    <motion.line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.08 }}
                      stroke={e.kind === 'contradicts' ? 'rgba(248,113,113,0.55)' : 'rgba(143,182,165,0.35)'}
                      strokeWidth={1.6}
                      strokeDasharray={e.kind === 'contradicts' ? '5 4' : undefined}
                    />
                  )
                })}
                {nodes.map((n, i) => (
                  <motion.g
                    key={n.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.07, type: 'spring' }}
                    onMouseEnter={() => setHoverNode(n.id)}
                    onMouseLeave={() => setHoverNode(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r}
                      fill="#0E241B"
                      stroke={nodeColor[n.kind]}
                      strokeWidth={hoverNode === n.id ? 3 : 2}
                    />
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fill="#EAF6EF" fontFamily="Inter, sans-serif">
                      {n.label}
                    </text>
                  </motion.g>
                ))}
              </svg>
              <AnimatePresence>
                {hoverNode && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 left-5 right-5 glass rounded-lg px-4 py-2.5 text-[12.5px] text-[var(--color-muted)]"
                  >
                    {find(hoverNode)?.note}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* side */}
            <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col gap-3.5">
              <div className="text-[12px] font-bold tracking-[0.1em] text-[var(--color-muted)]">COMPETING HYPOTHESES</div>
              {inv.hypotheses.map((h, i) => (
                <motion.button
                  key={h.id}
                  onClick={() => navigate(`/counterfactual?h=${h.id}`)}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="glass rounded-xl p-4 text-left hover:border-[rgba(52,211,153,0.35)] transition-colors"
                >
                  <div className="font-bold text-[14.5px] mb-1.5">
                    {h.code} &middot; {h.name}
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {h.supporting > 0 && <Pill tone="ok">{h.supporting} supporting</Pill>}
                    {h.contradicting > 0 && <Pill tone="crit">{h.contradicting} contradicting</Pill>}
                    {h.missing > 0 && <Pill tone="warn">{h.missing} missing</Pill>}
                  </div>
                  <div className={`text-[12px] font-bold mt-2.5 ${statusColor[h.status]}`}>{statusLabel[h.status]}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="px-6 md:px-8 py-4 border-t border-[var(--color-border)] flex flex-wrap gap-3 justify-between items-center">
            <div className="text-[12px] text-[var(--color-muted)] max-w-[480px]">
              Every edge is traceable to a source record. Nothing here is a confirmed finding.
            </div>
            <div className="flex gap-2.5">
              <button className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[13px] font-semibold hover:bg-white/5 transition">
                Add new evidence
              </button>
              <button
                onClick={() => navigate('/counterfactual?h=h-a')}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-gradient-to-br from-[var(--color-emerald-dim)] to-[var(--color-teal)] text-[#06130D] hover:brightness-110 transition"
              >
                Challenge this hypothesis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
