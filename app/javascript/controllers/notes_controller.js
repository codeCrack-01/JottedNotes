import { Controller } from "@hotwired/stimulus"
import "trix"

// =========================================================================
// 1. STANDALONE STORAGE ENGINE (IndexedDB Service)
// =========================================================================
class EditorDB {
  constructor(dbName = "JottedDB", version = 2, storeName = "notes") {
    this.dbName = dbName
    this.dbVersion = version
    this.storeName = storeName
    this.db = null
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName)
        }
        db.createObjectStore(this.storeName, { keyPath: "id" })
      }

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onerror = (event) => {
        console.error("IndexedDB initialization error:", event.target.errorCode)
        reject(event.target.errorCode)
      }
    })
  }

  getAllNotes() {
    return new Promise((resolve) => {
      if (!this.db) return resolve([])
      const transaction = this.db.transaction([this.storeName], "readonly")
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  getNote(id) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null)
      const transaction = this.db.transaction([this.storeName], "readonly")
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
    })
  }

  saveNote(noteData) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false)
      const transaction = this.db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)
      const request = store.put(noteData)
      request.onsuccess = () => resolve(true)
    })
  }

  deleteNote(id) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false)
      const transaction = this.db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)
      request.onsuccess = () => resolve(true)
    })
  }
}

// =========================================================================
// 2. GLOBAL TRIX SCHEMA REGISTRATION
// =========================================================================
if (window.Trix) {
  configureTrixAttributes()
} else {
  document.addEventListener("trix-initialize", () => {
    configureTrixAttributes()
  })
}

function configureTrixAttributes() {
  if (window.Trix.config && !window.Trix.config.textAttributes.highlightColor) {
    window.Trix.config.textAttributes.highlightColor = {
      styleProperty: "backgroundColor",
      inheritable: true
    }
    console.log("🎯 Trix Global Highlight Schema Whitelist injected!");
  }
}

// =========================================================================
// 3. MAIN WORKSPACE UI CONTROLLER
// =========================================================================
export default class extends Controller {
  static targets = ["list", "editor", "id", "title", "content", "emptyState", "wordCount", "colorMenu"]

  async connect() {
    this.currentZoom = 0.95

    // Initialize the storage instance smoothly
    this.storage = new EditorDB()
    try {
      await this.storage.init()
      this.loadNotes()
    } catch (e) {
      console.error("Failed to connect to storage engine:", e)
    }

    this.onTrixChange = (event) => this.updateWordCount(event.target)
    this.element.addEventListener("trix-change", this.onTrixChange)
  }

  onTrixInit() {
    this.updateWordCount()
  }

  get trixEditor() {
    return this.element.querySelector("trix-editor")
  }

  // --- INTERFACE EVENTS & TEXT FORMATTING ---
  applyFormat(event) {
    const format = event.currentTarget.dataset.formatType
    const value = event.currentTarget.dataset.value

    console.log(`💥 DOCK CLICKED: Type = "${format}", Value = "${value}"`);

    if (!this.trixEditor) {
      console.error("❌ ERROR: Could not find trix-editor node in DOM!");
      return
    }
    const editor = this.trixEditor.editor
    const range = format === "highlight" ? editor.getSelectedRange() : null
    this.trixEditor.focus()
    if (range) {
      editor.setSelectedRange(range)
    }

    switch(format) {
      case "bold":
        editor.attributeIsActive("bold") ? editor.deactivateAttribute("bold") : editor.activateAttribute("bold")
        break
      case "heading1":
        editor.attributeIsActive("heading1") ? editor.deactivateAttribute("heading1") : editor.activateAttribute("heading1")
        break
      case "code":
        editor.attributeIsActive("code") ? editor.deactivateAttribute("code") : editor.activateAttribute("code")
        break
      case "highlight":
        editor.activateAttribute("highlightColor", value)
        editor.setSelectedRange([range[1], range[1]])
        editor.deactivateAttribute("highlightColor")

        if (this.hasColorMenuTarget) this.colorMenuTarget.classList.add("d-none")
        break
      case "size":
        if (value === "up" && this.currentZoom < 1.5) this.currentZoom += 0.10
        if (value === "down" && this.currentZoom > 0.75) this.currentZoom -= 0.10
        this.trixEditor.style.setProperty("--jb-editor-font-size", `${this.currentZoom}rem`)
        break
    }
  }

  toggleColorMenu() {
    this.colorMenuTarget.classList.toggle("d-none")
  }

  closeColorMenuOutside(event) {
    if (this.colorMenuTarget.contains(event.target) || event.target.closest('[data-action*="toggleColorMenu"]')) {
      return
    }
    this.colorMenuTarget.classList.add("d-none")
  }

  updateWordCount(editorElementOrEvent = null) {
    let targetEditor = editorElementOrEvent instanceof Event ? editorElementOrEvent.target : editorElementOrEvent
    const editor = targetEditor || this.trixEditor
    if (!editor || !editor.editor) return

    const text = editor.editor.getDocument().toString().trim()
    const wordCount = text ? text.split(/\s+/).length : 0
    if (this.hasWordCountTarget) {
      this.wordCountTarget.textContent = `${wordCount} words · ${text.length} chars`
    }
  }

  // --- VIEW ORCHESTRATION ---
  async loadNotes() {
    const notes = await this.storage.getAllNotes()
    const activeId = this.idTarget.value

    this.listTarget.innerHTML = notes.map(note => {
      const isActive = note.id === activeId ? "active-note" : ""
      return `
        <button type="button" class="jb-tree-item ${isActive}" data-action="click->notes#selectNote" data-note-id="${note.id}">
          <span class="d-block text-truncate" style="font-size: 0.9rem;">📄 ${note.title || 'Untitled_Note.md'}</span>
        </button>
      `
    }).join("")
  }

  createNewNote() {
    this.emptyStateTarget.classList.add("d-none")
    this.editorTarget.classList.remove("d-none")

    this.idTarget.value = crypto.randomUUID()
    this.titleTarget.value = "Untitled_Note.md"

    if (this.trixEditor) {
      this.trixEditor.editor.loadHTML("")
      this.updateWordCount(this.trixEditor)
    }
    this.titleTarget.focus()
  }

  async selectNote(event) {
    const id = event.currentTarget.dataset.noteId
    const note = await this.storage.getNote(id)
    if (!note) return

    this.emptyStateTarget.classList.add("d-none")
    this.editorTarget.classList.remove("d-none")

    this.idTarget.value = note.id
    this.titleTarget.value = note.title

    if (this.trixEditor) {
      this.trixEditor.editor.loadHTML(note.content || "")
      this.updateWordCount(this.trixEditor)
    }
    this.loadNotes()
  }

  async saveNote() {
    const noteData = {
      id: this.idTarget.value,
      title: this.titleTarget.value || "Untitled_Note.md",
      content: this.contentTarget.value,
      updatedAt: new Date().toISOString()
    }

    await this.storage.saveNote(noteData)
    console.log("Note saved successfully.")
    this.loadNotes()
  }

  async deleteNote() {
    const id = this.idTarget.value
    if (!id) return

    await this.storage.deleteNote(id)
    this.loadNotes()
    this.editorTarget.classList.add("d-none")
    this.emptyStateTarget.classList.remove("d-none")
  }
}