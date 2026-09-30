const CACHE_NAME = 'week-planner-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/js/app.js',
  '/js/calendar.js',
  '/js/database.js',
  '/js/mobile.js',
  '/js/state.js',
  '/js/tasks.js',
  '/js/ui.js',
  '/js/utils.js',
  '/js/config.js',
  '/js/localization.js',
  'https://cdn.jsdelivr.net/npm/fuzzysort@2.0.4/fuzzysort.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
