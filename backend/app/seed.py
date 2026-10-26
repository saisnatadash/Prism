"""
Seeds the database with a clearly-labelled SYNTHETIC demonstration dataset.

Every row written here has is_synthetic=1. None of it is a real CPCB, IMD or
WRIS reading — the field names, units and station-ID conventions match the
real sources exactly so the app behaves the way it will once a real ingest
job (see README > "Wiring in real data") replaces this script's output with
is_synthetic=0 rows pulled from data.gov.in / IMD / India-WRIS.
"""
import json
from datetime import datetime, timedelta
from app.core.db import Base, engine, SessionLocal
from app.models.orm import Dataset, Observation, Investigation, Hypothesis, EvidenceItem

Base.metadata.create_all(bind=engine)


def run():
    db = SessionLocal()
    if db.query(Dataset).first():
        print("Already seeded — skipping.")
        db.close()
        return

    datasets = [
        Dataset(id="cpcb-aqi", name="CPCB Real-Time Air & Water Quality", publisher="Central Pollution Control Board",
                licence="data.gov.in — Govt. Open Data Licence India", coverage="National, station-level",
                cadence="Hourly", status="connected", record_count=128400,
                description="Station-wise AQI, pollutant concentrations and water-quality parameters reported by CPCB monitoring stations."),
        Dataset(id="imd-rainfall", name="IMD Rainfall & Climate Records", publisher="India Meteorological Department",
                licence="IMD Open Data Terms", coverage="District-level, daily", cadence="Daily",
                status="connected", record_count=94210,
                description="District and gridded rainfall, temperature and extreme-weather event records."),
        Dataset(id="wris", name="India-WRIS River & Reservoir Levels", publisher="India Water Resources Information System",
                licence="National Data Sharing & Accessibility Policy", coverage="Basin-level gauges", cadence="Daily",
                status="connected", record_count=51860,
                description="River discharge, reservoir storage and water-level gauge data across major basins."),
        Dataset(id="bhuvan", name="ISRO Bhuvan Land Use & Land Cover", publisher="ISRO / NRSC",
                licence="Bhuvan Data Use Policy", coverage="National, satellite-derived", cadence="Seasonal",
                status="planned", record_count=0,
                description="Satellite-derived land-use, land-cover and change-detection layers."),
        Dataset(id="aikosh", name="AIKosh Environmental Compliance Filings", publisher="Ministry of Electronics & IT / AIKosh",
                licence="AIKosh Open Government Data Licence", coverage="National, facility-level", cadence="As filed",
                status="planned", record_count=0,
                description="Industrial compliance and discharge-consent filings linked to CPCB facility IDs."),
    ]
    db.add_all(datasets)

    base_t = datetime.utcnow()
    obs = []
    for i in range(30):
        obs.append(Observation(dataset_id="cpcb-aqi", station_id="OD-STN-014", station_name="CPCB Station 14, Mahanadi sector 4",
                                parameter="AQI", value=96 + (i % 5) * 3, unit="index", recorded_at=base_t - timedelta(days=30 - i),
                                latitude=20.296, longitude=85.824))
    obs.append(Observation(dataset_id="cpcb-aqi", station_id="OD-STN-014", station_name="CPCB Station 14, Mahanadi sector 4",
                            parameter="AQI", value=187, unit="index", recorded_at=base_t, latitude=20.296, longitude=85.824))
    for i in range(10):
        obs.append(Observation(dataset_id="imd-rainfall", station_id="OD-DIST-KTK", station_name="Cuttack district gauge",
                                parameter="rainfall_mm", value=2.1 + (i % 3), unit="mm", recorded_at=base_t - timedelta(days=10 - i)))
    obs.append(Observation(dataset_id="wris", station_id="MH-GAUGE-22", station_name="Mahanadi downstream gauge, 6km",
                            parameter="water_level_m", value=4.2, unit="m", recorded_at=base_t))
    db.add_all(obs)

    inv = Investigation(id="inv-mahanadi-s4", title="Mahanadi river basin, downstream sector 4",
                         location="Near Bhubaneswar, Odisha", opened_from="AQI + water-quality anomaly, CPCB station 14",
                         status_note="Initial assessment — evidence not yet verified")
    db.add(inv)

    hyps = [
        Hypothesis(id="h-a", investigation_id=inv.id, code="A", name="Upstream discharge event",
                   assumptions=json.dumps([
                       "The CPCB reading and the IMD rainfall record refer to the same stretch of river within a 48-hour window.",
                       "No upstream industrial source reported a separate, unrelated discharge in that period.",
                       "The sensor at the sampling point was functioning within its normal calibration range.",
                   ]),
                   recommended_check="Request the calibration log for CPCB station 14 before escalating."),
        Hypothesis(id="h-b", investigation_id=inv.id, code="B", name="Seasonal rainfall variation",
                   assumptions=json.dumps([
                       "Rainfall variation alone is sufficient to produce the observed reading.",
                       "The reading pattern matches prior seasonal anomalies at this station.",
                   ]),
                   recommended_check="Compare against the downstream gauge time-series over the last 90 days."),
        Hypothesis(id="h-c", investigation_id=inv.id, code="C", name="Sensor or sampling issue",
                   assumptions=json.dumps([
                       "The station's calibration log would show a deviation around the sampling date.",
                       "No field maintenance visit is logged for the affected sensor.",
                   ]),
                   recommended_check="Request the station's last calibration log and maintenance history."),
    ]
    db.add_all(hyps)

    evidence = [
        EvidenceItem(id="e1", hypothesis_id="h-a", dataset_id="cpcb-aqi", stance="supports",
                     text="CPCB station 14 shows a measurement outside its typical range for this week."),
        EvidenceItem(id="e2", hypothesis_id="h-a", dataset_id="imd-rainfall", stance="supports",
                     text="IMD rainfall data shows no unusual rainfall event in the 72 hours before the reading."),
        EvidenceItem(id="e3", hypothesis_id="h-a", dataset_id="cpcb-aqi", stance="gap",
                     text="No comparable measurement from the same station in the last 30 days to establish a baseline."),
        EvidenceItem(id="e4", hypothesis_id="h-b", dataset_id="imd-rainfall", stance="supports",
                     text="Historical records show mild seasonal variation at this station in prior years."),
        EvidenceItem(id="e5", hypothesis_id="h-b", dataset_id="wris", stance="contradicts",
                     text="A second, independent reading 6km downstream does not show the same pattern."),
        EvidenceItem(id="e6", hypothesis_id="h-c", dataset_id="cpcb-aqi", stance="gap",
                     text="No confirmation of calibration status for CPCB station 14 on the sampling date."),
        EvidenceItem(id="e7", hypothesis_id="h-c", dataset_id="cpcb-aqi", stance="gap",
                     text="No field-maintenance record available for this station in the registry."),
    ]
    db.add_all(evidence)

    db.commit()
    db.close()
    print("Seeded PRISM demo data (synthetic, clearly labelled).")


if __name__ == "__main__":
    run()
