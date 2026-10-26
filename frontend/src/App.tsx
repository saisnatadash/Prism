import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Investigation from './pages/Investigation'
import Counterfactual from './pages/Counterfactual'
import Datasets from './pages/Datasets'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/investigation" element={<Investigation />} />
        <Route path="/counterfactual" element={<Counterfactual />} />
        <Route path="/datasets" element={<Datasets />} />
      </Routes>
    </BrowserRouter>
  )
}
