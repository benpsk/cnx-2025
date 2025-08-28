
## GitHub Pages Deployment

- What it does: Deploys the `images/` directory to GitHub Pages on every push to `main` (and supports manual runs).
- Workflow: `.github/workflows/pages.yml` uploads `images/` and adds `images/.nojekyll` to disable Jekyll processing.
- One-time setup: In GitHub → Settings → Pages → Build and deployment → Source: select “GitHub Actions”.
- Triggers:
  - Push to `main`: auto-deploys `images/`.
  - Manual: Actions → “Deploy to GitHub Pages” → “Run workflow”.
- Where to find the URL: After a successful run, open the workflow run and look for the “github-pages” environment. The `page_url` is shown there.

### Change what gets deployed

- Deploy `dist/` (built site): add build steps (e.g., `npm ci && npm run build`), then set the upload path to `dist`.
- Deploy repo root: stage and upload from the project root (excluding CI/dev dirs) instead of `images/`.

Want me to switch to deploying `dist/` via a build step? I can wire that up.
# cnx-2025
