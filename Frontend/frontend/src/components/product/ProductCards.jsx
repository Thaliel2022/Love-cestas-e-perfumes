import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useShop } from '../../contexts/ShopContext';
import { getFirstImage, parseJsonString } from '../../utils/cloudinary';
import {
    CartIcon, ClockIcon, EditIcon, ExclamationCircleIcon, EyeIcon, HeartIcon,
    SaleIcon, SparklesIcon, SpinnerIcon, StarIcon, TagIcon, TrashIcon, TruckIcon
} from '../icons';

export const ProductCard = memo(({ product, onNavigate }) => {
    const { addToCart, shippingLocation, calculateLocalDeliveryPrice, setIsMinicartOpen, paymentInstallmentsConfig } = useShop();
    const notification = useNotification();
    const { user } = useAuth();
    const { wishlist, addToWishlist, removeFromWishlist } = useShop(); 
    const { isAuthenticated } = useAuth();

    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [cardShippingInfo, setCardShippingInfo] = useState(null); 
    const [isCardShippingLoading, setIsCardShippingLoading] = useState(false); 
    
    const [timeLeft, setTimeLeft] = useState('');
    const [isPromoActive, setIsPromoActive] = useState(false);

    const imageUrl = useMemo(() => getFirstImage(product.images), [product.images]);

    useEffect(() => {
        setIsPromoActive(!!product.is_on_sale && product.sale_price > 0);
    }, [product]);

    const currentPrice = isPromoActive ? product.sale_price : product.price;

    const discountPercent = useMemo(() => {
        if (isPromoActive && product.price > 0) { 
            return Math.round(((product.price - product.sale_price) / product.price) * 100);
        }
        return 0;
    }, [isPromoActive, product]);

    useEffect(() => {
        if (!product?.sale_end_date) {
            setTimeLeft('');
            return;
        }

        if (!isPromoActive) return;

        const calculateTimeLeft = () => {
            const difference = new Date(product.sale_end_date) - new Date();
            
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);

                let timeString = '';
                if (days > 0) timeString += `${days}d `;
                timeString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                setTimeLeft(timeString);
            } else {
                setTimeLeft('Expirada');
                setIsPromoActive(false);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [isPromoActive, product.sale_end_date]);

    const isNew = useMemo(() => {
        if (!product || !product.created_at) return false;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(product.created_at) > thirtyDaysAgo;
    }, [product]);

    const avgRating = product.avg_rating ? Math.round(product.avg_rating) : 0;
    const reviewCount = product.review_count || 0;

    const productVariations = useMemo(() => parseJsonString(product?.variations, []), [product]);
    const isProductOutOfStock = product.stock <= 0;
    const isVariationOutOfStock = product.product_type === 'clothing' && productVariations.length > 0 && productVariations.every(v => v.stock <= 0);
    const isOutOfStock = isProductOutOfStock || isVariationOutOfStock;

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
         const debounceTimer = setTimeout(() => {
            const cleanCep = shippingLocation.cep.replace(/\D/g, '');
            
            if (product && cleanCep.length === 8) {
                setIsCardShippingLoading(true);
                setCardShippingInfo(null);

                const cepPrefix = parseInt(cleanCep.substring(0, 5));
                const isJoaoPessoa = cepPrefix >= 58000 && cepPrefix <= 58099;

                if (isJoaoPessoa) {
                    const date = new Date();
                    let addedDays = 0;
                    while (addedDays < 1) { 
                        date.setDate(date.getDate() + 1);
                        if (date.getDay() !== 0 && date.getDay() !== 6) { addedDays++; }
                    }
                    const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                    
                    const localPrice = calculateLocalDeliveryPrice ? calculateLocalDeliveryPrice([product]) : 20;
                    
                    const priceDisplay = localPrice === 0 ? "Grátis" : `R$ ${localPrice.toFixed(2).replace('.', ',')}`;
                    
                    setCardShippingInfo(`Frete ${priceDisplay} - Receba até ${formattedDate}.`);
                    setIsCardShippingLoading(false);
                    return; 
                }

                const calculateShipping = async () => {
                    try {
                        const productsPayload = [{ id: String(product.id), price: currentPrice, quantity: 1 }];
                        const apiOptions = await apiService('/shipping/calculate', 'POST', { cep_destino: shippingLocation.cep, products: productsPayload }, { signal, suppressAuthError: true });

                        let shippingOption = apiOptions.find(opt => opt.name.toLowerCase().includes('pac'));
                        if (!shippingOption) {
                            shippingOption = apiOptions.find(opt => opt.name.toLowerCase().includes('sedex'));
                        }

                        if (shippingOption) {
                            const date = new Date();
                            let deliveryTime = shippingOption.delivery_time;
                            let addedDays = 0;
                            while (addedDays < deliveryTime) {
                                date.setDate(date.getDate() + 1);
                                if (date.getDay() !== 0 && date.getDay() !== 6) { addedDays++; }
                            }
                            const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                            setCardShippingInfo(`Frete R$ ${Number(shippingOption.price).toFixed(2).replace('.', ',')} - Receba até ${formattedDate}.`);
                        } else {
                            setCardShippingInfo('Entrega indisponível para este CEP.');
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            setCardShippingInfo('Erro ao calcular frete.');
                        }
                    } finally {
                        if (!signal.aborted) { setIsCardShippingLoading(false); }
                    }
                };
                calculateShipping();
            } else {
                setCardShippingInfo(null); 
                 setIsCardShippingLoading(false); 
            }
        }, 500);

        return () => {
            clearTimeout(debounceTimer);
            controller.abort();
        };
    }, [product, shippingLocation.cep, currentPrice, calculateLocalDeliveryPrice]); 

    const installmentInfo = useMemo(() => {
        const interestFreeInstallments = Number(paymentInstallmentsConfig?.interest_free_installments) || 4;
        const minInstallmentAmount = Number(paymentInstallmentsConfig?.min_installment_amount) || 0;
        if (currentPrice > 0 && currentPrice >= minInstallmentAmount && interestFreeInstallments > 1) {
            const installmentValue = currentPrice / interestFreeInstallments;
            return `${interestFreeInstallments}x de R$ ${installmentValue.toFixed(2).replace('.', ',')} s/ juros`;
        }
        return null;
    }, [currentPrice, paymentInstallmentsConfig]);

    const handleViewDetails = (e) => {
        e.stopPropagation();
        onNavigate(`product/${product.id}`);
    };

    // --- CORREÇÃO: No Mobile, NÃO abre a gaveta. Apenas notifica.
    const handleAddToCartInternal = async (e) => { 
        e.stopPropagation();
        if (product.product_type === 'clothing') {
            notification.show("Escolha cor e tamanho na página do produto.", "error");
            onNavigate(`product/${product.id}`);
            return;
        }
        setIsAddingToCart(true);
        try {
            await addToCart(product, 1);
            if (window.innerWidth >= 1024) {
                setIsMinicartOpen(true); 
            } else {
                notification.show(`${product.name} adicionado à sacola!`, 'success');
            }
        } catch (error) {
            notification.show(error.message || "Erro ao adicionar ao carrinho", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const WishlistButton = ({ product }) => {
        const isWishlisted = wishlist.some(item => item.id === product.id);
        const handleWishlistToggle = async (e) => {
            e.stopPropagation(); 
            if (!isAuthenticated) {
                notification.show("Faça login para adicionar à lista de desejos", "error");
                return;
            }
            if (isWishlisted) {
                await removeFromWishlist(product.id);
                notification.show(`${product.name} removido da lista de desejos.`, 'error');
            } else {
                const result = await addToWishlist(product);
                notification.show(result.message, result.success ? 'success' : 'error');
            }
        };
        return (
            <button
                onClick={handleWishlistToggle}
                className={`absolute top-2 right-2 bg-[#000000]/40 hover:bg-[#000000]/60 backdrop-blur-sm p-1.5 rounded-full text-[#ffffff] transition-colors duration-200 z-10 ${isWishlisted ? 'text-amber-400' : 'hover:text-amber-300'}`}
                aria-label="Adicionar à Lista de Desejos"
            >
                <HeartIcon className="h-5 w-5" filled={isWishlisted} />
            </button>
        );
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div
            layout 
            variants={cardVariants}
            initial="hidden" 
            animate="visible" 
            exit="hidden" 
            whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)" }}
            className={`bg-black border ${isPromoActive ? (timeLeft && timeLeft !== 'Expirada' ? 'border-red-600 shadow-lg shadow-red-900/30' : 'border-green-600 shadow-lg shadow-green-900/30') : 'border-gray-800'} rounded-lg overflow-hidden flex flex-col text-white h-full transition-shadow duration-300 ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`} 
            onClick={() => onNavigate(`product/${product.id}`)} 
        >
            <div className="relative h-64 bg-white overflow-hidden group">
                <img
                    src={imageUrl} 
                    alt={product.name}
                    loading="lazy" 
                    className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105 p-2"
                />
                <WishlistButton product={product} /> 

                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    {isOutOfStock ? (
                        <div className="bg-gray-700 text-[#ffffff] text-[10px] font-bold px-2.5 py-1 rounded-full shadow">ESGOTADO</div>
                    ) : isPromoActive ? (
                         <div className={`bg-gradient-to-r ${timeLeft && timeLeft !== 'Expirada' ? 'from-red-600 to-orange-500' : 'from-green-600 to-teal-500'} text-[#ffffff] text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5`}> 
                            <SaleIcon className="h-4 w-4"/>
                            <span>PROMOÇÃO {discountPercent}%</span>
                        </div>
                    ) : isNew ? (
                        <div className="bg-blue-500 text-[#ffffff] text-xs font-bold px-3 py-1 rounded-full shadow-lg">LANÇAMENTO</div> 
                    ) : null}
                </div>

                {isPromoActive && timeLeft && timeLeft !== 'Expirada' && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-r from-red-700 to-red-500/90 backdrop-blur-md py-1.5 px-3 flex items-center justify-between z-20 shadow-inner border-t border-red-400">
                        <div className="flex items-center gap-1.5 text-[#ffffff] font-bold text-[10px] uppercase tracking-wide">
                            <SparklesIcon className="h-3 w-3 text-yellow-300 animate-pulse"/>
                            <span>Oferta Relâmpago</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#000000]/30 rounded px-1.5 py-0.5">
                            <ClockIcon className="h-3 w-3 text-[#ffffff]"/>
                            <span className="text-[#ffffff] font-mono font-bold text-xs">{timeLeft}</span>
                        </div>
                    </div>
                )}

                {isPromoActive && (!timeLeft || timeLeft === 'Expirada') && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-r from-emerald-600 to-green-500/95 backdrop-blur-md py-1.5 px-3 flex items-center justify-between z-20 shadow-inner border-t border-emerald-400/50">
                        <div className="flex items-center gap-1.5 text-[#ffffff] font-bold text-[10px] uppercase tracking-wide">
                            <TagIcon className="h-3 w-3 text-[#ffffff] fill-white"/>
                            <span>Preço Especial</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#000000]/20 rounded px-2 py-0.5">
                            <span className="text-[#ffffff] font-bold text-[9px]">Aproveite</span>
                        </div>
                    </div>
                )}

                 {product.product_type === 'clothing' && !isPromoActive && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-[#000000]/70 text-center text-xs py-1 text-amber-300"> 
                        Ver Cores e Tamanhos
                    </div>
                 )}
                 {user && user.role === 'admin' && (
                    <div className="absolute top-2 right-10 z-10"> 
                        <button onClick={(e) => { e.stopPropagation(); onNavigate(`admin/products?search=${encodeURIComponent(product.name)}`); }}
                                className="bg-[#000000]/50 hover:bg-[#000000]/70 backdrop-blur-sm text-[#ffffff] p-1.5 rounded-full shadow-md transition-colors" 
                                title="Editar Produto">
                            <EditIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1">{product.brand.toUpperCase()}</p>
                    <h4
                        className="text-base font-semibold tracking-tight cursor-pointer hover:text-amber-300 transition-colors line-clamp-2 h-10"
                        title={product.name}
                    >
                        {product.name}
                    </h4>
                    <div className="flex items-center mt-1.5 h-4 gap-1">
                        {[...Array(5)].map((_, i) => ( <StarIcon key={i} className={`h-4 w-4 ${i < avgRating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={i < avgRating} /> ))}
                        {reviewCount > 0 && ( <span className="text-[10px] text-gray-500">({reviewCount})</span> )}
                    </div>
                </div>

                <div className="mt-auto pt-3">
                    {isPromoActive ? (
                         <div className="flex flex-col">
                            <p className="text-xs font-light text-gray-500 line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-red-500">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</p>
                                <span className={`text-xs font-bold ${timeLeft && timeLeft !== 'Expirada' ? 'text-red-500' : 'text-green-500'}`}>{discountPercent}% OFF</span>
                            </div>
                        </div>
                    ) : ( <p className="text-xl font-semibold text-white">R$ {Number(product.price).toFixed(2).replace('.', ',')}</p> )}

                    {installmentInfo && ( <p className="text-[11px] text-gray-400 mt-0.5">{installmentInfo}</p> )}

                    {isOutOfStock ? (
                        <div className="mt-3">
                            <div className="w-full bg-gray-700 text-gray-400 py-2 px-3 rounded-md font-bold text-center text-sm">Esgotado</div>
                        </div>
                    ) : (
                        <div className="mt-3 flex items-stretch space-x-2">
                            <button
                                onClick={handleViewDetails}
                                className="flex-grow bg-amber-400 text-black py-2 px-3 rounded-md hover:bg-amber-300 transition font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <EyeIcon className="h-4 w-4"/>
                                Ver Detalhes
                            </button>
                            <button
                                onClick={handleAddToCartInternal}
                                disabled={isAddingToCart}
                                title="Adicionar ao Carrinho"
                                className="flex-shrink-0 border border-gray-600 text-gray-400 p-2 rounded-md hover:bg-gray-700 hover:text-white transition flex items-center justify-center disabled:opacity-50"
                            >
                                {isAddingToCart ? <SpinnerIcon className="h-5 w-5 text-gray-400" /> : <CartIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {(isCardShippingLoading || cardShippingInfo) && (
                <div className="p-2 text-[10px] text-center border-t border-gray-800 bg-gray-900/50 flex items-center justify-center gap-1.5">
                    {isCardShippingLoading ? (
                        <SpinnerIcon className="h-3 w-3 text-gray-500" />
                    ) : cardShippingInfo.includes('Erro') ? (
                         <ExclamationCircleIcon className="h-3 w-3 text-red-500" />
                    ) : (
                        <TruckIcon className="h-3 w-3 text-green-500"/>
                    )}
                    <span className={isCardShippingLoading ? "text-gray-500" : (cardShippingInfo.includes('Erro') ? 'text-red-400' : 'text-gray-400')}>
                        {isCardShippingLoading ? 'Calculando...' : cardShippingInfo}
                    </span>
                </div>
            )}
        </motion.div>
    );
});

export const ProductCarousel = memo(({ products, onNavigate, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(4);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    const updateItemsPerPage = useCallback(() => {
        if (window.innerWidth < 640) setItemsPerPage(1);
        else if (window.innerWidth < 1024) setItemsPerPage(2);
        else setItemsPerPage(4);
    }, []);

    useEffect(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, [updateItemsPerPage]);

    useEffect(() => {
        const maxIndex = Math.max(0, products.length - itemsPerPage);
        if (currentIndex > maxIndex) {
            setCurrentIndex(maxIndex);
        }
    }, [itemsPerPage, products, currentIndex]);

    const goNext = useCallback(() => {
        const maxIndex = Math.max(0, products.length - itemsPerPage);
        setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    }, [products.length, itemsPerPage]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    if (!products || products.length === 0) {
        return null;
    }

    const canGoPrev = currentIndex > 0;
    const canGoNext = products.length > itemsPerPage && currentIndex < (products.length - itemsPerPage);

    const handleTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && canGoNext) {
            goNext();
        } else if (isRightSwipe && canGoPrev) {
            goPrev();
        }

        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <div className="relative">
            {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
            <div
                className="overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <motion.div
                    className="flex -mx-2 md:-mx-4" // Mantém align-items: stretch (padrão)
                    animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
                    transition={{ type: 'spring', stiffness: 350, damping: 40 }}
                >
                    {products.map(product => (
                        <div
                            key={product.id}
                            className="flex-shrink-0 px-2 md:px-4" // REMOVIDO self-start
                            style={{ width: `${100 / itemsPerPage}%` }}
                        >
                            <ProductCard product={product} onNavigate={onNavigate} />
                        </div>
                    ))}
                </motion.div>
            </div>

            {products.length > itemsPerPage && (
                <>
                    <button onClick={goPrev} disabled={!canGoPrev} className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goNext} disabled={!canGoNext} className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </>
            )}
        </div>
    );
});

// NOVO COMPONENTE: WishlistItemCard
export const WishlistItemCard = memo(({ item, onRemove, onNavigate }) => {
    const { addToCart } = useShop(); // Pega addToCart do contexto
    const notification = useNotification();
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const imageUrl = getFirstImage(item.images);
    const isOnSale = !!(item.is_on_sale && item.sale_price > 0 && Number(item.price) > Number(item.sale_price));
    const currentPrice = isOnSale ? item.sale_price : item.price;
    const isOutOfStock = item.stock <= 0;

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        if (item.product_type === 'clothing') {
            notification.show("Escolha cor e tamanho na página do produto.", "error");
            onNavigate(`product/${item.id}`);
            return;
        }
        if (isOutOfStock) {
             notification.show("Este item está fora de estoque.", "error");
             return;
        }

        setIsAddingToCart(true);
        try {
            await addToCart(item, 1);
            notification.show(`${item.name} adicionado ao carrinho!`);
        } catch (error) {
            notification.show(error.message || "Erro ao adicionar ao carrinho", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            layout // Garante animação suave ao remover
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full"
        >
            <div className="relative h-48 sm:h-56 bg-white overflow-hidden group">
                <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => onNavigate(`product/${item.id}`)}
                />
                 {isOutOfStock && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">ESGOTADO</div>
                )}
                {isOnSale && !isOutOfStock && (
                     <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">OFERTA</div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex-grow">
                    <p className="text-xs text-amber-400 font-semibold tracking-wider mb-1">{item.brand?.toUpperCase()}</p>
                    <h4
                        className="text-base font-bold tracking-tight cursor-pointer hover:text-amber-400 line-clamp-2"
                        onClick={() => onNavigate(`product/${item.id}`)}
                        title={item.name}
                    >
                        {item.name}
                    </h4>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700">
                    {isOnSale ? (
                        <div>
                            <p className="text-sm font-light text-gray-500 line-through">R$ {Number(item.price).toFixed(2).replace('.', ',')}</p>
                            <p className="text-xl font-bold text-red-500">R$ {Number(currentPrice).toFixed(2).replace('.', ',')}</p>
                        </div>
                    ) : (
                        <p className="text-xl font-semibold text-white">R$ {Number(currentPrice).toFixed(2).replace('.', ',')}</p>
                    )}
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || isOutOfStock}
                        className={`flex-grow ${isOutOfStock ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-amber-400 text-black hover:bg-amber-300'} transition font-bold py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-70`}
                    >
                        {isAddingToCart ? <SpinnerIcon className="h-5 w-5"/> : <CartIcon className="h-5 w-5"/>}
                        {isOutOfStock ? 'Esgotado' : (item.product_type === 'clothing' ? 'Ver Opções' : 'Add Carrinho')}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                        title="Remover da lista"
                        className="flex-shrink-0 border border-gray-700 text-gray-400 p-2 rounded-md hover:bg-red-900/50 hover:border-red-700 hover:text-red-400 transition"
                    >
                        <TrashIcon className="h-5 w-5"/>
                    </button>
                </div>
            </div>
        </motion.div>
    );
});
