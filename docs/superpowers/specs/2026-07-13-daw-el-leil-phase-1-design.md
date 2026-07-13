# Daw el-Leil — Phase 1 (Foundation & Catalogue) Design

**Date:** 2026-07-13
**Status:** Approved for spec review
**Repo:** `huobao-drama` (being transformed in place)

---

## 1. Context & goal

This repository currently is **Huobao Drama**, a single-user AI *production* workbench
(Nuxt 3 + Hono + Drizzle + better-sqlite3) that turns a script into storyboards and
generates video via a stack of AI adapters. We are pivoting it **in place** into
**Daw el-Leil (ضو الليل)** — a Netflix-style **streaming catalogue** for Syrian drama and
film, with three roles (viewer / studio / admin).

**Decisions already locked (from brainstorming):**
- Target codebase: **this repo**, transformed in place (keep the toolchain, rebuild the domain).
- The AI production pipeline is **dropped** — Daw el-Leil is a **pure catalogue**; studios upload
  finished titles (video URL + poster + metadata). No AI generation in Phase 1.
- Bar: **portfolio-grade demo** — behaves like the real product end-to-end and deploys, but the
  truly heavy externals (Stripe, AI dubbing) are deferred to later phases behind clean interfaces.
- This is **Phase 1 of 3**. Phase 2 = dashboards/analytics; Phase 3 = Stripe registration,
  subtitles, KYC onboarding, AI dubbing. This spec covers **Phase 1 only**.

**Phase 1 definition of done:** a deployable bilingual (Arabic-first, RTL) streaming app where
viewers browse/filter/watch and rate; studios publish titles that go through an approval workflow;
admins moderate — all wearing the Daw el-Leil brand identity, seeded with a living Syrian catalogue.

---

## 2. Approach

**Greenfield-in-place rebuild of the domain, same rails.** We keep the tooling and infra patterns
(Hono sub-app per route, Drizzle ORM, `success/notFound` response helpers, snake_case API transform,
the `useApi` fetch client, vue-sonner, pure-CSS theming) and replace the domain entirely.

Rejected alternatives: a brand-new repo (discards working infra + git history) and a slow "strangle"
that keeps the dead AI code entangled with new code (confusing, false coupling). We remove the AI
domain cleanly up front.

---

## 3. What is removed vs. kept

**Remove (the AI world):**
- Routes: `storyboards, scenes, characters, images, videos, compose, merge, grid, agent,
  agentConfigs, aiVoices, webhooks, skills`
- All of `backend/src/services/` (adapters, ffmpeg-merge, ffmpeg-compose, tts-generation,
  image-generation, video-generation, grid-split, ai)
