# Jotted

JetBrains-inspired browser-based note-taking app with a rich-text editor, IDE-themed UI, and client-side persistence via IndexedDB.

## Features

- **Rich-text editing** via Trix (powered by Rails Action Text) — bold, heading, code blocks, inline color, and font sizing
- **Apple-style floating dock** — a glassmorphism toolbar docked to the right side of the editor with formatting controls
- **Highlighter markers** — apply semi-transparent background highlight colors to selected text (Yellow, Blue, Red, Green)
- **Font scaling** — increase or decrease text size relative to the base font
- **Live word & character count** — updates in real time as you type, displayed in a pill badge at the bottom-right of the editor
- **Client-side storage** — notes are persisted to the browser's IndexedDB (`JottedDB`) with automatic loading on page refresh
- **Sidebar note list** — tree-style note browser with active-note highlighting; create, select, save, and delete notes
- **JetBrains-inspired theme** — custom CSS variables for colors, sidebar/editor layout, and focus rings

## Project Structure

```
app/
├── assets/stylesheets/
│   ├── application.bootstrap.scss    # Bootstrap + Icons import
│   ├── actiontext.css                # Trix editor default styles
│   └── notes_workspace.css           # IDE theme, dock, sidebar, custom buttons
├── controllers/
│   ├── application_controller.rb
│   ├── home_controller.rb            # Serves the single root page
│   └── notes_controller.rb           # Stub (notes logic lives client-side)
├── javascript/
│   ├── application.js                # Entry point: imports, Trix config patching
│   └── controllers/
│       ├── application.js            # Stimulus bootstrap
│       ├── index.js                  # Auto-registers all controllers
│       ├── hello_controller.js       # Demo controller (unused)
│       └── notes_controller.js       # Core controller — all note CRUD, formatting, word count
├── models/
│   └── note.rb                       # has_rich_text :content (declared, no DB table yet)
└── views/
    └── home/
        ├── index.html.erb            # Root page: sidebar + editor + empty state
        ├── _sidebar.erb              # Note list sidebar with "+ New Note" button
        ├── _editor_canvas.html.erb   # Trix editor, title input, word count, save/delete buttons
        └── _floating_dock.html.erb   # Formatting toolbar (color, bold, heading, code, font size)

config/
├── routes.rb                         # root "home#index"
├── importmap.rb                      # JS dependency pins (Stimulus, Trix, Bootstrap, etc.)
└── database.yml                      # SQLite3 (primary + cache + queue + cable)
```

Note: Notes are stored entirely client-side in IndexedDB. The Rails `Note` model and `notes_controller.rb` are placeholders for future server-side persistence. There is no database migration for a `notes` table yet.

## Getting Started

### Prerequisites

- Ruby 3.x (see `.ruby-version`)
- Node.js (see `.node-version`)
- Yarn or Bun
- Rails 8.x

### Setup

```bash
bundle install
yarn install
bin/rails db:create db:migrate
bin/dev
```

This starts the Rails server on port 3000 and the CSS watcher for Bootstrap/SCSS compilation.

### Development

- **CSS changes**: edit `app/assets/stylesheets/notes_workspace.css` or the SCSS entry point. The watcher (`bin/dev`) auto-recompiles.
- **JavaScript changes**: edit files under `app/javascript/`. Importmap reloads on page refresh — no build step needed.
- **Trix editor**: configured in `app/javascript/application.js` with custom `highlightColor` and `fontSize` attributes patched into `Trix.config`.
- **Stimulus controller**: `notes_controller.js` manages all UI interactivity. Targets are defined in the static `targets` array and referenced in views via `data-notes-target` attributes.

## Architecture

### Client-Side Persistence

Notes are stored in IndexedDB under database `JottedDB` (version 2), object store `notes`. Each note has:

- `id` (UUID, generated via `crypto.randomUUID()`)
- `title` (string, defaults to "Untitled_Note.md")
- `content` (HTML string from Trix's hidden input)
- `updatedAt` (ISO timestamp)

### Trix Custom Attributes

Two custom text attributes are registered:

- `highlightColor` — applies inline `background-color` CSS via `<span style="background-color: ...">` for highlighter-marker effects
- `fontSize` — applies inline `font-size` CSS via `<span style="font-size: ...">`

Both use `styleProperty` (not `style`) to receive the dynamic value from `editor.activateAttribute()`, and both are `inheritable: true`, meaning the attribute carries forward to subsequent typing at the same cursor position.

### Formatting Flow (Floating Dock)

1. User selects text in the Trix editor
2. User clicks a formatting button in the dock
3. `notes#applyFormat` captures the selection range from Trix's internal tracking
4. The editor is focused, the selection is restored, and the attribute is applied via `editor.activateAttribute(name, value)`
5. The selection is preserved because the editor's `currentLocationRange` survives blur
6. For highlights, the color menu auto-closes after selection

### Word Count

`trix-change` events trigger `updateWordCount`, which reads the plain text via `editor.getDocument().toString()` and displays `{n} words · {n} chars` in the pill badge.

## Testing

```bash
bin/rails test
```

The CI pipeline (see `config/ci.rb`) also runs RuboCop, bundler-audit, yarn audit, importmap audit, and Brakeman.

## Deployment

Kamal-based Docker deployment (see `config/deploy.yml`). Targets a single host, uses SQLite databases (primary + cache + queue + cable), Solid Queue for background jobs, and Solid Cable for Action Cable.
