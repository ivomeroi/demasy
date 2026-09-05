const CACHE_NAME = 'demasy-v1-onboarding-1';
const APP_SHELL = [
    '/', '/index.html', '/styles.css', '/DEMASY-LOGO.jpeg',
    '/vendor/chart.min.js', '/vendor/fontawesome/css/all.min.css',
    '/vendor/fontawesome/webfonts/fa-brands-400.woff2',
    '/vendor/fontawesome/webfonts/fa-regular-400.woff2',
    '/vendor/fontawesome/webfonts/fa-solid-900.woff2',
    '/core/demasy-config.js', '/core/signal-source-contract.js',
    '/core/recording-controller.js', '/core/section-router.js',
    '/services/analysis-service.js', '/services/settings-service.js',
    '/services/memory-storage-adapter.js', '/services/replay-signal-source.js',
    '/services/session-configuration-service.js', '/services/data-normalization-service.js',
    '/services/session-history-service.js', '/services/backup-service.js',
    '/services/assistant-service.js', '/services/chat-transcript-service.js',
    '/services/onboarding-tour.js',
    '/database.js', '/patient-manager.js', '/analysis-manager.js', '/backup-manager.js',
    '/emg-simulator.js', '/serial-manager.js', '/bluetooth-manager.js',
    '/ai-assistant.js', '/app.js', '/database-init.js'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith('demasy-') && key !== CACHE_NAME).map(key => caches.delete(key))
    )));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
        return;
    }

    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
