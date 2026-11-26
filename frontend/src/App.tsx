import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import Investigation from './pages/Investigation'
import Counterfactual from './pages/Counterfactual'
import Datasets from './pages/Datasets'
import Monitor from './pages/Monitor'
import { InvestigationProvider } from './lib/store'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <InvestigationProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/monitor" element={<Monitor />} />
        <Route path="/investigation" element={<Investigation />} />
        <Route path="/counterfactual" element={<Counterfactual />} />
        <Route path="/datasets" element={<Datasets />} />
      </Routes>
      </InvestigationProvider>
    </HashRouter>
  )
}
