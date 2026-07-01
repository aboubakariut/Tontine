/* ══════════════════════════════════════════════════════
   TONTINES FACILE — Service Worker v1.0
   Offline support, cache stratégique, push notifications
   ══════════════════════════════════════════════════════ */

const CACHE_NAME    = 'tf-cache-v1';
const DYNAMIC_CACHE = 'tf-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/sw.js',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'
];

/* ── INSTALL : mise en cache des assets statiques ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(() => cache.addAll(['/index.html', '/style.css', '/app.js']));
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE : nettoyage des anciens caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH : stratégie Cache-First pour assets, Network-First pour API ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* API calls → Network First, fallback offline response */
  if (url.pathname.includes('api.php')) {
    event.respondWith(networkFirstAPI(event.request));
    return;
  }

  /* Google Fonts → Cache First */
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  /* App shell → Cache First with network update */
  event.respondWith(staleWhileRevalidate(event.request));
});

/* ── STRATEGIES ── */
async function networkFirstAPI(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'Vous êtes hors ligne. Données non disponibles.'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}

/* ── PUSH NOTIFICATIONS ── */
self.addEventListener('push', event => {
  let data = { title: 'Tontines Facile', body: 'Vous avez une nouvelle notification.', icon: '/icon-192.png' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || '/icon-192.png',
      badge:   '/icon-72.png',
      tag:     data.tag || 'tf-notification',
      data:    data,
      actions: data.actions || [],
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* ── BACKGROUND SYNC (rappels de paiement) ── */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

async function syncPayments() {
  try {
    const db = await openDB();
    const pending = await getFromDB(db, 'pending-actions');
    for (const action of (pending || [])) {
      await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });
    }
    await clearDB(db, 'pending-actions');
  } catch {}
}

/* ── Mini IndexedDB helpers ── */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tf-offline-db', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('pending-actions', { autoIncrement: true });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject();
  });
}
function getFromDB(db, store) {
  return new Promise(resolve => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => resolve([]);
  });
}
function clearDB(db, store) {
  return new Promise(resolve => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = resolve;
    tx.onerror    = resolve;
  });
}
