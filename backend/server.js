/* eslint-disable no-restricted-globals */

// Define a URL da sua logo
const LOGO_URL = 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png';

// Listener para o evento 'push' (quando uma notificação chega do servidor)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Recebido.');

  let data = {};
  try {
    // Tenta parsear os dados enviados pelo backend como JSON
    data = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Erro ao parsear dados do push:', e);
    // Define dados padrão se o parse falhar
    data = {
      title: 'Notificação',
      body: 'Você tem uma nova atualização.',
      icon: LOGO_URL,
      url: '/', // URL padrão para onde o clique levará
    };
  }

  // Configurações da notificação a ser exibida
  const options = {
    body: data.body || 'Você tem uma nova atualização.',
    icon: data.icon || LOGO_URL, // Usa a logo como ícone principal
    badge: LOGO_URL, // Ícone menor (opcional, pode ser a logo também)
    vibrate: [200, 100, 200], // Padrão de vibração [vibra, pausa, vibra]
    data: {
      url: data.url || '/', // Passa a URL para o evento de clique
    },
    // Você pode adicionar actions (botões) aqui se desejar
    // actions: [
    //   { action: 'open_url', title: 'Ver Detalhes' },
    // ]
  };

  // Garante que o Service Worker permaneça ativo até a notificação ser exibida
  event.waitUntil(
    self.registration.showNotification(data.title || 'Notificação', options)
  );
});

// Listener para o evento 'notificationclick' (quando o usuário clica na notificação)
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Clique na Notificação Recebido.');

  // Fecha a notificação
  event.notification.close();

  // Obtém a URL dos dados da notificação
  const urlToOpen = event.notification.data.url || '/';

  // Tenta focar uma aba existente do site ou abre uma nova
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true, // Inclui clientes não controlados pelo SW atual
    }).then((clientList) => {
      // Verifica se já existe uma janela/aba aberta com a mesma URL base
      for (const client of clientList) {
        // Verifica se a URL base é a mesma e foca se possível
        // (Você pode refinar essa lógica se precisar focar URLs específicas)
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin); // Garante que a URL alvo seja absoluta
        if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
          return client.focus().then(focusedClient => {
              // Após focar, navega para a URL específica da notificação
              if (focusedClient) {
                  return focusedClient.navigate(targetUrl.href);
              }
              // Se não conseguiu focar, abre uma nova janela como fallback
              return clients.openWindow(targetUrl.href);
          });
        }
      }
      // Se nenhuma aba correspondente estiver aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl.href);
      }
    })
  );
});

// Opcional: Instalar e Ativar o Service Worker (necessário para controle de cache, etc.)
// Estes listeners são mais para PWAs com funcionalidade offline, mas são boa prática.
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalado');
  // Pode adicionar lógica de pré-cache aqui se necessário
  // event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting(); // Força o SW a ativar imediatamente
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativado');
  // Pode adicionar lógica para limpar caches antigos aqui
  // event.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.map(name => caches.delete(name)))));
  return self.clients.claim(); // Torna o SW ativo o controlador imediatamente
});