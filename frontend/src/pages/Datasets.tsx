import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Nav from '../components/Nav'
import Pill from '../components/Pill'
import { getDatasets } from '../lib/api'
import type { SourceDataset } from '../data/types'
import { Database } from 'lucide-react'

export default function Datasets() {
  const [datasets, setDatasets] = useState<SourceDataset[]>([])
  const [live, setLive] = useState(false)

  useEffect(() => {
    getDatasets().then(({ data, live }) => {
      setDatasets(data)
      setLive(live)
    })
  }, [])

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-14">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-10">
          <div>
            <div className="text-[12px] font-bold tracking-[0.14em] text-[var(--color-emerald)] mb-3">DATASET OBSERVATORY</div>
            <h1 className="text-[28px] md:text-[32px] font-extrabold">India's open environmental data, in one registry.</h1>
            <p className="text-[14px] text-[var(--color-muted)] mt-3 max-w-[560px] leading-relaxed">
              Every source PRISM can draw evidence from, with its publisher, licence and how current it is. Nothing
              here is used in an investigation without being traced back to this registry.
            </p>
          </div>
          <Pill tone={live ? 'ok' : 'muted'}>{live ? 'Live backend' : 'Demo registry'}</Pill>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {datasets.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(45,212,191,0.1)] border border-[rgba(45,212,191,0.3)] flex items-center justify-center shrink-0">
                    <Database size={16} className="text-[var(--color-teal)]" />
                  </div>
                  <div className="font-bold text-[14.5px]">{d.name}</div>
                </div>
                <Pill tone={d.status === 'connected' ? 'ok' : 'warn'}>{d.status === 'connected' ? 'Connected' : 'Planned'}</Pill>
              </div>
              <p className="text-[12.5px] text-[var(--color-muted)] mt-3 leading-relaxed">{d.description}</p>
              <div className="grid grid-cols-2 gap-2.5 mt-4 text-[11.5px]">
                <div className="bg-white/[0.03] rounded-md px-3 py-2">
                  <div className="text-[var(--color-muted)]">Publisher</div>
                  <div className="font-semibold mt-0.5">{d.publisher}</div>
                </div>
                <div className="bg-white/[0.03] rounded-md px-3 py-2">
                  <div className="text-[var(--color-muted)]">Coverage</div>
                  <div className="font-semibold mt-0.5">{d.coverage}</div>
                </div>
                <div className="bg-white/[0.03] rounded-md px-3 py-2">
                  <div className="text-[var(--color-muted)]">Cadence</div>
                  <div className="font-semibold mt-0.5">{d.cadence}</div>
                </div>
                <div className="bg-white/[0.03] rounded-md px-3 py-2">
                  <div className="text-[var(--color-muted)]">Records</div>
                  <div className="font-semibold mt-0.5 tabular-nums">{d.recordCount.toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-3 italic">{d.licence}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
