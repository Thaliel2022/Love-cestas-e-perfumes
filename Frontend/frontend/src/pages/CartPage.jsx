import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useShop } from '../contexts/ShopContext';
import { EmptyState } from '../components/ui/EmptyState';
import { ShippingCalculator } from '../components/checkout/CheckoutAddress';
import { getFirstImage, parseJsonString } from '../utils/cloudinary';
import {
    CartIcon,
    CheckBadgeIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    PlusIcon,
    SpinnerIcon,
    TrashIcon
} from '../components/icons';

export const CartPage = ({ onNavigate }) => {
    const {
        cart,
        setCart, 
        updateQuantity,
        removeFromCart,
        addToCart, 
        autoCalculatedShipping,
        isLoadingShipping,
        shippingError,
        couponCode, setCouponCode,
        applyCoupon, removeCoupon,
        couponMessage, appliedCoupon,
        discount,
        paymentInstallmentsConfig
    } = useShop();
    const notification = useNotification();
    const { isAuthenticated } = useAuth(); 

    // --- NOVA INTELIGÊNCIA DE ESTOQUE (NÍVEL AMAZON) ---
    // Analisa o carrinho em tempo real para descobrir se algo esgotou
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
        const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
        // Se estiver esgotado, podemos mantê-lo no subtotal para o cliente ver, 
        // mas a compra será bloqueada de qualquer forma.
        return sum + price * item.qty;
    }, 0), [cartWithStockInfo]);

    const shippingCost = useMemo(() => autoCalculatedShipping ? autoCalculatedShipping.price : 0, [autoCalculatedShipping]);

    const handleApplyCoupon = (e) => {
        e.preventDefault();
        if (couponCode.trim()) {
            applyCoupon(couponCode);
        }
    }

    const total = useMemo(() => {
        const calculatedTotal = subtotal - discount + shippingCost;
        return calculatedTotal < 0 ? 0 : calculatedTotal; 
    }, [subtotal, discount, shippingCost]);

    const installmentSummary = useMemo(() => {
        const interestFreeInstallments = Number(paymentInstallmentsConfig?.interest_free_installments) || 4;
        const minInstallmentAmount = Number(paymentInstallmentsConfig?.min_installment_amount) || 0;
        if (total <= 0 || total < minInstallmentAmount || interestFreeInstallments <= 1) return null;
        return `${interestFreeInstallments}x de R$ ${(total / interestFreeInstallments).toFixed(2).replace('.', ',')} sem juros`;
    }, [paymentInstallmentsConfig, total]);


    const handleUpdateQuantity = async (cartItemId, newQuantity) => {
        try {
            await updateQuantity(cartItemId, newQuantity);
        } catch (error) {
            notification.show(error.message, 'error');
        }
    };

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

    const itemsForShipping = useMemo(() => cartWithStockInfo.filter(i => !i.isOutOfStock), [cartWithStockInfo]);

    return (
        <div className="bg-black text-white min-h-screen">
            <div className="container mx-auto px-4 pt-12 pb-28 md:pb-12"> 
                <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center">Meu Carrinho</h1> 
                
                {cart.length === 0 ? (
                    <EmptyState
                        icon={<CartIcon className="h-12 w-12"/>}
                        title="Seu carrinho está vazio"
                        message="Explore nossos produtos e adicione seus favoritos!"
                        buttonText="Ver Produtos"
                        onButtonClick={() => onNavigate('products')}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10"> 
                        <div className="lg:col-span-2 space-y-8"> 
                            
                            {/* ALERTA DE ESTOQUE GLOBAL */}
                            <AnimatePresence>
                                {blockingItemsCount > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-900/30 border border-red-800/50 p-4 rounded-xl flex items-start gap-3 shadow-lg"
                                    >
                                        <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-red-400 font-bold text-base">Atenção aos itens do seu carrinho</h4>
                                            <p className="text-red-200 text-sm mt-1">
                                                Identificamos que {blockingItemsCount === 1 ? '1 item esgotou' : `${blockingItemsCount} itens esgotaram`} ou não têm a quantidade desejada disponível. 
                                                Por favor, remova ou ajuste a quantidade para finalizar sua compra.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg overflow-hidden">
                                <h2 className="text-xl font-semibold p-5 border-b border-gray-800 text-amber-400">Itens no Carrinho ({cart.length})</h2>
                                <div className="divide-y divide-gray-800">
                                    {cartWithStockInfo.map(item => {
                                        const isOnSale = item.is_on_sale && item.sale_price > 0;
                                        const currentPrice = isOnSale ? item.sale_price : item.price;
                                        const itemSubtotal = currentPrice * item.qty;
                                        
                                        let availableSizes = [];
                                        if (item.product_type === 'clothing' && item.variation) {
                                            const allVars = parseJsonString(item.variations, []);
                                            availableSizes = allVars
                                                .filter(v => v.color === item.variation.color && v.stock > 0)
                                                .map(v => v.size);
                                        }

                                        return (
                                        <motion.div
                                            key={item.cartItemId}
                                            layout 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            transition={{ duration: 0.3 }}
                                            // Esmaece o item inteiro se estiver sem estoque
                                            className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4 transition-opacity ${item.isOutOfStock ? 'opacity-60 bg-gray-900/50' : 'hover:bg-gray-800/30'}`}
                                        >
                                            <div className="flex items-center w-full md:w-auto flex-grow">
                                                <div
                                                    className={`w-24 h-24 bg-white rounded-lg flex-shrink-0 cursor-pointer p-1.5 border border-gray-700 shadow-sm ${item.isOutOfStock ? 'grayscale' : ''}`} 
                                                    onClick={() => onNavigate(`product/${item.id}`)}
                                                >
                                                    <img src={getFirstImage(item.images, 'https://placehold.co/96x96/222/fff?text=Img')} alt={item.name} className="w-full h-full object-contain"/>
                                                </div>
                                                <div className="flex-grow px-4">
                                                    <h3 className={`font-bold text-lg cursor-pointer transition line-clamp-2 ${item.isOutOfStock ? 'text-gray-400 line-through' : 'text-white hover:text-amber-400'}`} onClick={() => onNavigate(`product/${item.id}`)}>{item.name}</h3>
                                                    
                                                    {item.variation && (
                                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                                            <div className="flex items-center gap-1 text-xs text-gray-300 bg-black/40 px-2 py-1 rounded border border-gray-800">
                                                                <span className="text-gray-500">Cor:</span>
                                                                <span className="font-bold text-white">{item.variation.color}</span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs text-gray-500">Tam:</label>
                                                                <select 
                                                                    value={item.variation.size} 
                                                                    onChange={(e) => handleSizeChange(item, e.target.value)}
                                                                    disabled={item.isOutOfStock}
                                                                    className="bg-black/40 text-white text-xs font-bold border border-gray-700 rounded px-2 py-1 focus:ring-1 focus:ring-amber-400 outline-none cursor-pointer disabled:opacity-50"
                                                                >
                                                                    <option value={item.variation.size}>{item.variation.size}</option>
                                                                    {availableSizes.filter(s => s !== item.variation.size).map(size => (
                                                                        <option key={size} value={size}>{size}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Feedbacks Visuais Individuais */}
                                                    {item.isOutOfStock ? (
                                                        <div className="mt-2.5">
                                                            <span className="bg-red-900/50 text-red-400 border border-red-800/50 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Esgotado</span>
                                                        </div>
                                                    ) : item.isInsufficient ? (
                                                        <div className="mt-2.5 flex flex-col items-start gap-1">
                                                            <span className="text-amber-400 font-bold text-base">R$ {Number(currentPrice).toFixed(2)}</span>
                                                            <span className="bg-orange-900/30 text-orange-400 border border-orange-800/50 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">
                                                                Apenas {item.currentAvailableStock} unid. disponível
                                                            </span>
                                                        </div>
                                                    ) : isOnSale ? (
                                                        <div className="flex items-baseline gap-2 mt-2">
                                                            <p className="text-base text-red-500 font-bold">R$ {Number(currentPrice).toFixed(2)}</p>
                                                            <p className="text-xs text-gray-500 line-through">R$ {Number(item.price).toFixed(2)}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-base text-amber-400 mt-2 font-bold">R$ {Number(item.price).toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6 mt-4 md:mt-0">
                                                {!item.isOutOfStock ? (
                                                    <div className={`flex items-center border rounded-md overflow-hidden h-10 ${item.isInsufficient ? 'border-orange-500/50 shadow-[0_0_8px_rgba(249,115,22,0.2)]' : 'border-gray-700 bg-black/40'}`}>
                                                        <button onClick={() => handleUpdateQuantity(item.cartItemId, item.qty - 1)} className="px-3.5 text-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors h-full flex items-center">-</button>
                                                        <span className={`w-10 text-center font-bold text-sm border-x border-gray-700 h-full flex items-center justify-center ${item.isInsufficient ? 'text-orange-400' : 'text-white'}`}>{item.qty}</span>
                                                        <button 
                                                            onClick={() => handleUpdateQuantity(item.cartItemId, item.qty + 1)} 
                                                            disabled={item.qty >= item.currentAvailableStock}
                                                            className="px-3.5 text-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors h-full flex items-center disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="h-10 flex items-center">
                                                        <span className="text-sm text-gray-500 italic">Indisponível</span>
                                                    </div>
                                                )}
                                                
                                                <p className={`font-bold text-lg w-24 text-right ${item.isOutOfStock ? 'text-gray-600 line-through' : 'text-white'}`}>
                                                    R$ {itemSubtotal.toFixed(2)}
                                                </p>

                                                <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-500 hover:text-red-500 hover:bg-red-900/30 p-2.5 rounded-full transition-all" title="Remover item">
                                                    <TrashIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        </motion.div>
                                        )
                                    })}
                                </div>
                                <div className="p-5 border-t border-gray-800 bg-black/20 text-right">
                                     <button onClick={() => onNavigate('products')} className="text-amber-400 hover:text-amber-300 text-sm font-bold flex items-center gap-1.5 ml-auto w-fit transition-colors">
                                        <PlusIcon className="h-4 w-4"/> Continuar Comprando
                                    </button>
                                </div>
                            </div>
                            
                            <ShippingCalculator items={itemsForShipping} />
                        </div>

                        <div className="lg:col-span-1">
                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-xl h-fit lg:sticky lg:top-28">
                                <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-800 pb-4">Resumo do Pedido</h2>
                                <div className="space-y-3.5 mb-6 border-b border-gray-800 pb-6">
                                    <div className="flex justify-between text-gray-300 text-sm">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-white">R$ {subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-300 text-sm">
                                        <span>Frete</span>
                                        {isLoadingShipping ? (
                                            <SpinnerIcon className="h-4 w-4 text-amber-400" />
                                        ) : autoCalculatedShipping ? (
                                            <span className="font-medium text-white">{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'Grátis'}</span>
                                        ) : (
                                            <span className="text-xs text-gray-500">Selecione o CEP</span>
                                        )}
                                    </div>
                                    {shippingError && <p className="text-red-400 text-xs text-right mt-1">{shippingError}</p>}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-green-400 text-sm font-medium">
                                            <span>Desconto ({appliedCoupon.code})</span>
                                            <span>- R$ {discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center font-bold text-xl mb-8">
                                    <span className="text-white">Total</span>
                                    <span className="text-3xl text-amber-400 tracking-tight">R$ {total.toFixed(2)}</span>
                                </div>
                                {installmentSummary && (
                                    <p className="text-center text-xs text-gray-400 -mt-6 mb-6">
                                        ou em até <span className="font-bold text-gray-200">{installmentSummary}</span>
                                    </p>
                                )}

                                <div className="mb-6">
                                    {!appliedCoupon ? (
                                        <>
                                        <form onSubmit={handleApplyCoupon} className="flex gap-2">
                                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} type="text" placeholder="Cupom de Desconto" className="w-full p-3 bg-gray-800 border border-gray-700 text-white placeholder:text-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm transition-all" />
                                            <button type="submit" className="px-5 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 text-sm transition-colors border border-gray-700">Aplicar</button>
                                        </form>
                                        {couponMessage && <p className={`text-xs mt-2 font-medium pl-1 ${couponMessage.includes('aplicado') ? 'text-green-400' : 'text-red-400'}`}>{couponMessage}</p>}
                                        </>
                                    ) : (
                                        <div className="flex justify-between items-center bg-green-900/20 p-3 rounded-lg border border-green-800/50">
                                            <p className="text-sm text-green-400 font-bold flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/> {appliedCoupon.code}</p>
                                            <button onClick={removeCoupon} className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors">Remover</button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => onNavigate('checkout')}
                                    className={`w-full py-4 rounded-xl font-extrabold text-base shadow-lg transition-all duration-300 flex items-center justify-center gap-2 
                                        ${blockingItemsCount > 0 || !autoCalculatedShipping || cart.length === 0
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                                            : 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95'
                                        }`}
                                    disabled={!autoCalculatedShipping || cart.length === 0 || blockingItemsCount > 0}
                                >
                                    {blockingItemsCount > 0 ? (
                                        <><ExclamationCircleIcon className="h-5 w-5" /> Revisar Itens Esgotados</>
                                    ) : (
                                        <><CheckBadgeIcon className="h-6 w-6" /> Finalizar Compra</>
                                    )}
                                </button>
                                
                                {blockingItemsCount === 0 && !autoCalculatedShipping && cart.length > 0 && (
                                    <p className="text-center text-xs text-amber-500 font-bold mt-4">Por favor, calcule o frete para continuar.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
