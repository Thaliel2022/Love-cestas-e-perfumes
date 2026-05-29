import React, { useState, useEffect } from 'react';
import { AppContent } from './AppContent';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { ShopProvider } from './contexts/ShopContext';
// --- Constante da API ---

initMercadoPago(process.env.REACT_APP_MP_PUBLIC_KEY || 'APP_USR-fe8bcd59-da54-4fb5-a3d0-8b8f749097be', { locale: 'pt-BR' });





// --- PÁGINAS DO CLIENTE ---

// --- PAINEL DO ADMINISTRADOR ---
export default function App() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });
        
        if ('serviceWorker' in navigator) {
            const registerSW = () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('SW registrado com sucesso:', registration))
                    .catch(error => console.log('Falha no SW:', error));
            };

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                registerSW();
            } else {
                window.addEventListener('load', registerSW);
            }
        }

        // Scripts externos (Chart, Excel, PDF, e WEBAUTHN)
        const loadScript = (src, id, callback) => {
            if (document.getElementById(id)) { if (callback) callback(); return; }
            const script = document.createElement('script');
            script.src = src; script.id = id; script.async = true;
            script.onload = () => { if (callback) callback(); };
            document.body.appendChild(script);
        };
        
        loadScript('https://unpkg.com/@simplewebauthn/browser/dist/bundle/index.umd.min.js', 'webauthn-browser-script');
        loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'chartjs-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', 'jspdf-autotable-script');
        });
        
        // O Script do Mercado Pago foi removido daqui, pois o @mercadopago/sdk-react 
        // já lida com a injeção do script automaticamente, evitando duplicação.
    }, []);

    return (
        <AuthProvider>
            <NotificationProvider>
                <ConfirmationProvider>
                    <ShopProvider>
                        <AppContent deferredPrompt={deferredPrompt} />
                    </ShopProvider>
                </ConfirmationProvider>
            </NotificationProvider>
        </AuthProvider>
    );
}