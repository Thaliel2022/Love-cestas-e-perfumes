import { useCallback, useEffect, useState, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const BannerCarousel = memo(({ banners, onNavigate }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    useEffect(() => {
        setCurrentIndex(0);
    }, [banners]);

    const goNext = useCallback(() => {
        if (!banners || banners.length === 0) return;
        setCurrentIndex(prev => (prev === banners.length - 1 ? 0 : prev + 1));
    }, [banners]);

    const goPrev = useCallback(() => {
        if (!banners || banners.length === 0) return;
        setCurrentIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1));
    }, [banners]);

    useEffect(() => {
        if (banners && banners.length > 1) {
            const timer = setTimeout(goNext, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, banners, goNext]);
    
    const handleTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const handleTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd || !banners || banners.length <= 1) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe) goNext();
        else if (isRightSwipe) goPrev();
        setTouchStart(null);
        setTouchEnd(null);
    };

    const bannerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
    };

    if (!banners || banners.length === 0) return null;
    
    const isMobile = window.innerWidth < 640;
    const currentBanner = banners[currentIndex];
    
    if (!currentBanner) return null;

    const imageUrl = isMobile && currentBanner.image_url_mobile ? currentBanner.image_url_mobile : currentBanner.image_url;

    return (
        <section 
            className="relative h-[55vh] sm:h-[70vh] w-full overflow-hidden group bg-black"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentBanner.id || currentIndex}
                    className="absolute inset-0 cursor-pointer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    onClick={() => onNavigate(currentBanner.link_url.replace(/^#/, ''))}
                >
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
                    
                    {/* AQUI ESTÁ A CORREÇÃO: Utilizando a cor sólida HEX para não sofrer interferência das variáveis do tema claro */}
                    <div className="absolute inset-0 bg-[#000000]/40" />
                    
                    {(currentBanner.title || currentBanner.subtitle || currentBanner.cta_enabled) && (
                         <motion.div 
                            className="relative z-10 h-full flex flex-col items-center justify-center text-center text-[#ffffff] p-4"
                            variants={bannerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            key={`content-${currentBanner.id}`}
                         >
                            {currentBanner.title && (
                                <motion.h1 
                                    variants={itemVariants}
                                    className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-wider drop-shadow-lg"
                                >
                                    {currentBanner.title}
                                </motion.h1>
                            )}
                            {currentBanner.subtitle && (
                                <motion.p 
                                    variants={itemVariants}
                                    className="text-base md:text-xl mt-2 md:mt-4 max-w-2xl text-[#e5e7eb]"
                                >
                                    {currentBanner.subtitle}
                                </motion.p>
                            )}
                             {currentBanner.cta_enabled === 1 && currentBanner.cta_text && (
                                <motion.div variants={itemVariants}>
                                    <button className="mt-6 md:mt-8 bg-amber-400 text-black px-8 py-3 md:px-12 md:py-4 rounded-md text-base md:text-lg font-bold hover:bg-amber-300 transition-colors shadow-xl active:scale-95">
                                        {currentBanner.cta_text}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            {banners.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-[#000000]/30 rounded-full text-[#ffffff] md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-[#000000]/30 rounded-full text-[#ffffff] md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                        {banners.map((_, index) => (
                            <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }} className={`w-3 h-3 rounded-full transition-colors ${currentIndex === index ? 'bg-amber-400' : 'bg-[#ffffff]/50'}`} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
});
