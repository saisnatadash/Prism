import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, Clock, Pause, Play, RotateCcw, X } from 'lucide-react'
import Nav from '../components/Nav'
import Pill from '../components/Pill'
import { BASELINE_PER_DAY, FORMED_AT } from '../data/monitor'
import type { Lang } from '../data/monitor'
import { TOTAL, deriveMonitor, tagLabel, wardStateLabel } from '../lib/monitorEngine'
import type { BannerTone, PredictionState, WardState } from '../lib/monitorEngine'

type Tab = 'overview' | 'feed' | 'investigation'

const bannerStyle: Record<BannerTone, string> = {
  calm: 'border-[var(--color-border)] text-[var(--color-muted)]',
  watch: 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.07)] text-[var(--color-amber)]',
  alert: 'border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.08)] text-[var(--color-coral)]',
  revised: 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.07)] text-[var(--color-amber)]',
}
const bannerDot: Record<BannerTone, string> = {
  calm: 'bg-[var(--color-muted)]',
  watch: 'bg-[var(--color-amber)]',
  alert: 'bg-[var(--color-coral)]',
  revised: 'bg-[var(--color-amber)]',
}
const wardDot: Record<WardState, string> = {
  none: 'bg-[var(--color-border)]',
  normal: 'bg-[var(--color-ink)]',
  emerging: 'bg-[var(--color-amber)]',
  high: 'bg-[var(--color-coral)]',
  anomaly: 'bg-[var(--color-amber)]',
}
const wardText: Record<WardState, string> = {
  none: 'text-[var(--color-muted)]',
  normal: 'text-[var(--color-muted)]',
  emerging: 'text-[var(--color-amber)]',
  high: 'text-[var(--color-coral)]',
  anomaly: 'text-[var(--color-amber)]',
}
const langStyle: Record<Lang, string> = {
  EN: 'text-[var(--color-teal)] border-[rgba(45,212,191,0.35)]',
  HI: 'text-[var(--color-amber)] border-[rgba(245,158,11,0.35)]',
  OR: 'text-[#C4B5FD] border-[rgba(196,181,253,0.35)]',
  SYS: 'text-[var(--color-muted)] border-[var(--color-border)]',
}
const langLabel = (l: Lang) => (l === 'SYS' ? 'FEED' : l)

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="border border-[var(--color-border)] rounded-[6px] p-4">
      <div className="font-mono text-[10px] text-[var(--color-muted)] tracking-wide">{label}</div>
      <div className="font-display text-[30px] leading-none mt-2 tabular-nums">{value}</div>
      <div className="font-mono text-[10px] text-[var(--color-muted)] mt-2">{sub}</div>
    </div>
  )
}

function PredictionIcon({ state }: { state: PredictionState }) {
  if (state === 'confirmed') return <Check size={13} className="text-[var(--color-emerald)] shrink-0 mt-[3px]" aria-label="Confirmed" />
  if (state === 'failed') return <X size={13} className="text-[var(--color-coral)] shrink-0 mt-[3px]" aria-label="Did not hold" />
  return <Clock size={13} className="text-[var(--color-amber)] shrink-0 mt-[3px]" aria-label="Awaiting evidence" />
}

