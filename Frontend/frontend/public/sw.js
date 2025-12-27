// public/sw.js - Service Worker Completo para Push Notifications

// v6 para forçar atualização e limpar caches antigos de imagem
const CACHE_NAME = 'lovecestas-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker: Instalado (v6)');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
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

  // URLs diretas do Cloudinary
  const DEFAULT_ICON = 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png';
  
  // Badge FORÇADO PARA BRANCO via Cloudinary
  // Isso resolve o problema de ícones com cores sendo rejeitados pelo Android
  const DEFAULT_BADGE = 'https://res.cloudinary.com/dvflxuxh3/image/upload/w_96,h_96,c_scale,e_grayscale,co_white,e_colorize:100/v1766856538/ek6yjbqj5ozhup2yzlwp.png';

  const title = data.title || 'Love Cestas e Perfumes';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
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