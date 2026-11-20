// Lets the app open instantly from the phone's copy. A new version is fetched in the background;
// the page then shows "New version ready - tap to update".
const CACHE = 'kt-staff-v8';
const BUILD_RE = /KT_BUILD = "([0-9a-f]+)"/;
const tell = msg => self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => l.forEach(w => w.postMessage(msg)));
// the page asks "which version is the newest you have?" when it opens
self.addEventListener('message', e => {
  const d = e.data || {}; if (d.kt !== 'ask' || !e.source) return;
  e.waitUntil(caches.open(CACHE).then(c => c.match(location.origin + String(d.path || '/'))).then(h => h ? h.text() : '')
    .then(t => { const m = BUILD_RE.exec(t); if (m) e.source.postMessage({ kt: 'build', build: m[1] }); }).catch(() => {}));
});
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    // 20 Nov 2026 ("app too slow"): open at once from the phone's copy; get the new version quietly in the background.
    // When the new copy is a different version, the page shows "New version ready - tap to update".
    const key = u.origin + u.pathname;
    e.respondWith(caches.open(CACHE).then(c => c.match(key).then(hit => {
      const net = fetch(key, { cache: 'no-cache', credentials: 'same-origin' }).then(r => r && r.ok && r.type === 'basic' ? c.put(key, r.clone()).then(() => r) : r);
      if (hit) {
        e.waitUntil(net.then(r => r.ok ? r.text() : '').then(t => { const m = BUILD_RE.exec(t); if (m) return tell({ kt: 'build', build: m[1] }); }).catch(() => {}));
        return hit;
      }
      return net.catch(() => c.match(u.origin + u.pathname.replace(/[^/]*$/, '') + 'index.html').then(h => h || Response.error()));
    })));
    return;
  }
  e.respondWith(caches.match(e.request).then(h => h || fetch(e.request)));
});
// phone notifications (sent by the "push" server function)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { title: 'K-TRONiCS', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'K-TRONiCS', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag, renotify: !!d.tag, data: { link: d.link || '#/home' } }));
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
