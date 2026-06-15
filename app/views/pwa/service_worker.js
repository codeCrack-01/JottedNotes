var CACHE_NAME = "jotted-v1"
var PRECACHE_URLS = [
  "/",
  "/icon.png",
  "/icon.svg",
  "/assets/application.css",
  "/assets/application.js"
]

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

  if (requestUrl.pathname === "/") {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match("/")
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
