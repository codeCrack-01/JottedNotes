# Deploying Jotted to GitHub Pages

## How It Works

Jotted is a fully client-side app — notes are stored in IndexedDB, not on a server. This means it can be exported to static files and hosted on GitHub Pages for free.

The build pipeline:
1. Compiles Tailwind CSS (standalone Rust binary — no Node needed for CSS)
2. Precompiles Rails assets (Propshat fingerprinted JS/CSS)
3. Renders ERB templates to static HTML/JSON/JS
4. Applies a URL prefix (`/JottedNotes`) so all asset paths work under the repo subpath
5. Deploys the output to the `gh-pages` branch

Your site will be live at `https://codeCrack-01.github.io/JottedNotes/`.

---

## Prerequisites

- Ruby 4.0.5 (see `.ruby-version`)
- Node 22 (see `.node-version`)
- Yarn (`npm i -g yarn`)
- Git

---

## One-Time Setup

### 1. Enable GitHub Pages

1. Go to your repo: `https://github.com/codeCrack-01/JottedNotes`
2. **Settings → Pages**
3. Under "Branch", select **gh-pages** and **/(root)**, then **Save**

*If the `gh-pages` branch doesn't exist yet, the first CI run will create it.*

### 2. Verify GitHub Actions has permission

1. **Settings → Actions → General**
2. Scroll to "Workflow permissions"
3. Ensure **Read and write permissions** is selected
4. Check **Allow GitHub Actions to create and approve pull requests**

---

## Building and Deploying

### Option A: CI/CD (Automatic — Recommended)

Every push to the `main` branch triggers `.github/workflows/pages.yml`:

1. Push your changes:
   ```bash
   git add .
   git commit -m "your message"
   git push origin main
   ```
2. Go to **Actions** tab in your repo — you'll see the workflow running
3. Once it finishes (2–3 minutes), your site is live at `https://codeCrack-01.github.io/JottedNotes/`

### Option B: Local Build + Manual Deploy

Build the static site locally, then push to `gh-pages`:

```bash
# Build everything
bin/pages-build

# Deploy using gh-pages CLI
npx gh-pages -d public/JottedNotes --dotfiles

# Or deploy manually:
# cp -r public/JottedNotes/* /tmp/gh-pages/
# git checkout gh-pages
# cp -r /tmp/gh-pages/* .
# git add . && git commit -m "Deploy" && git push
```

---

## Testing the Build Locally

You don't need to push to verify the export works:

```bash
ASSET_PREFIX=/JottedNotes RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 bin/rails tailwindcss:build
ASSET_PREFIX=/JottedNotes RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile
ASSET_PREFIX=/JottedNotes RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 bin/rails pages:export
```

Inspect the output in `public/JottedNotes/`. You can serve it locally with any static file server:

```bash
npx serve public/JottedNotes
```

---

## How Asset Paths Work

- In development (`bin/dev`), paths are root-relative (`/assets/tailwind-xxx.css`) — correct for `localhost:3000`
- In the static export, paths are prefixed (`/JottedNotes/assets/tailwind-xxx.css`) — correct for `codeCrack-01.github.io/JottedNotes/`
- The prefix is controlled by `ASSET_PREFIX` (defaults to `/JottedNotes` in `bin/pages-build`)
- `config/initializers/asset_prefix.rb` reads this env var and sets Rails' `assets.prefix` accordingly

---

## Progressive Web App (PWA) Support

| Feature | Status |
|---|---|
| HTTPS | Provided by GitHub Pages automatically |
| Manifest (install prompt) | Works — served at `/JottedNotes/manifest.json` |
| Service worker registration | Works — registered at `/JottedNotes/service-worker` |
| Asset precaching | Works — all fingerprinted assets are precached via the Propshaft manifest |
| Offline fallback | Works — cached `index.html` is served when offline |

### How offline works

1. On first visit, the service worker installs and precaches:
   - The homepage (`/JottedNotes/`)
   - Icons (`icon.png`, `icon.svg`)
   - All fingerprinted JS and CSS assets (read from Propshaft's `.manifest.json` at build time)
2. On subsequent visits, the service worker serves cached assets instantly (Cache-First strategy)
3. The homepage uses Network-First: it tries the network, falls back to cache when offline

### Cache busting

The cache name is `jotted-v1`. When you deploy an update, change the cache version in
`app/views/pwa/service_worker.js.erb` to force a full re-cache:

```js
var CACHE_NAME = "jotted-v2"
```

---

## Troubleshooting

### "Blank page after deploy"

Check the browser console for 404s on asset files. The most common cause: paths are missing the `/JottedNotes` prefix.

Verify: open DevTools → Network tab and look for failed requests. They should all start with `/JottedNotes/...`.

### "Service worker didn't register"

GitHub Pages serves with HTTPS, which is required for service workers. If you see "Service Worker not supported" in the console, check:
- Are you on `localhost`? Dev mode doesn't register the SW by default.
- Are you on an `http://` URL? GH Pages redirects to `https://` automatically.

### "Changes not showing after deploy"

The service worker caches aggressively. Hard-reload (Cmd+Shift+R / Ctrl+Shift+R) or clear site data in DevTools → Application → Clear storage. Also bump `CACHE_NAME` in the service worker to force a refresh.

### "Build fails with Ruby version mismatch"

The CI runner uses `.ruby-version` to select Ruby. Make sure it matches what's available:
- Check [ruby/setup-ruby](https://github.com/ruby/setup-ruby#supported-versions) for supported versions
- Update `.ruby-version` if needed

---

## Files You Might Need to Update

| If you change... | Also update... |
|---|---|
| Repo name | `ASSET_PREFIX` in `bin/pages-build`, `publish_dir` in `.github/workflows/pages.yml` |
| Cache strategy | `app/views/pwa/service_worker.js.erb` |
| Asset list | The SW reads from Propshaft's manifest automatically — no manual update needed |
| Icon or manifest | `app/views/pwa/manifest.json.erb`, `public/icon.png` |
