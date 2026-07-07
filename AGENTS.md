# AGENTS.md

Guidance for AI agents working in this repository.

## Project overview

This is the personal academic website for Shan Gao.
It is a mostly static site with a small Vercel serverless backend for blog publishing.
There is no frontend build step: pages are plain HTML with shared CSS and inline JavaScript.

The site is deployed on Vercel.
Blog posts are committed to GitHub at publish time via the GitHub Contents API.

## Repository layout

```
index.html          Homepage (bio, publications)
blog.html           Blog listing with client-side filters
admin.html          Password-protected blog editor UI
styles/theme.css    Shared Turbo C++ pastel theme (Fixedsys Excelsior)
blog/
  index.json        Blog post metadata index (title, date, section, slug, url)
  posts/*.html      Individual blog post pages (generated from Markdown)
  posts/*.md        Markdown source for each post (written on publish)
api/
  _auth.js          Session cookie helpers (HMAC-signed, HttpOnly)
  _github.js        GitHub Contents API helpers (local FS mode for E2E)
  _blog.js          Blog validation, templates, index helpers
  login.js          POST /api/login - password authentication
  publish.js        POST /api/publish - create or update a post
  post.js           GET /api/post?slug= - load Markdown for editing
  delete.js         POST /api/delete - remove a post
scripts/
  e2e-dev.mjs       Local dev server with API routes and local filesystem
  e2e-test.mjs      Automated end-to-end test suite
vercel.json         Clean URLs and rewrites (/admin, /blog)
package.json        marked dependency; npm scripts for check and E2E
.github/workflows/  Legacy scrape_talks workflow (Jekyll-era artifact)
```

## Architecture

### Static pages

Pages link to `styles/theme.css` for shared styling.
The visual theme is Turbo C++ inspired: pastel blues, 3D beveled borders, title bars, and Fixedsys Excelsior as the main font.

### Blog system

1. `blog/index.json` holds metadata for all posts, sorted by date descending after publish.
2. `blog.html` fetches the index and renders a filterable list (section, date range, sort order).
3. `admin.html` provides login, a post manager (edit/delete), and a Markdown editor.
4. On publish, `api/publish.js`:
   - Validates title, date (`YYYY-MM-DD`), section, slug (`[a-z0-9-]+`), and Markdown body.
   - Converts Markdown to HTML with `marked`.
   - Writes `blog/posts/{slug}.html` and `blog/posts/{slug}.md`.
   - Updates `blog/index.json` via the GitHub Contents API.
5. On delete, `api/delete.js` removes both files and updates the index.

### Authentication

- `ADMIN_PASSWORD` env var gates login.
- Successful login sets an HMAC-signed `shan_admin_session` cookie (7-day TTL).
- All write/read admin API routes require a valid session.

### Required environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD` | Admin login password |
| `SESSION_SECRET` | HMAC key for session cookies |
| `GITHUB_TOKEN` | PAT with repo write access |
| `GITHUB_REPO` | Target repo (e.g. `owner/repo`) |
| `GITHUB_BRANCH` | Branch to commit to (defaults to `main`) |

## Development

```bash
npm install          # Install marked dependency
npm run check        # Syntax-check api/*.js files
```

When editing blog posts manually (without the admin UI), update both `blog/posts/<slug>.html`, `blog/posts/<slug>.md`, and `blog/index.json`.

When editing generated post HTML, preserve the MathJax script block and the link to `styles/theme.css`.

## End-to-end testing

Local E2E tests run against a dev server that writes to the local filesystem instead of GitHub.
Set `USE_LOCAL_FS=1` (the dev server sets this automatically).

```bash
# Terminal 1: start local server on http://127.0.0.1:4173
npm run dev:e2e

# Terminal 2: run automated tests
npm run test:e2e
```

The test suite covers:

- Static pages and theme CSS loading
- Admin login (reject bad password, accept valid password)
- Publish (creates `.html` and `.md`, updates `blog/index.json`)
- Load post for edit (`GET /api/post?slug=`)
- Edit with slug rename
- Delete (removes files and index entry)
- Admin page UI markers (manage posts, edit, delete)

Default local credentials (E2E only, not used in production):

- Password: `e2e-test-password`
- Session secret: set by `scripts/e2e-dev.mjs`

After API changes, run `npm run check` and `npm run test:e2e` before opening a pull request.

## Deployment

Production is hosted on Vercel at https://shan-gao5-github-io.vercel.app.
GitHub Pages also serves the static site at https://shan-gao5.github.io.

Pushes to `master` trigger a Vercel production deploy via `.github/workflows/deploy-vercel.yml`.
The workflow POSTs to a Vercel deploy hook stored in the `VERCEL_DEPLOY_HOOK` GitHub secret.

Manual deploy from a linked local project:

```bash
vercel link --yes --project shan-gao5-github-io
vercel --prod
```

## Conventions

- Keep the Turbo C++ pastel theme consistent across pages via `styles/theme.css`.
- API handlers export a default `handler(req, res)` function for Vercel.
- Use `sendJson` and `readJson` from `_auth.js` for API responses.
- Use `_github.js` for repository file I/O and `_blog.js` for blog logic.
- Escape user content with `escapeHtml` before embedding in HTML templates.
- Slugs are lowercase alphanumeric with hyphens; auto-generated from titles in the admin UI.
- Do not commit secrets, `.env.local`, or `.vercel/` contents.

## General guidelines

### Writing style

- Never use the em dash character `—`.
  Use a plain dash `-` instead.
- When writing or substantially editing long Markdown files, put each full sentence on its own line.
  Preserve normal Markdown structure, but avoid wrapping multiple sentences onto the same physical line.

### Git and commits

- When writing commit messages, never automatically add the agent name as a co-author.
- Never manually modify `CHANGELOG.md` files or files marked as auto-generated.

### Engineering decisions

- When making technical decisions, do not give much weight to short-term development cost.
  Prefer quality, simplicity, robustness, scalability, and long-term maintainability.

### Bug fixes and testing

- When fixing a bug, always begin by reproducing it in an end-to-end setting that closely matches how an end user experiences it.
  This helps identify the actual problem so the fix addresses its root cause.
- When performing end-to-end testing, be highly attentive to the visible user interface and overall user experience.
  If something clearly looks incorrect, even when it is not directly related to the current task, fix it when reasonably possible.

### Code quality

- Apply the same high standard to engineering quality, including lint errors, test failures, type errors, build warnings, and flaky tests.
  If an issue is discovered, fix it even when it was not introduced by the current change.
