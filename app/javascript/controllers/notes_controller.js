import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["list", "editor", "id", "title", "content", "emptyState", "wordCount", "colorMenu"]

  connect() {
    this.dbName = "JottedDB"
    // Bumping version to 2 triggers the 'onupgradeneeded' lifecycle for our schema change
    this.dbVersion = 2
    this.storeName = "notes"
    this.db = null

    this.initDatabase()
  }

  updateWordCount() {
    const text = this.contentTarget.value.trim()

    // Characters count is straightforward
    const charCount = text.length

    // Words count requires splitting by spaces/newlines while filtering out accidental double-spaces
    const wordCount = text === "" ? 0 : text.split(/\s+/).filter(word => word.length > 0).length

    // Update the pill text content
    this.wordCountTarget.textContent = `${wordCount} words · ${charCount} chars`
  }

  // Append or Wrap selected text with Markdown tags
  insertMarkdown(event) {
    const type = event.currentTarget.dataset.mdType
    const textarea = this.contentTarget

    // Find where the cursor currently is sitting
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    let insertedText = ""
    let newCursorPos = start

    if (type === "header") {
      insertedText = "\n# "
      newCursorPos += 3
    } else if (type === "bold") {
      const selectedText = text.substring(start, end)
      if (selectedText.length > 0) {
        insertedText = `**${selectedText}**`
        newCursorPos = start + insertedText.length
      } else {
        insertedText = `****`
        newCursorPos = start + 2 // Places cursor perfectly inside the ** here **
      }
    } else if (type === "code") {
      insertedText = "\n```javascript\n\n```\n"
      newCursorPos += 15
    }

    // Replace text area value around insertion points
    textarea.value = text.substring(0, start) + insertedText + text.substring(end)

    // Put focus back on the text container and place cursor elegantly
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)

    // Refresh our counters & ensure state is registered
    this.updateWordCount()
  }

  // Dynamically scale font styles inside the editor field
  adjustFontSize(event) {
    const change = event.currentTarget.dataset.sizeChange
    const textarea = this.contentTarget

    // Grab current font size or fallback to standard 15px
    let currentSize = parseFloat(window.getComputedStyle(textarea).fontSize) || 15

    if (change === "up") {
      currentSize += 2
    } else if (change === "down" && currentSize > 10) {
      currentSize -= 2
    }

    textarea.style.fontSize = `${currentSize}px`
  }

  // Toggle the visibility of our floating color circles panel
  toggleColorMenu() {
    this.colorMenuTarget.classList.toggle("d-none")
  }

  // Apply the selected hex value directly to the editor font layout
  changeColor(event) {
    const selectedColor = event.currentTarget.dataset.color

    if (selectedColor) {
      // This updates the CSS variable directly, overriding any Bootstrap text priorities!
      this.contentTarget.style.setProperty('--dynamic-text-color', selectedColor)
    }

    this.colorMenuTarget.classList.add("d-none")
  }

  closeColorMenuOutside(event) {
    // If the click happened inside the color picker button or the menu itself, do nothing
    if (this.colorMenuTarget.contains(event.target) || event.target.closest('[data-action*="toggleColorMenu"]')) {
      return
    }
    // Otherwise, hide it!
    this.colorMenuTarget.classList.add("d-none")
  }

  initDatabase() {
    const request = indexedDB.open(this.dbName, this.dbVersion)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // If the old integer-based store exists, drop it so we can create the fresh UUID-based one
      if (db.objectStoreNames.contains(this.storeName)) {
        db.deleteObjectStore(this.storeName)
      }

      // Create the store expecting a manual unique 'id' string (no auto-increment)
      db.createObjectStore(this.storeName, { keyPath: "id" })
    }

    request.onsuccess = (event) => {
      this.db = event.target.result
      this.loadNotes()
    }

    request.onerror = (event) => {
      console.error("IndexedDB open error:", event.target.errorCode)
    }
  }

  loadNotes() {
    const transaction = this.db.transaction([this.storeName], "readonly")
    const store = transaction.objectStore(this.storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      const notes = request.result
      const activeId = this.idTarget.value // Remember what note is currently open

      this.listTarget.innerHTML = notes.map(note => {
        // If this note is the one currently loaded in the editor, highlight it
        const isActive = note.id === activeId ? "active-note" : ""

        return `
          <button type="button" 
                  class="jb-tree-item ${isActive}" 
                  data-action="click->notes#selectNote" 
                  data-note-id="${note.id}">
            <span class="d-block text-truncate" style="font-size: 0.9rem;">📄 ${note.title || 'Untitled_Note.md'}</span>
          </button>
        `
      }).join("")
    }
  }

  createNewNote() {
    this.emptyStateTarget.classList.add("d-none")
    this.editorTarget.classList.remove("d-none")

    // Generate a secure, standard browser native UUID string right here!
    this.idTarget.value = crypto.randomUUID()

    this.titleTarget.value = ""
    this.contentTarget.value = ""
    this.contentTarget.focus()

    this.updateWordCount()
  }

  selectNote(event) {
    // Note IDs are strings now, no need for parseInt()
    const id = event.currentTarget.dataset.noteId
    const transaction = this.db.transaction([this.storeName], "readonly")
    const store = transaction.objectStore(this.storeName)
    const request = store.get(id)

    request.onsuccess = () => {
      const note = request.result
      if (!note) return

      this.emptyStateTarget.classList.add("d-none")
      this.editorTarget.classList.remove("d-none")

      this.idTarget.value = note.id
      this.titleTarget.value = note.title
      this.contentTarget.value = note.content

      this.loadNotes()
    }

    this.updateWordCount()
  }

  saveNote() {
    let id = this.idTarget.value

    // Guard clause: If someone hits save on an un-initialized note context without a UUID
    if (!id) {
      id = crypto.randomUUID()
      this.idTarget.value = id
    }

    const note = {
      id: id, // Explicitly assign our string UUID
      title: this.titleTarget.value,
      content: this.contentTarget.value,
      updatedAt: new Date().toISOString()
    }

    const transaction = this.db.transaction([this.storeName], "readwrite")
    const store = transaction.objectStore(this.storeName)
    const request = store.put(note)

    request.onsuccess = () => {
      this.loadNotes()
    }
  }

  deleteNote() {
    const id = this.idTarget.value
    if (!id) return

    const transaction = this.db.transaction([this.storeName], "readwrite")
    const store = transaction.objectStore(this.storeName)
    const request = store.delete(id) // Passing the string UUID directly

    request.onsuccess = () => {
      this.loadNotes()
      this.editorTarget.classList.add("d-none")
      this.emptyStateTarget.classList.remove("d-none")
    }
  }
}