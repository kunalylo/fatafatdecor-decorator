/* FatafatDecor Decorator — Service Worker
 * Handles Web Push (works when the app is closed / phone locked) and
 * notification taps. When the app is open & focused we hand off to the
 * page (postMessage) so it shows an in-app toast + chime instead of a
 * duplicate OS notification.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function parsePush(event) {
  try {
    return event.data ? event.data.json() : {}
  } catch (e) {
    return { title: 'New Order — FatafatDecor', body: event.data ? event.data.text() : '' }
  }
}

self.addEventListener('push', (event) => {
  const data = parsePush(event)
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const focused = clientsArr.some((c) => c.focused || c.visibilityState === 'visible')

    // App is open in the foreground → let the page handle it (toast + sound),
    // don't stack an OS notification on top.
    if (focused) {
      clientsArr.forEach((c) => c.postMessage({ type: 'new-order', payload: data }))
      return
    }

    await self.registration.showNotification(data.title || 'New Order — FatafatDecor', {
      body: data.body || 'A new order is available. Open the app to accept.',
      icon: data.icon || '/logo.png',
      badge: '/logo.png',
      tag: data.tag || 'fd-order',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsArr) {
      if ('focus' in client) return client.focus()
    }
    if (self.clients.openWindow) return self.clients.openWindow(url)
  })())
})
