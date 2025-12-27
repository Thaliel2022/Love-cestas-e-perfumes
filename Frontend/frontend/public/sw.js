// public/sw.js - Service Worker Completo para Push Notifications

// Mudei para v2 para forçar o celular a baixar os ícones novos
const CACHE_NAME = 'lovecestas-v2';

// 1. Instalação e Ativação
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata
  console.log('Service Worker: Instalado (v2)');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('Service Worker: Ativo (v2)');
});

// 2. Recebimento de Notificação (Push)
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

  // Define URLs absolutas para garantir que o Android encontre a imagem
  // self.registration.scope pega a URL base do site (ex: https://site.com/)
  const baseUrl = self.registration.scope;

  const title = data.title || 'Love Cestas';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    
    // Força o caminho completo para evitar erro de "W"
    icon: data.icon || (baseUrl + 'icon-192x192.png'),
    badge: data.badge || (baseUrl + 'badge-monochrome.png'), 
    
    vibrate: data.vibrate || [100, 50, 100],
    data: data.data || { url: '/' },
    tag: 'order-update',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 3. Clique na Notificação
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