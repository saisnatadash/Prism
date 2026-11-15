import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Plus, RotateCcw } from 'lucide-react'
import Nav from '../components/Nav'
import Pill from '../components/Pill'
import AddEvidenceDialog from '../components/AddEvidenceDialog'
import { useInvestigation } from '../lib/store'
import { statusShort, statusTone, verdictText } from '../lib/engine'
import { DATASETS } from '../data/demo'

const datasetName = (id: string) => DATASETS.find((d) => d.id === id)?.name ?? id
const dot = { supported: 'bg-[var(--color-emerald)]', challenged: 'bg-[var(--color-coral)]', insufficient: 'bg-[var(--color-amber)]' }

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative shrink-0 w-9 h-5 rounded-full border transition-colors ${
        on ? 'bg-[rgba(52,211,153,0.25)] border-[var(--color-emerald)]' : 'bg-transparent border-[var(--color-border)]'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full transition-transform ${
          on ? 'translate-x-4 bg-[var(--color-emerald)]' : 'bg-[var(--color-muted)]'
        }`}
      />
    </button>
  )
}

export default function Counterfactual() {
  const [params, setParams] = useSearchParams()
  const { loading, hyps, baseline, toggleEvidence, reset, dirty } = useInvestigation()
  const [adding, setAdding] = useState(false)

  if (loading || hyps.length === 0) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="p-10 font-mono text-[12px] text-[var(--color-muted)]">Loading…</div>
      </div>
    )
  }

  const active = hyps.find((h) => h.id === params.get('h')) ?? hyps[0]
  const before = baseline[active.id]
  const changed = before !== active.status
  const toggleable = active.evidence.filter((e) => e.stance !== 'gap')
  const gaps = active.evidence.filter((e) => e.stance === 'gap')

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <div className="px-6 md:px-8 pt-5 pb-0 border-b border-[var(--color-border)]">
        <div className="font-mono text-[10.5px] text-[var(--color-muted)] mb-3">COUNTERFACTUAL EVIDENCE ENGINE</div>
        <div role="tablist" className="flex gap-1 overflow-x-auto">
          {hyps.map((h) => (
            <button
              key={h.id}
              role="tab"
              aria-selected={h.id === active.id}
              onClick={() => setParams({ h: h.id }, { replace: true })}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 -mb-px whitespace-nowrap transition-colors ${
                h.id === active.id
                  ? 'border-[var(--color-emerald)] text-white'
                  : 'border-transparent text-[var(--color-muted)] hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot[h.status]}`} />
              <span className="font-mono text-[11px]">{h.code}</span>
              {h.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5 md:p-8 gap-6 max-w-[1280px] w-full mx-auto">
        <motion.h1
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[26px] md:text-[34px] font-medium leading-tight max-w-[860px]"
          style={{ textWrap: 'balance' }}
        >
          What would change our conclusion about{' '}
          <span className="italic text-[var(--color-emerald)]">{active.name.toLowerCase()}</span>?
        </motion.h1>

        <div className="grid lg:grid-cols-3 gap-5 flex-1">
          {/* assumptions */}
          <section className="border border-[var(--color-border)] rounded-[6px] p-5 flex flex-col gap-3">
            <h2 className="font-mono text-[10.5px] text-[var(--color-muted)]">1 · ASSUMPTIONS IT DEPENDS ON</h2>
            {active.assumptions.map((a, i) => (
              <p key={i} className="text-[13px] leading-relaxed pl-3 border-l border-[var(--color-border)]">
                {a}
              </p>
            ))}
          </section>

          {/* what-if evidence */}
          <section className="border border-[var(--color-border)] rounded-[6px] p-5 flex flex-col gap-3">
            <div>
              <h2 className="font-mono text-[10.5px] text-[var(--color-emerald)]">2 · TRY IT: SWITCH EVIDENCE OFF</h2>
              <p className="text-[12px] text-[var(--color-muted)] mt-1 leading-relaxed">
                What if a reading were wrong or unavailable? Turn it off and watch the conclusion.
              </p>
            </div>
            {toggleable.length === 0 && <p className="text-[13px] text-[var(--color-muted)] italic">No supporting or contradicting evidence yet.</p>}
            {toggleable.map((e) => (
              <div key={e.id} className="flex items-start gap-3 py-2.5 border-t border-[var(--color-border)] first:border-t-0">
                <div className={`flex-1 min-w-0 transition-opacity ${e.disabled ? 'opacity-40' : ''}`}>
                  <div
                    className={`font-mono text-[10.5px] mb-1 ${e.stance === 'supports' ? 'text-[var(--color-emerald)]' : 'text-[var(--color-coral)]'}`}
                  >
                    {e.stance === 'supports' ? 'SUPPORTS' : 'CONTRADICTS'}
                  </div>
                  <p className={`text-[13px] leading-relaxed ${e.disabled ? 'line-through' : ''}`}>{e.text}</p>
                  <div className="font-mono text-[10px] text-[var(--color-muted)] mt-1">
                    {datasetName(e.sourceDatasetId)}
                    {e.userAdded && ' · added this session'}
                  </div>
                </div>
                <Switch on={!e.disabled} onChange={() => toggleEvidence(active.id, e.id)} label={`Include: ${e.text}`} />
              </div>
            ))}
          </section>

          {/* gaps */}
          <section className="border border-[var(--color-border)] rounded-[6px] p-5 flex flex-col gap-3">
            <h2 className="font-mono text-[10.5px] text-[var(--color-amber)]">3 · STILL MISSING</h2>
            {gaps.length === 0 && <p className="text-[13px] text-[var(--color-muted)] italic">No recorded gaps for this hypothesis.</p>}
            {gaps.map((e) => (
              <p key={e.id} className="text-[13px] leading-relaxed pl-3 border-l-2 border-[var(--color-amber)]">
                {e.text}
              </p>
            ))}
            <div className="mt-auto pt-3 text-[12.5px] leading-relaxed border-t border-[var(--color-border)]">
              <span className="font-mono text-[10px] text-[var(--color-emerald)] block mb-1">NEXT BEST CHECK</span>
              {active.recommendedCheck}
            </div>
          </section>
        </div>

        {/* verdict */}
        <div className="border border-[var(--color-border)] rounded-[6px] p-5 flex flex-wrap gap-5 items-center justify-between bg-[rgba(255,255,255,0.015)]">
          <div className="min-w-0 max-w-[680px]">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className="font-mono text-[10.5px] text-[var(--color-muted)]">{changed ? 'WAS' : 'CONCLUSION'}</span>
              <Pill tone={statusTone[before]}>{statusShort[before]}</Pill>
              <AnimatePresence>
                {changed && (
                  <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                    <ArrowRight size={13} className="text-[var(--color-muted)]" />
                    <span className="font-mono text-[10.5px] text-[var(--color-muted)]">NOW</span>
                    <Pill tone={statusTone[active.status]}>{statusShort[active.status]}</Pill>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p key={active.status + active.missing} className="text-[13.5px] leading-relaxed">
              {verdictText(active)}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={reset}
              disabled={!dirty}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border border-[var(--color-border)] text-[13px] font-semibold hover:bg-white/5 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <RotateCcw size={13} /> Reset what-ifs
            </button>
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-semibold bg-[var(--color-emerald)] text-[#06130D] hover:bg-[var(--color-teal)] transition-colors"
            >
              <Plus size={14} /> Add new evidence
            </button>
          </div>
        </div>
      </div>

      <AddEvidenceDialog open={adding} onClose={() => setAdding(false)} defaultHypothesisId={active.id} />
    </div>
  )
}
