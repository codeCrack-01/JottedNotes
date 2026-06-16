import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["banner"]

  connect() {
    this._onBeforeInstall = this._onBeforeInstall.bind(this)
    this._onAppInstalled = this._onAppInstalled.bind(this)
    window.addEventListener("beforeinstallprompt", this._onBeforeInstall)
    window.addEventListener("appinstalled", this._onAppInstalled)
    // Check if already installed (display-mode: standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      this.element.remove()
    }
  }

  disconnect() {
    window.removeEventListener("beforeinstallprompt", this._onBeforeInstall)
    window.removeEventListener("appinstalled", this._onAppInstalled)
  }

  _onBeforeInstall(e) {
    e.preventDefault()
    this.deferredPrompt = e
    this.bannerTarget.classList.remove("hidden")
  }

  _onAppInstalled() {
    this.deferredPrompt = null
    this.bannerTarget.classList.add("hidden")
  }

  install() {
    if (!this.deferredPrompt) return
    this.deferredPrompt.prompt()
    this.deferredPrompt.userChoice.then(() => {
      this.deferredPrompt = null
    })
  }

  dismiss() {
    this.bannerTarget.classList.add("hidden")
    this.deferredPrompt = null
  }
}
