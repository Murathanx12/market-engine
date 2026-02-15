# Market Engine

**Stock Market Analysis: AI-Powered Crash Detection & Probabilistic Forecasting System**

Market Engine is a hybrid market-intelligence platform that combines regime-aware modeling, Monte Carlo simulation, macro data, and sentiment signals to answer:

1. **When might the next major market drawdown happen, and what is driving it?**
2. **What is the probability distribution for asset prices across 1M / 6M / 12M / 5Y horizons?**

## Project Highlights

- Unified market regime API (`/api/market-status`) used across the app.
- Probabilistic crash timeline and scenario analysis.
- Per-ticker projection with geometric modeling.
- Macro dashboard with validated indicator transforms.
- Backtesting (sync and async job/polling flow).
- Docker-first local environment.

## Architecture

- **Frontend**: React + MUI + Recharts (`frontend/`)
- **Backend**: FastAPI + SQLAlchemy (`backend/`)
- **DB**: Postgres (Docker service)
- **Ops**: Docker Compose for full stack

---

## Quick Start (Docker)

### 1) Clone and open in VS Code

```bash
git clone <your-repo-url> market-engine
cd market-engine
code .
```

### 2) Configure environment

Create a `.env` file in the repo root (or copy from `.env.example`):

```bash
cp .env.example .env
```

Then add your keys (optional but recommended):

- `FRED_API_KEY`
- `NEWS_API_KEY`
- `OPENAI_API_KEY`

### 3) Build and run

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Postgres: `localhost:5432`

### 4) Stop

```bash
docker compose down
```

To also remove volumes:

```bash
docker compose down -v
```

---

## Pull latest code into your local VS Code copy

If you already cloned the repo:

```bash
git checkout main
git pull origin main
```

If you are using another branch:

```bash
git fetch origin
git checkout <branch-name>
git pull origin <branch-name>
```

---

## Suggested Git/Repo Naming Cleanup

If you want to rename from `market-engine-v5` to `market-engine` on GitHub:

1. GitHub repo **Settings → General → Repository name**.
2. Rename to `market-engine`.
3. Update your local remote URL:

```bash
git remote set-url origin <new-repo-url>
```

If you want v6 to be the default branch:

1. Push your stable v6 branch.
2. GitHub repo **Settings → Branches → Default branch** → select that branch (usually `main`).

---

## Troubleshooting

- If frontend dependencies fail outside Docker, prefer Docker workflow first.
- If API returns defaults, confirm external data keys are configured.
- If backtests are slow, start with newer `start_year` values.

