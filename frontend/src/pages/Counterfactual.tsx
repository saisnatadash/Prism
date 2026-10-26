import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import Nav from '../components/Nav'
import Pill from '../components/Pill'
import { getInvestigation } from '../lib/api'
import type { Investigation, Hypothesis } from '../data/types'

const stanceStyle = {
  supports: 'border-l-[rgba(52,211,153,0.4)]',
  contradicts: 'border-l-[rgba(248,113,113,0.4)]',
  gap: 'border-l-[rgba(245,158,11,0.4)]',
}

export default function Counterfactual() {
  const [params] = useSearchParams()
  const [inv, setInv] = useState<Investigation | null>(null)
  const [active, setActive] = useState<Hypothesis | null>(null)

  useEffect(() => {
    getInvestigation('inv-mahanadi-s4').then(({ data }) => {
      setInv(data)
      const hId = params.get('h') ?? data.hypotheses[0].id
      setActive(data.hypotheses.find((h) => h.id === hId) ?? data.hypotheses[0])
    })
  }, [params])

  if (!inv || !active) return <div className="min-h-screen" />

  const supports = active.evidence.filter((e) => e.stance === 'supports')
  const contradicts = active.evidence.filter((e) => e.stance === 'contradicts')
  const gaps = active.evidence.filter((e) => e.stance === 'gap')

  const verdict =
    active.status === 'challenged'
      ? `The contradicting record weakens hypothesis ${active.code}. The investigation favours an alternative explanation pending further evidence.`
      : active.status === 'supported'
        ? `Available evidence currently supports hypothesis ${active.code}, but ${active.missing} point${active.missing === 1 ? '' : 's'} of evidence remain missing before this can be treated as a finding.`
        : `There isn't enough evidence yet to support or challenge hypothesis ${active.code}.`

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-[var(--color-border)] flex-wrap gap-3">
        <div className="font-bold text-[15px] flex items-center gap-2">
          Counterfactual Evidence Engine
          <div className="flex gap-1.5 ml-3">
            {inv.hypotheses.map((h) => (
              <button
                key={h.id}
                onClick={() => setActive(h)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition ${
                  h.id === active.id
                    ? 'border-[var(--color-emerald)] text-[var(--color-emerald)] bg-[rgba(52,211,153,0.08)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-white/5'
                }`}
              >
                {h.code}
              </button>
            ))}
          </div>
        </div>
        <Pill tone="crit">Challenging: Hypothesis {active.code}</Pill>
      </div>

      <div className="flex-1 flex flex-col p-5 md:p-8 gap-6">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[22px] md:text-[27px] font-extrabold max-w-[900px] leading-snug"
        >
          What would change our conclusion?{' '}
          <span className="text-[var(--color-emerald)]">Testing &ldquo;{active.name.toLowerCase()}.&rdquo;</span>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 flex-1 min-h-0">
          <motion.div
            key={`a-${active.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="text-[12px] font-bold tracking-[0.08em] text-[var(--color-muted)]">ASSUMPTIONS THIS HYPOTHESIS DEPENDS ON</div>
            {active.assumptions.map((a, i) => (
              <div key={i} className="text-[13px] leading-relaxed bg-white/[0.03] border border-[var(--color-border)] rounded-lg px-3.5 py-3">
                {a}
              </div>
            ))}
          </motion.div>

          <motion.div
            key={`b-${active.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="glass rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="text-[12px] font-bold tracking-[0.08em] text-[var(--color-emerald)]">SUPPORTS / CONTRADICTS</div>
            {[...supports, ...contradicts].map((e) => (
              <div
                key={e.id}
                className={`text-[13px] leading-relaxed bg-white/[0.03] border border-[var(--color-border)] ${stanceStyle[e.stance]} border-l-4 rounded-lg px-3.5 py-3`}
              >
                {e.text}
              </div>
            ))}
            {supports.length + contradicts.length === 0 && (
              <div className="text-[13px] text-[var(--color-muted)] italic">No supporting or contradicting evidence linked yet.</div>
            )}
          </motion.div>

          <motion.div
            key={`c-${active.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="glass rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="text-[12px] font-bold tracking-[0.08em] text-[var(--color-amber)]">MISSING EVIDENCE</div>
            {gaps.map((e) => (
              <div
                key={e.id}
                className={`text-[13px] leading-relaxed bg-white/[0.03] border border-[var(--color-border)] ${stanceStyle.gap} border-l-4 rounded-lg px-3.5 py-3`}
              >
                {e.text}
              </div>
            ))}
            <div className="text-[13px] leading-relaxed rounded-lg px-3.5 py-3 border border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.06)]">
              Recommended: {active.recommendedCheck}
            </div>
          </motion.div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 pt-2 border-t border-[var(--color-border)] pt-5">
          <motion.div key={`v-${active.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12.5px] text-[var(--color-muted)] max-w-[640px]">
            {verdict}
          </motion.div>
          <div className="flex gap-2.5">
            <button className="px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-[13px] font-semibold hover:bg-white/5 transition">
              Test an alternative explanation
            </button>
            <button className="px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-gradient-to-br from-[var(--color-emerald-dim)] to-[var(--color-teal)] text-[#06130D] hover:brightness-110 transition">
              Add new evidence
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
