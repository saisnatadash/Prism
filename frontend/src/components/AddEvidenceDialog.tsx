import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useInvestigation } from '../lib/store'
import { DATASETS } from '../data/demo'
import type { EvidenceStance } from '../data/types'

const stances: { value: EvidenceStance; label: string; hint: string }[] = [
  { value: 'supports', label: 'Supports', hint: 'Backs this explanation' },
  { value: 'contradicts', label: 'Contradicts', hint: 'Argues against it' },
  { value: 'gap', label: 'Missing', hint: 'Something still unverified' },
]

const inputCls =
  'w-full bg-[#07140F] border border-[var(--color-border)] rounded-[4px] px-3 py-2 text-[13px] text-[var(--color-ink)] placeholder:text-[#58796b] focus:outline-none focus:border-[var(--color-emerald)]'

export default function AddEvidenceDialog({
  open,
  onClose,
  defaultHypothesisId,
}: {
  open: boolean
  onClose: () => void
  defaultHypothesisId?: string | null
}) {
  const { hyps, addEvidence } = useInvestigation()
  const [hypId, setHypId] = useState('')
  const [stance, setStance] = useState<EvidenceStance>('supports')
  const [source, setSource] = useState('cpcb-aqi')
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setHypId(defaultHypothesisId ?? hyps[0]?.id ?? '')
    setText('')
    setStance('supports')
    setTouched(false)
    const t = setTimeout(() => textRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [open, defaultHypothesisId, hyps])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const invalid = text.trim().length < 8

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (invalid || !hypId) return
    addEvidence(hypId, { text: text.trim(), stance, sourceDatasetId: source })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-ev-title"
            onSubmit={submit}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[480px] bg-[var(--color-panel)] border border-[var(--color-border)] rounded-[8px] p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 id="add-ev-title" className="font-display text-[21px] font-medium">
                  Add new evidence
                </h2>
                <p className="text-[12px] text-[var(--color-muted)] mt-1 leading-relaxed">
                  The status of the hypothesis recomputes immediately. Kept in this browser session only; nothing is
                  saved to the backend.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--color-muted)] hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <label htmlFor="ev-hyp" className="block font-mono text-[10.5px] text-[var(--color-muted)] mb-1.5">
              HYPOTHESIS
            </label>
            <select id="ev-hyp" value={hypId} onChange={(e) => setHypId(e.target.value)} className={`${inputCls} mb-4`}>
              {hyps.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} · {h.name}
                </option>
              ))}
            </select>

            <div className="font-mono text-[10.5px] text-[var(--color-muted)] mb-1.5">THIS EVIDENCE</div>
            <div className="grid grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label="Evidence stance">
              {stances.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={stance === s.value}
                  onClick={() => setStance(s.value)}
                  className={`text-left rounded-[4px] border px-3 py-2 transition-colors ${
                    stance === s.value
                      ? 'border-[var(--color-emerald)] bg-[rgba(52,211,153,0.08)]'
                      : 'border-[var(--color-border)] hover:bg-white/5'
                  }`}
                >
                  <div className="text-[12.5px] font-semibold">{s.label}</div>
                  <div className="text-[10.5px] text-[var(--color-muted)] leading-snug mt-0.5">{s.hint}</div>
                </button>
              ))}
            </div>

            <label htmlFor="ev-text" className="block font-mono text-[10.5px] text-[var(--color-muted)] mb-1.5">
              WHAT DID YOU FIND?
            </label>
            <textarea
              id="ev-text"
              ref={textRef}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Station 14 calibration log shows a drift correction two days before the reading."
              className={`${inputCls} resize-none`}
            />
            {touched && invalid && (
              <p className="text-[11.5px] text-[var(--color-coral)] mt-1.5">Describe it in a sentence (at least 8 characters).</p>
            )}

            <label htmlFor="ev-src" className="block font-mono text-[10.5px] text-[var(--color-muted)] mt-4 mb-1.5">
              SOURCE DATASET
            </label>
            <select id="ev-src" value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
              {DATASETS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[4px] border border-[var(--color-border)] text-[13px] font-semibold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-[4px] text-[13px] font-semibold bg-[var(--color-emerald)] text-[#06130D] hover:bg-[var(--color-teal)] transition-colors"
              >
                Add evidence
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
