import React, { memo, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { ArrowUturnLeftIcon, CheckIcon, ClockIcon, SparklesIcon, SpinnerIcon } from '../icons';

export const CollectionsCarousel = memo(({ onNavigate, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        apiService('/collections')
            .then(data => setCategories(data)) 
            .catch(err => console.error("Falha ao buscar coleções:", err))
            .finally(() => setIsLoading(false));
    }, []);

    const updateItemsPerPage = useCallback(() => {
        if (window.innerWidth < 640) setItemsPerPage(2);
        else if (window.innerWidth < 768) setItemsPerPage(3);
        else if (window.innerWidth < 1024) setItemsPerPage(4);
        else setItemsPerPage(6);
    }, []);

    useEffect(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, [updateItemsPerPage]);

    const goNext = useCallback(() => {
        const maxIndex = Math.max(0, categories.length - itemsPerPage);
        setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    }, [categories.length, itemsPerPage]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    if (isLoading) {
        return (
            <section className="bg-black text-white py-12 md:py-16">
                <div className="container mx-auto px-4">
                    {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
                    <div className="animate-pulse flex justify-center items-center h-48">
                        <SpinnerIcon className="h-8 w-8 text-amber-500" />
                    </div>
                </div>
            </section>
        );
    }

    if (!categories || categories.length === 0) return null;

    const canGoPrev = currentIndex > 0;
    const canGoNext = categories.length > itemsPerPage && currentIndex < (categories.length - itemsPerPage);

    const handleTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const handleTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance && canGoNext) goNext();
        else if (distance < -minSwipeDistance && canGoPrev) goPrev();
        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <section className="bg-black text-white py-12 md:py-16">
            <div className="container mx-auto px-4">
                {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
                <div className="relative group">
                    <div 
                        className="overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <motion.div
                            className="flex -mx-2"
                            animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
                            transition={{ type: 'spring', stiffness: 350, damping: 40 }}
                        >
                            {categories.map(cat => (
                                <div 
                                    key={cat.name} 
                                    className="flex-shrink-0 px-2"
                                    style={{ width: `${100 / itemsPerPage}%` }}
                                >
                                    {/* CORREÇÃO: Adicionado group/card para isolar o hover do card do hover do carrossel inteiro */}
                                    <div className="relative rounded-lg overflow-hidden aspect-[4/5] group/card cursor-pointer" onClick={() => onNavigate(`products?category=${cat.filter}`)}>
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"/>
                                        
                                        <div className="absolute inset-0 bg-[#000000]/40 flex items-center justify-center p-2 transition-all group-hover/card:bg-[#000000]/60">
                                            <h3 className="text-xl font-semibold text-[#ffffff] text-center tracking-wide" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{cat.name}</h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                    {/* Botões de Navegação (ocultos por padrão, visíveis no hover do carrossel) */}
                    {canGoPrev && (
                        <button onClick={goPrev} className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-[#ffffff]/50 hover:bg-[#ffffff] text-black p-2 rounded-full shadow-lg z-10 transition-opacity opacity-0 group-hover:opacity-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    {canGoNext && (
                         <button onClick={goNext} className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-[#ffffff]/50 hover:bg-[#ffffff] text-black p-2 rounded-full shadow-lg z-10 transition-opacity opacity-0 group-hover:opacity-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
});

export const NewsletterSection = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const notification = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setMessage('');

        try {
            const response = await apiService('/newsletter/subscribe', 'POST', { email });
            setStatus('success');
            setMessage(response.message);
            setEmail('');
            notification.show("Bem-vindo ao Clube VIP!", "success");
        } catch (error) {
            setStatus('error');
            setMessage(error.message || "Erro ao se inscrever. Tente novamente.");
            // Não mostramos notificação flutuante aqui para manter o feedback contextual na seção
        }
    };

    return (
        <section className="bg-gradient-to-r from-amber-500 to-amber-600 py-10 md:py-16 mt-8 md:mt-16 relative overflow-hidden">
            {/* Padrão de fundo decorativo */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-10 relative z-10">
                <div className="text-center lg:text-left text-black max-w-xl">
                    <h2 className="text-2xl md:text-4xl font-extrabold flex flex-col md:flex-row items-center lg:items-start gap-2 md:gap-3 mb-2 md:mb-3 leading-tight">
                        <span className="bg-black text-amber-500 p-1.5 md:p-2 rounded-lg shadow-lg transform -rotate-3"><SparklesIcon className="h-6 w-6 md:h-8 md:w-8" /></span>
                        <span>Clube VIP</span>
                    </h2>
                    <p className="font-medium text-black/90 text-sm md:text-lg px-2 md:px-0">
                        Cadastre-se e receba <span className="font-bold border-b-2 border-black">ofertas exclusivas</span> e cupons surpresa diretamente no seu e-mail.
                    </p>
                </div>
                
                <div className="w-full lg:w-auto max-w-lg">
                    <form className="flex flex-col sm:flex-row gap-3 bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-sm transition-all focus-within:ring-2 focus-within:ring-black/20" onSubmit={handleSubmit}>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Seu melhor e-mail" 
                            className="w-full px-4 py-3 md:px-6 md:py-4 rounded-lg border-0 focus:ring-0 text-gray-900 placeholder-gray-600 font-medium text-sm md:text-base outline-none bg-white/90 focus:bg-white transition-colors"
                            required
                            disabled={status === 'loading' || status === 'success'}
                        />
                        <button 
                            type="submit" 
                            disabled={status === 'loading' || status === 'success'}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-sm md:text-lg transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap
                                ${status === 'success' 
                                    ? 'bg-green-600 text-white cursor-default' 
                                    : 'bg-black text-white hover:bg-gray-900 active:scale-95'
                                } disabled:opacity-80`}
                        >
                            {status === 'loading' ? (
                                <SpinnerIcon className="h-5 w-5 md:h-6 md:w-6 text-amber-500"/>
                            ) : status === 'success' ? (
                                <>Inscrito <CheckIcon className="h-5 w-5 md:h-6 md:w-6"/></>
                            ) : (
                                <>Cadastrar <CheckIcon className="h-4 w-4 md:h-5 md:w-5 text-amber-500"/></>
                            )}
                        </button>
                    </form>
                    
                    {/* Mensagens de Feedback */}
                    <AnimatePresence>
                        {message && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0 }}
                                className={`mt-3 text-sm font-bold text-center lg:text-left px-2 py-1 rounded ${status === 'error' ? 'text-red-800 bg-red-100/80 inline-block' : 'text-black'}`}
                            >
                                {status === 'success' && <span className="mr-1">🎉</span>}
                                {message}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

// --- PÁGINAS DO CLIENTE ---
// Componente Interno do Banner de Destaque (Carrossel)
// Movido para fora para evitar recriação a cada renderização da HomePage
export const PromoBannerSection = ({ customBanners, onNavigate }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const defaultBanner = [{
        image_url: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=2070&auto=format&fit=crop",
        title: "Semana do Consumidor",
        subtitle: "Até 50% OFF em itens selecionados.",
        cta_text: "Ver Ofertas",
        link_url: "products?promo=true",
        isFlashOffer: true,
        id: 'default'
    }];

    const activeBanners = customBanners && customBanners.length > 0 ? customBanners : defaultBanner;
    
    useEffect(() => {
        if (activeBanners.length > 1) {
            const timer = setTimeout(() => {
                setCurrentIndex(prev => (prev === activeBanners.length - 1 ? 0 : prev + 1));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, activeBanners.length]);

    const safeIndex = currentIndex >= activeBanners.length ? 0 : currentIndex;
    const currentBanner = activeBanners[safeIndex];
    
    if (!currentBanner) return null;

    const isFlashOffer = currentBanner.isFlashOffer || 
                            currentBanner.title?.toLowerCase().includes('relâmpago') || 
                            currentBanner.subtitle?.toLowerCase().includes('relâmpago');

    const renderTitle = () => {
        if (currentBanner.id === 'default' && currentBanner.title === "Semana do Consumidor") {
            return (<>Semana do <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Consumidor</span></>);
        }
        return currentBanner.title;
    };

    return (
        <section className="container mx-auto px-4 mb-12 mt-4 md:mt-8">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentBanner.id || safeIndex} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-xl md:rounded-2xl overflow-hidden relative h-[350px] md:h-[500px] flex items-center bg-cover bg-center cursor-pointer group shadow-2xl border border-gray-800"
                    style={{ backgroundImage: `url(${currentBanner.image_url})` }}
                    onClick={() => onNavigate(currentBanner.link_url.replace(/^#/, ''))}
                >
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/40 to-transparent transition-all duration-500"></div>
                    <div className="relative z-10 w-full px-6 md:px-16 pb-8 md:pb-0 flex flex-col items-center md:items-start justify-end md:justify-center h-full text-center md:text-left">
                        {isFlashOffer && (
                            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-600 text-[#ffffff] text-xs md:text-sm font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-wider mb-3 md:mb-6 inline-flex items-center gap-2 shadow-lg">
                                <ClockIcon className="h-3 w-3 md:h-4 md:w-4" /> Oferta Relâmpago
                            </motion.span>
                        )}
                        
                        {/* AQUI ESTÁ A CORREÇÃO: Protegendo o texto contra temas que o tornam escuro */}
                        <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-7xl font-extrabold mb-3 md:mb-6 text-[#ffffff] drop-shadow-lg leading-tight">
                            {renderTitle()}
                        </motion.h2>
                        
                        {currentBanner.subtitle && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-base md:text-xl text-[#e5e7eb] mb-6 md:mb-10 max-w-xs md:max-w-lg font-light leading-snug">
                                {currentBanner.subtitle}
                            </motion.p>
                        )}
                        
                        {currentBanner.cta_enabled !== 0 && (
                            <motion.button whileTap={{ scale: 0.95 }} className="bg-white text-black px-8 py-3 md:px-12 md:py-4 rounded-full font-bold text-sm md:text-lg hover:bg-amber-400 transition-all shadow-xl flex items-center gap-2 md:gap-3">
                                {currentBanner.cta_text || 'Ver Ofertas'} <ArrowUturnLeftIcon className="h-4 w-4 md:h-5 md:w-5 rotate-180"/>
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
            
            {activeBanners.length > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                    {activeBanners.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            className={`w-2 h-2 rounded-full transition-all ${safeIndex === idx ? 'bg-amber-500 w-4' : 'bg-gray-600'}`}
                            aria-label={`Ir para banner ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

// Componente Cards Inferiores
// Movido para fora para evitar recriação a cada renderização da HomePage
export const CategoryCardsSection = ({ customCards, onNavigate }) => {
    const defaultCards = [
        {
            image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
            title: "Moda & Estilo", subtitle: "Peças exclusivas.", cta_text: "Explorar Roupas", link_url: "products?category=Roupas"
        },
        {
            image_url: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1974&auto=format&fit=crop",
            title: "Perfumaria", subtitle: "Fragrâncias marcantes.", cta_text: "Ver Perfumes", link_url: "products?category=Perfumes"
        }
    ];

    const card1 = (customCards && customCards.length > 0) ? customCards[0] : defaultCards[0];
    const card2 = (customCards && customCards.length > 1) ? customCards[1] : defaultCards[1];
    const cardsToRender = [card1, card2];

    return (
        <section className="container mx-auto px-4 py-8 md:py-12 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-10 text-center">Navegue por Universo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {cardsToRender.map((card, index) => (
                    <div 
                        key={index}
                        onClick={() => onNavigate(card.link_url.replace(/^#/, ''))}
                        className="relative h-64 md:h-[400px] rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer group shadow-lg border border-gray-800"
                    >
                        <img src={card.image_url} alt={card.title} className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10">
                            {/* AQUI ESTÁ A CORREÇÃO: Protegendo o texto para não ficar escuro no tema claro e sumir no gradiente */}
                            <h3 className="text-2xl md:text-4xl font-bold text-[#ffffff] mb-1 md:mb-3">{card.title}</h3>
                            <p className="text-[#d1d5db] text-sm md:text-lg mb-3 md:mb-6 line-clamp-1 md:line-clamp-none">{card.subtitle}</p>
                            <span className="inline-flex items-center gap-2 text-[#ffffff] text-xs md:text-sm font-bold underline decoration-amber-500 underline-offset-4">
                                {card.cta_text || 'Ver Mais'} &rarr;
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
