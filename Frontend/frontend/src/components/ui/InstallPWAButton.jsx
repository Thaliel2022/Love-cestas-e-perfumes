import { useState } from 'react';
import { DownloadIcon, XMarkIcon } from '../icons';

export const InstallPWAButton = ({ deferredPrompt }) => {
    const [isVisible, setIsVisible] = useState(true);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA setup user choice: ${outcome}`);
            // Se o usuário aceitar instalar, o botão some
            if (outcome === 'accepted') {
                setIsVisible(false);
            }
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center bg-amber-500 text-black rounded-full shadow-2xl transition-transform hover:scale-105 border border-amber-400">
            <button
                onClick={handleInstallClick}
                className="px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-amber-400 transition-colors rounded-l-full"
            >
                <DownloadIcon className="h-5 w-5" />
                <span className="whitespace-nowrap text-sm">Instalar App</span>
            </button>
            {/* Divisória vertical sutil */}
            <div className="w-px h-6 bg-black/20"></div>
            <button
                onClick={() => setIsVisible(false)}
                className="px-3 py-2.5 hover:bg-amber-400 transition-colors rounded-r-full flex items-center justify-center text-black/70 hover:text-black"
                title="Fechar"
            >
                <XMarkIcon className="h-5 w-5" />
            </button>
        </div>
    );
};
