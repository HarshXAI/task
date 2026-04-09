# AI Billing Dashboard

A billing and usage dashboard for Adam's AI — tracking API credits across Deepgram (STT), Groq (LLM), and ElevenLabs (TTS).

---

## 1. Setup & Running

### Prerequisites
- Docker & Docker Compose
- API keys for Deepgram, Groq, and ElevenLabs
- Groq API key (free tier at console.groq.com — used for LLM in the voice pipeline)

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd billing-dashboard

# 2. Copy and fill in your API keys
cp .env.example .env
# Edit .env and set:
#   DEEPGRAM_API_KEY + DEEPGRAM_PROJECT_ID   (billing + STT)
#   GROQ_API_KEY                              (billing + LLM + voice pipeline)
#   ELEVENLABS_API_KEY                        (billing + TTS)

# 3. Start all services
docker-compose up --build

# 4. Access the dashboard
open http://localhost:3000

# 5. Browse the API
open http://localhost:8000/docs
```

### Services started by docker-compose
| Service | Port | Description |
|---|---|---|
| frontend | 3000 | React dashboard (nginx) |
| backend | 8000 | FastAPI REST + WebSocket |
| postgres | 5432 | PostgreSQL 15 |
| redis | 6379 | Redis 7 (broker + result backend) |
| celery-worker | — | Polls provider APIs |
| celery-beat | — | Scheduler (every 5 minutes) |

---

## 2. Architecture Decisions
<img width="1564" height="816" alt="Screenshot 2026-04-09 at 11 13 25 PM" src="https://github.com/user-attachments/assets/e58be3bf-f453-46ab-8989-888716f3ca9b" />

### Adapter pattern — one file per provider
Each provider (`deepgram.py`, `groq.py`, `elevenlabs.py`) implements the `BaseAdapter` ABC with a single `fetch_usage() -> UsageSnapshot` method. This means adding a new provider (e.g. Sarvam AI) requires creating one file and wiring it into `worker.py` — no existing code changes. It also makes each adapter independently testable with mocked HTTP responses.

### Celery over APScheduler
APScheduler is an in-process scheduler — if the web server crashes the schedule stops. Celery with Redis broker is distributed and production-grade: tasks are persisted in Redis, workers can be scaled horizontally, and failed tasks are automatically retried with configurable back-off. The beat schedule is defined declaratively (`crontab(minute="*/5")`) and survives worker restarts.

### JSONB `raw_response` column
The full API response is stored alongside the derived metrics. If Deepgram changes the schema of their `/balances` endpoint, historical raw responses can be re-parsed without re-calling the API. This is especially valuable for billing data where you cannot re-fetch past periods.

### Pydantic separate from SQLAlchemy ORM
SQLAlchemy ORM objects carry session state, lazy-load relationships, and can trigger unexpected queries when serialised. Routes always convert to `ProviderUsage` Pydantic models before returning — this enforces a clean serialisation contract and prevents accidental N+1 query bugs from leaking into the HTTP layer.

### Async FastAPI + asyncpg
All provider API calls and database operations are non-blocking. A single uvicorn worker can handle concurrent WebSocket connections and REST requests while a slow provider API call is in-flight. `asyncpg` provides native PostgreSQL async support without the overhead of a thread pool.

---

## 3. Trade-offs & Known Limitations

- **Groq has no hard credit quota on the free tier**: Groq's free tier does not expose a traditional "credits remaining" value. The dashboard tracks token consumption only (`credits_used`), and `credits_remaining` will show as `—`. The adapter attempts the `/v1/usage` endpoint first; if unavailable it falls back to a `/v1/models` connectivity check and logs a warning. This is expected behaviour, not an error.

- **Deepgram requires a valid project ID**: The balance endpoint is `GET /v1/projects/{project_id}/balances`. If `DEEPGRAM_PROJECT_ID` is missing or wrong, the adapter logs a clear error with the setup URL (`console.deepgram.com → Settings → Projects`) rather than failing silently.

- **ElevenLabs is fully functional**: The ElevenLabs adapter returns real `character_count` (credits used) and `character_limit - character_count` (credits remaining) from the `/v1/user/subscription` endpoint. No fallback needed.

- **No mock or seeded data**: If a provider API key is missing or the API is unreachable, the card displays "No data available" — this is correct behaviour. There is no demo mode or fake data.

- **Polling interval vs API rate limits**: Celery beat polls every 5 minutes. Deepgram's balance endpoint has generous rate limits; ElevenLabs subscription endpoint is effectively free to poll; Groq's usage endpoint is lightweight. If rate limits become a concern the interval can be increased in `worker.py`.

- **No authentication layer**: The dashboard has no login. For production you would add JWT bearer tokens on the FastAPI side and an OAuth flow on the frontend. This is intentionally omitted to keep the demo focused on the billing logic.

- **Kubernetes manifests target minikube/local clusters**: Image references use `ghcr.io/YOUR_ORG/...` placeholders. For a managed cluster (EKS, GKE) you would add IAM role annotations, a proper StorageClass for Postgres PVCs, and cert-manager for TLS on the Ingress.

- **PostgreSQL over SQLite**: SQLite would simplify local dev but cannot support async drivers, connection pooling, or `DISTINCT ON` queries (used for latest-per-provider). PostgreSQL was chosen to demonstrate production practices even though it requires Docker for local setup.

---

