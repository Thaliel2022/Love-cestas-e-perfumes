import React, { memo, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useShop } from '../../contexts/ShopContext';
import { getFirstImage, parseJsonString } from '../../utils/cloudinary';
import { CartIcon, CheckBadgeIcon, ExclamationCircleIcon, ShieldCheckIcon, TrashIcon, XMarkIcon } from '../icons';

export const Minicart = memo(({ onNavigate }) => {
    const {
        cart,
        setCart,
        isMinicartOpen,
        setIsMinicartOpen,
        updateQuantity,
        removeFromCart,
        paymentInstallmentsConfig
    } = useShop();
    
    const { isAuthenticated } = useAuth();
    const notification = useNotification();

    // --- INTELIGÊNCIA DE ESTOQUE (NÍVEL AMAZON) PARA O MINICART ---
    const cartWithStockInfo = useMemo(() => {
        return cart.map(item => {
            let currentAvailableStock = Number(item.stock) || 0;
            
            // Se for roupa, busca o estoque exato da variação (cor/tamanho)
            if (item.product_type === 'clothing' && item.variation) {
                try {
                    const allVariations = typeof item.variations === 'string' ? JSON.parse(item.variations) : (item.variations || []);
                    const currentVar = allVariations.find(v => v.color === item.variation.color && v.size === item.variation.size);
                    if (currentVar) {
                        currentAvailableStock = Number(currentVar.stock) || 0;
                    } else {
                        currentAvailableStock = 0; // Variação foi deletada do banco
                    }
                } catch(e) {
                    currentAvailableStock = 0;
                }
            }

            const isOutOfStock = currentAvailableStock === 0;
            const isInsufficient = currentAvailableStock > 0 && item.qty > currentAvailableStock;

            return { 
                ...item, 
                currentAvailableStock, 
                isOutOfStock, 
                isInsufficient 
            };
        });
    }, [cart]);

    // Conta quantos itens estão bloqueando o checkout
    const blockingItemsCount = cartWithStockInfo.filter(i => i.isOutOfStock || i.isInsufficient).length;

    const subtotal = useMemo(() => cartWithStockInfo.reduce((sum, item) => {
        const isOnSale = !!item.is_on_sale && item.sale_price > 0;
        const price = isOnSale ? item.sale_price : item.price;
        return sum + price * item.qty;
    }, 0), [cartWithStockInfo]);

    const installmentSummary = useMemo(() => {
        const interestFreeInstallments = Number(paymentInstallmentsConfig?.interest_free_installments) || 4;
        const minInstallmentAmount = Number(paymentInstallmentsConfig?.min_installment_amount) || 0;
        if (subtotal <= 0 || subtotal < minInstallmentAmount || interestFreeInstallments <= 1) return null;
        return `${interestFreeInstallments}x de R$ ${(subtotal / interestFreeInstallments).toFixed(2).replace('.', ',')} sem juros`;
    }, [paymentInstallmentsConfig, subtotal]);

    // --- LÓGICA DE TROCA DE TAMANHO DIRETO NO MINICART ---
    const handleSizeChange = async (item, newSize) => {
        if (!item.variation || item.variation.size === newSize) return;

        const allVariations = parseJsonString(item.variations, []);
        const newVariation = allVariations.find(v => v.color === item.variation.color && v.size === newSize);

        if (!newVariation) {
            notification.show("Tamanho indisponível.", "error");
            return;
        }

        if (newVariation.stock < item.qty) {
            notification.show(`Estoque insuficiente para o tamanho ${newSize}.`, "error");
            return;
        }

        const newCartItemId = `${item.id}-${newVariation.color}-${newVariation.size}`;
        const existingItemIndex = cart.findIndex(i => i.cartItemId === newCartItemId);
        let newCart = [...cart];

        if (existingItemIndex > -1) {
            newCart[existingItemIndex].qty += item.qty;
            newCart = newCart.filter(i => i.cartItemId !== item.cartItemId);
        } else {
            newCart = newCart.map(i => {
                if (i.cartItemId === item.cartItemId) {
                    return { ...i, variation: newVariation, cartItemId: newCartItemId };
                }
                return i;
            });
        }

        setCart(newCart);
        notification.show(`Tamanho alterado para ${newSize}`);

        if (isAuthenticated) {
            try {
                await apiService(`/cart/${item.id}`, 'DELETE', { variation: item.variation });
                await apiService('/cart', 'POST', { 
                    productId: item.id, 
                    quantity: item.qty, 
                    variationId: newVariation.id, 
                    variation: newVariation,
                    variation_details: JSON.stringify(newVariation)
                });
            } catch (error) {
                console.error("Erro ao sincronizar troca de tamanho:", error);
            }
        }
    };

    // Bloqueia o scroll do fundo quando o carrinho está aberto no mobile
    useEffect(() => {
        if (isMinicartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMinicartOpen]);

    return (
        <AnimatePresence>
            {isMinicartOpen && (
                <>
                    {/* Overlay Escuro com Desfoque */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        onClick={() => setIsMinicartOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    
                    {/* Gaveta Lateral Premium */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#0a0a0a] shadow-2xl z-[110] flex flex-col border-l border-white/10"
                    >
                        {/* Header do Minicart (Glassmorphism) */}
                        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl z-20 sticky top-0">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-wide">
                                <span className="p-2 bg-amber-500/10 rounded-lg">
                                    <CartIcon className="h-5 w-5 text-amber-400" />
                                </span>
                                Minha Sacola
                                <span className="bg-white/10 text-white text-xs px-2.5 py-0.5 rounded-full font-medium ml-1">
                                    {cart.reduce((a,b) => a + b.qty, 0)}
                                </span>
                            </h2>
                            <button onClick={() => setIsMinicartOpen(false)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Conteúdo (Itens) */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#0a0a0a] to-[#111]">
                            {/* ALERTA DE ESTOQUE GLOBAL */}
                            <AnimatePresence>
                                {blockingItemsCount > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-900/30 border border-red-800/50 p-3 rounded-xl flex items-start gap-2.5 shadow-lg"
                                    >
                                        <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-red-400 font-bold text-sm">Atenção ao estoque</h4>
                                            <p className="text-red-200 text-xs mt-0.5 leading-tight">
                                                Identificamos que {blockingItemsCount === 1 ? '1 item esgotou' : `${blockingItemsCount} itens esgotaram`} ou não têm a quantidade desejada. Ajuste para finalizar a compra.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {cartWithStockInfo.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-6 py-20 relative">
                                    {/* Efeito de luz sutil no fundo vazio */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl"></div>
                                    <div className="relative">
                                        <CartIcon className="h-20 w-20 text-gray-700 opacity-50" />
                                    </div>
                                    <div className="text-center z-10 px-4">
                                        <p className="text-lg font-bold text-gray-300 mb-2">Sua sacola está vazia</p>
                                        <p className="text-sm text-gray-500 mb-8">Parece que você ainda não adicionou nenhum produto.</p>
                                        <button 
                                            onClick={() => { setIsMinicartOpen(false); onNavigate('products'); }} 
                                            className="px-8 py-3.5 bg-white text-black rounded-full font-bold shadow-lg hover:bg-gray-200 transition-all active:scale-95"
                                        >
                                            Começar a Comprar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                cartWithStockInfo.map(item => {
                                    const isOnSale = !!item.is_on_sale && item.sale_price > 0;
                                    const currentPrice = isOnSale ? item.sale_price : item.price;
                                    
                                    let availableSizes = [];
                                    if (item.product_type === 'clothing' && item.variation) {
                                        const allVars = parseJsonString(item.variations, []);
                                        availableSizes = allVars
                                            .filter(v => v.color === item.variation.color && v.stock > 0)
                                            .map(v => v.size);
                                    }

                                    return (
                                        <div key={item.cartItemId} className={`flex gap-4 p-3.5 rounded-2xl border relative group transition-all duration-300 ${item.isOutOfStock ? 'bg-black/40 border-gray-800 opacity-70' : 'bg-white/5 border-white/5 shadow-sm hover:bg-white/10'}`}>
                                            {/* Imagem do Produto */}
                                            <div className={`w-24 h-28 bg-white rounded-xl p-1.5 flex-shrink-0 cursor-pointer overflow-hidden shadow-inner ${item.isOutOfStock ? 'grayscale' : ''}`} onClick={() => {setIsMinicartOpen(false); onNavigate(`product/${item.id}`);}}>
                                                <img src={getFirstImage(item.images)} alt={item.name} className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500" />
                                            </div>
                                            
                                            {/* Detalhes do Produto */}
                                            <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="min-w-0 pr-2">
                                                        <p className={`text-sm font-bold line-clamp-2 cursor-pointer transition-colors leading-tight ${item.isOutOfStock ? 'text-gray-500 line-through' : 'text-gray-100 hover:text-amber-400'}`} onClick={() => {setIsMinicartOpen(false); onNavigate(`product/${item.id}`);}}>
                                                            {item.name}
                                                        </p>
                                                        {item.variation && (
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                <span className="text-[10px] font-medium text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                                    {item.variation.color}
                                                                </span>
                                                                <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                                                                    <span className="text-[10px] font-medium text-gray-300">Tam:</span>
                                                                    <select 
                                                                        value={item.variation.size} 
                                                                        onChange={(e) => handleSizeChange(item, e.target.value)}
                                                                        disabled={item.isOutOfStock}
                                                                        className="bg-transparent text-white text-[10px] font-bold focus:outline-none cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        <option value={item.variation.size} className="bg-gray-900 text-white">{item.variation.size}</option>
                                                                        {availableSizes.filter(s => s !== item.variation.size).map(size => (
                                                                            <option key={size} value={size} className="bg-gray-900 text-white">{size}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Botão Remover Discreto */}
                                                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-500 hover:text-red-400 transition-colors p-1.5 flex-shrink-0 rounded-full hover:bg-red-500/10">
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="flex flex-col mt-2">
                                                    {/* Feedbacks Visuais Individuais */}
                                                    {item.isOutOfStock ? (
                                                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1 mb-2">Esgotado</span>
                                                    ) : item.isInsufficient ? (
                                                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1 mb-2">Apenas {item.currentAvailableStock} un. disp.</span>
                                                    ) : null}

                                                    <div className="flex items-end justify-between mt-1">
                                                        {/* Controle de Quantidade em Pílula */}
                                                        {!item.isOutOfStock ? (
                                                            <div className={`flex items-center rounded-full border p-0.5 ${item.isInsufficient ? 'bg-orange-900/20 border-orange-500/50' : 'bg-black/40 border-white/10'}`}>
                                                                <button onClick={() => updateQuantity(item.cartItemId, item.qty - 1)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">-</button>
                                                                <span className={`w-6 text-center text-xs font-bold ${item.isInsufficient ? 'text-orange-400' : 'text-white'}`}>{item.qty}</span>
                                                                <button 
                                                                    onClick={() => updateQuantity(item.cartItemId, item.qty + 1)} 
                                                                    disabled={item.qty >= item.currentAvailableStock}
                                                                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="h-7"></div> // Spacer para manter o layout alinhado
                                                        )}
                                                        
                                                        {/* Preço */}
                                                        <div className="text-right">
                                                            {isOnSale && !item.isOutOfStock && (
                                                                <p className="text-[10px] text-gray-500 line-through">R$ {Number(item.price * item.qty).toFixed(2).replace('.', ',')}</p>
                                                            )}
                                                            <p className={`font-extrabold text-base tracking-tight ${item.isOutOfStock ? 'text-gray-600 line-through' : 'text-white'}`}>
                                                                R$ {Number(currentPrice * item.qty).toFixed(2).replace('.', ',')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer do Minicart Premium */}
                        {cartWithStockInfo.length > 0 && (
                            <div className="p-6 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/5 z-20 pb-safe">
                                <div className="flex justify-between items-end mb-6">
                                    <span className="text-gray-400 text-sm font-medium">Subtotal</span>
                                    <span className="text-2xl font-black text-white tracking-tight">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                {installmentSummary && (
                                    <p className="text-right text-xs text-gray-500 -mt-4 mb-5">
                                        até <span className="font-bold text-gray-300">{installmentSummary}</span>
                                    </p>
                                )}
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => { setIsMinicartOpen(false); onNavigate('checkout'); }} 
                                        disabled={blockingItemsCount > 0}
                                        className={`w-full py-4 rounded-xl font-extrabold text-base transition-all flex items-center justify-center gap-2 
                                            ${blockingItemsCount > 0 
                                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                                                : 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)] active:scale-[0.98]'
                                            }`}
                                    >
                                        {blockingItemsCount > 0 ? (
                                            <><ExclamationCircleIcon className="h-6 w-6" /> Revisar Itens</>
                                        ) : (
                                            <><CheckBadgeIcon className="h-6 w-6" /> Finalizar Compra</>
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => { setIsMinicartOpen(false); onNavigate('cart'); }} 
                                        className="w-full py-3 bg-transparent text-gray-400 font-bold text-sm hover:text-white transition-colors active:scale-[0.98]"
                                    >
                                        Ver Carrinho Completo
                                    </button>
                                </div>
                                {/* Gatilho de Confiança */}
                                <div className="mt-4 flex items-center justify-center gap-1.5 text-gray-500">
                                    <ShieldCheckIcon className="h-4 w-4" />
                                    <span className="text-[10px] font-medium uppercase tracking-widest">Ambiente 100% Seguro</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
