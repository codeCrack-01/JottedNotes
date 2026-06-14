# Agent Instructions for Jotted

## Before Any Work

1. **Read this file** — these instructions.
2. **Read `README.md`** — understand the project structure, tech stack, and core concepts (IndexedDB persistence, Trix custom attributes, dock formatting flow, word count).
3. **Read `DEVLOG.md`** — understand recent changes, what was tried, known issues, and architectural decisions.

Do not modify any file until you have read all three.

## While Working

- Maintain the existing code style (Stimulus controller conventions, Trix API patterns, CSS variable usage).
- Read neighbouring files before making assumptions about available libraries or patterns.
- Prefer editing existing files over creating new ones.
- Add no explanatory comments unless the existing code already uses them — follow the file's convention.
- Verify changes with `bin/rails test` (and `bin/rails lint` if available) before declaring completion.

## After Work

1. **Update `DEVLOG.md`** — append a new dated entry (format: `## YYYY-MM-DD — Brief Title`) at the top of the file, summarizing:
   - What changed and why
   - Key implementation details
   - Files modified (table of file path → summary of change)
   - Known issues or follow-up items
2. **Update `README.md`** — if you added a new feature, changed the project structure, added a dependency, or altered how something fundamentally works, keep the README accurate.
3. Do not rewrite or re-format existing entries in either file — only append or update your own.

## Key Technical Notes

- **IndexedDB schema**: `JottedDB` (version 2), store `notes` with `keyPath: "id"`. Fields: `id` (UUID), `title` (string), `content` (HTML string), `updatedAt` (ISO string). The `onupgradeneeded` handler creates the store — do not change the store name or key path without a DB version bump.
- **Trix custom attributes**: `textColor` and `fontSize` are registered in `app/javascript/application.js` on `Trix.config.textAttributes`. They must be `inheritable: true` and use `style`-based tags. Do not move this registration without ensuring it runs before any `<trix-editor>` element exists.
- **Selection preservation**: dock buttons must capture `editor.getSelectedRange()` before `trixEditor.focus()` and restore via `editor.setSelectedRange(range)` — the browser resets the selection on focus.
- **Word count**: always use `editor.getDocument().toString()` — `editor.toString()` returns `"[object Object]"`.
- **Color menu**: uses Bootstrap dropdown. The color menu `div` is separate from the toggle button (which is inside the dock). The toggle has `data-bs-toggle="dropdown"` and the menu is linked via `aria-labelledby`.

## Scope

- This is a client-side-first application. Server-side persistence (Rails `Note` model, `notes_controller.rb`) is **not yet implemented**. Do not wire up server routes or database migrations unless explicitly asked.
- The project uses Importmap (no Webpack, no esbuild for JS). Do not add bundler-based JS tooling.
- CSS is compiled via the Bootstrap `bin/dev` watcher (see `Procfile.dev`). SCSS lives in `app/assets/stylesheets/application.bootstrap.scss`.
