var CACHE = '3g-ua-cache'
var urlsToCache = [
  '/',
  '/app.manifest',
  '/favicon.ico',
  '/scripts/vendor.js',
  '/scripts/main.js',
  '/styles/main.css'
]

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(urlsToCache)
    })
  )
})

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response
      }
      var fetchRequest = event.request.clone()
      return fetch(fetchRequest).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        var responseToCache = response.clone()
        caches.open(CACHE).then(function(cache) {
          cache.put(event.request, responseToCache)
        })
        return response
      })
    })
  )
})
