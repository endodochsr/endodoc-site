// ============================================================
// EndoDoc — Service Worker
// ------------------------------------------------------------
// Versão: 1.0.0
// Responsabilidades:
//   1. Cache de assets estáticos (shell offline)
//   2. Receber Web Push notifications
//   3. Tratar clique nas notificações (abre /app)
// ============================================================

const VERSION = 'endodoc-v1';
const CACHE_STATIC = [
  '/app',
  '/brand/favicon.svg',
  '/brand/android-chrome-192.png',
  '/brand/android-chrome-512.png',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap'
];

// ===== Install: pré-cacheia assets críticos =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(CACHE_STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ===== Activate: limpa caches antigos =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== Fetch: network-first, fallback para cache =====
self.addEventListener('fetch', event => {
  // Só intercepta GET do mesmo origin
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Não intercepta chamadas à API do Supabase
  if(url.hostname.includes('supabase.co')) return;
  if(url.hostname.includes('z-api.io')) return;

  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // Armazena em cache se for um asset estático
        if(resp.ok && (url.pathname.match(/\.(js|css|svg|png|ico|woff2)$/) || url.pathname === '/app')){
          const clone = resp.clone();
          caches.open(VERSION).then(c => c.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});

// ===== Push: recebe notificação do servidor =====
self.addEventListener('push', event => {
  let data = { title: 'EndoDoc', body: 'Novo evento na sua agenda.', tag: 'endodoc-default', url: '/app' };
  try { data = { ...data, ...event.data.json() }; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/brand/android-chrome-192.png',
      badge:   '/brand/favicon-48.png',
      tag:     data.tag,
      renotify: true,
      data:    { url: data.url || '/app' },
      actions: [
        { action: 'open',    title: 'Abrir Agenda' },
        { action: 'dismiss', title: 'Ignorar' }
      ]
    })
  );
});

// ===== Clique na notificação: abre /app =====
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if(event.action === 'dismiss') return;

  const target = event.notification.data?.url || '/app';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Reaproveita aba já aberta
        for(const client of clientList){
          if(new URL(client.url).pathname.startsWith('/app') && 'focus' in client){
            return client.focus();
          }
        }
        // Abre nova aba
        return clients.openWindow(target);
      })
  );
});
