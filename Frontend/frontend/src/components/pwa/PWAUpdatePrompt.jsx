import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { API_URL } from '../../services/apiConfig';
import { SpinnerIcon } from '../icons';

const VERSION_STORAGE_KEY = 'lovecestas_pwa_version';
const apiOrigin = API_URL.replace(/\/api\/?$/, '');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const buildManifestHref = (manifestUrl) => {
    if (!manifestUrl) return `${apiOrigin}/manifest.json?v=${Date.now()}`;
    if (/^https?:\/\//i.test(manifestUrl)) return manifestUrl;
    return `${apiOrigin}${manifestUrl}`;
};

const clearBrowserCaches = async () => {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }

    if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_PWA_CACHE' });
    }
};

const updateServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    await registration.update();
    if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
};

export function PWAUpdatePrompt({ currentPath, setAppLogo, setAppNameConfig }) {
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Preparando atualização...');
    const lastSeenVersionRef = useRef(localStorage.getItem(VERSION_STORAGE_KEY));

    const hasLocalBrandMismatch = useCallback((data) => {
        try {
            const cachedName = JSON.parse(localStorage.getItem('lovecestas_app_name') || '{}');
            const cachedLogo = localStorage.getItem('lovecestas_app_logo') || '';
            const nextName = data?.appName || {};
            const nextLogo = data?.icons?.pwa_icon?.current || '';

            return (
                (nextName.name && cachedName.name && nextName.name !== cachedName.name) ||
                (nextName.short_name && cachedName.short_name && nextName.short_name !== cachedName.short_name) ||
                (nextLogo && cachedLogo && nextLogo !== cachedLogo)
            );
        } catch {
            return false;
        }
    }, []);

    const checkForUpdate = useCallback(async () => {
        if (currentPath?.startsWith('admin') || isUpdating) return;

        try {
            const data = await apiService(`/pwa/version?v=${Date.now()}`, 'GET', null, { suppressAuthError: true });
            if (!data?.version) return;

            const storedVersion = lastSeenVersionRef.current;
            const shouldPrompt = storedVersion
                ? storedVersion !== data.version
                : hasLocalBrandMismatch(data);

            if (shouldPrompt) {
                setPendingUpdate(data);
                return;
            }

            if (!storedVersion) {
                localStorage.setItem(VERSION_STORAGE_KEY, data.version);
                lastSeenVersionRef.current = data.version;
            }
        } catch (error) {
            console.warn('Falha ao verificar atualização do PWA:', error);
        }
    }, [currentPath, hasLocalBrandMismatch, isUpdating]);

    useEffect(() => {
        checkForUpdate();
        const intervalId = setInterval(checkForUpdate, 60000);

        const handleFocus = () => checkForUpdate();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') checkForUpdate();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [checkForUpdate]);

    const applyUpdate = async () => {
        if (!pendingUpdate || isUpdating) return;

        setIsUpdating(true);
        setProgress(8);
        setStatusText('Baixando nova identidade do app...');

        try {
            await wait(350);

            if (pendingUpdate.appName) {
                setAppNameConfig(pendingUpdate.appName);
                localStorage.setItem('lovecestas_app_name', JSON.stringify(pendingUpdate.appName));
            }

            setProgress(30);
            setStatusText('Atualizando nome, ícones e manifesto...');
            await wait(350);

            const favicon = pendingUpdate.icons?.favicon?.current;
            const pwaIcon = pendingUpdate.icons?.pwa_icon?.current;

            if (favicon) {
                localStorage.setItem('lovecestas_app_favicon', favicon);
                const faviconLink = document.querySelector("link[rel~='icon']");
                if (faviconLink) faviconLink.href = `${favicon}${favicon.includes('?') ? '&' : '?'}v=${pendingUpdate.version}`;
            }

            if (pwaIcon) {
                localStorage.setItem('lovecestas_app_logo', pwaIcon);
                setAppLogo(pwaIcon);
            }

            const manifestLink = document.getElementById('pwa-manifest');
            if (manifestLink) {
                manifestLink.href = buildManifestHref(pendingUpdate.manifestUrl);
            }

            setProgress(58);
            setStatusText('Limpando arquivos antigos...');
            await clearBrowserCaches();
            await wait(400);

            setProgress(78);
            setStatusText('Ativando atualização...');
            await updateServiceWorker();
            await wait(450);

            localStorage.setItem(VERSION_STORAGE_KEY, pendingUpdate.version);
            lastSeenVersionRef.current = pendingUpdate.version;

            setProgress(100);
            setStatusText('Atualização concluída. Reiniciando app...');
            await wait(600);

            window.location.reload();
        } catch (error) {
            console.error('Erro ao aplicar atualização do PWA:', error);
            setStatusText('Não foi possível atualizar agora. Tente novamente em instantes.');
            setIsUpdating(false);
            setProgress(0);
        }
    };

    return (
        <AnimatePresence>
            {pendingUpdate && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6"
                >
                    <motion.div
                        initial={{ y: 40, scale: 0.96, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{ y: 40, scale: 0.96, opacity: 0 }}
                        className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/30 bg-gray-950 shadow-2xl shadow-amber-500/10"
                    >
                        <div className="relative p-6">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300" />

                            <div className="flex items-center gap-4">
                                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-amber-400/40 bg-black p-2">
                                    {pendingUpdate.icons?.pwa_icon?.current ? (
                                        <img src={pendingUpdate.icons.pwa_icon.current} alt="" className="h-full w-full object-contain" />
                                    ) : (
                                        <div className="h-full w-full rounded-xl bg-amber-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Nova atualização</p>
                                    <h2 className="mt-1 text-xl font-black text-white">Seu app ficou ainda melhor</h2>
                                </div>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-gray-300">
                                Atualizamos a identidade do aplicativo. Toque em atualizar para aplicar os arquivos novos dentro do PWA.
                            </p>

                            <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                                Observação: o ícone e o nome que ficam na tela inicial são atualizados pelo Android/iOS quando o sistema reprocessa o manifesto. Em alguns aparelhos, essa parte só muda removendo e instalando o atalho novamente.
                            </p>

                            {isUpdating && (
                                <div className="mt-6">
                                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-300">
                                        <span>{statusText}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                                        <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-500"
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.25 }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setPendingUpdate(null)}
                                    disabled={isUpdating}
                                    className="flex-1 rounded-xl border border-gray-700 px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-gray-900 disabled:opacity-50"
                                >
                                    Depois
                                </button>
                                <button
                                    onClick={applyUpdate}
                                    disabled={isUpdating}
                                    className="flex-1 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-300 disabled:opacity-80"
                                >
                                    {isUpdating ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <SpinnerIcon className="h-4 w-4 animate-spin" />
                                            Atualizando
                                        </span>
                                    ) : (
                                        'Atualizar agora'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
