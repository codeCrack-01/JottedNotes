# Development Log

## 2026-06-16 — Read-only view toggle

### Summary
Added a read-only mode for browsing notes without accidental edits. A circular glassmorphism toggle button (pen-in-square icon) sits above the floating dock. New notes open in edit mode; selecting an existing note opens in read-only mode. The button toggles between modes and changes color (accent blue = editing, muted = viewing).

### Key Implementation Details
- **Toggle button**: 36px circle with `border-radius: 50%`, same glassmorphism styling as the dock (`rgba(255,255,255,0.85)` background, `blur(20px)` backdrop-filter, subtle border and shadow). Uses a pen-in-rounded-square SVG icon from two `<path>` elements — the pen is scaled to fit within a `rect` frame.
- **dock-column wrapper**: Replaced the standalone `position: absolute` on `.island-dock` with a new `.dock-column` flex container that holds both the toggle button and the dock. The dock is now `position: relative` inside this wrapper. The wrapper sits at `right: 16px; top: 50%; transform: translateY(-50%)` — same position as the old dock.
- **readOnly state**: Boolean flag `this.readOnly` initialized to `false` in `connect()`. `toggleReadOnly()` flips it and calls `applyReadOnlyState()`. The method sets `contenteditable` on the trix-editor, adds/removes `readonly` on the title input, toggles `opacity-70` class on the title, hides/shows the dock and action bar via `hidden` attribute on Stimulus targets, and updates the toggle button's `edit-mode` class + title text.
- **Mode routing**: `createNewNote()` forces edit mode after clearing the editor. `selectNote()` forces read-only mode after loading the note's content. The check `if (!this.readOnly)` in each prevents redundant DOM updates when the mode is already correct.
- **Stimulus targets**: Added `readOnlyToggle` (the button), `dockPanel` (wrapper around the dock partial), and `editorActions` (the save/delete button bar). All use `has*Target` guards for safety.
- **Visual feedback**: `.read-only-toggle.edit-mode` sets `color` and `border-color` to `--color-jb-accent` (#3574f0). The default (read-only) state uses muted gray (#5f6368).

### Files Modified
| File | Change |
|------|--------|
| `app/javascript/controllers/notes_controller.js` | Added `readOnlyToggle`/`dockPanel`/`editorActions` targets, `readOnly` state, `toggleReadOnly()`/`applyReadOnlyState()` methods, mode switching in `selectNote()` and `createNewNote()` |
| `app/views/home/_editor_canvas.html.erb` | Added toggle button with pen-in-square SVG above the dock; wrapped dock in `dockPanel` target; added `editorActions` target to save/delete bar |
| `app/assets/tailwind/application.css` | Added `.dock-column` wrapper (absolutely positioned flex column), `.dock-column .island-dock` override (relative positioning), `.read-only-toggle` (circular glassmorphism button), `.read-only-toggle.edit-mode` (accent state) |

### Known Issues / Follow-up
- Toggling to read-only while editing discards the undo stack visually (contenteditable freeze is non-destructive, but Trix history is preserved internally)
- The read-only toggle is hidden when no note is selected (editor is in empty state) — consistent with the dock being hidden

---

## 2026-06-16 — Custom island-themed confirm dialog for delete

### Summary
Replaced the native `confirm()` dialog with a custom modal that matches the JetBrains Island Light aesthetic — glassmorphism surface, blurred backdrop, slide-up scale animation, and rounded corners. Also added a `.btn-jb-danger` (red) button style for destructive actions.

### Key Implementation Details
- **Promise-based flow**: `showConfirmDialog(message)` returns a `Promise` that resolves `true`/`false` based on user action. The `_confirmResolve` callback is stored on the controller instance and invoked by `confirmYes()` / `confirmNo()`.
- **Backdrop dismiss**: Clicking the overlay (outside the modal island) triggers `confirmNo()`, cancelling the delete. The modal island uses `data-action="click->stopPropagation"` to prevent clicks inside from propagating.
- **Modal design**: `.modal-overlay` (fixed fullscreen, semi-transparent backdrop with fade-in) + `.modal-island` (white glassmorphism card, 16px radius, 0.3s slide-up scale animation). Icon is an inline SVG trashcan, title is "Delete Note", message is the confirmation text.
- **Danger button**: `.btn-jb-danger` in red (#e55c5c) with hover darkening — used for the Delete action in the modal.
- **Modal targets**: `confirmDialog` (overlay) and `confirmMessage` (message text) added to the Stimulus controller.

### Files Modified
| File | Change |
|------|--------|
| `app/views/home/_editor_canvas.html.erb` | Added modal HTML with SVG icon, title, message, Cancel/Delete buttons; wired via Stimulus targets and actions |
| `app/javascript/controllers/notes_controller.js` | Added `confirmDialog`/`confirmMessage` targets, `showConfirmDialog()`, `confirmYes()`, `confirmNo()` methods; replaced `confirm()` with async dialog in `deleteNote()` |
| `app/assets/tailwind/application.css` | Added `.modal-overlay`, `.modal-island`, `.modal-icon`, `.modal-title`, `.modal-message`, `.modal-actions`, `.btn-jb-danger` with animations |

---

## 2026-06-16 — Commit button dirty-state indicator + delete confirmation

### Summary
Added a visual dirty-state indicator to the Commit button: blue with a subtle pulse animation when there are unsaved changes, green when everything is saved. Added a `confirm()` dialog before deleting notes to prevent accidental deletions, especially on mobile.

### Key Implementation Details
- **Dirty tracking**: `isDirty` flag set on `trix-change` and title `input` events, cleared after save or note load/create. A `_suppressDirty` flag prevents programmatic `loadHTML()` calls from marking the note as dirty.
- **saveIndicator target**: New Stimulus target on the commit button. `updateSaveIndicator()` toggles between `btn-jb-success` (green, "Saved") and `btn-jb-unsaved` (blue with pulse, "Commit Changes").
- **Pulse animation**: `.btn-jb-unsaved` uses a `pulse-unsaved` keyframe animation that fades a blue box-shadow ring in/out on a 2s loop — subtle but noticeable.
- **Delete confirmation**: `window.confirm()` in `deleteNote()` with a clear message ("Are you sure you want to delete this note? This cannot be undone."). Returns early if cancelled.
- **Title input dirty tracking**: Added `data-action="input->notes#markDirty"` to the title input so renaming a note also marks it dirty.

### Files Modified
| File | Change |
|------|--------|
| `app/javascript/controllers/notes_controller.js` | Added `saveIndicator` target, `markDirty()`/`markClean()`/`updateSaveIndicator()`, dirty tracking in `connect()`, `_suppressDirty` flag in `selectNote()`/`createNewNote()`, `confirm()` in `deleteNote()` |
| `app/views/home/_editor_canvas.html.erb` | Added `data-notes-target="saveIndicator"` and `data-action="input->notes#markDirty"` to title input; button default text → "Saved" |
| `app/assets/tailwind/application.css` | Added `.btn-jb-unsaved` class and `@keyframes pulse-unsaved` animation |

---

## 2026-06-16 — Mobile sidebar auto-collapse on new note

### Summary
`createNewNote()` was missing the sidebar auto-collapse logic that `selectNote()` already had. On mobile (<1024px), tapping "+ New Note" left the sidebar overlay open, forcing an extra tap to dismiss it. Added the same `window.innerWidth` check to `createNewNote()` so both navigation paths close the sidebar.

### Files Modified
| File | Change |
|------|--------|
| `app/javascript/controllers/notes_controller.js` | Added `window.innerWidth < 1024` check in `createNewNote()` to collapse sidebar on mobile |

---

## 2026-06-16 — PWA install banner + favicon fix

### Summary
Fixed the browser tab icon (was showing a red circle from the old 14×14 placeholder) by generating proper 32×32 and 16×16 favicon PNGs and updating the HTML to use them as the primary favicon. Added a PWA install banner (Stimulus controller) that appears when Chrome fires `beforeinstallprompt`, giving users a visible "Install Jotted" button — essential for mobile users who won't know to use the browser's install menu.

### Key Implementation Details
- **Favicon fix**: Added `<link rel="icon" sizes="32x32">` pointing to a crisp 32×32 PNG render of the journal-pen "J" design. Kept the SVG as a secondary option for modern browsers that support SVG favicons.
- **PWA install controller** (`pwa_install_controller.js`):
  - Listens for `beforeinstallprompt` on `window` — prevents default mini-infobar, shows custom banner
  - Listens for `appinstalled` to hide the banner after successful install
  - Checks `display-mode: standalone` on connect — if already installed, removes the banner element entirely
  - `install()` calls `prompt()` on the stored deferred prompt; `dismiss()` hides the banner
  - Follows existing Stimulus controller conventions (static targets, lifecycle methods, `.bind(this)` for event handlers)
- **Install banner UI**: Glassmorphism pill fixed at bottom-center of viewport, matching the JetBrains Island aesthetic (blurred white background, 16px radius, subtle shadow). Uses an `.install-banner` CSS class with a slide-up fade-in animation.
- **Exported assets**: Added `icon-32.png` and `icon-16.png` to `pages.rake` copy list.

### Files Modified
| File | Change |
|------|--------|
| `public/icon-32.png` | **Created** — 32×32 PNG favicon |
| `public/icon-16.png` | **Created** — 16×16 PNG favicon (legacy fallback) |
| `app/javascript/controllers/pwa_install_controller.js` | **Created** — Stimulus controller for `beforeinstallprompt` handling |
| `app/views/layouts/application.html.erb` | Replaced `icon.png` favicon with `icon-32.png` + `sizes="32x32"`; added install banner HTML with data-controller/targets/actions |
| `app/assets/tailwind/application.css` | Added `.install-banner` class and `@keyframes install-banner-in` animation; added `.install-banner-close` hover style |
| `lib/tasks/pages.rake` | Added `icon-32.png` and `icon-16.png` to static asset copy list |

---

## 2026-06-16 — Custom PWA icons (journal-pen "J" design, multiple sizes)

### Summary
Replaced the default 14×14 favicon with a custom vector-designed icon set featuring a "J" stylized as a journal/pen on a blue gradient rounded-square background. Generated SVG source and PNG renders at 512×512, 192×192, and 180×180. Updated the PWA manifest, layout, and export task to use the correct icon files at each size.

### Key Implementation Details
- **SVG design**: A bold white "J" with a dark fountain pen diagonally crossing it, on a JetBrains-accent-blue gradient rounded-square background. Simple vector style recognizable at all sizes (16×16 favicon to 512×512 PWA icon).
- **Icon set**: Generated via Inkscape from a single SVG source:
  - `public/icon.svg` (SVG source for favicon)
  - `public/icon.png` (512×512 — primary PWA icon)
  - `public/icon-192.png` (192×192 — Chrome install dialog icon)
  - `public/icon-180.png` (180×180 — Apple touch icon)
- **Manifest update**: Added a 192×192 entry as the first icon (Chrome uses the first suitable icon for the install prompt).
- **Apple touch icon**: Changed from `icon.png` to `icon-180.png` for proper iOS home screen rendering.
- **Export**: Added `icon-192.png` and `icon-180.png` to the `pages.rake` static asset copy list.

### Files Modified
| File | Change |
|------|--------|
| `public/icon.png` | Replaced 14×14 placeholder with 512×512 render of new design |
| `public/icon.svg` | Replaced with new journal-pen "J" SVG design |
| `public/icon-192.png` | **Created** — 192×192 PWA icon |
| `public/icon-180.png` | **Created** — 180×180 Apple touch icon |
| `app/views/pwa/manifest.json.erb` | Added 192×192 icon entry as first icon |
| `app/views/layouts/application.html.erb` | apple-touch-icon → `icon-180.png` |
| `lib/tasks/pages.rake` | Added `icon-192.png` and `icon-180.png` to copy list |

---

## 2026-06-16 — GitHub Pages deployment pipeline (removed Vercel, added prefix-aware static export)

### Summary
Replaced the Vercel deployment pipeline with a GitHub Pages–focused approach. Removed `vercel.json`, `bin/vercel-build`, and `lib/tasks/vercel.rake`. Created `lib/tasks/pages.rake` (static export task), `bin/pages-build` (build script), and `.github/workflows/pages.yml` (CI/CD). Added `config/initializers/asset_prefix.rb` so `config.assets.prefix` is dynamically set from `ASSET_PREFIX` env var (e.g., `/JottedNotes`), ensuring Propshaft generates correct subpath URLs. All PWA templates now use `ENV.fetch("ASSET_PREFIX", "")` for paths, and the service worker was renamed to `.js.erb` to support ERB preprocessing.

### Key Implementation Details
- **Dynamic asset prefix**: `config/initializers/asset_prefix.rb` reads `ENV['ASSET_PREFIX']` and sets `config.assets.prefix` to `{prefix}/assets`. This makes `stylesheet_link_tag`, `javascript_importmap_tags`, and `asset_path` generate URLs with the subpath (e.g., `/JottedNotes/assets/tailwind-xxx.css`).
- **Export to subdirectory**: `pages.rake` writes rendered templates and copies static assets (icons, offline.html) into `public/<ASSET_PREFIX>/`. When deploying, only this subdirectory is published as the site root, so file paths match the URL structure.
- **Service worker → JS ERB**: Renamed `service_worker.js` → `service_worker.js.erb` so that `ENV['ASSET_PREFIX']` can be injected at build time. All precache URLs and path-matching logic use a `PREFIX` variable.
- **GitHub Actions**: `.github/workflows/pages.yml` runs on push to `main`, executes `bin/pages-build`, and deploys `public/JottedNotes/` via `peaceiris/actions-gh-pages`.
- **Build script**: `bin/pages-build` defaults `ASSET_PREFIX` to `/JottedNotes`, then runs: bundle → yarn → tailwind build → precompile → pages:export.
- **No regressions for local dev**: Without `ASSET_PREFIX` set, all template expressions and the initializer produce empty-string prefixes, matching pre-change behavior.

### Files Modified
| File | Change |
|------|--------|
| `vercel.json` | **Removed** |
| `bin/vercel-build` | **Removed** |
| `lib/tasks/vercel.rake` | **Removed** |
| `config/initializers/asset_prefix.rb` | **Created** — dynamic `assets.prefix` from `ENV['ASSET_PREFIX']` |
| `lib/tasks/pages.rake` | **Created** — exports static files to `public/<ASSET_PREFIX>/` |
| `bin/pages-build` | **Created** — full build script for GitHub Pages |
| `.github/workflows/pages.yml` | **Created** — CI/CD deploying to `gh-pages` branch |
| `app/views/layouts/application.html.erb` | All PWA paths wrapped with `ENV.fetch("ASSET_PREFIX", "")` |
| `app/views/pwa/manifest.json.erb` | Icon src, start_url, scope now use `ASSET_PREFIX` |
| `app/views/pwa/service_worker.js` | **Renamed** → `service_worker.js.erb`, added `PREFIX` variable |
| `.gitignore` | Replaced Vercel artifact entries with `/public/JottedNotes/` |
| `README.md` | Replaced Vercel deployment docs with GitHub Pages section; updated project structure |

### Known Issues / Follow-up
- The PWA's precache list still hardcodes `/assets/application.css` and `/assets/application.js` (non-digest paths). These will fail on install but the fetch handler falls through to network. Should be updated to use actual digest filenames.
- `bin/pages-build` requires Ruby and Node installed — ensure the CI runner has both.
- If the repo name changes, update `ASSET_PREFIX` in `bin/pages-build` and the workflow's `publish_dir` path.

---

## 2026-06-16 — Migrated from Bootstrap to Tailwind CSS v4 with JetBrains Island Light redesign

### Summary
Replaced Bootstrap 5.3 with Tailwind CSS v4 (via the `tailwindcss-rails` gem) and redesigned the entire UI with a JetBrains Island Light aesthetic. Removed the entire SCSS/Sass/PostCSS build pipeline in favor of Tailwind's standalone binary (Rust-based, no Node.js build dependency). All views were rewritten to strip Bootstrap classes and use Tailwind utility classes. The floating dock, sidebar, and editor panels now render as rounded "floating islands" on a warm-gray background, matching the JetBrains New UI light-theme look. Bootstrap Icons were replaced with inline SVGs. The color-menu dropdown now uses pure CSS/Stimulus (no Bootstrap JS dependency).

### Key Implementation Details
- **Tailwind v4 via `tailwindcss-rails` v4.5.0**: uses the standalone Rust binary (`tailwindcss-ruby` gem) — no Node.js needed for CSS compilation. The watcher runs via `bin/rails tailwindcss:watch` in Procfile.dev.
- **CSS-first configuration**: `app/assets/tailwind/application.css` uses `@import "tailwindcss"` with an `@theme` block defining custom JetBrains color tokens (`jb-bg`, `jb-surface`, `jb-sidebar`, `jb-text`, `jb-muted`, `jb-accent`, etc.).
- **Island panels**: sidebar/editor use `.island-panel` and `.island-sidebar` classes with `border-radius: 12px`, `box-shadow` subtleties, and `border: 1px solid` for the floating effect.
- **Floating dock**: `.island-dock` with `backdrop-filter: blur(20px)` glassmorphism, right-positioned at 50% vertical.
- **Button system**: `.btn-jb-accent` (blue), `.btn-jb-success` (green), `.btn-jb-ghost` (subtle outline) — all with `border-radius: 8px` and soft hover transitions.
- **Color menu**: repositioned to the left of the dock, uses `.color-menu` (white rounded card with shadow) and `.color-swatch` (circular buttons) — toggled via Stimulus `toggleColorMenu`/`closeColorMenuOutside`, no Bootstrap JS.
- **Icons**: all Bootstrap Icons replaced with inline SVGs (hamburger, close, plus icons).
- **Stale assets**: removed `public/assets/.manifest.json` (precompiled Bootstrap manifest) which was causing Propshaft to use the static resolver instead of dynamic resolution.

### Files Modified
| File | Change |
|------|--------|
| `Gemfile` | Replaced `cssbundling-rails` with `tailwindcss-rails` |
| `Procfile.dev` | Replaced `yarn watch:css` with `bin/rails tailwindcss:watch` |
| `package.json` | Removed bootstrap, bootstrap-icons, @popperjs/core, sass, postcss, autoprefixer, nodemon. Kept only trix + @rails/actiontext |
| `bin/vercel-build` | Replaced yarn CSS build steps with `bundle exec rails tailwindcss:build`. Added `yarn install` back for JS deps |
| `config/importmap.rb` | Removed `pin "bootstrap"` |
| `config/initializers/assets.rb` | Removed Bootstrap icon/font and JS asset paths |
| `app/javascript/application.js` | Removed `import * as bootstrap from "bootstrap"` |
| `app/javascript/controllers/notes_controller.js` | Replaced all `d-none` class refs with `hidden` |
| `app/views/layouts/application.html.erb` | Replaced `stylesheet_link_tag :app` with `stylesheet_link_tag "tailwind"` |
| `app/views/home/index.html.erb` | Full rewrite: stripped Bootstrap grid classes, uses Tailwind flex layout, island-panel wrapper |
| `app/views/home/_sidebar.erb` | Full rewrite: island-sidebar panel, inline SVG icons, Tailwind utility classes |
| `app/views/home/_editor_canvas.html.erb` | Full rewrite: Tailwind classes, status-pill in flow, jb-input styling |
| `app/views/home/_floating_dock.html.erb` | Rewrote: island-dock class, color-menu with pure CSS/Stimulus, inline SVGs |
| `app/assets/tailwind/application.css` | **Created**: Tailwind v4 CSS-first config with @theme tokens and all custom component styles |
| `app/assets/stylesheets/application.bootstrap.scss` | **Removed** |
| `app/assets/stylesheets/notes_workspace.scss` | **Removed** |
| `app/assets/builds/application.css` | **Removed** (1.1MB stale Bootstrap build) |
| `public/assets/.manifest.json` | **Removed** (stale precompile manifest) |
| `.gitignore` | Added `public/assets/.manifest.json` |

### Known Issues / Follow-up
- Tailwind v4's CSS-first config requires adding custom colors in `@theme` blocks; ensure new utility classes are detected by the content scanner
- The `status-pill` word count element now renders in normal flow (previously absolute-positioned) — verify positioning doesn't break at various editor heights
- Inline SVGs for icons work but lack the consistency of a dedicated icon library — consider Heroicons or Lucide if more icons are needed
- Pre-existing test failure in `home_controller_test.rb` remains resolved (was a routing stub, not related to this change)

### Summary
The notebook implementation (scattered notes + notebook accordions) was broken — notes created via the UI weren't displaying in the sidebar, and notebooks couldn't be created either. Root cause was a stale `public/index.html` build artifact being served instead of the live ERB (fixed in previous session), plus the notebook code itself adding complexity without working correctly. Reverted the sidebar, controller, and CSS to the pre-notebook v1 state — a single "Project Notes" header with a "+ New Note" button and a flat note list. Also fixed a service-worker 404 caused by a template filename mismatch (hyphen vs underscore in `app/views/pwa/`).

### Key Implementation Details
- **Sidebar**: restored `data-notes-target="list"` for all notes; removed `scatteredList` and `notebookList` targets; removed the Scattered Notes and Notebooks sections
- **Controller**: DB version back to 2 (no notebooks store); `loadSidebar()` → `loadNotes()` rendering into `listTarget`; removed all notebook CRUD, accordion toggle, drag-and-drop, and long-press handlers; `saveNote()` / `createNewNote()` / `selectNote()` no longer touch `notebookId`
- **CSS**: removed notebook accordion styles, scattered-notes-list, drag-over outlines, and the `.jb-tree-item` flex-override rules added for the notebook sidebar
- **Service worker**: renamed `service-worker.js` → `service_worker.js` to match the controller action name; updated `lib/tasks/vercel.rake` template reference accordingly
- **Stale build artifacts**: removed `public/index.html`, `public/manifest.json`, `public/service-worker.js` that were being served instead of live ERB templates

### Files Modified
| File | Change |
|------|--------|
| `app/views/home/_sidebar.erb` | Reverted to original v1: single "Project Notes" header with "+ New Note" button and `data-notes-target="list"` |
| `app/javascript/controllers/notes_controller.js` | Reverted to v1: DB v2, `loadNotes()` into `listTarget`, no notebook methods. Removed `scatteredList`/`notebookList` targets |
| `app/assets/stylesheets/notes_workspace.scss` | Reverted to v1: removed notebook accordion, scattered notes, drag-and-drop, and flex-override rules |
| `lib/tasks/vercel.rake` | Updated template reference from `pwa/service-worker` to `pwa/service_worker` |

---

## 2026-06-15 — Notebooks: accordion sidebar, drag-and-drop, IndexedDB v3

### Summary
Added notebook grouping to organize notes into named collections. The sidebar is split into two sections: "Scattered Notes" (notes without a notebook) at the top, and "Notebooks" below. Notebooks use a single-expand accordion — clicking a notebook reveals its notes inline. Notes can be dragged between notebooks or to the scattered section. Long-press (mobile) or right-click (desktop) on a notebook header triggers a confirm dialog for deletion, which moves all contained notes back to scattered.

### Key Implementation Details
- **IndexedDB v3**: New `notebooks` object store (keyPath: `id`) with fields `id`, `title`, `createdAt`, `updatedAt`. `notebookId` index added to existing `notes` store. The `onupgradeneeded` handler is now version-aware — v3 migration creates the notebooks store and index without destroying existing notes (unlike the previous destructive v2 handler).
- **Sidebar rendering**: `loadSidebar()` replaces `loadNotes()`. It separates notes by `notebookId` (null → "scattered"), renders scattered notes into `scatteredListTarget` and notebook accordions into `notebookListTarget`.
- **Accordion**: CSS-based collapse using `max-height: 0` → `max-height: 500px` transition. Single-expand only: toggling one notebook closes all others.
- **Drag-and-drop**: HTML5 drag API. `dragStart` sets `application/note-id` data. Drop zones (notebook bodies + scattered container) accept drops and call `updateNoteNotebook()`.
- **Long-press**: 600ms `setTimeout` on `touchstart`, cleared on `touchend`/`touchmove`. `contextmenu` event for desktop right-click. Both call `confirmDeleteNotebook()` which moves notes to scattered and deletes the notebook.
- **Note delete in sidebar**: Each note item has an X button (visible on hover) that calls `deleteNote()` with `data-note-id`, properly stopping propagation to avoid triggering note selection.
- **Note ownership**: New `notebookId` field on notes. `saveNote()` reads from `this.idTarget.dataset.notebookId`, set by `createNewNote()`, `createNoteInNotebook()`, or `selectNote()`.

### Files Modified

| File | Change |
|------|--------|
| `app/javascript/controllers/notes_controller.js` | DB v3 with version-aware upgrade; added `notebooks` store CRUD + `updateNoteNotebook()`; added `scatteredList`/`notebookList` targets; `loadSidebar()` replaces `loadNotes()`; new methods: `createNotebook`, `confirmDeleteNotebook`, `createNoteInNotebook`, `toggleNotebookAccordion`, drag-and-drop handlers, long-press handlers; updated `createNewNote`, `selectNote`, `saveNote`, `deleteNote` for `notebookId` |
| `app/views/home/_sidebar.erb` | Restructured into two panels: "Scattered Notes" with `data-notes-target="scatteredList"` (drop zone) and "Notebooks" with `data-notes-target="notebookList"`; removed old `list` target |
| `app/assets/stylesheets/notes_workspace.scss` | Added `.notebook-header`, `.notebook-chevron`, `.notebook-body` accordion collapse/expand; `.notebook-body.drag-over` dashed outline; `.jb-tree-item` flex layout with hover-reveal delete button; `.scattered-notes-list` max-height + drop zone styling |

### Known Issues / Follow-up
- Pre-existing test failure in `home_controller_test.rb` (routing stub, unrelated)
- Drag-and-drop on mobile requires long-press to initiate drag (HTML5 drag API is desktop-focused; a touch polyfill or custom touch-drag could be added later)
- Deleting a notebook silently moves notes to scattered — no undo available
- Notebook accordion max-height of 500px may clip very long note lists inside a notebook (unlikely in practice)
- Prompt-based notebook naming (`window.prompt`) is basic; a proper modal with validation could be added

---

## 2026-06-14 — Vercel static deployment support

### Summary
Added a `vercel.json` config, a `bin/vercel-build` script, and a `lib/tasks/vercel.rake` Rake task to export Jotted as a fully static site for Vercel deployment. The Rake task renders all Rails ERB templates (home page, manifest, service worker) to static files in `public/` with correct fingerprinted asset paths from Propshaft. The build script chains dependency installation, CSS compilation, asset precompilation, and page export.

### Files Modified

| File | Change |
|------|--------|
| `vercel.json` | **Created** — Vercel config: serves `public/` as static files, rewrites `/service-worker` → `/service-worker.js` |
| `lib/tasks/vercel.rake` | **Created** — `rails vercel:export` renders `home/index` (with layout), `pwa/manifest`, `pwa/service-worker` to `public/` |
| `bin/vercel-build` | **Created** — Executable build script: `bundle install`, `yarn install`, `yarn build:css:*`, `rails assets:precompile`, `rails vercel:export` |
| `.gitignore` | Added `public/index.html`, `public/manifest.json`, `public/service-worker.js` (build artifacts) |

### Key Implementation Details
- Uses `ActionController::Base.render` directly via an anonymous controller class to avoid `ApplicationController` before_actions (`allow_browser`, `stale_when_importmap_changes`) that expect a real HTTP request.
- Templates are rendered in `RAILS_ENV=production` with `SECRET_KEY_BASE_DUMMY=1`, so all asset URLs get correct Propshaft digest fingerprints.
- The service-worker template is named `service-worker` (with hyphen), not `service_worker` — the Rake task must match the filename.
- Vercel's `cleanUrls: true` removes `.html` extensions automatically.

### Known Issues / Follow-up
- Service worker precache list hardcodes non-digest paths (`/assets/application.css`, `/assets/application.js`) — these don't exist in the Propshaft-compiled output. The SW still works (fetch falls through to network), but the precache step will fail silently. Should update to use the actual digest filenames or switch to a versioned cache-bust approach.
- Static export generates `public/index.html`, `public/manifest.json`, `public/service-worker.js` — these are gitignored to avoid conflicts with development (where the Rails server serves them via the PWA controller and `home#index`).

## 2026-06-14 — Progressive Web App (PWA) support

### Summary
Turned Jotted into an installable PWA. Wired up Rails 8's built-in PWA view templates (manifest, service worker) with a new controller and routes. Added a Cache-First service worker for offline-capable static assets, a Network-First strategy for the root page with offline fallback, and matched theme colors to the JetBrains IDE palette.

### Files Modified

| File | Change |
|------|--------|
| `app/controllers/pwa_controller.rb` | **Created** — serves manifest (JSON) and service worker (JS) without layout |
| `config/routes.rb` | Added `GET /manifest` and `GET /service-worker` routes |
| `app/views/pwa/manifest.json.erb` | Updated `theme_color` → `#3574f0` (accent blue), `background_color` → `#f8f9fa` (canvas gray), added `short_name`, meaningful `description` |
| `app/views/pwa/service-worker.js` | Replaced comment stub with full service worker: pre-caches app shell on install, Cache-First for static assets, Network-First for `/` with offline fallback, cleans old caches on activate |
| `app/views/layouts/application.html.erb` | Uncommented and wired manifest link; added service worker registration script at end of `<body>` |
| `public/offline.html` | **Created** — minimal offline fallback page shown when the root page can't be fetched |

### Key Implementation Details
- **Cache strategy**: Cache-First for versioned assets (CSS/JS under `/assets/`) and icons; Network-First for the root page `/` so fresh HTML is always served when online, with cache fallback when offline.
- **Cache name**: `jotted-v1` — bump the version number to force a full refresh of cached assets.
- **Controller**: Uses `layout false` to serve raw JSON/JS without HTML wrapping; `skip_before_action :verify_authenticity_token` on the service worker action since it's fetched by the browser, not a user-initiated request.
- **Service worker scope**: Registered with default scope (`/`), covering the entire app.
- **No splash screen config**: The existing 512×512 `public/icon.png` is reused; a maskable variant uses the same asset.

### Known Issues / Follow-up
- Future cloud sync support will need a revised service worker strategy (e.g. Network-First or background sync for API calls) — the current Cache-First approach is optimized for the fully client-side architecture.
- Pre-existing test failure in `home_controller_test.rb` (routing stub, unrelated)

## 2026-06-14 — Mobile sidebar toggle button with slide-in overlay

### Summary
Added a hamburger-toggle button that appears at the top-left on mobile viewports. The sidebar now slides in as a fixed overlay with a backdrop when toggled, instead of taking the full screen editor. On desktop (≥768px) the sidebar remains always visible in normal flow.

### Files Modified

| File | Change |
|------|--------|
| `app/views/home/index.html.erb` | Added fixed-position sidebar toggle button (`bi-list`); changed editor column to `col-12 col-md-9` so it takes full width on mobile; added `pt-5 pt-md-4` padding to clear the toggle |
| `app/views/home/_sidebar.erb` | Added `data-notes-target="sidebar"` and class `sidebar-panel`; added backdrop div for mobile dismiss; added close button (`bi-x-lg`) visible only on mobile |
| `app/javascript/controllers/notes_controller.js` | Added `"sidebar"` to static targets; added `toggleSidebar()` method; sidebar auto-closes on note selection when viewport < 768px |
| `app/assets/stylesheets/notes_workspace.scss` | Added `.sidebar-toggle-btn` glassmorphism styling; added mobile breakpoint rules: sidebar as fixed overlay with `translateX` slide transition, backdrop with fade, close button styles |

### Key Implementation Details
- Uses `position: fixed` on mobile (removed from flex flow), so the editor column takes the full viewport width
- Slide animation via `transform: translateX(-100%)` → `translateX(0)` with a 300ms cubic-bezier transition
- `sidebar-visible` class is toggled on the sidebar element; the backdrop sits inside the sidebar panel with `z-index: -1` relative to the panel
- On desktop (≥768px via `max-width: 767.98px` media query), the sidebar stays in normal Bootstrap grid flow — no changes to the existing layout
- Selecting a note on mobile automatically closes the sidebar

### Known Issues / Follow-up
- Pre-existing test failure in `home_controller_test.rb` (routing stub, unrelated)

## 2026-06-14 — Migrated from colored text to colored highlights (highlighter markers)

### Summary
Replaced the broken `textColor` system (inline `color` on `<span>`) with a `highlightColor` system (inline `background-color` on `<span>`), giving a highlighter-marker effect. The palette was replaced with semi-transparent pastel versions of the same colors, and black was replaced with yellow. Removed verbose debug logging from the highlight apply path and cleaned up the legacy `trix-editor mark` CSS override.

### Files Modified

| File | Change |
|------|--------|
| `app/javascript/application.js` | `textColor` → `highlightColor` Trix attribute with `backgroundColor` style |
| `app/javascript/controllers/notes_controller.js` | `configureTrixAttributes` uses `highlightColor`; `case "color"` → `case "highlight"`; removed debug logs |
| `app/views/home/_floating_dock.html.erb` | New rgba pastel swatches (yellow/blue/red/green), `data-format-type="highlight"`, title "Highlight Color" |
| `app/assets/stylesheets/notes_workspace.scss` | Removed `trix-editor mark` override rule |

### Key Implementation Details
- Root cause of the apply failure: Trix's `style` config property uses static/literal values from the config object, NOT the dynamic value passed to `activateAttribute`. For dynamic values, `styleProperty` must be used instead (maps to `element.style[styleProperty] = value`).
- Changed the color-menu toggle icon from a palette SVGs to a highlighter-marker SVG.
- Added selection-range preservation before `trixEditor.focus()` for the highlight case, preventing the browser from collapsing the user's text selection.

### Known Issues / Follow-up
- Pre-existing test failure in `home_controller_test.rb` (routing stub, unrelated)
- Notes saved with the old `textColor` spans will still render those styles — no migration is performed

## 2026-06-14 — Fixed CSS compilation, visual-only scale buttons, no editor focus

### Summary
Fixed the root cause of changes not appearing: `notes_workspace.css` was never imported into the Sass build pipeline — the file sat in the stylesheets directory but wasn't compiled into `application.css`. Renamed to `.scss` and added the import. Also made the +/− buttons visually larger (26×26px SVGs) and prevented editor focus on click.

### Files Modified

| File | Change |
|------|--------|
| `app/assets/stylesheets/notes_workspace.css` | Renamed to `notes_workspace.scss` (was never compiled before) |
| `app/assets/stylesheets/application.bootstrap.scss` | Added `@import 'notes_workspace'` so custom styles get compiled |
| `app/views/home/_floating_dock.html.erb` | Added `dock-scale-btn` class to the two size buttons |
| `app/assets/stylesheets/notes_workspace.scss` | Added `.dock-scale-btn svg` rule overriding size to 26×26px |
| `app/javascript/controllers/notes_controller.js` | Moved `format === "size"` early return before focus/selection code in `applyFormat` |
| `app/assets/builds/application.css` | Rebuilt via `yarn build:css` |

## 2026-06-14 — Float that Dock: positioning, persistence, and polish

### Summary
Replaced the top-mounted formatting toolbar with a floating glassmorphism dock docked to the right side of the editor. Full CRUD moved client-side via IndexedDB. Added inline color support, font scaling, and live word/character count.

### Changes (chronological)

1. **Applied color swatch visible** — the currently active `textColor` value now renders as a filled dot inside the color picker button, matching the active heading/code button highlight pattern.

2. **Selection persistence on dock click** — clicking any formatting button in the dock was losing the user's text selection because the editor blurred. Fixed by caching `editor.getSelectedRange()` before the focus transfer and restoring it via `trixEditor.focus()` + `editor.setSelectedRange(range)`.

3. **Dock moved to right side, full port** — the dock was prototyped on the left; relocated to the right edge of the editor canvas and the CSS flex layout adjusted: `.apple-floating-dock` now sits at `right: 16px; top: 50%; transform: translateY(-50%);`.

4. **Color swatch menu positioned below dock** — the color palette dropdown was clipping off-screen. Changed its dropdown orientation to `data-bs-popper` placement `bottom` and absolute-positioned it below the dock with `top: 100%` on the menu.

5. **Word count update fix** — `trix-change` handler was using `editor.toString()`, which returns `[object Object]` because Trix's `getDocument()` return is an object. Changed to `editor.getDocument().toString()` for proper plain-text extraction.

6. **Color menu auto-close** — after selecting a color swatch, the dropdown menu now closes automatically.

7. **IndexedDB persistence** — notes are now stored in `JottedDB` (version 2). On connect, all existing notes are loaded into the sidebar. Creating, saving, and deleting all interact with the database.

8. **Delete button** — added a delete button to the editor canvas, wired to `#deleteNote`, which removes the note from IndexedDB and resets the editor to the empty state.

9. **Active note persistence across reloads** — after saving a note, refreshing the page re-selects that same note in the sidebar.

### Files Touched

| File | Change |
|------|--------|
| `app/javascript/controllers/notes_controller.js` | IndexedDB CRUD; word count fix; selection preservation on dock click; color menu auto-close; active note tracking |
| `app/javascript/application.js` | Custom `textColor` and `fontSize` Trix attributes registered at module load |
| `app/assets/stylesheets/notes_workspace.css` | Right-positioned dock (`.apple-floating-dock`), glassmorphism styling, dock tool buttons, responsive rules |
| `app/views/home/_editor_canvas.html.erb` | Word count pill, delete button, title input, save button |
| `app/views/home/_floating_dock.html.erb` | Redesigned as vertical dock on the right; color swatch dropdown |
| `app/views/home/_sidebar.erb` | Active note CSS class, wireframe layout |
| `app/views/home/index.html.erb` | Editor workspace wrapper layout |

### Open Items / Known Issues

- **Color on paste in a new session** — if the page has never been interacted with, the first paste of colored text can lose the span. The `application.js` patch runs before Trix initialises, but Safari/WebKit may process paste differently on cold loads.
- **No undo for delete** — consider adding a "recently deleted" recovery mechanism or a confirmation dialog.
- **Font size inheritance** — `fontSize` is set as an absolute pixel value (current base + delta). A relative approach (`em`/`rem`) might be more maintainable.

---

## Earlier History (pre-2026-06-14)

- Initial Rails 8 app scaffold with Action Text, Stimulus, Bootstrap
- `home#index` root route serving the note-taking interface
- Basic sidebar + editor layout with JetBrains-themed CSS variables
- Trix editor wired up with a Stimulus controller scaffold
- Stub `Note` model and `notes_controller.rb` for future server-side work
