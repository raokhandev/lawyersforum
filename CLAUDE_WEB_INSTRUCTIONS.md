# Instructions for Claude (web): fix "Server error" on lawyersforum.org

You are helping the owner of **Lawyers Forum** (https://lawyersforum.org). The repo is
https://github.com/raokhandev/lawyersforum (branch `main`). Stack: Node.js + Express + `mysql2` (in `server/`),
React + Vite (in `client/`), MySQL.

## What happened

Two commits were pushed to `main` (`b058d29`, `6de90f0`). They changed the `authors` table:

- the `bio` column is replaced by two columns, `summary` (short, shown on the About Us page) and `description`
  (long, shown on each author's own page);
- the server now selects `summary` and `description`, and the client shows them.

The **live database was not migrated**, so it still has `bio`. Any request that reads authors fails with
`Unknown column 'summary'`, and the site shows **"Server error"** (About Us page, author pages, admin Add Author).
The migration files are in the repo but nothing runs them automatically.

## What to do

Do these steps in order. **Do not skip the backup.**

1. **Back up the live database** (e.g. `mysqldump <db name> > backup-before-authors-migration.sql`). Keep the file.
2. **Confirm the problem first.** Run `SHOW COLUMNS FROM authors;`.
   - If you see `bio` and no `summary`/`description`, continue.
   - If `summary` and `description` already exist, the migration was already applied. Do not run it again. Go to step 5
     and look at the server error log for the real cause.
3. **Pull the latest code** on the server: `git pull origin main`, then `cd server && npm install`.
4. **Apply the migration** to the live database, in a single run:
   ```sql
   ALTER TABLE authors
     CHANGE COLUMN bio description TEXT,
     ADD COLUMN summary VARCHAR(200) NOT NULL DEFAULT '' AFTER practice_area;
   UPDATE authors SET summary = LEFT(COALESCE(description, ''), 200);
   ALTER TABLE authors MODIFY COLUMN summary VARCHAR(500) NOT NULL DEFAULT '';
   ```
   (These are `server/db/migrations/001_author_summary_description.sql` and `002_author_summary_500.sql`.)
   Existing bios are kept: they move into `description` and are copied, cut at 200 characters, into `summary`.
5. **Rebuild and restart.**
   - If the Express server serves the built site, run `cd client && npm install && npm run build`
     (or `npm run build` at the repo root).
   - Restart the Node app (`cd server && npm start`, or restart the process manager / service that runs it).
6. **Verify.**
   - `curl -s https://lawyersforum.org/api/authors` returns JSON (HTTP 200) with `summary` and `description` fields.
   - These pages load without an error: `/`, `/about`, `/articles`, `/authors/<id>`.
   - If anything still says "Server error", read the server logs and report the actual error message.

## Rules

- **Never** run `DROP`, `TRUNCATE` or `DELETE` on live data, and do not run `npm run db:seed` (it adds dummy data).
- `npm run db:setup` does **not** alter existing tables. Do not rely on it for this fix.
- Do not commit or print secrets (`.env`, `login.txt`, database passwords, `JWT_SECRET`, `ADMIN_PASSWORD`).
- If a step fails, **stop**, restore from the backup if the database was changed, and report the exact error.
- Ask the owner before doing anything not listed here.

## Heads-up: more migrations are coming

The owner has more work that is **not pushed yet**. When it is, these migrations in `server/db/migrations/` must be
applied to the live database in numeric order **before** the new code goes live, or the site will break the same way:

| File | What it does |
|---|---|
| `003_author_summary_700.sql` | Allows author summaries up to 700 characters |
| `004_article_home_slot.sql` | Adds `articles.home_slot` (pins articles on the home page) |
| `005_article_image.sql` | Adds `articles.image_url` (article images) |

Uploaded images are saved in `server/uploads/` (not in git). That folder must exist and be writable on the live
server, and it must **not** be wiped on deploy.

## Report back

When finished, tell the owner: which steps you ran, the result of each verification check, and anything that did not
work (with the exact error text).
