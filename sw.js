/**
 * ==============================================================================================
 * SERVICE WORKER DE L'APPLICATION TONTINES FACILE (sw.js)
 * ==============================================================================================
 * Rôles principaux :
 * 1. Support hors ligne complet (Offline First) pour la coquille de l'application (App Shell).
 * 2. Mise en cache optimisée des pages, modules JavaScript modulaires, feuilles de style et icônes.
 * 3. Stratégie Network-First avec repli sur cache pour les requêtes d'API (/api/api.php).
 * 4. Gestion des notifications Push et interactions utilisateur.
 * 5. Synchronisation en arrière-plan (Background Sync) pour les actions initiées hors ligne.
 * ==============================================================================================
 */

// Identifiant de version du cache statique (incrémenté pour forcer le rafraîchissement)
const CACHE_NAME    = 'tf-cache-v3';

// Identifiant du cache dynamique pour les réponses d'API et ressources dynamiques
const DYNAMIC_CACHE = 'tf-dynamic-v3';

// Liste exhaustive des ressources statiques à pré-mettre en cache dès l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/improvements.js',

  // Modules JavaScript du cœur de l'application
  '/js/core/config.js',
  '/js/core/toast.js',
  '/js/core/modal.js',
  '/js/core/ui.js',
  '/js/core/api.js',
  '/js/core/nav.js',

  // Modules JavaScript des différentes pages
  '/js/pages/auth.js',
  '/js/pages/dashboard.js',
  '/js/pages/tontines.js',
  '/js/pages/tontine-detail.js',
  '/js/pages/create-tontine.js',
  '/js/pages/join-tontine.js',
  '/js/pages/transactions.js',
  '/js/pages/audit-log.js',
  '/js/pages/profile.js',
  '/js/pages/settings.js',
  '/js/pages/contacts.js',
  '/js/pages/chat.js',
  '/js/pages/invite.js',

  // Modules PWA et point d'entrée principal
  '/js/pwa/pwa-install.js',
  '/js/pwa/sw-manager.js',
  '/js/app.js',

  // Icônes PWA standard et adaptatives (Maskable)
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',

  // Captures d'écran pour la boîte de dialogue d'installation WebAPK riche
  '/icons/screenshot-mobile.png',
  '/icons/screenshot-desktop.png',

  // Polices Google Fonts
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'
];

/**
 * Événement INSTALL : téléchargement et mise en cache préalable de toutes les ressources statiques.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Tentative de mise en cache de l'intégralité des ressources avec rechargement forcé
      try {
        await cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      } catch (err) {
        console.warn('[SW] Certains fichiers statiques n\'ont pu être mis en cache à l\'installation :', err);
        // Repli minimaliste garantissant que la coquille de base est disponible hors ligne
        await cache.addAll(['/index.html', '/style.css', '/manifest.json', '/js/app.js']);
      }
    }).then(() => {
      // Force l'activation immédiate du nouveau Service Worker sans attendre la fermeture des onglets
      return self.skipWaiting();
    })
  );
});

/**
 * Événement ACTIVATE : suppression des anciens caches obsolètes pour libérer de l'espace.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Suppression de l\'ancien cache :', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      // Revendique le contrôle immédiat de tous les clients ouverts
      return self.clients.claim();
    })
  );
});

/**
 * Événement MESSAGE : permet aux pages de communiquer avec le Service Worker (ex: forcer SKIP_WAITING).
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Événement FETCH : interception et routage intelligent des requêtes réseau.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Requêtes vers l'API backend : stratégie Network-First (priorité aux données fraîches)
  if (url.pathname.includes('api.php')) {
    event.respondWith(networkFirstAPI(event.request));
    return;
  }

  // 2. Polices Google Fonts : stratégie Cache-First (performance maximale)
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 3. Fichiers de l'application (HTML, CSS, JS, Images) : stratégie Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

/**
 * Stratégie Network-First pour l'API : interroge le réseau en priorité,
 * met à jour le cache dynamique en cas de succès, ou renvoie le cache/message hors-ligne si indisponible.
 */
async function networkFirstAPI(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Si le réseau est indisponible, recherche une réponse précédente dans le cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Réponse JSON d'erreur propre indiquant l'état hors-ligne
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'Vous êtes actuellement hors connexion. Cette fonctionnalité nécessite un accès Internet.'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}

/**
 * Stratégie Cache-First : sert immédiatement depuis le cache si présent, sinon interroge le réseau.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('Ressource indisponible hors-ligne', { status: 503 });
  }
}

/**
 * Stratégie Stale-While-Revalidate : sert immédiatement la version en cache pour une réactivité instantanée,
 * tout en téléchargeant la version à jour en arrière-plan pour la prochaine visite.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response('Ressource hors-ligne', { status: 503 });
}

/**
 * Événement PUSH : réception et affichage d'une notification push émise par le serveur.
 */
self.addEventListener('push', (event) => {
  let data = {
    title: 'Tontines Facile',
    body: 'Vous avez une nouvelle notification.',
    icon: '/icons/icon-192.png'
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (err) {
    console.warn('[SW] Erreur de décodage des données push :', err);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'tf-notification',
      data: data,
      actions: data.actions || [],
      vibrate: [200, 100, 200]
    })
  );
});

/**
 * Événement NOTIFICATIONCLICK : réaction au clic de l'utilisateur sur une notification.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Événement SYNC : exécution des tâches de synchronisation différées en tâche de fond.
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

/**
 * Synchronise les paiements et actions enregistrés localement dans IndexedDB pendant une période hors ligne.
 */
async function syncPayments() {
  try {
    const db = await openDB();
    const pending = await getFromDB(db, 'pending-actions');
    for (const action of (pending || [])) {
      await fetch('/api/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });
    }
    await clearDB(db, 'pending-actions');
  } catch (err) {
    console.error('[SW] Erreur lors de la synchronisation en arrière-plan :', err);
  }
}

/**
 * Ouvre la base de données locale IndexedDB pour les opérations hors-ligne.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tf-offline-db', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('pending-actions', { autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject();
  });
}

/**
 * Récupère tous les enregistrements d'une table IndexedDB.
 */
function getFromDB(db, store) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

/**
 * Vide une table IndexedDB après synchronisation réussie.
 */
function clearDB(db, store) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}
