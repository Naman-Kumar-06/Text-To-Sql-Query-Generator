# DataCraft AI — Text to SQL & Data Analytics Platform

<div align="center">


**Talk to your data in plain English. No SQL knowledge required.**

[Features](#features) • [Demo](#demo) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Project Structure](#project-structure) • [API Docs](#api-documentation)

</div>

---

## Overview

DataCraft AI is a full-stack web application that lets users upload CSV/XLSX datasets, ask questions in natural language, and instantly get SQL queries, query results, interactive charts, and AI-generated business insights.

Built as a college project exploring the intersection of **Natural Language Processing**, **in-memory databases**, and **modern full-stack development**.

---

## Features

- **Natural Language → SQL** — Describe what you want; AI writes and executes the SQL
- **Multi-provider AI Cascade** — Tries Gemini → Groq → OpenRouter automatically; never fails if one is down
- **Fast In-Memory Queries** — DuckDB processes CSV/XLSX files directly without a traditional database setup
- **Auto Visualizations** — Query results render as interactive bar, line, pie, and scatter charts (Plotly.js)
- **AI Insights** — Get executive summaries, trend analysis, and recommendations for every query
- **Conversation Memory** — Ask follow-up questions; the AI remembers your previous queries in a session
- **Query History** — Browse, re-run, or export any past query
- **Export** — Download results as CSV or JSON
- **Authentication** — Secure email + password login with Clerk
- **Dark Mode** — Fully dark-themed UI built with shadcn/ui

---

## Demo

| Landing Page | AI Chat | Results & Charts |
|---|---|---|
| Sign in / sign up with email | Ask questions in plain English | Interactive charts + insights |

### Example Queries
```
"Show me the top 10 customers by total revenue"
"What is the monthly sales trend for 2024?"
"Which product category has the highest return rate?"
"Compare average order value by region"
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite 7 | UI framework and build tool |
| TypeScript 5.9 | Type safety |
| shadcn/ui + Tailwind CSS v4 | Component library and styling |
| TanStack Table | Sortable, paginated data tables |
| Plotly.js + react-plotly.js | Interactive charts |
| TanStack Query | Server state management |
| Wouter | Client-side routing |
| Clerk | Authentication |

### Backend
| Technology | Purpose |
|---|---|
| Python 3.11+ | Backend language |
| FastAPI | REST API framework |
| Uvicorn | ASGI server |
| DuckDB | In-process SQL engine for CSV/XLSX |
| Pandas | Data manipulation |
| SQLGlot | SQL parsing and validation |
| httpx | Async HTTP client for AI APIs |

### AI Providers (cascade — first available wins)
| Provider | Model | Notes |
|---|---|---|
| Google Gemini | gemini-2.0-flash | Primary provider |
| Groq | llama-3.1-8b-instant | Fast fallback |
| OpenRouter | Multiple free models | Final fallback |

---

## Getting Started

### Prerequisites

- **Node.js** 22+ — [nodejs.org](https://nodejs.org)
- **Python** 3.11+ — [python.org](https://www.python.org/downloads) *(tick "Add to PATH" on Windows)*
- **pnpm** — `npm install -g pnpm`

### 1. Clone the repository

```bash
git clone https://github.com/your-username/datacraft-ai.git
cd datacraft-ai
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
GEMINI_API_KEY=your_key          # https://aistudio.google.com/app/apikey
GROQ_API_KEY=your_key            # https://console.groq.com/keys
OPENROUTER_API_KEY=your_key      # https://openrouter.ai/settings/keys

CLERK_SECRET_KEY=sk_test_...     # https://dashboard.clerk.com
CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

> You need **at least one** AI provider key. The app will cascade to the next if one fails.

### 3. Install Node.js dependencies

```bash
pnpm install
```

### 4. Install Python dependencies

```bash
pip install fastapi uvicorn duckdb pandas openpyxl httpx sqlglot python-multipart aiofiles
```

Create the data directories:

**Windows:**
```cmd
mkdir artifacts\api-server\python\data\uploads
mkdir artifacts\api-server\python\data\exports
```

**Mac / Linux:**
```bash
mkdir -p artifacts/api-server/python/data/{uploads,exports}
```

### 5. Start the API server

```bash
cd artifacts/api-server/python
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see: `Uvicorn running on http://0.0.0.0:8080`

### 6. Start the frontend (new terminal in project root)

**Windows:**
```cmd
set PORT=5173 && set BASE_PATH=/ && set VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY && pnpm --filter @workspace/ai-sql-generator run dev
```

**Mac / Linux:**
```bash
PORT=5173 BASE_PATH=/ VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY pnpm --filter @workspace/ai-sql-generator run dev
```

### 7. Open the app

Visit **http://localhost:5173**

---

## Project Structure

```
datacraft-ai/
│
├── artifacts/
│   ├── ai-sql-generator/          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── pages/             # Home, Upload, Chat, History, Connections, Settings
│   │   │   ├── components/        # Layout, DataTable, UI components
│   │   │   └── App.tsx            # Router + Clerk provider
│   │   └── public/
│   │       └── logo.svg
│   │
│   └── api-server/
│       └── python/
│           ├── main.py            # FastAPI app entry point
│           ├── models/
│           │   └── schemas.py     # Pydantic request/response models
│           ├── services/
│           │   ├── ai_provider.py # Gemini → Groq → OpenRouter cascade
│           │   ├── duckdb_service.py  # SQL execution engine
│           │   ├── sql_validator.py   # SQLGlot-based validation
│           │   └── chart_detector.py  # Auto chart-type selection
│           └── routes/
│               ├── datasets.py    # CSV/XLSX upload & management
│               ├── query.py       # Natural language → SQL → execute
│               ├── conversations.py
│               ├── history.py
│               ├── insights.py
│               ├── export.py
│               └── stats.py
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml           # OpenAPI contract (source of truth)
│   └── api-client-react/          # Auto-generated React Query hooks
│
├── .env.example                   # Environment variable template
├── requirements.txt               # Python dependencies
└── package.json                   # Node.js workspace root
```

---

## API Documentation

Once the server is running, visit **http://localhost:8080/docs** for the interactive FastAPI Swagger UI.

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/datasets/upload` | Upload CSV or XLSX file |
| `GET` | `/api/datasets` | List all uploaded datasets |
| `POST` | `/api/query/generate` | Natural language → SQL |
| `POST` | `/api/query/execute` | Execute SQL on a dataset |
| `GET` | `/api/history` | Query history |
| `POST` | `/api/insights` | Generate AI insights for results |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/export/{id}` | Export results as CSV/JSON |

---

## How It Works

```
User types question
       │
       ▼
 Frontend sends question + dataset schema to /api/query/generate
       │
       ▼
 AI Provider Cascade
 ┌─────────────────────────────────────────────┐
 │  1. Gemini 2.0 Flash  (primary)             │
 │  2. Groq llama-3.1-8b (fast fallback)       │
 │  3. OpenRouter free models (final fallback) │
 └─────────────────────────────────────────────┘
       │
       ▼
 SQLGlot validates + DuckDB executes SQL
       │
       ▼
 Results → chart type auto-detected → Plotly renders chart
       │
       ▼
 AI generates insights from result data
```

---

## Environment Variables Reference

See `.env.example` for the full list. Summary:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | One of three | Google AI Studio API key |
| `GROQ_API_KEY` | One of three | Groq Cloud API key |
| `OPENROUTER_API_KEY` | One of three | OpenRouter API key |
| `CLERK_SECRET_KEY` | Yes | Clerk server-side secret |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk client-safe key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Same as above (exposed to Vite) |

---

## Future Improvements

- [ ] Support PostgreSQL / MySQL external database connections
- [ ] Export charts as PNG/PDF
- [ ] Shareable query links
- [ ] Query scheduling and alerts
- [ ] Multiple file joins (ask questions across two datasets)
- [ ] Voice input for queries

---

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/) — modern Python web framework
- [DuckDB](https://duckdb.org/) — in-process analytical database
- [shadcn/ui](https://ui.shadcn.com/) — beautifully designed components
- [Plotly.js](https://plotly.com/javascript/) — interactive charts
- [Clerk](https://clerk.com/) — authentication infrastructure
- [OpenRouter](https://openrouter.ai/) — unified AI model access

---

<div align="center">
Made with ❤️ as a student project
</div>
