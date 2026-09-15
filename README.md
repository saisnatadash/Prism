# PRISM

Early anomaly intelligence from multilingual (English, Hindi, Odia) simulated
citizen reports. Reports are structured by Qwen3, clustered by meaning +
geography + time via pgvector, scored for anomalies with pure statistics, and
explained with competing hypotheses whose confidence updates deterministically
as new evidence arrives.

## Architecture

- `frontend/` — Next.js (App Router) + TypeScript + Tailwind CSS, 3-screen
  dashboard (Live Event Feed / Investigation / Confidence Evolution)
- `backend/` — Python FastAPI, with sentence-transformers embeddings run
  in-process (no separate embedding service)
- Database — PostgreSQL + pgvector. Local dev uses a Docker container; the
  deployed backend points at Supabase Postgres instead.
- LLM — Qwen3 via Groq's OpenAI-compatible API (see note below)

```
prism/
├── docker-compose.yml       # local Postgres + pgvector only
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, /health, router wiring
│   │   ├── core/               # config + db session
│   │   ├── models/             # SQLAlchemy models
│   │   ├── data_generator.py   # synthetic report simulator
│   │   ├── llm_pipeline.py     # raw report -> structured_signals (Qwen + embeddings)
│   │   ├── clustering.py       # pgvector SQL clustering (no LLM)
│   │   ├── anomaly_scoring.py  # pure-statistics anomaly score
│   │   ├── hypothesis_engine.py# competing-hypothesis generation (Qwen)
│   │   ├── evidence_engine.py  # evidence verification (Qwen) + deterministic confidence scorer
│   │   ├── replay_engine.py    # releases the next held-back report end-to-end
│   │   └── routers/            # reports / clusters / replay endpoints
│   ├── db/schema.sql       # raw SQL schema (source of truth)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/app/            # Next.js App Router pages
    ├── src/components/     # the 3 screens + shared UI
    ├── src/lib/api.ts      # typed fetch client
    └── .env.example
```

### A note on the model

The spec calls for Qwen3-32B via Groq. **Groq deprecated `qwen/qwen3-32b`**
(shut down 2026-07-17); this codebase uses `qwen/qwen3.8-27b`, the current
equivalent on Groq, configurable via `GROQ_MODEL` in `backend/.env` if Groq's
catalog changes again (check `client.models.list()`).

**Groq rate limit**: this account's output-tokens/minute budget for this
model is tight (~1000 OTPM). Processing all 300 seeded reports through
`/api/reports/process` in one call will take a long time (tens of minutes) —
this is a Groq-side limit, not something concurrency tuning fixes. For
demoing quickly, process a smaller batch (see walkthrough below).

## Prerequisites

