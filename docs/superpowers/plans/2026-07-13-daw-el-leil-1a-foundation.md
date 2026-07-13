# Daw el-Leil — Plan 1A: Teardown & Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the AI-production domain out of the repo and stand up the Daw el-Leil data foundation — new Drizzle schema, a fresh seeded SQLite catalogue, and public read APIs (genres / studios / titles) — leaving the app booting cleanly on the new rails.

**Architecture:** Greenfield-in-place. Keep the toolchain (Hono sub-app per route, Drizzle + better-sqlite3 with runtime `CREATE TABLE IF NOT EXISTS` DDL, `success()` response envelope, snake_case API transform, Nuxt SPA + `useApi` client). Replace the domain entirely: remove all AI routes/services/agents, define the streaming schema, seed a bilingual Syrian catalogue, expose approved-only read endpoints.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, better-sqlite3, argon2 (`@node-rs/argon2`), vitest (new), Nuxt 3, tsx.

## Global Constraints

- **New DB path:** `data/daw_el_leil.db` (via `DB_PATH` env override; default in `db/index.ts`). Never reuse `huobao_drama.db`.
- **Timestamps:** ISO strings (`new Date().toISOString()`), via the existing `now()` helper. All tables have `created_at`, `updated_at` unless noted.
- **API envelope:** every response is `{ code, data, message }` via `success()/created()/badRequest()/notFound()` from `utils/response.ts`. Response bodies are **snake_case** (use `toSnakeCase`/`toSnakeCaseArray`).
- **Bilingual columns:** localized content is stored as paired `*_ar` / `*_en` columns. Never a single-language content column.
- **Approved-only catalogue:** any public (viewer-facing) title query returns only `status='approved'` titles from non-suspended studios.
- **Soft delete:** `titles` has `deleted_at`; public queries filter `deleted_at IS NULL`.
- **Node/module:** ESM (`"type":"module"`); local imports use `.js` extensions (e.g. `import { db } from '../db/index.js'`), matching the existing codebase.
- **No AI:** no code may import from `services/`, `agents/`, `@mastra/*`, `@ai-sdk/*`, `fluent-ffmpeg`, or `sharp` after teardown.

---

## Plan set (Phase 1 = four sequential plans)

This is **Plan 1A of 4**. Each plan produces working, testable software and is authored just-ahead-of-execution so later plans reflect decisions made while building earlier ones.

- **1A — Teardown & Foundation** *(this plan)*: remove AI domain, new schema, seed, public catalogue read API. Testable: `GET /api/v1/titles` returns seeded approved titles; app boots.
- **1B — Auth & Roles**: argon2 login, session cookies, `requireAuth`/`requireRole` middleware, auth routes, `useAuth` + Nuxt route guards, login/register pages.
- **1C — Identity, i18n & Viewer**: Daw el-Leil theme tokens + `<Logo>` + fonts, `@nuxtjs/i18n` ar(RTL)/en + `localized()` helper, viewer layout + sidebar, Home/Browse/Detail/Watch/My-List/History/Subscriptions/Profile pages, reviews + subscriptions + watch-history.
- **1D — Studio, Admin & Approval**: studio dashboard + title/episode editor + submit-for-approval, admin moderation queue + studios + users, approval state machine enforced end-to-end.

---

## File structure (Plan 1A)

**Backend — created:**
- `backend/src/db/schema.ts` — *rewritten* — all Phase-1 Drizzle tables.
- `backend/src/db/index.ts` — *rewritten* — new DB path + runtime DDL for new tables.
- `backend/src/db/ddl.ts` — the `CREATE TABLE IF NOT EXISTS` SQL string (single source of runtime DDL).
- `backend/src/utils/password.ts` — argon2 `hashPassword`/`verifyPassword`.
- `backend/src/db/seed.ts` — idempotent seed script (genres, users, studios, titles, episodes, reviews).
- `backend/src/routes/genres.ts` — public list.
- `backend/src/routes/studios.ts` — public list/get.
- `backend/src/routes/titles.ts` — public list (filters, approved-only) + get.
- `backend/src/utils/localized.ts` — shared `pickLocale` / `withLocaleFields` helpers (used by routes + later frontend mirror).
- `backend/vitest.config.ts` — vitest config.
- `backend/test/helpers/testdb.ts` — spin up a temp DB for tests.
- `backend/test/schema.test.ts`, `test/seed.test.ts`, `test/titles.test.ts`, `test/studios.test.ts`, `test/genres.test.ts`.

**Backend — modified:**
- `backend/src/index.ts` — strip to minimal app + mount new routes.
- `backend/package.json` — remove AI deps, add `@node-rs/argon2`, `vitest`; add `test` + `db:seed` scripts.

**Backend — deleted:** `src/agents/`, `src/services/`, and routes `storyboards, scenes, characters, images, videos, compose, merge, grid, agent, agentConfigs, aiVoices, webhooks, skills`. Utilities `utils/storage.ts`, `utils/task-logger.ts` if unused after teardown.

**Frontend — modified:**
- `frontend/app/composables/useApi.ts` — replace domain API blocks with catalogue client.
- `frontend/app/pages/index.vue` — temporary boot-clean placeholder (real Home in 1C).
- `frontend/nuxt.config.ts` — title/favicon (full identity in 1C).
- `frontend/app/composables/useAgent.ts`, `pages/settings.vue`, `pages/drama/` — deleted.

**Repo — modified:** `CLAUDE.md`, `README.md`, `configs/config.yaml`, `skills/` (delete AI SKILL.md defs).

---

## Task 1: Backend teardown + minimal app + vitest

