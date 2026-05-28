import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import { useShop } from '../contexts/ShopContext';
import { EmptyState } from '../components/ui/EmptyState';
import { WishlistItemCard } from '../components/product/ProductCards';
import { HeartIcon } from '../components/icons';

export const WishlistPage = ({ onNavigate }) => {
    const { wishlist, removeFromWishlist } = useShop(); 
    const notification = useNotification();

    const handleRemove = async (item) => {
        await removeFromWishlist(item.id);
        notification.show(`${item.name} removido da lista de desejos.`, 'error');
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 } 
        }
    };

    return (
        // CORREÇÃO AQUI: pt-12 pb-28 md:pb-12 para liberar espaço do navbar mobile
        <div className="bg-black text-white min-h-screen pt-12 pb-28 md:pb-12">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center">Lista de Desejos</h1>
                {wishlist.length === 0 ? (
                    <EmptyState
                        icon={<HeartIcon className="h-12 w-12"/>}
                        title="Sua lista de desejos está vazia"
                        message="Adicione produtos que você ama para encontrá-los facilmente mais tarde."
                        buttonText="Ver Produtos"
                        onButtonClick={() => onNavigate('products')}
                    />
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {wishlist.map(item => (
                                <WishlistItemCard
                                    key={item.id}
                                    item={item}
                                    onRemove={handleRemove}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
