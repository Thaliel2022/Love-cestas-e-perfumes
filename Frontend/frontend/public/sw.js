// public/sw.js - Service Worker Completo para Push Notifications

// Mudei para v3 para forçar o celular a baixar a nova lógica imediatamente
const CACHE_NAME = 'lovecestas-v3';

// 1. Instalação e Ativação
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata
  console.log('Service Worker: Instalado (v3)');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('Service Worker: Ativo (v3)');
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

  // --- CONFIGURAÇÃO DE IMAGENS ABSOLUTAS ---
  // Usamos os links diretos para garantir que o Android encontre
  
  // 1. Ícone Grande (Colorido - Ao lado do texto)
  // Usando o mesmo do seu manifesto para consistência
  const DEFAULT_ICON = 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png';
  
  // 2. Ícone Pequeno (Badge - Barra de Status)
  // Deve ser a imagem BRANCA e TRANSPARENTE que você colocou na public
  const DEFAULT_BADGE = 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1766856027/cgjkb0vagtya53xd8s3e.png';

  const title = data.title || 'Love Cestas e Perfumes';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    
    // Define explicitamente as imagens
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