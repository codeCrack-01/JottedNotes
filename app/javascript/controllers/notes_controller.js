import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["list", "editor", "id", "title", "content", "emptyState"]

  connect() {
    this.dbName = "JottedDB"
    // Bumping version to 2 triggers the 'onupgradeneeded' lifecycle for our schema change
    this.dbVersion = 2
    this.storeName = "notes"
    this.db = null

    this.initDatabase()
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
      this.listTarget.innerHTML = notes.map(note => `
        <button type="button" 
                class="list-group-item list-group-item-action" 
                data-action="click->notes#selectNote" 
                data-note-id="${note.id}">
          <strong class="d-block">${note.title || 'Untitled Note'}</strong>
          <small class="text-muted text-break d-block" style="font-size: 0.75rem;">ID: ${note.id}</small>
        </button>
      `).join("")
    }
  }

  createNewNote() {
    this.emptyStateTarget.classList.add("d-none")
    this.editorTarget.classList.remove("d-none")

    // Generate a secure, standard browser native UUID string right here!
    this.idTarget.value = crypto.randomUUID()

    this.titleTarget.value = ""
    this.contentTarget.value = ""
    this.titleTarget.focus()
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
    }
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