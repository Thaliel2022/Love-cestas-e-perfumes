import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUpIcon } from '../icons';

// --- COMPONENTE DO BOTÃO DE VOLTAR AO TOPO ---
export const BackToTopButton = ({ scrollableRef }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = useCallback(() => {
        const target = scrollableRef?.current;
        let scrollTop = 0;
        if (target) {
            scrollTop = target.scrollTop; // Usa o scroll do elemento
        } else {
            scrollTop = window.pageYOffset; // Usa o scroll da página
        }

        if (scrollTop > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [scrollableRef]);

    const scrollToTop = () => {
        const target = scrollableRef?.current;
        if (target) {
            target.scrollTo({ top: 0, behavior: 'smooth' }); // Rola o elemento
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a página
        }
    };

    useEffect(() => {
        const target = scrollableRef?.current || window;
        
        // Garante que o target (elemento) exista antes de adicionar o listener
        if (target) {
            target.addEventListener('scroll', toggleVisibility);
            return () => {
                target.removeEventListener('scroll', toggleVisibility);
            };
        }
    }, [toggleVisibility, scrollableRef]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    onClick={scrollToTop}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 right-6 z-50 bg-amber-500 text-black p-3 rounded-full shadow-lg hover:bg-amber-400 transition-colors"
                    aria-label="Voltar ao topo"
                >
                    <ChevronUpIcon className="h-6 w-6" />
                </motion.button>
            )}
        </AnimatePresence>
    );
};
