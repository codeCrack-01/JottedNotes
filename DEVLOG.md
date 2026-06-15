# Development Log

## 2026-06-15 — Reverted notebooks feature, simplified sidebar to original v1

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
