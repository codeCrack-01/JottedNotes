var PREFIX = "/JottedNotes"
var CACHE_NAME = "jotted-v1"
var ASSET_FILES = JSON.parse('["tailwind-1447bf6c.css","actiontext-a8d496b6.css","stimulus-importmap-autoloader-64cc03e1.js","stimulus.min-4b1e420e.js","stimulus-autoloader-9d447422.js","stimulus-loading-1fc53fe7.js","stimulus-d59b3b7f.js","turbo.min-9fd88cd5.js","turbo-736fb387.js","actiontext-c9c6c481.js","actiontext.esm-c376325e.js","trix-4bf79781.js","trix-65afdb1d.css","actioncable.esm-e0ec9819.js","action_cable-5212cfee.js","actioncable-ac25813f.js","activestorage.esm-81bb34bc.js","activestorage-f9e46063.js","rails-ujs-20eaf715.js","rails-ujs.esm-e925103b.js","controllers/notes_controller-59eea74c.js","controllers/index-ee64e1f1.js","controllers/pwa_install_controller-e58e0222.js","controllers/hello_controller-708796bd.js","controllers/application-3affb389.js","application-30b31416.js"]')
var PRECACHE_URLS = [
  PREFIX + "/",
  PREFIX + "/icon.png",
  PREFIX + "/icon.svg"
].concat(
  ASSET_FILES.map(function(f) { return PREFIX + "/assets/" + f })
)

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS)
    })
  )
})

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

self.addEventListener("fetch", function(event) {
  var requestUrl = new URL(event.request.url)

  if (requestUrl.origin !== location.origin) return

  if (requestUrl.pathname === PREFIX + "/") {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(PREFIX + "/")
      })
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      return cachedResponse || fetch(event.request)
    })
  )
})
