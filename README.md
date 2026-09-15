# PRISM

Early anomaly intelligence from multilingual (English, Hindi, Odia) simulated
citizen reports. Reports are structured by an LLM, clustered by meaning +
geography + time, scored for anomalies statistically, and explained with
competing hypotheses whose confidence updates as new evidence arrives.

This repository is currently a **scaffold**: project structure, database
schema, and health-checked skeleton apps. The AI pipeline (extraction,
clustering, anomaly scoring, hypothesis generation, evidence tracking) is not
implemented yet.

## Architecture

- `frontend/` — Next.js (App Router) + TypeScript + Tailwind CSS
- `backend/` — Python FastAPI, with sentence-transformers embeddings run
  in-process (no separate embedding service)
- Database — PostgreSQL + pgvector. Local dev uses a Docker container; the
  deployed backend points at Supabase Postgres instead.
- LLM — Qwen3-32B via Groq's OpenAI-compatible API

```
prism/
├── docker-compose.yml     # local Postgres + pgvector only
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app, /health endpoint
│   │   ├── core/          # config + db session
│   │   └── models/        # SQLAlchemy models (reports, structured_signals,
│   │                       #  clusters, hypotheses, evidence_checks)
│   ├── db/schema.sql       # raw SQL schema (source of truth)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/app/            # Next.js App Router pages
    └── .env.example
```

## Prerequisites

- Python 3.11+ (tested on 3.14)
- Node.js 20+
- Docker Desktop (for local Postgres+pgvector)

## 1. Local database (Docker)

From the repo root:

```bash
docker compose up -d
```

This starts Postgres with the pgvector extension on `localhost:5432`
(user `prism`, password `prism`, database `prism`) and automatically applies
`backend/db/schema.sql` on first boot via Postgres's init-scripts mechanism.

If you change `backend/db/schema.sql` after the volume already exists, it
won't re-run automatically — either drop the volume
(`docker compose down -v`) or apply it manually:

```bash
docker compose exec -T db psql -U prism -d prism < backend/db/schema.sql
```

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # defaults already match docker-compose

uvicorn app.main:app --reload
```

Visit http://localhost:8000/health — should return `{"status": "ok"}`.

## 3. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local

npm run dev
```

Visit http://localhost:3000 — it pings the backend `/health` endpoint and
shows a connection status indicator.

## Environment variables

**backend/.env**
| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string | local docker-compose Postgres |
| `GROQ_API_KEY` | Groq API key for Qwen3-32B | (empty until you add one) |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |

**frontend/.env.local**
| Variable | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL | `http://localhost:8000` |

## Deploying

- **Backend (Render)**: set `DATABASE_URL` to your Supabase connection string
  and `GROQ_API_KEY` in Render's environment settings. Do not use
  `docker-compose.yml` in production — it's local-dev only. Run
  `backend/db/schema.sql` once against Supabase (SQL editor, or
  `psql "$DATABASE_URL" -f backend/db/schema.sql`) before first deploy.
- **Frontend**: point `NEXT_PUBLIC_API_BASE_URL` at the deployed backend URL.

## Database schema

Five tables, defined in [`backend/db/schema.sql`](backend/db/schema.sql):

- **reports** — raw citizen reports as ingested, in their original language
- **structured_signals** — LLM-extracted structured observations per report,
  including a `vector(384)` embedding column (dimension matches
  `paraphrase-multilingual-MiniLM-L12-v2`) and a nullable `cluster_id`
- **clusters** — groups of semantically/geographically/temporally related
  signals, with a centroid embedding and an `anomaly_score`
- **hypotheses** — competing explanations generated for a cluster once its
  anomaly score crosses threshold
- **evidence_checks** — predicted future evidence for a hypothesis, and
  whether later reports confirm or contradict it

`structured_signals.embedding` and `clusters.centroid_embedding` each have an
`ivfflat` cosine-similarity index for pgvector nearest-neighbour search.

## Simulated report seeding

[`backend/app/data_generator.py`](backend/app/data_generator.py) generates
300 synthetic multilingual (English/Hindi/Odia) citizen reports over a
simulated 24-hour window in Bhubaneswar: ~65% unrelated background chatter,
plus one emerging water-contamination event that builds gradually (weak
signals -> vomiting reports -> a dead-fish-in-canal report -> spread to a
neighbouring ward -> supporting evidence -> a contradicting official
statement), all in chronological order.

Regenerate the checked-in seed file (`backend/data/seed_reports.json`):

```bash
cd backend
python -m app.data_generator
```

Load it into the `reports` table (raw text only, no AI processing yet) via
the running backend:

```bash
curl -X POST http://localhost:8000/api/reports/seed
```

This wipes and reloads the `reports` table. Other endpoints for the frontend
feed: `GET /api/reports?limit=50` and `GET /api/reports/stats`.
