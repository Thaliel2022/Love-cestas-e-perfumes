import React, { memo, useEffect, useMemo, useState } from 'react';

// Componente de Animações Sazonais (Alta Performance via CSS Animation e Memoização)
export const SeasonalAnimations = memo(({ isEnabled, forcedSeason, isAppReady }) => {
    const [season, setSeason] = useState(null);
    const [isActive, setIsActive] = useState(false); 
    const [isMounted, setIsMounted] = useState(false); 

    useEffect(() => {
        // Se a animação estiver desativada pelo Admin ou se o app ainda estiver na tela de carregamento, não faz nada.
        if (!isEnabled || !isAppReady) {
            return;
        }

        // Se veio forçado pelo config (Admin salvou o tema sazonal)
        if (forcedSeason) {
            setSeason(forcedSeason);
        } else {
            const now = new Date();
            const m = now.getMonth() + 1;
            const d = now.getDate();

            if (m === 12 && d <= 25) setSeason('natal');
            else if (m === 6 && d <= 12) setSeason('namorados');
            else if (m === 5 && d <= 15) setSeason('maes');
            else if (m === 8 && d <= 15) setSeason('pais');
            else if (m === 11 && d >= 15) setSeason('blackfriday');
            else {
                setSeason(null);
                return;
            }
        }

        // Inicia a animação apenas quando o app estiver pronto
        setIsActive(true);
        setIsMounted(true);
        
        const fadeTimer = setTimeout(() => {
            setIsActive(false); // Inicia o fade out suave aos 5 segundos
        }, 5000);
        
        const unmountTimer = setTimeout(() => {
            setIsMounted(false); // Remove totalmente da memória aos 6 segundos
        }, 6000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(unmountTimer);
        };
    }, [isEnabled, forcedSeason, isAppReady]); // A dependência isAppReady garante que só inicie após o load

    const particles = useMemo(() => {
        if (!season) return [];
        
        let count = 0;
        if (season === 'natal') count = 40;
        else if (season === 'namorados' || season === 'maes') count = 25;
        else if (season === 'pais') count = 15;
        else if (season === 'blackfriday') count = 40;

        return [...Array(count)].map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: season === 'blackfriday' ? Math.random() * 100 : -10,
            animDuration: season === 'blackfriday' ? 1 + Math.random() * 2 : 4 + Math.random() * 4,
            delay: season === 'blackfriday' ? Math.random() * 2 : Math.random() * -5,
            size: season === 'blackfriday' ? 0.1 + Math.random() * 0.3 : 0.8 + Math.random() * 1.5,
        }));
    }, [season]);

    if (!isEnabled || !isAppReady || !isMounted || !season || particles.length === 0) return null;

    return (
        <div className={`fixed inset-0 pointer-events-none z-[100] overflow-hidden transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {particles.map((p) => {
                if (season === 'blackfriday') {
                    return (
                        <div
                            key={p.id}
                            className="absolute bg-amber-400 rounded-full"
                            style={{
                                left: `${p.left}vw`,
                                top: `${p.top}vh`,
                                width: `${p.size}rem`,
                                height: `${p.size}rem`,
                                boxShadow: '0 0 12px 4px rgba(251, 191, 36, 0.8)',
                                animation: `sparkle ${p.animDuration}s ease-in-out ${p.delay}s infinite`,
                            }}
                        />
                    );
                }

                let content;
                if (season === 'natal') {
                    content = <div className="rounded-full bg-white" style={{ width: `${p.size * 0.3}rem`, height: `${p.size * 0.3}rem`, boxShadow: '0 0 10px rgba(255,255,255,1)' }} />;
                } else if (season === 'namorados') {
                    content = '❤️';
                } else if (season === 'maes') {
                    content = '🌸';
                } else if (season === 'pais') {
                    content = '👔';
                }

                return (
                    <div
                        key={p.id}
                        className="absolute"
                        style={{
                            left: `${p.left}vw`,
                            top: `${p.top}vh`,
                            fontSize: season !== 'natal' ? `${p.size}rem` : undefined,
                            animation: `fall ${p.animDuration}s linear ${p.delay}s infinite`,
                            opacity: season === 'pais' ? 0.4 : 0.7,
                            filter: season !== 'natal' ? 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))' : 'none'
                        }}
                    >
                        {content}
                    </div>
                );
            })}
        </div>
    );
});
