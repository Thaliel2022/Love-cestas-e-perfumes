// public/sw.js

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Recebido.');
  console.log(`[Service Worker] Push data: "${event.data ? event.data.text() : 'Sem payload'}"`);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error("Erro ao parsear payload JSON:", e);
      // Fallback se não for JSON
      data = { title: "Nova Notificação", body: event.data.text() };
    }
  }

  const title = data.title || 'Love Cestas e Perfumes';
  const options = {
    body: data.body || 'Você tem uma nova mensagem.',
    // --- SEU LOGO AQUI ---
    // Substitua pela URL completa do seu logo.
    // Use uma imagem quadrada ou com boa visualização em formato pequeno (ex: 192x192 pixels).
    icon: data.icon || 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png', // <-- URL DO SEU LOGO
    // O 'badge' é um ícone menor, monocromático, usado em algumas plataformas (como Android).
    // Crie um ícone simples, idealmente transparente com a silhueta do logo.
    badge: data.badge || 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png', // <-- URL DO SEU BADGE (opcional, mas recomendado)
    vibrate: [200, 100, 200], // Vibração [vibra, pausa, vibra]
    tag: data.tag || 'general-notification', // Agrupa notificações (opcional)
    renotify: data.renotify || false, // Se true, vibra/toca mesmo se já houver notificação com a mesma tag (opcional)
    requireInteraction: data.requireInteraction || false, // Mantém a notificação até ser dispensada (opcional)
    data: { // Dados extras para usar no evento 'notificationclick'
      url: data.url || '/' // URL para abrir ao clicar
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notificação clicada.');

  event.notification.close(); // Fecha a notificação

  // Abre a URL definida nos dados da notificação ou a página inicial
  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Se uma janela/aba do site já estiver aberta, foca nela
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // Verifica se a URL base é a mesma e foca se possível
        if (client.url && client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Navega para a URL específica se for diferente da atual
          if (client.url !== self.location.origin + targetUrl) {
              return client.navigate(targetUrl).then(client => client.focus());
          } else {
              return client.focus();
          }
        }
      }
      // Se nenhuma janela/aba estiver aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Opcional: Instala o Service Worker imediatamente e o mantém atualizado
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  self.skipWaiting(); // Força a ativação imediata
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativado.');
   event.waitUntil(clients.claim()); // Garante que o SW controle a página imediatamente
});