- `backend/src/agents/` (agents, tools, skills)
- Top-level `skills/` SKILL.md definitions
- `frontend/app/composables/useAgent.ts`, existing `pages/` (index, settings, drama/*), the
  `dramaAPI/episodeAPI/...` blocks in `useApi.ts`

**Keep & repurpose:**
- `backend/src/db/` (Drizzle layer — new schema), `utils/response.ts`, `utils/transform.ts`,
  `middleware/logger.ts`, static file serving, the `upload` route (now: posters, logos, subtitles later)
- `frontend/` Nuxt shell (`app.vue`, nuxt.config), the `api` fetch client core in `useApi.ts`,
  vue-sonner Toaster, `BaseSelect.vue`

**Config/docs:** update `CLAUDE.md`, `README.md`, `configs/config.yaml` (drop AI provider config),
Dockerfile stays (build still `frontend` + `backend`).

---

## 4. Data model (fresh Drizzle schema)

New SQLite DB `data/daw_el_leil.db`, built by **drizzle-kit migrations** + a **seed script**
(the repo currently has no migrations — we add them as a real-world touch). Snake_case columns,
ISO-string timestamps (matching the existing convention), soft-delete via `deleted_at` where noted.

| Table | Key columns |
|---|---|
| **users** | id, email (unique), password_hash, display_name, role `viewer\|studio\|admin`, locale `ar\|en`, avatar_url, created_at, updated_at |
| **studios** | id, owner_id→users, name_ar, name_en, slug (unique), description_ar, description_en, logo_url, banner_url, status `active\|suspended`, created_at, updated_at |
| **genres** | id, key (unique), name_ar, name_en |
| **titles** | id, studio_id→studios, kind `film\|series`, title_ar, title_en, synopsis_ar, synopsis_en, genre_id→genres, year, poster_url, backdrop_url, status `pending\|approved\|rejected`, moderation_note, rating_avg (real), rating_count, views_count, published_at, created_at, updated_at, deleted_at |
| **episodes** | id, title_id→titles, number, name_ar, name_en, video_url, duration_sec, thumbnail_url, created_at, updated_at |
| **reviews** | id, user_id→users, title_id→titles, rating 1–5, body, created_at, updated_at — unique(user_id, title_id) |
| **subscriptions** | id, user_id→users, studio_id→studios, created_at — unique(user_id, studio_id) |
| **watch_history** | id, user_id→users, episode_id→episodes, position_sec, updated_at — unique(user_id, episode_id) |
| **sessions** | id (opaque token), user_id→users, expires_at, created_at |

**Modeling calls:**
- **A film is a title of `kind='film'` with exactly one episode** (number 1). Series have many.
  The watch player is uniform (always plays an episode). Confirmed with user.
- **Genre** is a reference table (studios pick from a seeded list) so it renders bilingual and
  filters cleanly; a title has one primary genre in Phase 1 (multi-genre deferred).
- `rating_avg`/`rating_count`/`views_count` are denormalized counters updated on write, so
  catalogue queries stay cheap.

---

## 5. Auth & roles

- **Credentials:** email + password, hashed with **argon2** (`@node-rs/argon2` or `argon2`).
- **Sessions:** opaque token row in `sessions`, delivered as an **httpOnly, SameSite=Lax cookie**
  (`dl_session`). CORS already sets `credentials:true`; add cookie parsing. Sessions expire in 30d.
- **Backend middleware:**
  - `requireAuth` — resolves the session cookie → `c.set('user', …)`, else 401.
  - `requireRole('admin')` / `requireStudio` — role gates (studio = user.role `studio` and owns a studio).
- **Endpoints:** `POST /auth/register` (viewer by default), `POST /auth/login`, `POST /auth/logout`,
  `GET /auth/me`. Studio accounts in Phase 1 are created by seeding or by an admin promoting a user
  (self-service Stripe registration is Phase 3).
- **Frontend:** `useAuth` composable (`user`, `login`, `register`, `logout`, `hasRole`), Nuxt route
  middleware `auth.ts` (redirect to login) and `role.ts` (guard studio/admin pages), role-aware nav.
- **Seeded demo accounts** (known passwords, shown on the login screen for the demo):
  `admin@dawelleil.demo`, one studio owner, one viewer.

---

## 6. i18n & RTL (Arabic-first)

- **Module:** `@nuxtjs/i18n`. Locales: **`ar` (default, `dir=rtl`)** and `en` (`dir=ltr`).
- **No hardcoded UI strings** — everything in `locales/ar.json` / `locales/en.json` (buttons, labels,
  menus, forms, placeholders, tooltips, empty states, errors/toasts, page titles, status badges).
- **Direction:** `dir` and `lang` set reactively on `<html>` from the active locale; layout mirrors
  (sidebar side, icon/arrow flips, text alignment, padding/margin logical properties).
- **Content localization:** DB rows carry `_ar`/`_en` fields; a `localized(row, 'title')` helper picks
  the active locale with **graceful fallback** to the other language (and logs the gap, never shows a key).
- **Persistence:** locale saved to a cookie and to `user.locale`; browser language auto-detect on
  first visit.
- **Numbers/dates:** localized via `Intl` (Arabic-Indic optional, Latin digits default — configurable).
- **Typography (self-hosted via `@nuxtjs/google-fonts`, `download:true`):** Aref Ruqaa (logo/display),
  Reem Kufi (headings/eyebrows), IBM Plex Sans Arabic (Arabic body/UI), Sora (Latin). Tune size,
  line-height, letter-spacing per the brand guide.

---

## 7. Daw el-Leil identity system

- **Design tokens** (replace `frontend/app/assets/studio.css` with `theme.css`): the brand palette as
  CSS variables — `--layl #0B0E20`, `--sham #241238`, `--sparkler #F5B841`, `--spark-tip #FFE9A8`,
  `--yasmin #F7F2E7`, `--brass #A9814E`, `--halab #C05B3E`, `--fostoq #8FA05E`. Night is indigo-plum,
  never flat black; gold used sparingly as light.
- **`<Logo>` component:** the sparkler-star SVG (8-point Damascene tile star fused with a spark burst),
  gold-on-night primary + mono variant. Sourced from the existing brand-identity HTML.
- **Motion:** launch splash animates sparkler rays outward once; loading states use a flickering spark,
  not a spinner. Respect `prefers-reduced-motion`.
- **Poster card treatment:** night base + a single gold glow in a corner, Reem Kufi title (RTL).
- **App icon / favicon / `<title>`** updated to Daw el-Leil.
- **Voice:** warm, celebratory, colloquial Levantine (reflected in the `ar` locale copy).

---

## 8. Surfaces (pages & layouts)

**Layouts:** `viewer` (collapsible responsive sidebar: Home, Browse, My List, History, Subscriptions,
Profile, Settings + language toggle + auth state), `studio` (dashboard shell), `admin`, `auth` (bare).

**Viewer pages**
- **Home** — hero (featured approved title) + horizontal rows (New, by genre, by studio).
- **Browse** — grid with filters (genre, year, studio, kind film/series) + keyword search.
- **Title detail** — poster/backdrop, localized synopsis, studio (with subscribe button), rating summary,
  episode list, reviews list + "write a review", Watch button.
- **Watch** — video player (HTML5 `<video>` or embed for external URLs), resume from `watch_history`,
  next-episode for series; increments `views_count` once per session.
- **My List / History / Subscriptions** — personal collections.
- **Profile / Settings** — display name, avatar, locale, password.
- **Auth** — login / register (viewer).

**Studio pages**
- **Dashboard** — own titles with status badges (pending/approved/rejected + moderation note).
- **Title editor** — create/edit title (bilingual fields, genre, year, poster upload, kind), manage
  episodes (add/edit, video URL, thumbnail), **Submit for approval**.
- **Studio branding** — name_ar/_en, logo, banner, description.

**Admin pages**
- **Moderation queue** — pending titles → Approve (sets `approved` + `published_at`) / Reject (+ note).
- **Studios** — list, view, suspend/reactivate.
- **Users** — list, promote a viewer to studio (creates a studio shell), change role.

---

## 9. Approval workflow

- Studio creates/edits a title → status `pending`. Editing an `approved` title re-enters `pending`
  (Phase 1 keeps it simple; per-field diffing deferred).
- Admin **approves** → `approved`, `published_at` stamped → title becomes visible in the viewer catalogue.
- Admin **rejects** → `rejected` + `moderation_note`; studio sees the note and can resubmit.
- **Catalogue queries return only `approved` titles** (and only from non-suspended studios).
- Status badges surface everywhere in the studio dashboard.

---

## 10. API surface (new routes, `/api/v1`)

Following the existing Hono sub-app + `success()`/snake_case pattern:

- `auth` — register, login, logout, me
- `titles` — list (public, filters, approved-only) · get · **studio-scoped** create/update/submit ·
  admin approve/reject
- `episodes` — nested under titles: create/update/delete (studio-scoped)
- `genres` — list (public)
- `studios` — list (public) · get · me (studio dashboard) · update branding · admin suspend
- `reviews` — list by title (public) · create/update/delete (auth, own)
- `subscriptions` — list mine · subscribe · unsubscribe
- `watch-history` — list mine · upsert position
- `me` — my list, profile update
- `admin` — moderation queue, studios, users
- `upload` — poster/logo/banner/thumbnail to `data/static/`

Every response keeps the `{ code, data, message }` envelope and snake_case body.

---

## 11. Seed data (living demo)

Seed script populates: genres (bilingual: دراما/Drama, تاريخي/Historical, كوميديا/Comedy, رومانسي/Romance,
اجتماعي/Social…); a few studios; recognizable Syrian titles with `_ar/_en` (e.g. باب الحارة / *Bab al-Hara*,
الخوالي / *Al-Khawali*, ضيعة ضايعة / *Day'a Day'a*) each with poster + demo `video_url` (public sample /
placeholder mp4), episodes for the series; sample reviews; and the three demo accounts. All titles seeded
as `approved` except 1–2 left `pending` so the moderation queue demos out of the box.

---

## 12. Testing

- **Backend:** unit tests for auth (hash/verify, session lifecycle, role gates) and the approval
  state machine; route tests for catalogue-returns-approved-only, review upsert uniqueness, subscribe
  idempotency. Use a temp SQLite DB per test run.
- **Frontend:** component tests for the `localized()` fallback, the language toggle flipping `dir`, and
  route-middleware guards. A smoke e2e (register → browse → watch → review; studio submit → admin approve
  → appears in catalogue) if a runner is wired.
- **Verify skill** exercises the register→submit→approve→watch happy path end-to-end before "done".

---

## 13. Out of scope (later phases)

Stripe self-service studio registration, multi-language subtitles, viewer KYC/preferences onboarding &
personalized recommendations, AI dubbing, AI-written analytics reports, rich analytics dashboards with
charts, CSV export, multi-genre per title, cast/crew, comments/watch-parties. All deferred to Phase 2/3.

---

## 14. Risks & mitigations

- **Scope creep** — the brand docs list far more than one phase. Mitigation: this spec is a hard Phase-1
  boundary; §13 is explicit.
- **RTL regressions** — the previous attempt localized incompletely. Mitigation: zero-hardcoded-strings
  rule enforced by a missing-key logger; every screen audited in both locales before done.
- **Data migration** — old GORM DB is incompatible. Mitigation: fresh DB + migrations; old DB untouched
  on disk (can be deleted later).
- **Video hosting** — real hosting is out of scope. Mitigation: external `video_url` (matches the brand
  docs' "watch via linked video"); upload route handles images only in Phase 1.
