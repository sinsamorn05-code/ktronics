// Lets the app open instantly. The app page is always fetched fresh when
// online, so new versions reach every phone on the next open.
const CACHE = 'kt-staff-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(h => h || fetch(e.request)));
});
// phone notifications (sent by the "push" server function)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { title: 'K-TRONiCS', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'K-TRONiCS', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag, renotify: !!d.tag, data: { link: d.link || '#/home' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '#/home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(w => w.url.includes('index.html') || w.url.endsWith('/'));
    if (c) { c.focus(); return c.navigate ? c.navigate('./' + link).catch(() => {}) : null; }
    return self.clients.openWindow('./' + link);
  }));
});