**Files:**
- Delete: `backend/src/agents/` (dir), `backend/src/services/` (dir), `backend/src/routes/{storyboards,scenes,characters,images,videos,compose,merge,grid,agent,agentConfigs,aiVoices,webhooks,skills}.ts`, `backend/src/routes/aiConfigs.ts`, `backend/src/routes/dramas.ts`, `backend/src/routes/episodes.ts`, `backend/src/routes/upload.ts` (re-added clean in 1C when needed)
- Modify: `backend/src/index.ts`, `backend/package.json`
- Create: `backend/vitest.config.ts`, `backend/test/helpers/testdb.ts`

**Interfaces:**
- Produces: a minimal Hono `app` exporting nothing new yet; `npm run typecheck` passes; `npm test` runs (0 tests OK).

- [ ] **Step 1: Delete the AI domain**

```bash
cd backend
rm -rf src/agents src/services
rm -f src/routes/storyboards.ts src/routes/scenes.ts src/routes/characters.ts \
      src/routes/images.ts src/routes/videos.ts src/routes/compose.ts \
      src/routes/merge.ts src/routes/grid.ts src/routes/agent.ts \
      src/routes/agentConfigs.ts src/routes/aiVoices.ts src/routes/webhooks.ts \
      src/routes/skills.ts src/routes/aiConfigs.ts src/routes/dramas.ts \
      src/routes/episodes.ts src/routes/upload.ts
rm -f src/utils/storage.ts src/utils/task-logger.ts
```

- [ ] **Step 2: Replace `backend/src/index.ts` with a minimal app**

```typescript
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'path'
import { fileURLToPath } from 'url'

import { requestLogger, errorHandler } from './middleware/logger.js'
import genres from './routes/genres.js'
import studios from './routes/studios.js'
import titles from './routes/titles.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

export const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:3013', 'http://localhost:5679'],
  credentials: true,
}))
app.use('*', requestLogger)
app.use('*', errorHandler)

app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

const api = new Hono()
api.route('/genres', genres)
api.route('/studios', studios)
api.route('/titles', titles)
app.route('/api/v1', api)

// Static (posters/backdrops uploaded under data/static)
app.use('/static/*', serveStatic({ root: path.join(projectRoot, 'data') }))

// Frontend production build
const distPath = path.join(projectRoot, 'frontend', 'dist')
app.use('*', serveStatic({ root: distPath }))
app.get('*', serveStatic({ root: distPath, path: 'index.html' }))

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 5679)
  console.log(`✨ Daw el-Leil server on http://localhost:${port}`)
  serve({ fetch: app.fetch, port })
}
```

> Note: routes `genres/studios/titles` are created in Tasks 5–7. Until then `index.ts` won't compile — that's expected; typecheck for this task runs after Step 5 stubs exist. To keep Task 1 self-contained, create empty stub routers now:

- [ ] **Step 3: Create stub routers so the app compiles**

For each of `backend/src/routes/genres.ts`, `studios.ts`, `titles.ts`:

```typescript
import { Hono } from 'hono'
const app = new Hono()
export default app
```

- [ ] **Step 4: Update `backend/package.json` deps & scripts**

Remove dependencies: `@ai-sdk/google`, `@ai-sdk/openai`, `@mastra/core`, `fluent-ffmpeg`, `sharp`, and devDeps `@types/fluent-ffmpeg`. Add dependency `@node-rs/argon2` and devDependency `vitest`. Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"db:seed": "tsx src/db/seed.ts"
```

Then:

```bash
cd backend && npm install
```

- [ ] **Step 5: Create `backend/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
  },
})
```

- [ ] **Step 6: Create `backend/test/helpers/testdb.ts`**

```typescript
import fs from 'fs'
import os from 'os'
import path from 'path'

/** Point db/index.ts at a throwaway DB file before it is imported. */
export function useTempDb(): string {
  const file = path.join(os.tmpdir(), `dawtest-${process.pid}-${Math.floor(performance.now())}.db`)
  process.env.DB_PATH = file
  process.env.NODE_ENV = 'test'
  return file
}

export function cleanupDb(file: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(file + suffix) } catch { /* ignore */ }
  }
}
```

- [ ] **Step 7: Run typecheck and tests**

Run: `cd backend && npm run typecheck && npm test`
Expected: typecheck passes; vitest reports "no test files found" (exit 0) or runs 0 tests. If typecheck fails on `db/index.ts` (old schema), that is fixed in Task 3 — for now it should still compile since `db/index.ts` is unchanged and `schema.ts` still holds the old tables. If any deleted route is still imported, remove the import.

- [ ] **Step 8: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add -A
git commit -m "refactor: tear down AI production domain, minimal Hono app + vitest"
```

---

## Task 2: New Drizzle schema

**Files:**
- Modify (rewrite): `backend/src/db/schema.ts`
- Test: `backend/test/schema.test.ts`

**Interfaces:**
- Produces (table exports consumed by all later tasks):
  `users, studios, genres, titles, episodes, reviews, subscriptions, watchHistory, sessions`.
  Column accessors are camelCase in TS (e.g. `titles.studioId`, `titles.titleAr`), snake_case in SQL.

- [ ] **Step 1: Write the failing test `backend/test/schema.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import * as schema from '../src/db/schema.js'

