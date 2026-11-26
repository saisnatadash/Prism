import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const STEPS = [
  'Loading CPCB river-quality readings',
  'Loading IMD rainfall records',
  'Loading India-WRIS gauge levels',
  'Linking citizen reports by place and time',
]

export default function Splash() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem('prism-splash') } catch { return true }
  })
  const [i, setI] = useState(0)

  useEffect(() => {
    if (!show) return
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 450)
    const done = setTimeout(() => {
      setShow(false)
      try { sessionStorage.setItem('prism-splash', '1') } catch { /* ignore */ }
    }, 2200)
    return () => { clearInterval(t); clearTimeout(done) }
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060f0b]"
        >
          <img src="./prism-mark.png" alt="PRISM" className="w-28 h-28 object-contain mb-6 drop-shadow-[0_0_50px_rgba(52,211,153,0.35)]" />
          <div className="font-display text-[28px] font-semibold tracking-tight">PRISM</div>
          <div className="font-mono text-[11px] text-[var(--color-muted)] mt-1 mb-8">ENVIRONMENTAL SIGNAL-TO-EVIDENCE ENGINE</div>
          <div className="w-[260px] h-[3px] bg-white/10 rounded overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="h-full bg-[var(--color-emerald)]"
            />
          </div>
          <div className="font-mono text-[11px] text-[var(--color-muted)] mt-4 h-4">{STEPS[i]}…</div>
          <div className="font-mono text-[10px] text-[var(--color-muted)]/70 mt-10">Demo case uses synthetic records in these sources' formats</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
