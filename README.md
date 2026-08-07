# HistoryAI

**An AI historical library.** Source-grounded conversations with historical figures, with inline citations to primary sources.

> **Status: Phase 1 (Foundation) complete.** The data model, API shell, auth, service abstractions, and frontend shells are built and running. There is no retrieval, no LLM call, no embedding, and no ingestion yet — those are Phases 2 and 3.

---

## Scope: v1.0 is one person

**v1.0 ships Abraham Lincoln alone.** The goal is to get one figure genuinely right — ingestion, retrieval quality, citation accuracy, persona voice — before adding the remaining 29.

This is a scope decision, not an architectural one. The schema, routes, and frontend are all multi-person; nothing is hardcoded to a single figure. All five seeded people exist as rows, but only Lincoln has `published = true`. The other four are drafts: invisible to every public route, ready to go live by flipping one flag in `seed.ts` and re-seeding.

Lincoln was chosen because the [Library of Congress's Abraham Lincoln Papers](https://www.loc.gov/collections/abraham-lincoln-papers/) are transcribed, unambiguously public domain, and carry real archival metadata — clean input for getting the ingestion, citation, and rights-handling paths right before facing the corpus variety of 29 more figures.

**What "perfecting" means concretely:** a held-out evaluation set of questions with known-correct source answers, measuring whether retrieval finds the right passage, whether quotations are verbatim, whether citations point at the right document, and whether the knowledge cutoff holds. That set becomes the regression suite protecting figures 2 through 30.

---

## The invariant

Everything in this codebase is arranged around one rule:

```
SOURCE  →  RETRIEVAL  →  RESPONSE  →  CITATIONS
```

Documents are catalogued first. A question retrieves passages from that catalogue. Only then is a response composed, from those passages. Citations are assembled from the stored `source` records — never written by the model, never found after the fact.

Four guarantees follow from it, and the architecture is built to make them checkable rather than merely intended:

| Guarantee | How the code enforces it |
|---|---|
| Never generate-then-find-sources | `LLMService.generate` takes `context: RetrievedChunk[]` as a **required** argument. There is no signature that generates without grounding. |
| Citations come from stored records | `Citation` is built by `CitationService` from `source` rows. No route parses URLs or titles out of model output. |
| Quotations are verbatim | Quoted text is sliced from `source_chunk.text`, which stores passages unmodified. `CitationService.verifyQuotations` checks this before a response is persisted. |
| Figures are bounded in time | `historical_person.knowledge_cutoff_date` is applied as a **SQL predicate** on `source_chunk.date_context` at retrieval, not as a prompt instruction. |

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node 20 + Express 4 + TypeScript |
| Database **and** vector store | **PostgreSQL 17 + pgvector** — one store for relational data and embeddings |
| ORM | **Drizzle ORM** + drizzle-kit migrations |
| Validation | Zod (shared between env config and request validation) |
| Auth | JWT (bearer) + bcrypt, with `user` / `curator` / `admin` roles |
| Object storage | Interface only in Phase 1; S3-compatible (R2) adapter in Phase 2 |
| AI providers | Interfaces + stubs only. Claude is the intended default LLM. |

**Why Drizzle over Prisma:** this is fundamentally a vector-retrieval application. Drizzle has first-class pgvector support — a real `vector('embedding', { dimensions })` column type and `.using('hnsw', ...)` index builders — so embeddings are ordinary typed columns. Prisma models `vector` as `Unsupported`, which means its client cannot read or write the column at all and every ingestion and retrieval query would have to drop to raw SQL. That is the hot path of the whole product.

**Why one database:** pgvector keeps relational data and embeddings in the same store, so a retrieval query can filter by person, by date, and by rights status *in the same statement* as the vector search. Temporal filtering and knowledge-cutoff enforcement are joins, not application-level post-filters — which is what makes them reliable. A dedicated vector database would mean two stores to keep consistent for no MVP benefit.

---

## Repo layout

```
hxai/
├── apps/
│   ├── api/                     Express backend
│   │   ├── drizzle/             Generated SQL migrations
│   │   └── src/
│   │       ├── config/env.ts    Zod-validated environment
│   │       ├── db/
│   │       │   ├── schema/      Drizzle table definitions (the data model)
│   │       │   ├── client.ts    Pool + drizzle instance
│   │       │   ├── migrate.ts   Enables pgvector, then applies migrations
│   │       │   └── seed.ts      Seed figures (Lincoln published, rest drafts)
│   │       ├── lib/             errors, logger, auth, audit, asyncHandler
│   │       ├── middleware/      auth, validate, rateLimit, error, requestContext
│   │       ├── routes/          health, auth, people, sources, conversations, admin
│   │       └── services/        Service interfaces + Phase 1 stubs + registry
│   └── web/                     React frontend
│       └── src/
│           ├── api/client.ts    Typed fetch client
│           ├── components/      Layout, PersonCard, Disclaimer, states
│           ├── pages/           Home, People, Person, Chat, About, NotFound
│           └── styles/          Design tokens + component styles
├── packages/
│   └── shared/                  DTOs, enums, error codes, disclaimer copy
├── docker-compose.yml           Postgres 17 + pgvector
└── .env.example
```

`packages/shared` is the contract: the API's serializers return its types and the web client consumes them, so a shape change breaks the build on both sides at once.

---

## Running it

**Requires:** Node ≥ 20, and a PostgreSQL 16+ database with the `pgvector` extension available. Two ways to get one — pick either.

```bash
git clone https://github.com/bartholomewdevelopment/hxai.git && cd hxai
npm install
cp .env.example .env      # Phase 1 needs no API keys — the defaults work as-is
```

**Option A — local Postgres via Docker.** One command, nothing installed on your machine. Requires Docker Desktop with working image downloads.

```bash
npm run db:up             # Postgres 17 + pgvector on localhost:5433
```

Host port is **5433**, not 5432, to avoid colliding with an existing local install. `npm run db:down` stops it.

**Option B — hosted Postgres.** No local database at all. [Neon](https://neon.tech) and [Supabase](https://supabase.com) both have free tiers with pgvector included. Create a database, copy the connection string, and set it in `.env`:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Nothing else changes — the schema, migrations, and queries are identical either way.

**Then, with either option:**

```bash
npm run db:migrate        # enables the vector extension, then applies migrations
npm run db:seed           # seeds the figures (Lincoln published)
npm run dev               # API on :4000, web on :5173
```

Open **http://localhost:5173**.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + web together |
| `npm run build` | Builds shared → API (esbuild bundle) → web |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm run lint` / `npm run format` | ESLint (flat config) / Prettier |
| `npm run db:up` / `db:down` | Start / stop Postgres |
| `npm run db:generate` | Regenerate SQL migrations after a schema edit |
| `npm run db:migrate` / `db:seed` / `db:studio` | Apply migrations / seed / open Drizzle Studio |

**Note on the API build:** the API is bundled by esbuild rather than emitted by `tsc`, and its relative imports are extensionless. drizzle-kit loads the schema through a CJS require and cannot resolve `./enums.js` back to `enums.ts`, so `.js`-suffixed imports break migration generation. `tsc` still runs as a typecheck gate before every bundle.

---

## The data model

Ten tables. All of it is built to spec now, so later phases populate columns rather than rewrite tables.

**`historical_person`** — slug, names, birth/death dates and places, nationality, occupations[], era, categories[], short/long biography, portrait and hero image URLs, `knowledge_cutoff_date`, `published`, `featured`, denormalised source counts, `persona_configuration` (JSONB), timestamps.

**`source`** — the origin of every citation. Title, author, document type, `date_created` + `approximate_date` (machine-comparable date *and* the human hedge, "circa 1858"), historical period, description, archive and collection names, canonical / original-document / transcription / local-file URLs, full text, language, translation fields, `source_type` (`primary` | `contemporary` | `scholarly`), `rights_status` (`public_domain` | `licensed` | `permission_required` | `copyright` | `unknown`), copyright jurisdiction, rights notes, `verification_status`, metadata JSONB.

**`source_chunk`** — the retrieval unit. Chunk index, verbatim text, token count, page/chapter/section locators, `date_context`, topic tags[], **`embedding vector(1536)`** with an **HNSW cosine index**, metadata JSONB.

**`conversation`**, **`conversation_participant`**, **`message`** — messages carry `citations` (JSONB, snapshotted at write time) and `retrieved_source_chunk_ids[]` (what the model was actually shown, kept for evaluation and auditing).

**`audio_source`**, **`video_source`** — architecture only. Each has a nullable `transcript_source_id` pointing at a `source` row: once transcribed, a recording becomes an ordinary citable source and flows through the same retrieval path. Media never becomes a second, parallel system.

**`users`**, **`audit_logs`** — accounts with roles, and an append-only audit trail.

### Design decisions worth knowing

- **`persona_configuration` is JSONB on the person, not its own table.** It is read whole, written whole, always exactly one per person, and its shape is still moving. `PersonaConfiguration` in `packages/shared` types it.
- **Dates are `date`, not `timestamp`.** Historical dating has day-level precision at best, and timezone-shifting an 1809 birthday is meaningless. The frontend formats from the string parts directly for the same reason.
- **`source_chunk.historical_person_id` is denormalised** from its parent source so the hot retrieval query — filter by person, filter by date, order by vector distance — never needs a join.
- **`source_chunk.date_context` is separate from `source.date_created`.** A collected-works volume published in 1905 can contain a letter written in 1862. Temporal retrieval reads the chunk's date.
- **Multi-person conversations are an insert, not a migration.** `conversation.historical_person_id` is the primary participant; `conversation_participant` holds the rest; `message.speaker_person_id` records who spoke.
- **`published = true` gates every public read**, including sources — unpublishing a person hides their sources in the same move.
- **Full text is withheld unless rights permit it.** `toSourceDetail` returns `fullText: null` for anything not `public_domain` or `licensed`.

---

## API

| Method | Route | Status |
|---|---|---|
| GET | `/api/health` | ✅ Live (DB check + active providers) |
| POST | `/api/auth/register` | ✅ Live |
| POST | `/api/auth/login` | ✅ Live |
| GET | `/api/auth/me` | ✅ Live |
| GET | `/api/people` | ✅ Live — pagination, search, era/category/featured filters |
| GET | `/api/people/:slug` | ✅ Live |
| GET | `/api/people/:id/sources` | ✅ Live (empty until Phase 2) |
| GET | `/api/sources/:id` | ✅ Live |
| GET/POST | `/api/conversations`, `/api/conversations/:id`, `/api/conversations/:id/messages` | 🔒 501 — auth and rate limits are already enforced; handlers land in Phase 3 |
| * | `/api/admin/*` | 🔒 501 behind `authenticate` + `requireAdmin` — handlers land in Phase 6 |

All errors share one envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "…", "requestId": "…", "issues": [] } }
```

`code` is a closed union in `packages/shared`. Every response carries an `X-Request-Id` that matches the server log line.

**Promoting a user to admin** (until the Phase 6 console exists) — roles are never self-assigned at registration:

```bash
docker exec -it historyai-postgres psql -U historyai -d historyai \
  -c "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
```

---

## Frontend

Routes: `/` (Home), `/people`, `/people/:slug`, `/people/:slug/chat`, `/about`.

The chat page is a **deliberately inert skeleton** — composer disabled, no request made. A chat that answered without sources would break the product's only real promise.

The AI-reconstruction disclaimer appears on both the person page and the chat page. Its copy lives in `packages/shared/src/constants.ts` so it can only be changed in one place.

Design is warm and paper-like rather than product-blue — the subject is archives and printed matter, and the interface should read as a reading room. Serif display face for names, neutral sans for interface text, full light/dark support.

---

## Environment variables

**Phase 1 needs no API keys.** `cp .env.example .env` and everything runs. Every AI and storage provider defaults to `stub`.

### Required now

`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGINS`, `EMBEDDING_DIMENSIONS` — all pre-filled with working development values in `.env.example`.

> `JWT_SECRET` in `.env.example` is a development placeholder. Generate a real one for any deployed environment: `openssl rand -base64 48`.

### Needed in later phases — not now

| Phase | Variable | For |
|---|---|---|
| **2** | `EMBEDDING_PROVIDER` + `OPENAI_API_KEY` / `VOYAGE_API_KEY` / `COHERE_API_KEY` | Embedding source chunks |
| **2** | `STORAGE_PROVIDER`, `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL` | Source scans, portraits, audio, video |
| **3** | `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`, `LLM_MODEL` | Response generation |
| **3** | `RERANKING_PROVIDER` + `COHERE_API_KEY` / `VOYAGE_API_KEY` | Post-retrieval relevance ordering |
| **5** | `STT_PROVIDER` / `TTS_PROVIDER` + `DEEPGRAM_API_KEY` / `ELEVENLABS_API_KEY` | Voice input and output |

Switching a provider off `stub` is a one-line change in `apps/api/src/services/registry.ts` plus one adapter file. No route or handler touches a vendor SDK directly.

---

## Phase 2 readiness

Everything Phase 2 needs is in place:

- `source` and `source_chunk` tables, migrated, with the vector column and HNSW index live.
- `SourceIngestionService` and `EmbeddingService` interfaces, with a registry to swap real implementations into.
- `StorageService` interface for scans and media.
- `POST /api/admin/sources` and `/api/admin/sources/:id/ingest` routes registered, protected, returning 501.
- `GET /api/people/:id/sources` and `GET /api/sources/:id` already live and rendering on the person page — sources appear the moment they exist.
- Counters (`source_count`, `audio_source_count`, `video_source_count`) ready for the ingestion pipeline to maintain.

Phase 2's work is scoped to Lincoln: catalogue his corpus properly — full-text transcriptions, real archive metadata, verified rights status, accurate dating on every document — rather than a thin slice across five figures. Depth here is what the evaluation set measures against.

**Three decisions are needed before Phase 2 starts.** See below.

---

## Decisions needed before Phase 2

1. **Embedding provider.** `EMBEDDING_DIMENSIONS` is baked into the pgvector column at migration time; changing it later means an `ALTER TABLE` **and a full re-embed of every chunk**. Currently 1536, which fits OpenAI `text-embedding-3-small` and Voyage `voyage-3-lite`. Cohere `embed-english-v3.0` is 1024; Voyage `voyage-3` is 1024. (Anthropic does not offer an embedding model, so this is a second vendor regardless of the LLM choice.)

   **The single-person v1.0 scope makes this testable rather than a guess.** One corpus is cheap enough to embed more than once, so two providers can be run head-to-head against the evaluation set and chosen on measured retrieval quality. Worth doing before figure #2, since that is the last cheap moment.

2. **Object storage provider** — S3 or Cloudflare R2. Both work through one S3-compatible adapter; R2 differs only in endpoint and zero egress fees, which matters if source scans and audio get served directly to browsers.

3. **Hosting target** — affects connection pooling and the migration story. A managed Postgres with pgvector (Neon, Supabase, RDS) versus a container platform changes whether the API needs a pooler, and serverless deployment would want a different Postgres driver.

Two further decisions can wait but are worth flagging:

4. **Chunking strategy** — target chunk size and overlap. Affects citation granularity: chunks too large make quotations imprecise; too small lose context.
5. **Rate-limit store** — the current limiter is in-memory and per-process. More than one API instance needs Redis.

## Not in Phase 1, by design

No RAG, no retrieval, no LLM calls, no embeddings, no ingestion, no persona generation, no deployment. Sources are Phase 2; conversations are Phase 3.