- Python 3.11+ (tested on 3.14)
- Node.js 20+
- Docker Desktop (for local Postgres+pgvector)
- A Groq API key (https://console.groq.com/keys)

## 1. Local database (Docker)

```bash
docker compose up -d
```

Starts Postgres+pgvector on `localhost:5432` (user/password/db all `prism`)
and applies `backend/db/schema.sql` on first boot. If you change the schema
after the volume exists, either `docker compose down -v` or apply it by hand:

```bash
docker compose exec -T db psql -U prism -d prism < backend/db/schema.sql
```

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
# edit .env and set GROQ_API_KEY

uvicorn app.main:app --reload
```

Visit http://localhost:8000/health — should return `{"status": "ok"}`.

> The embedding model is pre-loaded at startup (a few seconds once its
> weights are cached under `~/.cache/huggingface`). If startup ever hangs on
> the Hugging Face Hub check after the model is already cached, set
> `HF_HUB_OFFLINE=1` in the environment to skip the network round-trip.

**Avoid `--reload` during a long `/process` run** — editing a file while a
batch extraction is in flight makes the reloader kill the process mid-request
and lose that batch's work. Run without `--reload` (`uvicorn app.main:app`)
whenever you're about to kick off a big processing job.

## 3. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local

npm run dev
```

Visit http://localhost:3000.

## Environment variables

**backend/.env**
| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string | local docker-compose Postgres |
| `GROQ_API_KEY` | Groq API key | (required) |
| `GROQ_MODEL` | Groq model id | `qwen/qwen3.8-27b` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |

**frontend/.env.local**
| Variable | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:8000` |

## Full walkthrough

The frontend's control bar drives this in order (or use curl directly):

```bash
# 1. Load 300 synthetic reports (raw text, unprocessed)
curl -X POST http://localhost:8000/api/reports/seed

# 2. Extract structured signals + embeddings for a batch of reports.
#    Given the Groq rate limit above, start with a modest batch rather
#    than all 300 for a quick demo:
curl -X POST "http://localhost:8000/api/reports/process?limit=80"

# 3. Cluster (pgvector SQL, no LLM) + score anomalies (pure statistics)
curl -X POST http://localhost:8000/api/clusters/detect
# -> look for the Old Town (Ward 12) / Kharavela Nagar (Ward 9) cluster(s)
#    scoring near 1.0; background-chatter clusters should not appear at all

# 4. Generate 3 competing hypotheses for the anomalous cluster
curl -X POST http://localhost:8000/api/clusters/<cluster_id>/hypotheses

# 5. Replay the rest of the timeline one report at a time. Each call
#    extracts the next unprocessed report, re-clusters, verifies it against
#    every active hypothesis, and updates confidence deterministically.
curl -X POST http://localhost:8000/api/replay/next
```

To see a real confidence **drop**, process everything except the last 5
seeded reports first (the 3 supporting + 2 contradictory reports the
simulator deliberately holds for last) so `/api/replay/next` reaches them
next in chronological order — otherwise it'll surface whatever's
chronologically next among the reports you haven't processed yet, which for
a partial `?limit=N` batch means ordinary background/escalation reports
first.

## Database schema

Five tables in [`backend/db/schema.sql`](backend/db/schema.sql):

- **reports** — raw citizen reports as ingested, in their original language
- **structured_signals** — Qwen-extracted structured observations per report:
  a `vector(384)` embedding (dimension matches
  `paraphrase-multilingual-MiniLM-L12-v2`), `entities` JSONB (phenomena,
  entities, severity, timing, reporter scale, certainty, domain guess), and a
  nullable `cluster_id`. `summary` always holds the verbatim raw text — it's
  never discarded or overwritten even when extraction fails and falls back.
- **clusters** — pgvector-clustered groups of signals (same ward, rolling
  time window, cosine-similar, ≥5 distinct reports), with a centroid
  embedding and an `anomaly_score`
- **hypotheses** — 3 competing explanations per anomalous cluster, with a
  `details` JSONB holding `supporting_evidence` / `contradicting_evidence` /
  `assumptions` / `predictions`
- **evidence_checks** — one row per replay step per hypothesis: the LLM's
  SUPPORTS/CONTRADICTS/NEUTRAL verdict, `old_confidence` / `new_confidence`
  from the deterministic scorer, and its `reasoning`

## Tuning knobs

- `backend/app/clustering.py`: `SIMILARITY_THRESHOLD`, `TIME_WINDOW_HOURS`,
  `MIN_CLUSTER_REPORTS`
- `backend/app/anomaly_scoring.py`: `BASELINE_RATE_PER_DAY`,
  `ANOMALY_THRESHOLD` (hypothesis generation should only be triggered once a
  cluster crosses this)
- `backend/app/evidence_engine.py`: `MAX_SWING_POINTS`, `BASE_SWING_POINTS`,
  `GEO_DECAY_KM`, `TEMPORAL_DECAY_HOURS` for the deterministic confidence
  scorer
- `backend/app/llm_pipeline.py`: `CONCURRENCY_LIMIT` for Groq calls

## Simulated report seeding

[`backend/app/data_generator.py`](backend/app/data_generator.py) generates
300 synthetic multilingual (English/Hindi/Odia) citizen reports over a
simulated 24-hour window in Bhubaneswar: ~65% unrelated background chatter,
plus one emerging water-contamination event that builds gradually (weak
signals -> vomiting reports -> a dead-fish-in-canal report -> spread to a
neighbouring ward -> supporting evidence -> a contradicting official
statement), all in chronological order. Regenerate the checked-in seed file:

```bash
cd backend
python -m app.data_generator
```

## Deploying

- **Backend (Render)**: set `DATABASE_URL` to your Supabase connection
  string, `GROQ_API_KEY`, and `GROQ_MODEL` in Render's environment settings.
  Run `backend/db/schema.sql` once against Supabase before first deploy.
- **Frontend (Vercel)**: point `NEXT_PUBLIC_API_URL` at the deployed backend
  URL.
