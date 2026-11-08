# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Lawyers Forum is a website being built from scratch. The repo currently contains only the brand logos; all application code is yet to be written.

## Tech stack

- **Runtime / backend:** Node.js (server-side JavaScript)
- **Frontend:** React
- **Database:** MySQL
- **Language:** plain JavaScript for all logic (no TypeScript unless the owner asks for it)

Guidelines:
- Use modern ES modules and `async`/`await`.
- Keep the backend and frontend in separate folders (suggested: `server/` and `client/`), each with its own `package.json`.
- Access MySQL through a maintained driver (e.g. `mysql2`) with parameterised queries only. Never build SQL by string concatenation.
- Keep secrets (DB credentials, session keys) in a `.env` file. Never commit it. Provide a `.env.example` instead.
- Add a `.gitignore` covering `node_modules/`, `.env` and build output before the first code commit.
- Database schema changes go in versioned migration/SQL files kept in the repo, not applied ad hoc.
- This is a legal-profession site. Treat user data as sensitive: hash passwords (bcrypt/argon2), validate and sanitise all input, and use HTTPS-only cookies for sessions.

## Brand and colour scheme

Use the logos in `Lawyers Forum Logos/Lawyers Forum Logos/` as the basis for the palette. The logos use two colours on a white background: a deep navy and a teal-green. Colours below are approximated by eye from the logo images, not sampled. Check them against the originals and adjust if needed.

| Role | Colour | Approx. hex |
|------|--------|-------------|
| Primary (headings, nav, buttons) | Deep navy | `#0B2142` |
| Accent (links, highlights, secondary buttons, dividers) | Teal-green | `#2E9A80` |
| Background | White | `#FFFFFF` |
| Subtle surface / borders | Light grey-blue | `#F3F6F9` / `#D9E0E7` |
| Body text | Navy or near-black | `#0B2142` / `#1A1A1A` |

Define these as CSS custom properties (e.g. `--color-navy`, `--color-teal`) in one place and reference them everywhere. Don't hard-code hex values in components.

Style notes:
- The wordmark is a bold serif. Use a serif for headings (e.g. Georgia or a similar web font) and a clean sans-serif for body text.
- The overall tone is professional, trustworthy and uncluttered. Prefer generous whitespace and a restrained use of the teal accent.
- Keep text contrast accessible (WCAG AA). Navy on white is fine. Use teal for text only at large sizes, or darken it.

### Logo files

- `LawyersForumLong.png`: full horizontal logo (open-book icon with wordmark). Use in the site header on desktop.
- `LawyersForumTeal#Divider.png`: horizontal logo with a teal divider line. Alternative header or footer lockup.
- `LawyersForum2Lines.png`: stacked two-line version. Use where horizontal space is tight.
- `LawyersForumShort.png`: compact mark. Use for favicons, mobile header and small placements.

Copy the assets the site needs into the frontend's public/assets folder rather than referencing this folder directly.

## Git

- Remote: https://github.com/raokhandev/lawyersforum (branch `main`).
- Keep commits small and focused, with clear messages.

## Commands

Layout: `server/` (Express + mysql2, ES modules) and `client/` (Vite + React + react-router-dom). Vite proxies `/api` to the server on port 3001.

First-time setup:
- `cd server && npm install && cp .env.example .env` (then edit `.env`: DB credentials, `ADMIN_PASSWORD`, `JWT_SECRET`)
- `cd server && npm run db:setup` creates the database and tables from `server/db/schema.sql`
- `cd server && npm run db:seed` (optional) inserts dummy authors and articles if the tables are empty
- `cd client && npm install`

Run (two terminals):
- `cd server && npm run dev` (API on http://localhost:3001)
- `cd client && npm run dev` (site on http://localhost:5173)

Build the client: `cd client && npm run build`.

Pages: Home (`/`), Authors (`/authors`), Articles (`/articles`, `/articles/:id`), Admin (`/admin`, password login; adds authors and articles). Admin API routes require a Bearer token from `POST /api/admin/login`.

Migrations: SQL files in `server/db/migrations/` are applied automatically (in name order, once each) when the server starts. Add a new numbered file for every schema change. Also update `server/db/schema.sql` so fresh installs match.

Uploads: admin image uploads are stored in `server/uploads/` (git-ignored), or in `UPLOAD_DIR` / the Railway volume mount path if set. On Railway, attach a volume or uploaded images are lost on each deploy.

No tests yet.
