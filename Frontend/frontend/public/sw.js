// public/sw.js - Service Worker Atualizado (v6)

// v6 para forçar atualização do cache no celular e limpar resquícios da imagem antiga
const CACHE_NAME = 'lovecestas-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker: Instalado (v6)');
});

self.addEventListener('activate', (event) => {
  // ATUALIZAÇÃO: Rotina rigorosa para deletar caches de versões anteriores
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando Cache Antigo');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
  console.log('Service Worker: Ativo (v6)');
});

self.addEventListener('push', function(event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nova Atualização', body: event.data.text() };
    }
  }

  // ATUALIZAÇÃO: As imagens antigas foram removidas.
  // Agora usamos um fallback genérico caso o backend não envie a imagem a tempo.
  const DEFAULT_ICON = 'https://placehold.co/192x192/D4AF37/111827?text=Love+Cestas';
  const DEFAULT_BADGE = 'https://placehold.co/96x96/111827/FFFFFF?text=L';

  const title = data.title || 'Love Cestas e Perfumes';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    // O ícone agora virá no pacote de dados dinâmico do servidor
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE, 
    vibrate: data.vibrate || [100, 50, 100],
    data: data.data || { url: '/' },
    tag: 'order-update',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});