# PRISM — Environmental Signal-to-Evidence Engine

PRISM connects India's environmental open data into one investigation
workspace: it links evidence to competing hypotheses, and runs a
counterfactual challenge engine that says exactly what's supported,
contradicted, or still missing before anyone treats a reading as a finding.

This repo contains a full, runnable implementation:

- **`frontend/`** — React + TypeScript + Vite + Tailwind + Framer Motion.
  Animated landing page, investigation workspace (signal-to-evidence graph),
  counterfactual engine screen, dataset observatory.
- **`backend/`** — FastAPI + SQLAlchemy. Seeds a clearly-labelled **synthetic**
  demo dataset shaped exactly like real CPCB/IMD/India-WRIS records, serves
  it over a REST API, and recomputes hypothesis status with a transparent,
  rule-based counterfactual engine (`backend/app/core/engine.py`).

**Important, read this before calling anything "live":** the demo data in
`frontend/src/data/demo.ts` and `backend/app/seed.py` is synthetic — built to
match the real datasets' schema so the workflow behaves correctly, but no
row in it is an actual CPCB/IMD/WRIS measurement. The app says so on every
screen that shows it ("Demo data, clearly labelled"). See **Wiring in real
data** below for how to replace it.

---

## Run it locally (fastest path)

**Frontend only** (works with zero backend — falls back to bundled demo data):

```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

**Full stack, with SQLite** (no Docker, no Postgres needed):

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

```bash
# in another terminal
cd frontend
cp .env.example .env.local        # points VITE_API_URL at localhost:8000
npm install
npm run dev
```

**Full stack with Docker + Postgres/PostGIS** (closest to production):

```bash
docker compose up --build
# frontend -> http://localhost:5173
# backend  -> http://localhost:8000
```

---

## Hosting it live

The stack is split so each half deploys to the host suited for it:

### 1. Backend → Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo. Render reads
   `render.yaml` at the root and provisions the web service + a free
   Postgres database automatically.
3. Once it's deployed, copy the service URL Render gives you
   (`https://prism-backend-xxxx.onrender.com`).

### 2. Frontend → Cloudflare Pages

1. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**,
   pick this repo.
2. Build settings:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Add an environment variable: `VITE_API_URL` = the Render backend URL
   from step above.
4. Deploy. Cloudflare gives you a `*.pages.dev` URL immediately; add a
   custom domain under the project's **Custom domains** tab whenever
   you're ready.
5. Back in Render, set the backend's `CORS_ORIGINS` env var to your
   Cloudflare Pages URL (instead of `*`) and redeploy, so the API only
   accepts requests from your live frontend.

Neither step needs you to hand any API key or secret to anyone outside
your own Render/Cloudflare accounts — both platforms deploy straight from
the GitHub repo on every push once connected.

---

## Wiring in real data

Replace the synthetic seed with real ingestion in two places:

1. **`backend/app/seed.py`** — swap this script for an ingest job that pulls
   from the real sources already listed in the dataset registry:
   - CPCB real-time data: `data.gov.in` (CPCB's open API/resource IDs)
   - IMD rainfall/climate records: IMD's open data portal
   - India-WRIS: WRIS's public API
   Write real rows with `is_synthetic=0` (the column already exists on
   `Dataset` and `Observation` in `backend/app/models/orm.py`) so the two
   can never be confused.
2. **Dataset `status`** — flip a dataset's `status` to `"connected"` only
   once real rows are flowing in; `"planned"` datasets (Bhuvan, AIKosh in
   the current seed) show up honestly as not-yet-wired-in on the Datasets
   page.

To add LLM-drafted hypotheses (e.g. via a hosted Qwen2.5 endpoint), fill in
`draft_hypothesis()` in `backend/app/core/engine.py` — it's stubbed with a
clear interface so this drops in without touching the rule-based status
engine, which stays deterministic and auditable on purpose.

---

## Project layout

```
prism/
├── frontend/           React + Vite + TS + Tailwind + Framer Motion
│   ├── src/pages/       Landing, Investigation, Counterfactual, Datasets
│   ├── src/data/        types + bundled demo dataset (synthetic, labelled)
│   └── src/lib/api.ts   API client with fallback to demo data
├── backend/             FastAPI + SQLAlchemy
│   ├── app/models/      ORM models + Pydantic schemas
│   ├── app/routers/     /api/datasets, /api/investigations
│   ├── app/core/engine.py   rule-based counterfactual engine
│   └── app/seed.py      synthetic demo seed (clearly labelled)
├── docker-compose.yml   full stack incl. Postgres/PostGIS
├── render.yaml          backend deploy blueprint
└── README.md
```
