// SYNTHETIC DEMONSTRATION DATA
// Shaped exactly like real CPCB / IMD / India-WRIS records (same fields, same
// units, same station-naming conventions) so the investigation workflow behaves
// the way it will once live feeds are wired in. None of these readings are
// real measurements — every screen that shows this data says so explicitly.

import type { SourceDataset, Investigation, GraphNode, GraphEdge } from './types'

export const DATASETS: SourceDataset[] = [
  {
    id: 'cpcb-aqi',
    name: 'CPCB Real-Time Air & Water Quality',
    publisher: 'Central Pollution Control Board',
    licence: 'data.gov.in — Govt. Open Data Licence India',
    coverage: 'National, station-level',
    cadence: 'Hourly',
    status: 'connected',
    recordCount: 128400,
    description: 'Station-wise AQI, pollutant concentrations and water-quality parameters reported by CPCB monitoring stations.',
  },
  {
    id: 'imd-rainfall',
    name: 'IMD Rainfall & Climate Records',
    publisher: 'India Meteorological Department',
    licence: 'IMD Open Data Terms',
    coverage: 'District-level, daily',
    cadence: 'Daily',
    status: 'connected',
    recordCount: 94210,
    description: 'District and gridded rainfall, temperature and extreme-weather event records.',
  },
  {
    id: 'wris',
    name: 'India-WRIS River & Reservoir Levels',
    publisher: 'India Water Resources Information System',
    licence: 'National Data Sharing & Accessibility Policy',
    coverage: 'Basin-level gauges',
    cadence: 'Daily',
    status: 'connected',
    recordCount: 51860,
    description: 'River discharge, reservoir storage and water-level gauge data across major basins.',
  },
  {
    id: 'bhuvan',
    name: 'ISRO Bhuvan Land Use & Land Cover',
    publisher: 'ISRO / NRSC',
    licence: 'Bhuvan Data Use Policy',
    coverage: 'National, satellite-derived',
    cadence: 'Seasonal',
    status: 'planned',
    recordCount: 0,
    description: 'Satellite-derived land-use, land-cover and change-detection layers.',
  },
  {
    id: 'aikosh',
    name: 'AIKosh Environmental Compliance Filings',
    publisher: 'Ministry of Electronics & IT / AIKosh',
    licence: 'AIKosh Open Government Data Licence',
    coverage: 'National, facility-level',
    cadence: 'As filed',
    status: 'planned',
    recordCount: 0,
    description: 'Industrial compliance and discharge-consent filings linked to CPCB facility IDs.',
  },
]

export const GRAPH_NODES: GraphNode[] = [
  { id: 'obs', label: 'Observation', kind: 'observation', x: 380, y: 280, r: 34, note: 'AQI + water-quality anomaly flagged at station 14' },
  { id: 'cpcb', label: 'CPCB', kind: 'data', x: 210, y: 150, r: 26, note: 'Station 14 reading, 3.1σ above 90-day mean' },
  { id: 'imd', label: 'IMD', kind: 'data', x: 120, y: 230, r: 22, note: 'No unusual rainfall in preceding 72h' },
  { id: 'wris', label: 'WRIS', kind: 'data', x: 210, y: 400, r: 26, note: 'Downstream gauge, 6km, normal range' },
  { id: 'hypA', label: 'Hyp. A', kind: 'hypothesis', x: 560, y: 160, r: 30, note: 'Upstream discharge event' },
  { id: 'evA', label: 'Evidence', kind: 'hypothesis', x: 650, y: 240, r: 22, note: 'Calibration log requested, not yet received' },
  { id: 'hypB', label: 'Hyp. B', kind: 'hypothesis', x: 580, y: 400, r: 30, note: 'Seasonal rainfall variation — contradicted' },
]

export const GRAPH_EDGES: GraphEdge[] = [
  { from: 'obs', to: 'cpcb' },
  { from: 'obs', to: 'wris' },
  { from: 'obs', to: 'hypA' },
  { from: 'obs', to: 'hypB', kind: 'contradicts' },
  { from: 'cpcb', to: 'imd' },
  { from: 'hypA', to: 'evA' },
]

export const INVESTIGATION: Investigation = {
  id: 'inv-mahanadi-s4',
  title: 'Mahanadi river basin, downstream sector 4',
  location: 'Near Bhubaneswar, Odisha',
  openedFrom: 'AQI + water-quality anomaly, CPCB station 14',
  statusNote: 'Initial assessment — evidence not yet verified',
  sourcesLinked: 3,
  evidenceGaps: 1,
  hypotheses: [
    {
      id: 'h-a',
      code: 'A',
      name: 'Upstream discharge event',
      status: 'supported',
      supporting: 2,
      contradicting: 0,
      missing: 1,
      assumptions: [
        'The CPCB reading and the IMD rainfall record refer to the same stretch of river within a 48-hour window.',
        'No upstream industrial source reported a separate, unrelated discharge in that period.',
        'The sensor at the sampling point was functioning within its normal calibration range.',
      ],
      evidence: [
        { id: 'e1', text: 'CPCB station 14 shows a measurement outside its typical range for this week.', stance: 'supports', sourceDatasetId: 'cpcb-aqi' },
        { id: 'e2', text: 'IMD rainfall data shows no unusual rainfall event in the 72 hours before the reading.', stance: 'supports', sourceDatasetId: 'imd-rainfall' },
        { id: 'e3', text: 'No comparable measurement from the same station in the last 30 days to establish a baseline.', stance: 'gap', sourceDatasetId: 'cpcb-aqi' },
      ],
      recommendedCheck: "Request the calibration log for CPCB station 14 before escalating. This is the single check most likely to settle the investigation.",
    },
    {
      id: 'h-b',
      code: 'B',
      name: 'Seasonal rainfall variation',
      status: 'challenged',
      supporting: 1,
      contradicting: 1,
      missing: 0,
      assumptions: [
        'Rainfall variation alone is sufficient to produce the observed reading.',
        'The reading pattern matches prior seasonal anomalies at this station.',
      ],
      evidence: [
        { id: 'e4', text: 'Historical records show mild seasonal variation at this station in prior years.', stance: 'supports', sourceDatasetId: 'imd-rainfall' },
        { id: 'e5', text: 'A second, independent reading 6km downstream does not show the same pattern.', stance: 'contradicts', sourceDatasetId: 'wris' },
      ],
      recommendedCheck: 'Compare against the downstream gauge time-series over the last 90 days.',
    },
    {
      id: 'h-c',
      code: 'C',
      name: 'Sensor or sampling issue',
      status: 'insufficient',
      supporting: 0,
      contradicting: 0,
      missing: 2,
      assumptions: [
        'The station\'s calibration log would show a deviation around the sampling date.',
        'No field maintenance visit is logged for the affected sensor.',
      ],
      evidence: [
        { id: 'e6', text: 'No confirmation of calibration status for CPCB station 14 on the sampling date.', stance: 'gap', sourceDatasetId: 'cpcb-aqi' },
        { id: 'e7', text: 'No field-maintenance record available for this station in the registry.', stance: 'gap', sourceDatasetId: 'cpcb-aqi' },
      ],
      recommendedCheck: 'Request the station\'s last calibration log and maintenance history.',
    },
  ],
}
