self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('markcraft-v1').then((cache) => {
            return cache.addAll([
                './',
                './index.html',  
                './app.js',
                './style.css',
                './parser.worker.js',
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );  
});