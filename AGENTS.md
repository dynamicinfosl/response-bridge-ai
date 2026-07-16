# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
Single-page app **Response Bridge AI** (Adapt Link) — a React 18 + TypeScript + Vite
SPA (shadcn/ui + Tailwind) for multichannel customer support. There is **no backend
server in this repo**: the frontend talks directly to external services (Supabase for
auth/DB, n8n webhooks for chat, plus optional Chatwoot/Vapi/MK/Gupshup). The `api/`
folder holds Vercel serverless proxies that are only active in production; in `dev`,
`vite.config.ts` sets up equivalent proxies.

### Run / lint / build
Standard scripts live in `package.json` (`dev`, `build`, `build:dev`, `lint`, `preview`);
use those. Package manager is **npm** (`package-lock.json`). The dev server runs on
**http://localhost:8080** (`npm run dev`).

- `npm run lint` currently reports **many pre-existing errors** (mostly
  `@typescript-eslint/no-explicit-any`). These are code-quality issues in the existing
  codebase, not environment problems — do not treat a non-zero lint exit as a broken env.
- `npm run build` succeeds; it prints a harmless "chunks larger than 500 kB" warning.
- Do not run `eslint .` and `vite build` concurrently: Vite writes a temporary
  `vite.config.ts.timestamp-*.mjs` file that can make a parallel ESLint run fail with
  `ENOENT`.

### Environment variables (`.env.local`)
App reads `VITE_*` vars from `.env.local` (git-ignored; no example file committed).
Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` the Supabase client falls back to a
placeholder and login cannot succeed — the app still renders the login page. `VITE_N8N_API_URL`
is only needed for the chat/Atendimentos features. **Restart the dev server after any
`.env.local` change** (Vite only reads env at startup).

### Testing auth-backed flows with a LOCAL Supabase
Login and everything behind it (dashboard, profile, etc.) require a Supabase backend. For
local development/testing use the **Supabase CLI local stack**, which needs **Docker** and
the **`supabase` CLI** (a shim that must sit next to its `supabase-go` binary — install the
release tarball into a directory on PATH, don't move only the `supabase` file).

- Start it from the repo root: `supabase start` (first run pulls several GB of images).
  `supabase/config.toml` is committed; ports default to API `54321`, DB `54322`,
  Studio `54323`, Mailpit `54324`.
- The committed `supabase/migrations/*.sql` + `supabase/seed.sql` are applied automatically
  on `supabase start` / `supabase db reset`. They create the `public.users` schema and a
  **ready-to-use admin login: `admin@adaptlink.com` / `admin123456`** (role `admin`).
- Get the local URL + keys with `supabase status -o env`, then put them in `.env.local`:
  `VITE_SUPABASE_URL=http://127.0.0.1:54321` and `VITE_SUPABASE_ANON_KEY=<ANON_KEY>`.
  Use the classic `ANON_KEY` JWT (not the `sb_publishable_...` key) for `VITE_SUPABASE_ANON_KEY`.

Non-obvious local-Supabase gotchas (already handled in the committed migration, keep in mind
if you reset/rebuild the DB or run the raw root `*.sql` scripts):
- The upstream `supabase-setup.sql` "Admins can view all profiles" RLS policy is
  self-referential and causes `infinite recursion detected in policy` (error 42P17) on the
  `public.users` table. The local migration omits it.
- Tables created by hand also need explicit `GRANT SELECT/INSERT/UPDATE/DELETE ... TO
  authenticated` (and `SELECT ... TO anon`), otherwise PostgREST returns
  `permission denied for table users` (42501).
- `AuthContext` requests columns `area`, `supervisor_id`, `chatwoot_id`; the base
  `supabase-setup.sql` doesn't create all of them. The local migration adds them. If any
  profile column is missing the app degrades gracefully to auth-metadata (login still works).
