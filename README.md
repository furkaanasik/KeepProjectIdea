# KeepProjectIdea

Strategic project-idea analyzer. Submit a project idea and receive a structured JSON analysis covering competitors, market, viability, differentiation, and a generated "Master Prompt" suitable for handing to another LLM.

The backend wraps the local `claude` CLI: it builds a Turkish strategist prompt, runs `claude -p ... --output-format json`, validates the model's output against a strict Zod schema, and persists each analysis to SQLite.

## Features

- `POST /api/analyze` — analyze a project idea, return strict-schema JSON.
- `GET /api/analyses` — list recently persisted analyses.
- `POST /api/export/pdf` — render an analysis result as a downloadable PDF report.
- `GET /health` — liveness probe.
- Static frontend (`public/`) for submitting ideas, browsing recent analyses, and exporting a result to PDF in one click.
- IP-based rate limiting on `/api/analyze` (default: 5 req/min).
- SQLite persistence via `better-sqlite3` with WAL journaling.

## Tech stack

- Node.js + TypeScript (ES modules, `NodeNext` resolution)
- Express 4
- Zod for input/output validation
- better-sqlite3 for storage
- express-rate-limit for throttling
- pdfkit for PDF export
- Vitest + Supertest + happy-dom for tests

## Requirements

- Node.js 20+
- The `claude` CLI installed and on `PATH` (or override via `CLAUDE_BIN`)

## Setup

```bash
npm install
npm run dev
```

Server listens on `http://localhost:3000` by default. Open `/` for the frontend.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the server with `tsx watch`. |
| `npm run build` | Type-check and emit JS to `dist/`. |
| `npm test` | Run the Vitest suite. |
| `npm run typecheck` | `tsc --noEmit`. |

## Configuration

All configuration is via environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listen port. |
| `CLAUDE_BIN` | `claude` | Path/name of the `claude` CLI binary. |
| `ANALYZE_RATE_MAX` | `5` | Max `/api/analyze` requests per IP per minute. |
| `DB_PATH` | `./data/app.db` | SQLite database path. Use `:memory:` for an ephemeral DB. |
| `TRUST_PROXY` | unset | Set to `1` to enable Express `trust proxy` (for accurate client IPs behind a reverse proxy). |

## API

### `POST /api/analyze`

Request body:

```json
{ "idea": "string between 10 and 6000 characters" }
```

Successful response (`200`): an `AnalysisResult` matching `src/types/analysis.ts`:

```json
{
  "project_summary": "...",
  "competitors": [
    { "name": "...", "key_features": "...", "weakness": "..." }
  ],
  "market_analysis": { "trends": "...", "target_audience": "..." },
  "viability": { "score": 85, "status": "...", "reasoning": "..." },
  "differentiation_points": ["...", "...", "..."],
  "master_prompt": "..."
}
```

Error responses:

- `400 invalid_input` — body fails `ProjectIdeaInputSchema`.
- `429 rate_limited` — IP exceeded `ANALYZE_RATE_MAX`/min.
- `502 analyzer_invalid_output` — Claude returned text that did not parse against the schema.
- `502 analyzer_unavailable` — failed to spawn / run / receive a valid envelope from `claude`.
- `500 internal_error` — unexpected server error.

### `GET /api/analyses`

Returns the most recent persisted analyses (newest first). Each row contains the original idea and the parsed result.

### `POST /api/export/pdf`

Renders an `AnalysisResult` as a PDF and streams it back as `application/pdf` with a `Content-Disposition: attachment` header.

Request body:

```json
{
  "idea": "optional original idea text (≤ 6000 chars)",
  "result": { "...": "AnalysisResult — same shape returned by POST /api/analyze" }
}
```

Error responses:

- `400 invalid_input` — body fails `ExportPdfBodySchema` (e.g. malformed `result`).
- `500 internal_error` — unexpected server error during PDF generation.

### `GET /health`

Returns `{ "ok": true }`.

## Project structure

```
src/
  app.ts                  Express app factory
  server.ts               Entry point
  db/index.ts             SQLite open/migrate/cache
  middleware/rateLimit.ts express-rate-limit factory
  prompts/                Strategist prompt template
  routes/                 /api/analyze, /api/analyses, /api/export
  services/               claudeService, analyzerService, analysesRepo, pdfExporter
  types/analysis.ts       Zod schemas + inferred types
public/                   Static frontend (index.html, app.js)
tests/                    Vitest suite
```

## Testing

```bash
npm test
```

Tests cover the analyzer service, Claude CLI runner, route handlers, persistence layer, rate limiting, the PDF exporter and `/api/export/pdf` route, and happy-dom smoke tests of the frontend (including the Export PDF flow).