describe('schema', () => {
  it('exports all Phase-1 tables', () => {
    for (const t of ['users','studios','genres','titles','episodes','reviews','subscriptions','watchHistory','sessions']) {
      expect(schema, `missing table ${t}`).toHaveProperty(t)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run test/schema.test.ts`
Expected: FAIL — old schema exports `dramas` etc., not `titles`.

- [ ] **Step 3: Rewrite `backend/src/db/schema.ts`**

```typescript
/**
 * Daw el-Leil — Drizzle schema (streaming catalogue).
 * Runtime table creation lives in db/ddl.ts; this file is the typed query surface.
 */
import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('viewer'), // viewer | studio | admin
  locale: text('locale').notNull().default('ar'),  // ar | en
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const studios = sqliteTable('studios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id').notNull(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  slug: text('slug').notNull().unique(),
  descriptionAr: text('description_ar'),
  descriptionEn: text('description_en'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  status: text('status').notNull().default('active'), // active | suspended
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const genres = sqliteTable('genres', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
})

export const titles = sqliteTable('titles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studioId: integer('studio_id').notNull(),
  kind: text('kind').notNull().default('series'), // film | series
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  synopsisAr: text('synopsis_ar'),
  synopsisEn: text('synopsis_en'),
  genreId: integer('genre_id'),
  year: integer('year'),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  status: text('status').notNull().default('pending'), // pending | approved | rejected
  moderationNote: text('moderation_note'),
  ratingAvg: real('rating_avg').notNull().default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  viewsCount: integer('views_count').notNull().default(0),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
})

export const episodes = sqliteTable('episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: integer('title_id').notNull(),
  number: integer('number').notNull().default(1),
  nameAr: text('name_ar'),
  nameEn: text('name_en'),
  videoUrl: text('video_url'),
  durationSec: integer('duration_sec').notNull().default(0),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  titleId: integer('title_id').notNull(),
  rating: integer('rating').notNull(), // 1..5
  body: text('body'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({ uniqUserTitle: unique().on(t.userId, t.titleId) }))

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  studioId: integer('studio_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => ({ uniqUserStudio: unique().on(t.userId, t.studioId) }))

export const watchHistory = sqliteTable('watch_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  episodeId: integer('episode_id').notNull(),
  positionSec: integer('position_sec').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({ uniqUserEpisode: unique().on(t.userId, t.episodeId) }))

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // opaque token
  userId: integer('user_id').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run test/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/schema.ts backend/test/schema.test.ts
git commit -m "feat: Daw el-Leil Drizzle schema (streaming catalogue)"
```

---

## Task 3: DB layer — new path + runtime DDL

**Files:**
- Create: `backend/src/db/ddl.ts`
- Modify (rewrite): `backend/src/db/index.ts`
- Test: `backend/test/db.test.ts`

**Interfaces:**
- Consumes: `schema` from Task 2.
- Produces: `db` (drizzle instance), `schema`, `type DB`, and `initSchema(sqlite)` applying DDL. DB file defaults to `data/daw_el_leil.db`, overridable by `DB_PATH`.

- [ ] **Step 1: Write the failing test `backend/test/db.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string
beforeAll(() => { file = useTempDb() })
afterAll(() => cleanupDb(file))

describe('db init', () => {
  it('creates all Phase-1 tables', async () => {
    const { db } = await import('../src/db/index.js')
    const rows = (db as any).$client
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all().map((r: any) => r.name)
    for (const t of ['users','studios','genres','titles','episodes','reviews','subscriptions','watch_history','sessions']) {
      expect(rows, `missing ${t}`).toContain(t)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npx vitest run test/db.test.ts`
Expected: FAIL — old `db/index.ts` creates `dramas` etc., not the new tables.

- [ ] **Step 3: Create `backend/src/db/ddl.ts`**

```typescript
/** Runtime DDL — idempotent. Source of truth for table existence at boot. */
export const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  locale TEXT NOT NULL DEFAULT 'ar',
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS studios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description_ar TEXT,
  description_en TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'series',
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  synopsis_ar TEXT,
  synopsis_en TEXT,
  genre_id INTEGER,
  year INTEGER,
  poster_url TEXT,
  backdrop_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  moderation_note TEXT,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_titles_status ON titles (status);
CREATE INDEX IF NOT EXISTS idx_titles_studio ON titles (studio_id);

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id INTEGER NOT NULL,
  number INTEGER NOT NULL DEFAULT 1,
  name_ar TEXT,
  name_en TEXT,
  video_url TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_episodes_title ON episodes (title_id);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, title_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  studio_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, studio_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  episode_id INTEGER NOT NULL,
  position_sec INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, episode_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`
```

- [ ] **Step 4: Rewrite `backend/src/db/index.ts`**

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { DDL } from './ddl.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../../data/daw_el_leil.db')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH, { timeout: 30000 })
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 30000')
sqlite.exec(DDL)

export const db = drizzle(sqlite, { schema })
export { schema }
export type DB = typeof db
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx vitest run test/db.test.ts test/schema.test.ts && npm run typecheck`
Expected: PASS; typecheck passes (no more references to old tables).

- [ ] **Step 6: Commit**

```bash
git add backend/src/db/ddl.ts backend/src/db/index.ts backend/test/db.test.ts
git commit -m "feat: new DB layer with runtime DDL for Daw el-Leil schema"
```

---

## Task 4: Password util + localized helper

**Files:**
- Create: `backend/src/utils/password.ts`, `backend/src/utils/localized.ts`
- Test: `backend/test/password.test.ts`, `backend/test/localized.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>` and `verifyPassword(hash: string, plain: string): Promise<boolean>`.
  - `pickLocale(row, base: string, locale: 'ar'|'en'): string` — returns `row[base+'Ar'|'En']` with fallback to the other, empty string if both missing.
  - `withLocale<T>(row: T, bases: string[], locale): T & Record<string,string>` — adds `title`, `synopsis`, … resolved fields alongside snake_case output.

- [ ] **Step 1: Write failing tests**

`backend/test/password.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/utils/password.js'

describe('password', () => {
  it('hashes and verifies', async () => {
    const h = await hashPassword('s3cret!')
    expect(h).not.toBe('s3cret!')
    expect(await verifyPassword(h, 's3cret!')).toBe(true)
    expect(await verifyPassword(h, 'wrong')).toBe(false)
  })
})
```

`backend/test/localized.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { pickLocale } from '../src/utils/localized.js'

describe('pickLocale', () => {
  const row = { titleAr: 'باب الحارة', titleEn: 'Bab al-Hara' }
  it('picks active locale', () => {
    expect(pickLocale(row, 'title', 'ar')).toBe('باب الحارة')
    expect(pickLocale(row, 'title', 'en')).toBe('Bab al-Hara')
  })
  it('falls back to the other locale', () => {
    expect(pickLocale({ titleAr: 'باب الحارة', titleEn: '' }, 'title', 'en')).toBe('باب الحارة')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && npx vitest run test/password.test.ts test/localized.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `backend/src/utils/password.ts`**

```typescript
import { hash, verify } from '@node-rs/argon2'

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain)
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain)
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Create `backend/src/utils/localized.ts`**

```typescript
export type Locale = 'ar' | 'en'

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

/** Pick `${base}Ar`/`${base}En` for the active locale, falling back to the other. */
export function pickLocale(row: Record<string, any>, base: string, locale: Locale): string {
  const ar = row[`${base}Ar`]
  const en = row[`${base}En`]
  const primary = locale === 'ar' ? ar : en
  const fallback = locale === 'ar' ? en : ar
  return (primary ?? fallback ?? '') as string
}

/** Attach resolved localized fields (e.g. `title`, `synopsis`) to a row. */
export function withLocale<T extends Record<string, any>>(row: T, bases: string[], locale: Locale) {
  const out: Record<string, any> = { ...row }
  for (const base of bases) out[base] = pickLocale(row, base, locale)
  return out as T & Record<string, string>
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `cd backend && npx vitest run test/password.test.ts test/localized.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/password.ts backend/src/utils/localized.ts backend/test/password.test.ts backend/test/localized.test.ts
git commit -m "feat: argon2 password util + locale field helper"
```

---

## Task 5: Seed script

**Files:**
- Create: `backend/src/db/seed.ts`
- Test: `backend/test/seed.test.ts`

**Interfaces:**
- Consumes: `db`, `schema`, `hashPassword`.
- Produces: `seed(): Promise<void>` — idempotent (clears then repopulates Phase-1 tables). Exports demo credentials constant `DEMO` for tests. When run as a script (`tsx src/db/seed.ts`) it calls `seed()` then exits.

- [ ] **Step 1: Write the failing test `backend/test/seed.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string
beforeAll(() => { file = useTempDb() })
afterAll(() => cleanupDb(file))

describe('seed', () => {
  it('populates a living catalogue with a pending title for moderation', async () => {
    const { seed } = await import('../src/db/seed.js')
    const { db, schema } = await import('../src/db/index.js')
    await seed()
    const genres = await db.select().from(schema.genres)
    const studios = await db.select().from(schema.studios)
    const titles = await db.select().from(schema.titles)
    const users = await db.select().from(schema.users)
    expect(genres.length).toBeGreaterThanOrEqual(4)
    expect(studios.length).toBeGreaterThanOrEqual(2)
    expect(titles.length).toBeGreaterThanOrEqual(4)
    expect(users.some(u => u.role === 'admin')).toBe(true)
    expect(users.some(u => u.role === 'studio')).toBe(true)
    expect(titles.some(t => t.status === 'approved')).toBe(true)
    expect(titles.some(t => t.status === 'pending')).toBe(true)
  })

  it('is idempotent (re-seeding does not duplicate)', async () => {
    const { seed } = await import('../src/db/seed.js')
    const { db, schema } = await import('../src/db/index.js')
    await seed()
    const g1 = (await db.select().from(schema.genres)).length
    await seed()
    const g2 = (await db.select().from(schema.genres)).length
    expect(g2).toBe(g1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && npx vitest run test/seed.test.ts`
Expected: FAIL — `seed` not found.

- [ ] **Step 3: Create `backend/src/db/seed.ts`**

```typescript
import { db, schema } from './index.js'
import { hashPassword } from '../utils/password.js'

const now = () => new Date().toISOString()

export const DEMO = {
  admin:  { email: 'admin@dawelleil.demo',  password: 'daw-admin-2026',  displayName: 'مدير المنصة' },
  studio: { email: 'studio@dawelleil.demo', password: 'daw-studio-2026', displayName: 'استوديو الشام' },
  viewer: { email: 'viewer@dawelleil.demo', password: 'daw-viewer-2026', displayName: 'مشاهد' },
}

export async function seed(): Promise<void> {
  const ts = now()

  // Idempotent: clear Phase-1 tables (respect FK-ish order)
  for (const t of [schema.watchHistory, schema.subscriptions, schema.reviews,
                   schema.episodes, schema.titles, schema.studios, schema.sessions,
                   schema.genres, schema.users]) {
    await db.delete(t)
  }

  // Users
  const [adminU] = await db.insert(schema.users).values({
    email: DEMO.admin.email, passwordHash: await hashPassword(DEMO.admin.password),
    displayName: DEMO.admin.displayName, role: 'admin', locale: 'ar', createdAt: ts, updatedAt: ts,
  }).returning()
  const [studioU] = await db.insert(schema.users).values({
    email: DEMO.studio.email, passwordHash: await hashPassword(DEMO.studio.password),
    displayName: DEMO.studio.displayName, role: 'studio', locale: 'ar', createdAt: ts, updatedAt: ts,
  }).returning()
  await db.insert(schema.users).values({
    email: DEMO.viewer.email, passwordHash: await hashPassword(DEMO.viewer.password),
    displayName: DEMO.viewer.displayName, role: 'viewer', locale: 'ar', createdAt: ts, updatedAt: ts,
  })

  // Genres
  const genreRows = [
    { key: 'drama',      nameAr: 'دراما',   nameEn: 'Drama' },
    { key: 'historical', nameAr: 'تاريخي',  nameEn: 'Historical' },
    { key: 'comedy',     nameAr: 'كوميديا', nameEn: 'Comedy' },
    { key: 'romance',    nameAr: 'رومانسي', nameEn: 'Romance' },
    { key: 'social',     nameAr: 'اجتماعي', nameEn: 'Social' },
  ]
  const genres = await db.insert(schema.genres).values(genreRows).returning()
  const g = (key: string) => genres.find(x => x.key === key)!.id

  // Studios
  const [shamStudio] = await db.insert(schema.studios).values({
    ownerId: studioU.id, nameAr: 'استوديو الشام', nameEn: 'Sham Studio', slug: 'sham-studio',
    descriptionAr: 'إنتاج درامي سوري أصيل من قلب دمشق.',
    descriptionEn: 'Authentic Syrian drama from the heart of Damascus.',
    status: 'active', createdAt: ts, updatedAt: ts,
  }).returning()
  const [halabStudio] = await db.insert(schema.studios).values({
    ownerId: adminU.id, nameAr: 'استوديو حلب', nameEn: 'Aleppo Studio', slug: 'aleppo-studio',
    descriptionAr: 'حكايات حلب وطربها.', descriptionEn: 'Stories and tarab from Aleppo.',
    status: 'active', createdAt: ts, updatedAt: ts,
  }).returning()

  // Sample video (public-domain / placeholder MP4)
  const SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  // Helper to insert a title + its episodes
  async function addTitle(opts: {
    studioId: number; kind: 'film'|'series'; titleAr: string; titleEn: string;
    synopsisAr: string; synopsisEn: string; genreKey: string; year: number;
    status: 'approved'|'pending'; episodes: number; ratingAvg?: number; ratingCount?: number;
  }) {
    const [t] = await db.insert(schema.titles).values({
      studioId: opts.studioId, kind: opts.kind, titleAr: opts.titleAr, titleEn: opts.titleEn,
      synopsisAr: opts.synopsisAr, synopsisEn: opts.synopsisEn, genreId: g(opts.genreKey),
      year: opts.year, status: opts.status,
      publishedAt: opts.status === 'approved' ? ts : null,
      ratingAvg: opts.ratingAvg ?? 0, ratingCount: opts.ratingCount ?? 0,
      posterUrl: null, backdropUrl: null, createdAt: ts, updatedAt: ts,
    }).returning()
    const eps = Array.from({ length: opts.episodes }, (_, i) => ({
      titleId: t.id, number: i + 1,
      nameAr: opts.kind === 'film' ? opts.titleAr : `الحلقة ${i + 1}`,
      nameEn: opts.kind === 'film' ? opts.titleEn : `Episode ${i + 1}`,
      videoUrl: SAMPLE, durationSec: 45 * 60, thumbnailUrl: null, createdAt: ts, updatedAt: ts,
    }))
    await db.insert(schema.episodes).values(eps)
    return t
  }

  await addTitle({ studioId: shamStudio.id, kind: 'series', titleAr: 'باب الحارة', titleEn: 'Bab al-Hara',
    synopsisAr: 'حياة حارة دمشقية في زمن الانتداب، بجيرانها وحكاياتها.',
    synopsisEn: 'Life in a Damascene quarter under the Mandate, its neighbours and their tales.',
    genreKey: 'historical', year: 2006, status: 'approved', episodes: 3, ratingAvg: 4.7, ratingCount: 128 })

  await addTitle({ studioId: shamStudio.id, kind: 'series', titleAr: 'الخوالي', titleEn: 'Al-Khawali',
    synopsisAr: 'لوحات من الحياة الشامية القديمة بروح كوميدية دافئة.',
    synopsisEn: 'Warm, comic vignettes of old Damascene life.',
    genreKey: 'comedy', year: 2000, status: 'approved', episodes: 2, ratingAvg: 4.5, ratingCount: 96 })

  await addTitle({ studioId: halabStudio.id, kind: 'series', titleAr: 'ضيعة ضايعة', titleEn: "Day'a Day'a",
    synopsisAr: 'قرية نائية وشخصياتها الطريفة في كوميديا اجتماعية.',
    synopsisEn: 'A remote village and its quirky characters in a social comedy.',
    genreKey: 'comedy', year: 2008, status: 'approved', episodes: 2, ratingAvg: 4.6, ratingCount: 110 })

  await addTitle({ studioId: halabStudio.id, kind: 'film', titleAr: 'أحلام المدينة', titleEn: 'Dreams of the City',
    synopsisAr: 'دمشق في الخمسينيات من عيون صبي يكبر وسط التحولات.',
    synopsisEn: '1950s Damascus through the eyes of a boy amid upheaval.',
    genreKey: 'drama', year: 1984, status: 'approved', episodes: 1, ratingAvg: 4.8, ratingCount: 54 })

  // A pending title so the admin moderation queue demos out of the box
  await addTitle({ studioId: shamStudio.id, kind: 'series', titleAr: 'ليالي الصالحية', titleEn: 'Salhieh Nights',
    synopsisAr: 'عمل جديد بانتظار الموافقة الإدارية.',
    synopsisEn: 'A new title awaiting admin approval.',
    genreKey: 'social', year: 2026, status: 'pending', episodes: 2 })
}

// Run directly: `tsx src/db/seed.ts`
const isDirect = process.argv[1] && process.argv[1].endsWith('seed.ts')
if (isDirect) {
  seed().then(() => { console.log('✨ Seed complete'); process.exit(0) })
       .catch((e) => { console.error(e); process.exit(1) })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run test/seed.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Seed the real dev DB and eyeball it**

Run: `cd backend && npm run db:seed`
Expected: `✨ Seed complete`. Then:
Run: `sqlite3 ../data/daw_el_leil.db "SELECT status, count(*) FROM titles GROUP BY status;"` (or a Node one-liner if sqlite3 CLI absent)
Expected: `approved|4` and `pending|1`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/db/seed.ts backend/test/seed.test.ts
git commit -m "feat: bilingual Syrian catalogue seed script"
```

---

## Task 6: Genres route (public)

**Files:**
- Modify (replace stub): `backend/src/routes/genres.ts`
- Test: `backend/test/genres.test.ts`

**Interfaces:**
- Consumes: `db`, `schema`, `success`.
- Produces: `GET /api/v1/genres` → `{ code, data: { items: [{id, key, name_ar, name_en}] } }`.

- [ ] **Step 1: Write the failing test `backend/test/genres.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string, app: any
beforeAll(async () => {
  file = useTempDb()
  const { seed } = await import('../src/db/seed.js')
  await seed()
  app = (await import('../src/index.js')).app
})
afterAll(() => cleanupDb(file))

describe('GET /api/v1/genres', () => {
  it('returns seeded genres', async () => {
    const res = await app.request('/api/v1/genres')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.code).toBe(200)
    expect(json.data.items.length).toBeGreaterThanOrEqual(4)
    expect(json.data.items[0]).toHaveProperty('name_ar')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && npx vitest run test/genres.test.ts`
Expected: FAIL — stub returns 404.

- [ ] **Step 3: Implement `backend/src/routes/genres.ts`**

```typescript
import { Hono } from 'hono'
import { db, schema } from '../db/index.js'
import { success } from '../utils/response.js'
import { toSnakeCaseArray } from '../utils/transform.js'

const app = new Hono()

app.get('/', async (c) => {
  const rows = await db.select().from(schema.genres)
  return success(c, { items: toSnakeCaseArray(rows) })
})

export default app
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && npx vitest run test/genres.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/genres.ts backend/test/genres.test.ts
git commit -m "feat: public genres list endpoint"
```

---

## Task 7: Titles route (public, approved-only, filters) + studios route

**Files:**
- Modify (replace stub): `backend/src/routes/titles.ts`, `backend/src/routes/studios.ts`
- Test: `backend/test/titles.test.ts`, `backend/test/studios.test.ts`

**Interfaces:**
- Consumes: `db`, `schema`, `success`, `notFound`, `withLocale`, `toSnakeCase`.
- Produces:
  - `GET /api/v1/titles?locale=&genre=&year=&studio_id=&kind=&keyword=&page=&page_size=` → approved-only list with `title`/`synopsis` resolved by locale + `studio_name`.
  - `GET /api/v1/titles/:id?locale=` → title + `episodes[]` + `reviews[]` + `studio`, or 404 if not approved.
  - `GET /api/v1/studios` → active studios (localized `name`); `GET /api/v1/studios/:id` → studio + its approved titles.

- [ ] **Step 1: Write the failing tests**

`backend/test/titles.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string, app: any
beforeAll(async () => {
  file = useTempDb()
  const { seed } = await import('../src/db/seed.js')
  await seed()
  app = (await import('../src/index.js')).app
})
afterAll(() => cleanupDb(file))

describe('GET /api/v1/titles', () => {
  it('returns only approved titles', async () => {
    const res = await app.request('/api/v1/titles?locale=en')
    const json = await res.json()
    expect(json.data.items.length).toBe(4) // 4 approved, 1 pending hidden
    expect(json.data.items.every((t: any) => t.status === 'approved')).toBe(true)
    expect(json.data.items[0]).toHaveProperty('title')       // resolved localized field
    expect(json.data.items[0]).toHaveProperty('studio_name')
  })

  it('filters by kind', async () => {
    const res = await app.request('/api/v1/titles?kind=film')
    const json = await res.json()
    expect(json.data.items.every((t: any) => t.kind === 'film')).toBe(true)
  })

  it('returns a title detail with episodes, hides pending', async () => {
    const list = await (await app.request('/api/v1/titles?locale=ar')).json()
    const id = list.data.items[0].id
    const res = await app.request(`/api/v1/titles/${id}?locale=ar`)
    const json = await res.json()
    expect(json.data.episodes.length).toBeGreaterThanOrEqual(1)
    expect(json.data).toHaveProperty('studio')
  })

  it('404s a pending title by id', async () => {
    const { db, schema } = await import('../src/db/index.js')
    const pending = (await db.select().from(schema.titles)).find((t: any) => t.status === 'pending')
    const res = await app.request(`/api/v1/titles/${pending.id}`)
    expect(res.status).toBe(404)
  })
})
```

`backend/test/studios.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string, app: any
beforeAll(async () => {
  file = useTempDb()
  const { seed } = await import('../src/db/seed.js')
  await seed()
  app = (await import('../src/index.js')).app
})
afterAll(() => cleanupDb(file))

describe('studios', () => {
  it('lists active studios with localized name', async () => {
    const res = await app.request('/api/v1/studios?locale=en')
    const json = await res.json()
    expect(json.data.items.length).toBeGreaterThanOrEqual(2)
    expect(json.data.items[0]).toHaveProperty('name')
  })
  it('returns a studio with its approved titles', async () => {
    const list = await (await app.request('/api/v1/studios')).json()
    const id = list.data.items[0].id
    const res = await app.request(`/api/v1/studios/${id}?locale=ar`)
    const json = await res.json()
    expect(json.data).toHaveProperty('titles')
    expect(json.data.titles.every((t: any) => t.status === 'approved')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && npx vitest run test/titles.test.ts test/studios.test.ts`
Expected: FAIL — stubs 404.

- [ ] **Step 3: Implement `backend/src/routes/titles.ts`**

```typescript
import { Hono } from 'hono'
import { and, eq, isNull, desc, inArray } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, notFound } from '../utils/response.js'
import { toSnakeCase, toSnakeCaseArray } from '../utils/transform.js'
import { withLocale, type Locale } from '../utils/localized.js'

const app = new Hono()

function loc(c: any): Locale { return c.req.query('locale') === 'en' ? 'en' : 'ar' }

/** ids of studios that are active (not suspended) */
async function activeStudioIds(): Promise<number[]> {
  const rows = await db.select().from(schema.studios).where(eq(schema.studios.status, 'active'))
  return rows.map(s => s.id)
}

app.get('/', async (c) => {
  const locale = loc(c)
  const page = Number(c.req.query('page') || 1)
  const pageSize = Number(c.req.query('page_size') || 24)
  const kind = c.req.query('kind')
  const year = c.req.query('year')
  const genre = c.req.query('genre')     // genre key
  const studioId = c.req.query('studio_id')
  const keyword = c.req.query('keyword')

  const activeIds = await activeStudioIds()
  const studios = await db.select().from(schema.studios)
  const genres = await db.select().from(schema.genres)
  const genreIdByKey = Object.fromEntries(genres.map(g => [g.key, g.id]))

  let rows = await db.select().from(schema.titles).where(
    and(eq(schema.titles.status, 'approved'), isNull(schema.titles.deletedAt)),
  ).orderBy(desc(schema.titles.publishedAt))

  rows = rows.filter(t => activeIds.includes(t.studioId))
  if (kind) rows = rows.filter(t => t.kind === kind)
  if (year) rows = rows.filter(t => t.year === Number(year))
  if (genre && genreIdByKey[genre] != null) rows = rows.filter(t => t.genreId === genreIdByKey[genre])
  if (studioId) rows = rows.filter(t => t.studioId === Number(studioId))
  if (keyword) {
    const k = keyword.toLowerCase()
    rows = rows.filter(t => `${t.titleAr} ${t.titleEn}`.toLowerCase().includes(k))
  }

  const total = rows.length
  const paged = rows.slice((page - 1) * pageSize, page * pageSize)
  const items = paged.map(t => {
    const studio = studios.find(s => s.id === t.studioId)
    const localized = withLocale(t, ['title', 'synopsis'], locale)
    return {
      ...toSnakeCase(localized),
      studio_name: studio ? (locale === 'ar' ? studio.nameAr : studio.nameEn) : '',
    }
  })

  return success(c, {
    items,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) },
  })
})

app.get('/:id', async (c) => {
  const locale = loc(c)
  const id = Number(c.req.param('id'))
  const [t] = await db.select().from(schema.titles).where(eq(schema.titles.id, id))
  if (!t || t.status !== 'approved' || t.deletedAt) return notFound(c, 'title not found')

  const [studio] = await db.select().from(schema.studios).where(eq(schema.studios.id, t.studioId))
  if (!studio || studio.status !== 'active') return notFound(c, 'title not found')

  const eps = await db.select().from(schema.episodes)
    .where(eq(schema.episodes.titleId, id)).orderBy(schema.episodes.number)
  const revs = await db.select().from(schema.reviews).where(eq(schema.reviews.titleId, id))
  const reviewers = revs.length
    ? await db.select().from(schema.users).where(inArray(schema.users.id, revs.map(r => r.userId)))
    : []

  const localized = withLocale(t, ['title', 'synopsis'], locale)
  return success(c, {
    ...toSnakeCase(localized),
    studio: {
      ...toSnakeCase(studio),
      name: locale === 'ar' ? studio.nameAr : studio.nameEn,
    },
    episodes: eps.map(e => toSnakeCase(withLocale(e, ['name'], locale))),
    reviews: revs.map(r => ({
      ...toSnakeCase(r),
      user_name: reviewers.find(u => u.id === r.userId)?.displayName ?? '',
    })),
  })
})

export default app
```

- [ ] **Step 4: Implement `backend/src/routes/studios.ts`**

```typescript
import { Hono } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, notFound } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { withLocale, type Locale } from '../utils/localized.js'

const app = new Hono()
function loc(c: any): Locale { return c.req.query('locale') === 'en' ? 'en' : 'ar' }

app.get('/', async (c) => {
  const locale = loc(c)
  const rows = await db.select().from(schema.studios).where(eq(schema.studios.status, 'active'))
  const items = rows.map(s => ({
    ...toSnakeCase(withLocale(s, ['name', 'description'], locale)),
  }))
  return success(c, { items })
})

app.get('/:id', async (c) => {
  const locale = loc(c)
  const id = Number(c.req.param('id'))
  const [s] = await db.select().from(schema.studios).where(eq(schema.studios.id, id))
  if (!s || s.status !== 'active') return notFound(c, 'studio not found')

  const titles = await db.select().from(schema.titles).where(
    and(eq(schema.titles.studioId, id), eq(schema.titles.status, 'approved'), isNull(schema.titles.deletedAt)),
  )
  return success(c, {
    ...toSnakeCase(withLocale(s, ['name', 'description'], locale)),
    titles: titles.map(t => toSnakeCase(withLocale(t, ['title', 'synopsis'], locale))),
  })
})

export default app
```

- [ ] **Step 5: Run to verify all pass + typecheck**

Run: `cd backend && npx vitest run test/titles.test.ts test/studios.test.ts && npm run typecheck`
Expected: all PASS; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/titles.ts backend/src/routes/studios.ts backend/test/titles.test.ts backend/test/studios.test.ts
git commit -m "feat: public titles (approved-only, filtered) + studios endpoints"
```

---

## Task 8: Frontend boot-clean + catalogue API client + repo docs

**Files:**
- Delete: `frontend/app/composables/useAgent.ts`, `frontend/app/pages/settings.vue`, `frontend/app/pages/drama/` (dir)
- Modify: `frontend/app/composables/useApi.ts`, `frontend/app/pages/index.vue`, `frontend/nuxt.config.ts`
- Modify: `CLAUDE.md`, `README.md`, `configs/config.yaml`; delete AI `skills/*/SKILL.md`

**Interfaces:**
- Consumes: backend `GET /genres|/studios|/titles`.
- Produces: `catalogueAPI` client (`genres.list`, `studios.list/get`, `titles.list/get`); a placeholder Home that lists approved titles proving the stack is wired (real Home in 1C).

- [ ] **Step 1: Delete stale frontend files**

```bash
cd frontend
rm -f app/composables/useAgent.ts app/pages/settings.vue
rm -rf app/pages/drama
```

- [ ] **Step 2: Replace domain blocks in `frontend/app/composables/useApi.ts`**

Keep the `req`/`api` core (top of the file, through `export const api = {...}`). Delete every `export const dramaAPI` … through the end and replace with:

```typescript
export interface TitleListItem {
  id: number; kind: 'film' | 'series'; title: string; year: number | null
  poster_url: string | null; studio_name: string; rating_avg: number; status: string
}

export const catalogueAPI = {
  genres: () => api.get<{ items: any[] }>('/genres'),
  studios: {
    list: (locale = 'ar') => api.get<{ items: any[] }>(`/studios?locale=${locale}`),
    get: (id: number, locale = 'ar') => api.get(`/studios/${id}?locale=${locale}`),
  },
  titles: {
    list: (params: Record<string, string | number> = {}) => {
      const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
      return api.get<{ items: TitleListItem[]; pagination: any }>(`/titles?${q.toString()}`)
    },
    get: (id: number, locale = 'ar') => api.get(`/titles/${id}?locale=${locale}`),
  },
}
```

- [ ] **Step 3: Replace `frontend/app/pages/index.vue` with a boot-clean placeholder**

```vue
<template>
  <main style="padding:40px; font-family:sans-serif">
    <h1>ضو الليل · Daw el-Leil</h1>
    <p>Catalogue (temporary view — real Home ships in Plan 1C).</p>
    <ul>
      <li v-for="t in titles" :key="t.id">{{ t.title }} — {{ t.studio_name }} ({{ t.year }})</li>
    </ul>
    <p v-if="!titles.length">No approved titles. Run <code>npm run db:seed</code> in backend.</p>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { catalogueAPI, type TitleListItem } from '~/composables/useApi'

const titles = ref<TitleListItem[]>([])
onMounted(async () => {
  const res = await catalogueAPI.titles.list({ locale: 'ar' })
  titles.value = res.items
})
</script>
```

- [ ] **Step 4: Update `frontend/nuxt.config.ts` head**

Change `title: '火宝短剧'` → `title: 'ضو الليل · Daw el-Leil'`. Leave favicon swap + i18n/fonts for Plan 1C.

- [ ] **Step 5: Update repo docs**

In `CLAUDE.md`: replace the "Project Overview"/"Architecture" AI-pipeline descriptions with the Daw el-Leil streaming-catalogue description (roles: viewer/studio/admin; pure catalogue; no AI pipeline). In `README.md`: replace the product description and update commands (note `npm run db:seed`, demo accounts). In `configs/config.yaml`: remove AI-provider defaults (or replace with a `# reserved for future phases` note). Delete AI skill defs:

```bash
cd "$(git rev-parse --show-toplevel)"
rm -rf skills
```

- [ ] **Step 6: Boot the full stack and verify end to end**

Run (backend): `cd backend && npm run db:seed && npm run dev` (leave running)
Run (frontend): `cd frontend && npm run dev`
Open `http://localhost:3013` — expect the four approved Syrian titles listed (باب الحارة, الخوالي, ضيعة ضايعة, أحلام المدينة). The pending title must NOT appear.

- [ ] **Step 7: Full backend test + typecheck sweep**

Run: `cd backend && npm test && npm run typecheck`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add -A
git commit -m "feat: frontend boot-clean + catalogue API client; retire AI docs/config/skills"
```

---

## Self-review notes (author)

- **Spec coverage (Plan 1A slice):** §3 teardown → T1/T8; §4 schema/DB/migrations-as-runtime-DDL → T2/T3; §5 password hashing (needed by seed) → T4; §11 seed → T5; §10 public read routes (genres/studios/titles) + §9 approved-only enforcement → T6/T7; docs/config → T8. Auth routes, i18n, identity, viewer/studio/admin surfaces are intentionally in Plans 1B–1D.
- **Deviation from spec §4:** the spec named "drizzle-kit migrations"; this plan uses the repo's established runtime `CREATE TABLE IF NOT EXISTS` convention (`db/ddl.ts`) so Docker/fresh-clone boot needs no migration step. `drizzle-kit push` remains available via the existing `db:push` script. This is a deliberate "follow existing patterns" choice; flag to user at review.
- **Placeholder scan:** none — all steps carry real code/commands.
- **Type consistency:** `withLocale`/`pickLocale` signatures match across T4/T7; `seed()`/`DEMO` match across T5 and its tests; `catalogueAPI` shape matches T8 usage.
- **Risk:** `@node-rs/argon2` is a native module — if install fails on the target platform, fall back to `argon2` (npm) with the same `hashPassword/verifyPassword` interface (only T4's imports change).
