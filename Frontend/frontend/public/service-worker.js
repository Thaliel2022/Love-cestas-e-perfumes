/*
  Este é o ficheiro do Service Worker.
  Guarde este código como 'service-worker.js' dentro da pasta 'public' na raiz do seu projeto React.
*/

// Evento 'install': é acionado quando o Service Worker é instalado.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado com sucesso.');
  // Força o novo service worker a tornar-se ativo imediatamente, sem esperar que o antigo termine.
  self.skipWaiting();
});

// Evento 'activate': é acionado quando o Service Worker é ativado.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativado com sucesso.');
  // Garante que o service worker ativado assuma o controlo da página imediatamente.
  event.waitUntil(self.clients.claim());
});

// Evento 'push': é acionado quando uma notificação push é recebida do servidor.
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notificação Push recebida.');
  
  let data = {};
  try {
    // Tenta interpretar os dados da notificação como JSON.
    data = event.data.json();
  } catch (e) {
    // Se falhar, trata como texto simples (fallback).
    data = { title: 'Nova Notificação', body: event.data.text() };
  }

  const title = data.title || 'Love Cestas e Perfumes';
  const options = {
    body: data.body,
    // Ícones para a notificação. Estes URLs devem ser acessíveis publicamente.
    icon: 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png', // Ícone principal (192x192)
    badge: 'https://res.cloudinary.com/dvflxuxh3/image/upload/c_scale,w_72/v1752296170/kk9tlhxb2qyioeoieq6g.png', // Ícone pequeno (geralmente monocromático)
    data: {
      // URL que será aberta quando o utilizador clicar na notificação.
      url: data.url || self.location.origin 
    }
  };

  // Pede ao sistema operativo para exibir a notificação.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Evento 'notificationclick': é acionado quando o utilizador clica na notificação.
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada.');
  event.notification.close();
  
  // Constrói a URL completa para garantir que funcione corretamente.
  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Se uma janela com a mesma URL já estiver aberta, foca nela.
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não houver uma janela aberta com essa URL, abre uma nova.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
