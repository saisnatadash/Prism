import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Nav from '../components/Nav'
import Pill from '../components/Pill'
import { getDatasets } from '../lib/api'
import type { SourceDataset } from '../data/types'

type Filter = 'all' | 'connected' | 'planned'

export default function Datasets() {
  const [datasets, setDatasets] = useState<SourceDataset[]>([])
  const [live, setLive] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    getDatasets().then(({ data, live }) => {
      setDatasets(data)
      setLive(live)
    })
  }, [])

  const counts = useMemo(
    () => ({
      all: datasets.length,
      connected: datasets.filter((d) => d.status === 'connected').length,
      planned: datasets.filter((d) => d.status === 'planned').length,
    }),
    [datasets],
  )
  const shown = datasets.filter((d) => filter === 'all' || d.status === filter)

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-12">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
          <div className="max-w-[640px]">
            <div className="font-mono text-[10.5px] text-[var(--color-muted)] mb-3">DATASET OBSERVATORY</div>
            <h1 className="font-display text-[30px] md:text-[38px] font-medium leading-tight" style={{ textWrap: 'balance' }}>
              India's open environmental data, in one registry.
            </h1>
            <p className="text-[14px] text-[var(--color-muted)] mt-3 leading-relaxed">
              Every source PRISM can draw evidence from, with publisher, licence and how current it is. Nothing is used in
              an investigation without tracing back to a row here.
            </p>
          </div>
          <Pill tone={live ? 'ok' : 'muted'}>{live ? 'Live backend' : 'Demo registry'}</Pill>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-y border-[var(--color-border)] py-3">
          <div role="tablist" aria-label="Filter datasets" className="flex gap-1.5">
            {(['all', 'connected', 'planned'] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-[4px] text-[12.5px] capitalize border transition-colors ${
                  filter === f
                    ? 'border-[var(--color-emerald)] text-[var(--color-emerald)] bg-[rgba(52,211,153,0.07)]'
                    : 'border-transparent text-[var(--color-muted)] hover:text-white'
                }`}
              >
                {f === 'connected' ? 'modelled' : f} <span className="font-mono text-[10.5px] opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>
          <div className="font-mono text-[11px] text-[var(--color-muted)]">
            {counts.connected} sources modelled with synthetic records, {counts.planned} planned
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {shown.map((d, i) => (
            <motion.article
              key={d.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="border border-[var(--color-border)] rounded-[6px] p-5 hover:border-[rgba(52,211,153,0.35)] transition-colors"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-mono text-[10px] text-[var(--color-muted)] mb-1">{d.id}</div>
                  <h2 className="font-display text-[18px] font-medium leading-snug">{d.name}</h2>
                </div>
                <Pill tone={d.status === 'connected' ? 'ok' : 'warn'}>{d.status === 'connected' ? 'Modelled' : 'Planned'}</Pill>
              </div>
              <p className="text-[12.5px] text-[var(--color-muted)] mt-3 leading-relaxed">{d.description}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 text-[12px]">
                {(
                  [
                    ['Publisher', d.publisher],
                    ['Coverage', d.coverage],
                    ['Cadence', d.cadence],
                    ['Records', d.status === 'connected' ? 'Synthetic demo set' : 'Not ingested'],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="border-t border-[var(--color-border)] pt-2">
                    <dt className="font-mono text-[10px] text-[var(--color-muted)]">{k.toUpperCase()}</dt>
                    <dd className="mt-0.5 tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="font-mono text-[10.5px] text-[var(--color-muted)] mt-4">{d.licence}</div>
            </motion.article>
          ))}
        </div>
        <p className="mt-8 font-mono text-[10.5px] text-[var(--color-muted)]">
          Modelled means the demo case uses synthetic records in this source's format. No live feed is connected yet.
        </p>
      </div>
    </div>
  )
}