function ConfidenceChart({ history }: { history: { step: number; score: number }[] }) {
  const W = 640
  const H = 170
  const padX = 36
  const padY = 24
  const slots = TOTAL - FORMED_AT + 1
  const x = (i: number) => padX + (i * (W - padX * 2)) / (slots - 1)
  const y = (s: number) => H - padY - (s / 100) * (H - padY * 2)
  const path = history.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.score)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Confidence in the leading hypothesis after each report">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="rgba(52,211,153,0.12)" strokeDasharray="3 4" />
          <text x={padX - 8} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#8FB6A5" fontFamily="IBM Plex Mono">
            {g}%
          </text>
        </g>
      ))}
      {Array.from({ length: slots }, (_, i) => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="9.5" fill="#8FB6A5" fontFamily="IBM Plex Mono">
          #{FORMED_AT + i}
        </text>
      ))}
      <path d={path} fill="none" stroke="#34D399" strokeWidth="2" strokeLinejoin="round" />
      {history.map((p, i) => {
        const falling = i > 0 && p.score < history[i - 1].score
        return (
          <g key={p.step}>
            <circle cx={x(i)} cy={y(p.score)} r="4.5" fill={falling ? '#F59E0B' : '#34D399'} stroke="#050D0A" strokeWidth="2" />
            <text
              x={x(i)}
              y={y(p.score) - 11}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={falling ? '#F59E0B' : '#EAF6EF'}
              fontFamily="IBM Plex Mono"
            >
              {p.score}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Monitor() {
  const [n, setN] = useState(0)
  const [tab, setTab] = useState<Tab>('overview')
  const [playing, setPlaying] = useState(false)

  const s = useMemo(() => deriveMonitor(n), [n])

  useEffect(() => {
    if (!playing) return
    if (n >= TOTAL) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setN((v) => Math.min(v + 1, TOTAL)), 1300)
    return () => clearTimeout(t)
  }, [playing, n])

  const next = () => setN((v) => Math.min(v + 1, TOTAL))
  const reset = () => {
    setPlaying(false)
    setN(0)
    setTab('overview')
  }
  const togglePlay = () => {
    if (n >= TOTAL) {
      setN(0)
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }

  const tabs: { id: Tab; label: string; hint?: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'feed', label: 'Live feed', hint: n > 0 ? String(n) : undefined },
    { id: 'investigation', label: 'Investigation', hint: s.formed ? 'new' : undefined },
  ]

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="max-w-[680px]">
            <div className="font-mono text-[10.5px] text-[var(--color-muted)] mb-2">LIVE MONITOR · MAHANADI SECTOR 4, ODISHA</div>
            <h1 className="font-display text-[28px] md:text-[34px] font-medium leading-tight" style={{ textWrap: 'balance' }}>
              Early river-pollution intelligence from citizen reports and sensor feeds
            </h1>
            <p className="text-[13.5px] text-[var(--color-muted)] mt-2 leading-relaxed">
              Citizen reports in three languages and CPCB, IMD and India-WRIS feeds are linked by place and time. When a signal
              grows, PRISM drafts rival explanations and then looks for evidence that breaks them.
            </p>
          </div>
          <Pill tone="warn">Demo data, clearly labelled</Pill>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2.5 border rounded-[6px] px-4 py-2.5 text-[13px] mb-5 transition-colors ${bannerStyle[s.banner.tone]}`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${bannerDot[s.banner.tone]} ${s.banner.tone === 'alert' ? 'glow-dot' : ''}`} />
          {s.banner.text}
        </div>

        <div role="tablist" aria-label="Monitor views" className="flex gap-1 border-b border-[var(--color-border)] mb-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-emerald)] text-white'
                  : 'border-transparent text-[var(--color-muted)] hover:text-white'
              }`}
            >
              {t.label}
              {t.hint && (
                <span className="font-mono text-[10px] px-1.5 py-[1px] rounded-[3px] bg-[rgba(52,211,153,0.12)] text-[var(--color-emerald)]">
                  {t.hint}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border border-[var(--color-border)] rounded-[6px] p-4 mb-5">
          <button
            onClick={next}
            disabled={s.done}
            className="inline-flex items-center px-4 py-2.5 rounded-[4px] text-[13px] font-semibold bg-[var(--color-emerald)] text-[#06130D] hover:bg-[var(--color-teal)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-emerald)]"
          >
            {s.done ? 'End of sequence' : 'Load next report'}
          </button>
          <button
            onClick={togglePlay}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border border-[var(--color-border)] text-[13px] font-semibold hover:bg-white/5 transition-colors"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? 'Pause' : s.done ? 'Replay' : 'Auto-play'}
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border border-[var(--color-border)] text-[13px] font-semibold hover:bg-white/5 transition-colors"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <span className="text-[12.5px] text-[var(--color-muted)] min-w-0">{s.caption}</span>
        </div>

        {tab === 'overview' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="REPORTS & FEEDS" value={n} sub="ingested, raw" />
              <Stat label="LANGUAGES" value={3} sub="en · hi · or" />
              <Stat label="AREAS ACTIVE" value={s.wardsActive} sub="near Bhubaneswar" />
              <Stat label="WINDOW" value={s.window} sub="simulated day" />
            </div>

            <section>
              <h2 className="font-mono text-[10.5px] text-[var(--color-muted)] mb-3">AREA STATUS</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {s.wards.map((w) => (
                  <div
                    key={w.name}
                    className={`border rounded-[6px] p-3.5 transition-colors ${
                      w.state === 'high' ? 'border-[rgba(248,113,113,0.45)]' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <div className="text-[13px] font-semibold">{w.name}</div>
                    <div className={`flex items-center gap-1.5 text-[11.5px] mt-2 ${wardText[w.state]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${wardDot[w.state]}`} />
                      {wardStateLabel(w.state)}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--color-muted)] mt-1.5">
                      {w.count} {w.count === 1 ? 'report' : 'reports'}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {n > 0 && (
              <section className="border border-[var(--color-border)] rounded-[6px] p-4">
                <div className="font-mono text-[10.5px] text-[var(--color-muted)] mb-2">LATEST REPORT</div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-[var(--color-muted)] pt-0.5">{s.seen[n - 1].time}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-[1px] rounded-[3px] border ${langStyle[s.seen[n - 1].lang]}`}>
                    {langLabel(s.seen[n - 1].lang)}
                  </span>
                  <div className="text-[13.5px] leading-relaxed">
                    {s.seen[n - 1].text}
                    <div className="font-mono text-[10px] text-[var(--color-muted)] mt-1">{s.seen[n - 1].ward}</div>
                  </div>
                </div>
              </section>
            )}

            {s.formed && (
              <button
                onClick={() => setTab('investigation')}
                className="self-start text-[13px] font-semibold text-[var(--color-emerald)] hover:text-[var(--color-teal)] transition-colors"
              >
                Open the investigation →
              </button>
            )}
          </div>
        )}

        {tab === 'feed' && (
          <section className="border border-[var(--color-border)] rounded-[6px]">
            <div className="flex justify-between px-5 py-3 border-b border-[var(--color-border)]">
              <h2 className="font-mono text-[10.5px] text-[var(--color-muted)]">LIVE REPORT FEED</h2>
              <span className="font-mono text-[10.5px] text-[var(--color-muted)]">most recent first</span>
            </div>
            {n === 0 && <p className="px-5 py-8 text-[13px] text-[var(--color-muted)]">No reports yet. Press “Load next report”.</p>}
            <ul>
              <AnimatePresence initial={false}>
                {[...s.seen].reverse().map((r) => {
                  const label = tagLabel(r.tag, s.formed)
                  return (
                    <motion.li
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <span className="font-mono text-[11px] text-[var(--color-muted)] pt-0.5 w-10 shrink-0">{r.time}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-[1px] rounded-[3px] border mt-0.5 shrink-0 ${langStyle[r.lang]}`}>
                        {langLabel(r.lang)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] leading-relaxed">
                          {r.text}
                          {label && (
                            <span
                              className={`ml-2 font-mono text-[10px] px-1.5 py-[1px] rounded-[3px] border align-middle ${
                                r.tag === 'contradicts'
                                  ? 'text-[var(--color-coral)] border-[rgba(248,113,113,0.35)]'
                                  : 'text-[var(--color-emerald)] border-[rgba(52,211,153,0.35)]'
                              }`}
                            >
                              {label}
                            </span>
                          )}
                        </p>
                        {r.translation && (
                          <p className="text-[12.5px] italic text-[var(--color-muted)] mt-1">Translated: {r.translation}</p>
                        )}
                        <div className="font-mono text-[10px] text-[var(--color-muted)] mt-1">
                          {r.ward} · {r.lang === 'SYS' ? 'automated data feed' : 'extracted → structured signal'}
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </section>
        )}

        {tab === 'investigation' && (
          <div className="flex flex-col gap-5">
            {!s.formed ? (
              <div className="border border-dashed border-[var(--color-border)] rounded-[6px] p-8 text-center">
                <p className="font-display text-[20px]">No investigation yet</p>
                <p className="text-[13px] text-[var(--color-muted)] mt-2 max-w-[460px] mx-auto leading-relaxed">
                  PRISM opens an investigation once a ward signal reaches high confidence. Keep loading reports and it will
                  appear here with its rival hypotheses.
                </p>
              </div>
            ) : (
              <>
                <section className="border border-[var(--color-border)] rounded-[6px] p-5 flex items-center gap-5">
                  <div className="relative w-[84px] h-[84px] shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(248,113,113,0.15)" strokeWidth="3.4" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="#F87171"
                        strokeWidth="3.4"
                        strokeLinecap="round"
                        strokeDasharray={`${(s.anomaly / 100) * 97.4} 97.4`}
                        style={{ transition: 'stroke-dasharray 0.6s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-display text-[22px] tabular-nums">
                      {s.anomaly}%
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10.5px] text-[var(--color-muted)]">ANOMALY SCORE</div>
                    <p className="text-[14px] mt-1.5 leading-relaxed">
                      <strong className="font-semibold">{s.related} related reports</strong> against a baseline of about{' '}
                      {BASELINE_PER_DAY} a day in {s.leadWard}.
                    </p>
                  </div>
                </section>

                <section className="border border-[var(--color-border)] rounded-[6px] p-5">
                  <div className="font-mono text-[10.5px] text-[var(--color-emerald)] mb-1.5">NEXT BEST CHECK</div>
                  <p className="text-[13.5px] leading-relaxed">{s.nextCheck}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 pt-3 border-t border-[var(--color-border)] text-[13px] font-semibold">
                    <Link to="/investigation" className="text-[var(--color-emerald)] hover:text-[var(--color-teal)] transition-colors">
                      See the evidence graph →
                    </Link>
                    <Link to="/counterfactual?h=h-a" className="text-[var(--color-emerald)] hover:text-[var(--color-teal)] transition-colors">
                      Challenge the leading hypothesis →
                    </Link>
                  </div>
                </section>

                <section>
                  <h2 className="font-mono text-[10.5px] text-[var(--color-muted)] mb-3">COMPETING HYPOTHESES</h2>
                  <div className="grid lg:grid-cols-3 gap-4">
                    {s.hypotheses.map((h) => {
                      const leading = h.id === s.leadingId
                      return (
                        <article
                          key={h.id}
                          className={`rounded-[6px] p-5 border transition-colors ${
                            leading ? 'border-[var(--color-emerald)] bg-[rgba(52,211,153,0.04)]' : 'border-[var(--color-border)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-display text-[17px] font-medium leading-snug">{h.name}</h3>
                          </div>
                          <div className="flex items-baseline gap-2 mt-2">
                            <motion.span
                              key={h.score}
                              initial={{ opacity: 0.3 }}
                              animate={{ opacity: 1 }}
                              className={`font-display text-[30px] tabular-nums ${leading ? 'text-[var(--color-emerald)]' : 'text-[var(--color-muted)]'}`}
                            >
                              {h.score}%
                            </motion.span>
                            {leading && <Pill tone="ok">Leading</Pill>}
                          </div>

                          <h4 className="font-mono text-[10px] text-[var(--color-muted)] mt-4 mb-1.5">SUPPORTING EVIDENCE</h4>
                          <ul className="flex flex-col gap-1.5">
                            {h.evidence.map((e) => (
                              <li
                                key={e.text}
                                className={`text-[12.5px] leading-snug pl-2.5 border-l-2 ${
                                  e.kind === 'supports' ? 'border-[var(--color-emerald)]' : 'border-[var(--color-coral)] text-[var(--color-coral)]'
                                }`}
                              >
                                {e.kind === 'contradicts' && <span className="font-mono text-[9.5px] mr-1.5">CONTRADICTS</span>}
                                {e.text}
                              </li>
                            ))}
                          </ul>

                          <h4 className="font-mono text-[10px] text-[var(--color-muted)] mt-4 mb-1.5">ASSUMPTIONS</h4>
                          <ul className="flex flex-col gap-1">
                            {h.assumptions.map((a) => (
                              <li key={a} className="text-[12.5px] leading-snug text-[var(--color-muted)]">
                                {a}
                              </li>
                            ))}
                          </ul>

                          <h4 className="font-mono text-[10px] text-[var(--color-muted)] mt-4 mb-1.5">WHAT MUST BE TRUE</h4>
                          <ul className="flex flex-col gap-1.5">
                            {h.predictions.map((p) => (
                              <li key={p.text} className="flex gap-2 text-[12.5px] leading-snug">
                                <PredictionIcon state={p.state} />
                                <span className={p.state === 'failed' ? 'text-[var(--color-muted)] line-through decoration-[rgba(248,113,113,0.6)]' : ''}>
                                  {p.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      )
                    })}
                  </div>
                </section>

                <section className="border border-[var(--color-border)] rounded-[6px] p-5">
                  <h2 className="font-mono text-[10.5px] text-[var(--color-muted)] mb-2">CONFIDENCE EVOLUTION · {s.trackedName.toUpperCase()}</h2>
                  <ConfidenceChart history={s.history} />
                  <p className="text-[12px] text-[var(--color-muted)] mt-2">
                    Each point is the confidence after that report number. It can fall as well as rise.
                  </p>
                </section>
              </>
            )}
          </div>
        )}

        <p className="mt-8 font-mono text-[10.5px] text-[var(--color-muted)] leading-relaxed">
          Preview build. Sequenced with a pre-written, synthetic dataset while the live LLM and clustering pipeline is being
          deployed. Hypothesis scores in this preview are scripted, not model output.
        </p>
      </div>
    </div>
  )
}
