// public/sw.js - Service Worker Completo para Push Notifications

// Nome do cache (opcional, mas bom para PWA)
const CACHE_NAME = 'lovecestas-v1';

// 1. Instalação do Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o SW a ativar imediatamente
  console.log('Service Worker: Instalado');
});

// 2. Ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Assume o controle da página imediatamente
  console.log('Service Worker: Ativo');
});

// 3. Evento PUSH (Onde a mágica acontece!)
// Este evento dispara quando o backend envia uma notificação
self.addEventListener('push', function(event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  let data = {};
  
  // Tenta ler os dados enviados pelo servidor
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nova Atualização', body: event.data.text() };
    }
  }

  // Configuração Visual da Notificação no Celular
  const title = data.title || 'Love Cestas e Perfumes';
  const options = {
    body: data.body || 'Você tem uma nova atualização.',
    
    // Ícone grande colorido (ao lado do texto)
    // Certifique-se de que este arquivo existe em public/
    icon: data.icon || '/icon-192x192.png', 
    
    // Ícone pequeno para a barra de status (OBRIGATÓRIO ser branco/transparente para Android)
    // Se não tiver esse arquivo, o Android pode mostrar um quadrado branco
    badge: data.badge || '/badge-monochrome.png', 
    
    vibrate: data.vibrate || [100, 50, 100], // Padrão de vibração
    data: data.data || { url: '/' }, // Link para abrir
    tag: 'order-update', // Agrupa notificações do mesmo tipo
    renotify: true, // Vibra novamente se chegar outra notificação igual
    actions: [
      { action: 'open', title: 'Ver Detalhes' }
    ]
  };

  // Exibe a notificação
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 4. Evento CLIQUE (Quando o usuário toca na notificação)
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Fecha a notificação da barra

  // Pega a URL enviada pelo backend (ex: /#account/orders/123)
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Se o app já estiver aberto em alguma aba/janela, foca nele
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // Se não estiver aberto, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});