import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useShop } from '../contexts/ShopContext';
import { Modal } from '../components/ui/Modal';
import { InstallmentModal, SizeGuideDisplay, VariationSelector } from '../components/product/ProductSupport';
import { ProductCarousel } from '../components/product/ProductCards';
import { ShippingCalculator } from '../components/checkout/CheckoutAddress';
import { getFirstImage, parseJsonString } from '../utils/cloudinary';
import {
    ArrowUturnLeftIcon, CartIcon, CheckIcon, ChevronDownIcon, ClockIcon,
    CreditCardIcon, RulerIcon, SaleIcon, ShareIcon, ShieldCheckIcon, ShirtIcon,
    SparklesIcon, SpinnerIcon, StarIcon, TagIcon, TrashIcon, UserIcon, XMarkIcon
} from '../components/icons';
export const ProductDetailPage = ({ productId, onNavigate }) => {
    const { user } = useAuth();
    const { addToCart, calculateLocalDeliveryPrice, shippingLocation, setIsMinicartOpen, paymentInstallmentsConfig } = useShop(); 
    const notification = useNotification();
    const confirmation = useConfirmation();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [crossSellProducts, setCrossSellProducts] = useState([]);
    const [mainImage, setMainImage] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [installments, setInstallments] = useState([]);
    const [isLoadingInstallments, setIsLoadingInstallments] = useState(true);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    
    // Novo estado para o lightbox das fotos das avaliações
    const [reviewLightboxImage, setReviewLightboxImage] = useState(null);

    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    
    const [isSizeGuideModalOpen, setIsSizeGuideModalOpen] = useState(false);
    
    const [pendingAction, setPendingAction] = useState(null); 
    const [selectionError, setSelectionError] = useState(false); 

    const [selectedVariation, setSelectedVariation] = useState(null); 
    const [galleryImages, setGalleryImages] = useState([]);
    
    const [timeLeft, setTimeLeft] = useState('');
    const [isPromoActive, setIsPromoActive] = useState(false);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const galleryRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const productImages = useMemo(() => parseJsonString(product?.images, []), [product]);
    const productVariations = useMemo(() => parseJsonString(product?.variations, []), [product]);

    useEffect(() => {
        if (product && product.id) {
            try {
                const stored = localStorage.getItem('lovecestas_recently_viewed');
                let viewed = stored ? JSON.parse(stored) : [];
                viewed = viewed.filter(id => id !== product.id);
                viewed.unshift(product.id);
                viewed = viewed.slice(0, 12);
                localStorage.setItem('lovecestas_recently_viewed', JSON.stringify(viewed));
            } catch(e) { console.error("Erro ao salvar vistos recentemente", e); }
        }
    }, [product]);

    useEffect(() => {
        if (galleryImages.length > 0 && galleryImages[currentImageIndex]) {
            setMainImage(galleryImages[currentImageIndex]);
        }
    }, [currentImageIndex, galleryImages]);

    useEffect(() => {
        if (product && product.product_type === 'clothing' && productVariations.length > 0 && !selectedColor) {
            const firstVar = productVariations.find(v => v.stock > 0) || productVariations[0];
            if (firstVar && firstVar.color) {
                setSelectedColor(firstVar.color);
            }
        }
    }, [product, productVariations, selectedColor]);

    useEffect(() => {
        if (selectedColor && selectedSize) {
            const found = productVariations.find(v => v.color === selectedColor && v.size === selectedSize);
            setSelectedVariation(found || null);
            setSelectionError(false); 
        } else {
            setSelectedVariation(null);
        }
        
        if (selectedColor) {
             const allImagesForColor = productVariations
                .filter(v => v.color === selectedColor && v.images && v.images.length > 0)
                .flatMap(v => v.images)
                .filter((value, index, self) => self.indexOf(value) === index);

            if (allImagesForColor.length > 0) {
                setGalleryImages(allImagesForColor);
                setCurrentImageIndex(0);
            } else {
                setGalleryImages(productImages);
            }
        } else {
             setGalleryImages(productImages);
        }

    }, [selectedColor, selectedSize, productVariations, productImages]);

    useEffect(() => {
        if (product) {
            let active = !!product.is_on_sale && product.sale_price > 0;
            if (product.product_type === 'clothing' && selectedVariation) {
                if (selectedVariation.is_promo === false) {
                    active = false;
                }
            }
            setIsPromoActive(active);
        }
    }, [product, selectedVariation]);

    const currentPrice = isPromoActive ? product?.sale_price : product?.price;

    const discountPercent = useMemo(() => {
        if (isPromoActive && product) {
            return Math.round(((product.price - product.sale_price) / product.price) * 100);
        }
        return 0;
    }, [isPromoActive, product]);

    useEffect(() => {
        if (!product?.sale_end_date || !isPromoActive) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const endDate = new Date(product.sale_end_date).getTime();
            const difference = endDate - now;
            
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                setTimeLeft({ days, hours, minutes, seconds });
            } else {
                setTimeLeft('Expirada');
            }
        };
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [isPromoActive, product?.sale_end_date]);

    const isNew = useMemo(() => {
        if (!product || !product.created_at) return false;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(product.created_at) > thirtyDaysAgo;
    }, [product]);

    const avgRating = useMemo(() => {
        return reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length || 0;
    }, [reviews]);

    const itemsForShipping = useMemo(() => {
        if (!product) return [];
        return [{...product, qty: quantity}];
    }, [product, quantity]);

    const isClothing = product?.product_type === 'clothing';
    const isPerfume = product?.product_type === 'perfume';

    const globalStock = Number(product?.stock) || 0;
    let productOrVariationOutOfStock = false;
    let stockLimit = 0;

    if (isClothing) {
        if (globalStock <= 0) {
            productOrVariationOutOfStock = true;
        } else if (selectedVariation) {
            productOrVariationOutOfStock = Number(selectedVariation.stock) <= 0;
            stockLimit = Number(selectedVariation.stock);
        } else {
            stockLimit = globalStock;
        }
    } else {
        productOrVariationOutOfStock = globalStock <= 0;
        stockLimit = globalStock;
    }

    const isQtyAtMax = stockLimit > 0 ? quantity >= stockLimit : false;

    const parseTextToList = (text) => { if (!text || text.trim() === '') return null; return <ul className="space-y-1">{text.split('\n').map((line, index) => <li key={index} className="flex items-start"><span className="text-amber-400 mr-2 mt-1 text-xs">✓</span><span>{line}</span></li>)}</ul>; };
    const getInstallmentSummary = () => { if (isLoadingInstallments) { return <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>; } if (!installments || installments.length === 0) { return <span className="text-gray-500 text-xs">Parcelamento indisponível.</span>; } const noInterest = [...installments].reverse().find(p => p.installment_rate === 0); if (noInterest) { return <span className="text-xs">em até <span className="font-bold">{noInterest.installments}x de R$ {noInterest.installment_amount.toFixed(2).replace('.', ',')}</span> sem juros</span>; } const lastInstallment = installments[installments.length - 1]; if (lastInstallment) { return <span className="text-xs">ou em até <span className="font-bold">{lastInstallment.installments}x de R$ {lastInstallment.installment_amount.toFixed(2).replace('.', ',')}</span></span>; } return null; };

    const fetchProductData = useCallback(async (id) => {
        const controller = new AbortController();
        const signal = controller.signal;
        setIsLoading(true);
        try {
            const [productData, reviewsData, allProductsData, crossSellData] = await Promise.all([
                apiService(`/products/${id}`, 'GET', null, { signal }),
                apiService(`/products/${id}/reviews`, 'GET', null, { signal }),
                apiService('/products', 'GET', null, { signal }),
                apiService(`/products/${id}/related-by-purchase`, 'GET', null, { signal }).catch(() => [])
            ]);

            if (signal.aborted) return;

            const images = parseJsonString(productData.images, ['https://placehold.co/600x400/222/fff?text=Produto']);
            setGalleryImages(images);
            setCurrentImageIndex(0);
            setMainImage(images[0] || 'https://placehold.co/600x400/222/fff?text=Produto');
            setProduct(productData);
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);
            setCrossSellProducts(Array.isArray(crossSellData) ? crossSellData : []);

            if (productData && allProductsData) {
                const productsArray = Array.isArray(allProductsData) ? allProductsData : (allProductsData.products || []);
                const related = productsArray.filter(p => p.id !== productData.id && (p.brand === productData.brand || p.category === productData.category)).slice(0, 8);
                setRelatedProducts(related);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                 setProduct({ error: true, message: "Produto não encontrado ou ocorreu um erro." });
                 notification.show(err.message || "Produto não encontrado", 'error');
            }
        } finally {
            if (!signal.aborted) { setIsLoading(false); }
        }
        return () => { controller.abort(); };
    }, [notification]);

    const handleHelpfulVote = async (reviewId) => {
        try {
            const votedReviews = JSON.parse(localStorage.getItem('lovecestas_voted_reviews') || '[]');
            if (votedReviews.includes(reviewId)) {
                notification.show("Você já avaliou este comentário como útil.", "error");
                return;
            }

            await apiService(`/reviews/${reviewId}/helpful`, 'POST');
            
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful_votes: (r.helpful_votes || 0) + 1 } : r));
            
            votedReviews.push(reviewId);
            localStorage.setItem('lovecestas_voted_reviews', JSON.stringify(votedReviews));
            
        } catch(e) {
            console.error("Erro ao registrar voto útil:", e);
        }
    };

    const handleDeleteReview = (reviewId) => {
        confirmation.show("Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.", async () => {
            try {
                await apiService(`/reviews/${reviewId}`, 'DELETE');
                notification.show('Avaliação excluída com sucesso.');
                fetchProductData(productId);
            } catch (error) {
                notification.show(`Erro ao excluir avaliação: ${error.message}`, 'error');
            }
        });
    };

    const handleShare = async () => {
        const shareText = `✨ Olha o que eu encontrei na Love Cestas e Perfumes!\n\n*${product.name}*\n\nConfira mais detalhes no site 👇`;
        const shareData = { title: `Love Cestas e Perfumes - ${product.name}`, text: shareText, url: window.location.href };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { if (err.name !== 'AbortError') { notification.show('Compartilhamento cancelado.', 'error'); } }
        } else {
            try { await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`); notification.show('Link do produto copiado!'); } catch (err) { notification.show('Não foi possível copiar o link.', 'error'); }
        }
    };

    const handleQuantityChange = (amount) => {
        setQuantity(prev => {
            const newQty = prev + amount;
            if (newQty < 1) return 1;
            if (stockLimit !== undefined && newQty > stockLimit) {
                 notification.show(`Apenas ${stockLimit} unidades disponíveis.`, 'error');
                 return stockLimit;
            }
            return newQty;
        });
    };

    const handleAction = (action) => {
        if (!product) return;
        if (isClothing) {
            setPendingAction(action);
            setIsSelectionModalOpen(true);
            setSelectionError(false);
        } else {
            processAddToCart(action);
        }
    };

    const handleConfirmSelection = () => {
        if (isClothing && (!selectedColor || !selectedSize)) {
            setSelectionError(true);
            if (navigator.vibrate) navigator.vibrate(200);
            return;
        }
        if (isClothing && !selectedVariation) {
             notification.show("Esta combinação não está disponível.", "error");
             return;
        }
        processAddToCart(pendingAction);
        setIsSelectionModalOpen(false);
    };

    const processAddToCart = async (action) => {
        try {
            await addToCart(product, quantity, selectedVariation);
            if (action === 'buyNow') { 
                onNavigate('cart'); 
            } else {
                notification.show(`${quantity}x ${product.name} adicionado(s) à sacola!`, 'success');
                if (window.innerWidth >= 1024) {
                    setIsMinicartOpen(true); 
                }
            }
        } catch (error) { notification.show(error.message, 'error'); }
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        if (galleryImages.length <= 1) return;
        setCurrentImageIndex(prev => (prev + 1) % galleryImages.length);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        if (galleryImages.length <= 1) return;
        setCurrentImageIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
    };

    useEffect(() => { fetchProductData(productId); window.scrollTo(0, 0); }, [productId, fetchProductData]);
    useEffect(() => { const fetchInstallments = async (price) => { if (!price || price <= 0) { setInstallments([]); setIsLoadingInstallments(false); return; } setIsLoadingInstallments(true); setInstallments([]); try { const installmentData = await apiService(`/mercadopago/installments?amount=${price}`); setInstallments(installmentData || []); } catch (error) { console.warn("Erro parcelas", error); setInstallments([]); } finally { setIsLoadingInstallments(false); } }; if (product && !product.error && currentPrice > 0) { fetchInstallments(currentPrice); } else if (!product || product.error || !(currentPrice > 0)) { setInstallments([]); setIsLoadingInstallments(false); } }, [product, currentPrice, paymentInstallmentsConfig]);
    
    const checkScrollButtons = useCallback(() => { 
        const gallery = galleryRef.current; 
        if (gallery) { 
            setCanScrollLeft(gallery.scrollLeft > 0); 
            setCanScrollRight(gallery.scrollWidth > gallery.clientWidth + gallery.scrollLeft + 1);
            setCanScrollUp(gallery.scrollTop > 0);
            setCanScrollDown(gallery.scrollHeight > gallery.clientHeight + gallery.scrollTop + 1);
        } 
    }, []);

    useEffect(() => { 
        checkScrollButtons(); 
        const gallery = galleryRef.current; 
        if (gallery) { 
            gallery.addEventListener('scroll', checkScrollButtons); 
            window.addEventListener('resize', checkScrollButtons); 
            return () => { 
                gallery.removeEventListener('scroll', checkScrollButtons); 
                window.removeEventListener('resize', checkScrollButtons); 
            }; 
        } 
    }, [galleryImages, checkScrollButtons]);

    const scrollGallery = (direction) => { 
        const gallery = galleryRef.current; 
        if (gallery) { 
            if (direction === 'left' || direction === 'right') {
                const scrollAmount = gallery.clientWidth * 0.7; 
                gallery.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' }); 
            } else {
                const scrollAmount = gallery.clientHeight * 0.7;
                gallery.scrollBy({ top: direction === 'up' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
            }
        } 
    };
    
    // Função auxiliar para formatar a URL do YouTube para Embed
    const getYouTubeEmbedUrl = (url) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11)
            ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
            : url;
    };

    const TabButton = ({ label, tabName, isVisible = true }) => { if (!isVisible) return null; return ( <button onClick={() => setActiveTab(tabName)} className={`px-5 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${activeTab === tabName ? 'border-amber-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'}`} > {label} </button> ); };
    const Lightbox = ({ mainImage, onClose }) => ( <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4" onClick={onClose}> <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white text-5xl leading-none z-[1000] p-2">×</button> <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}><img src={mainImage} alt="Imagem ampliada" className="max-w-full max-h-full object-contain rounded-lg" /></div> </div> );

    if (isLoading) {
        return (
            <div className="bg-black min-h-screen flex flex-col items-center justify-center pt-20 pb-32 px-4 gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <SpinnerIcon className="h-12 w-12 text-amber-400 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-wide">Carregando Detalhes</h2>
                    <p className="text-sm text-gray-500">Buscando as melhores imagens e informações para você...</p>
                </div>
            </div>
        );
    }
    
    if (product?.error) return <div className="text-white text-center py-20 bg-black min-h-screen">{product.message}</div>;
    if (!product) return <div className="bg-black min-h-screen"></div>;

    const showGalleryArrows = galleryImages.length > 1;

    return (
        <div className="bg-black text-white pb-28 md:pb-12">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(31, 41, 55, 0.5); 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(251, 191, 36, 0.5); 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(251, 191, 36, 0.8); 
                }
            `}</style>
            
            <InstallmentModal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} installments={installments}/>
            {isLightboxOpen && galleryImages.length > 0 && ( <Lightbox mainImage={mainImage} onClose={() => setIsLightboxOpen(false)} /> )}
            
            {reviewLightboxImage && (
                 <Lightbox mainImage={reviewLightboxImage} onClose={() => setReviewLightboxImage(null)} />
            )}
            
            {/* NOVO: Modal para o vídeo do YouTube */}
            <AnimatePresence>
                {isVideoModalOpen && product.video_url && (
                    <Modal isOpen={true} onClose={() => setIsVideoModalOpen(false)} title="Vídeo do Produto" size="3xl">
                        <div className="relative w-full overflow-hidden bg-black rounded-lg" style={{ paddingTop: '56.25%' }}>
                            <iframe
                                className="absolute top-0 left-0 w-full h-full rounded-lg"
                                src={getYouTubeEmbedUrl(product.video_url)}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSizeGuideModalOpen && product.size_guide && (
                    <Modal isOpen={true} onClose={() => setIsSizeGuideModalOpen(false)} title="Guia de Medidas" size="3xl">
                        <SizeGuideDisplay dataString={product.size_guide} />
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSelectionModalOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm"
                            onClick={() => setIsSelectionModalOpen(false)}
                        />
                        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center pointer-events-none p-0 md:p-4">
                            <motion.div
                                initial={{ y: "100%" }} 
                                animate={{ y: 0 }} 
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="pointer-events-auto bg-gray-900 border border-gray-700 w-full max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <div className="p-6 pb-0 flex justify-between items-start">
                                    <div className="pr-4">
                                        <h3 className="font-bold text-lg text-white leading-snug">{product.name}</h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <p className="text-amber-400 font-bold text-2xl">R$ {Number(currentPrice).toFixed(2).replace('.', ',')}</p>
                                            {isPromoActive && <span className="bg-red-600/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-md">-{discountPercent}%</span>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsSelectionModalOpen(false)} 
                                        className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                                    >
                                        <XMarkIcon className="h-6 w-6"/>
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="py-4 border-t border-gray-800 border-b border-gray-800 mb-6">
                                        <div className="flex items-center mb-5">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-blue-500/20 text-blue-400 p-2 rounded-lg">
                                                    <ShirtIcon className="h-5 w-5" />
                                                </div>
                                                <p className="text-sm text-gray-200 font-medium">Personalize sua escolha</p>
                                            </div>
                                        </div>
                                        <VariationSelector 
                                            product={product} 
                                            variations={productVariations} 
                                            selectedColor={selectedColor} 
                                            setSelectedColor={setSelectedColor} 
                                            selectedSize={selectedSize} 
                                            setSelectedSize={setSelectedSize} 
                                            error={selectionError} 
                                        />
                                    </div>
                                    <button 
                                        onClick={handleConfirmSelection}
                                        className={`w-full font-bold py-4 rounded-xl text-base shadow-lg transition-all transform active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-3
                                            ${selectionError && !selectedSize 
                                                ? 'bg-red-600 text-white animate-pulse' 
                                                : 'bg-amber-400 hover:bg-amber-300 text-black'}`
                                        }
                                    >
                                        {selectionError && !selectedSize ? '⚠️ Escolha um Tamanho' : (pendingAction === 'buyNow' ? 'Confirmar Compra' : 'Adicionar à Sacola')}
                                        {!selectionError && <CheckIcon className="h-5 w-5" />}
                                    </button>
                                    <p className="text-center text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-1.5 opacity-80">
                                        <ShieldCheckIcon className="h-3.5 w-3.5" /> Compra 100% Segura e Garantida
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4 py-8 lg:py-12">
                <div className="mb-6">
                    <button onClick={() => onNavigate('products')} className="text-sm text-amber-400 hover:underline flex items-center w-fit transition-colors"> <ArrowUturnLeftIcon className="h-4 w-4 mr-1.5"/> Voltar para todos os produtos </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
                    {/* COLUNA GALERIA */}
                    <div className="lg:col-span-7 lg:sticky lg:top-24 self-start">
                        <div className="flex flex-col lg:flex-row gap-4 align-stretch h-full">
                            
                            {/* Lista de Miniaturas */}
                            <div className="relative flex-shrink-0 order-2 lg:order-1 flex flex-col justify-center">
                                {/* Botão Scroll Cima (Desktop) */}
                                {canScrollUp && (
                                    <button 
                                        onClick={() => scrollGallery('up')} 
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white rounded-full p-1 hidden lg:block hover:bg-amber-500 transition-colors shadow-lg border border-gray-700"
                                    >
                                        <ChevronDownIcon className="h-4 w-4 rotate-180" />
                                    </button>
                                )}
                                
                                {/* Container Scrollável */}
                                <div 
                                    ref={galleryRef}
                                    className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-24 max-h-[80vh] scrollbar-hide py-2 lg:py-4"
                                    style={{ maxHeight: '80vh' }}
                                >
                                    {product.video_url && (
                                        <div 
                                            onClick={() => setIsVideoModalOpen(true)} 
                                            className="relative w-16 h-16 lg:w-24 lg:h-24 flex-shrink-0 bg-black rounded-lg cursor-pointer border-2 border-gray-800 hover:border-gray-500 overflow-hidden group/video transition-all shadow-md"
                                        >
                                            <img src={galleryImages[0] || getFirstImage(product.images)} alt="Vídeo" className="w-full h-full object-contain filter blur-[2px] opacity-60 group-hover/video:opacity-80 transition-opacity"/>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-red-600 rounded-full p-1.5 shadow-md group-hover/video:scale-110 transition-transform">
                                                    <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {galleryImages.map((img, index) => (
                                        <div 
                                            key={index} 
                                            onClick={() => setCurrentImageIndex(index)} 
                                            onMouseEnter={() => setCurrentImageIndex(index)} 
                                            className={`relative w-16 h-16 lg:w-24 lg:h-32 flex-shrink-0 bg-white rounded-lg cursor-pointer border-2 overflow-hidden transition-all duration-200 shadow-sm
                                                ${currentImageIndex === index 
                                                    ? 'border-amber-400 opacity-100 ring-2 ring-amber-400/50' 
                                                    : 'border-transparent hover:border-gray-400 opacity-70 hover:opacity-100'}`}
                                        >
                                            <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-contain p-1" />
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Botão Scroll Baixo (Desktop) */}
                                {canScrollDown && (
                                    <button 
                                        onClick={() => scrollGallery('down')} 
                                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white rounded-full p-1 hidden lg:block hover:bg-amber-500 transition-colors shadow-lg border border-gray-700"
                                    >
                                        <ChevronDownIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Imagem Principal */}
                            <div className="w-full relative bg-white rounded-xl overflow-hidden shadow-xl border border-gray-800 order-1 lg:order-2 group flex justify-center items-center aspect-square lg:aspect-[3/4]">
                                {/* Badges */}
                                {!productOrVariationOutOfStock && (
                                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
                                        {isPromoActive ? ( 
                                            <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"> 
                                                <SaleIcon className="h-4 w-4"/> 
                                                <span>PROMOÇÃO {discountPercent}%</span> 
                                            </div> 
                                        ) : isNew ? ( 
                                            <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">LANÇAMENTO</div> 
                                        ) : null}
                                    </div>
                                )}
                                {productOrVariationOutOfStock && ( 
                                    <div className="absolute top-4 left-4 bg-gray-800 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg z-10 border border-gray-600">ESGOTADO</div> 
                                )}

                                {/* Container de Imagem */}
                                <div className="absolute inset-0 flex items-center justify-center p-4 lg:p-8">
                                    <img 
                                        src={mainImage} 
                                        alt={product.name} 
                                        onClick={() => galleryImages.length > 0 && setIsLightboxOpen(true)} 
                                        className={`max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105 ${galleryImages.length > 0 ? 'cursor-zoom-in' : ''}`}
                                    />
                                </div>
                                
                                {/* Botões de Navegação da Imagem Principal */}
                                {showGalleryArrows && (
                                    <>
                                        <button 
                                            onClick={handlePrevImage} 
                                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 z-20"
                                            aria-label="Imagem anterior"
                                        >
                                            <ChevronDownIcon className="h-6 w-6 rotate-90" />
                                        </button>
                                        <button 
                                            onClick={handleNextImage} 
                                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 z-20"
                                            aria-label="Próxima imagem"
                                        >
                                            <ChevronDownIcon className="h-6 w-6 -rotate-90" />
                                        </button>
                                    </>
                                )}

                                {/* Dica de Zoom (Desktop) */}
                                <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm p-2 rounded-full text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden lg:flex items-center justify-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DETALHES (Direita) */}
                    <div className="lg:col-span-5 space-y-6">
                        <div>
                            <p className="text-sm text-amber-400 font-semibold tracking-wider mb-1">{product.brand.toUpperCase()}</p>
                            <h1 className="text-2xl lg:text-4xl font-bold mb-2 leading-tight">{product.name}</h1>
                            {isPerfume && product.volume && <h2 className="text-base font-medium text-gray-400">{String(product.volume).toLowerCase().includes('ml') ? product.volume : `${product.volume}ml`}</h2>}
                            <div className="flex items-center mt-3 justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center text-amber-400 gap-0.5">
                                        {[...Array(5)].map((_, i) => <StarIcon key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? 'fill-current' : 'text-gray-700'}`} isFilled={i < Math.round(avgRating)} />)}
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">({reviews.length > 0 ? `${reviews.length} avaliações` : 'Novo'})</span>
                                </div>
                                <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 px-3 py-1.5 rounded-full text-xs font-bold"> <ShareIcon className="h-3.5 w-3.5"/> Compartilhar </button>
                            </div>
                        </div>

                        {/* --- ÁREA DE PREÇO E PROMOÇÃO --- */}
                        {isPromoActive && timeLeft && timeLeft !== 'Expirada' && (
                            <div className="bg-gradient-to-br from-red-900/40 to-black border border-red-800 rounded-lg p-4 mb-4 relative overflow-hidden shadow-lg shadow-red-900/20">
                                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                    <ClockIcon className="h-24 w-24 text-red-500" />
                                </div>
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-3 text-red-400 font-bold uppercase tracking-wide text-xs sm:text-sm">
                                    <SparklesIcon className="h-4 w-4 animate-pulse text-yellow-400" />
                                    Oferta por Tempo Limitado
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 w-full">
                                    <div className="text-white font-mono text-lg sm:text-2xl font-bold flex justify-center gap-2 w-full sm:w-auto">
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.days).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">DIAS</span>
                                        </div>
                                        <span className="self-center text-red-500 animate-pulse">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">HORAS</span>
                                        </div>
                                        <span className="self-center text-red-500 animate-pulse">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">MIN</span>
                                        </div>
                                        <span className="self-center text-red-500 animate-pulse">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span className="text-red-500">{String(timeLeft.seconds).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">SEG</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-red-900/30 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                        <p className="text-gray-400 text-sm">De: <span className="line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span></p>
                                        <div className="flex items-center justify-center sm:justify-end gap-2">
                                            <p className="text-white font-bold text-xl">Por: <span className="text-amber-400">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</span></p>
                                        </div>
                                        <p className="text-xs text-green-400 font-semibold mt-1 bg-green-900/20 px-3 py-0.5 rounded-full inline-block border border-green-900/30">Economize {discountPercent}%</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isPromoActive && (!timeLeft || timeLeft === 'Expirada') && (
                             <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-800 rounded-lg p-4 mb-4 relative overflow-hidden shadow-lg shadow-green-900/20">
                                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                    <TagIcon className="h-24 w-24 text-green-500" />
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-green-400 font-bold uppercase tracking-wide text-sm">
                                    <SaleIcon className="h-5 w-5" />
                                    Preço Especial
                                </div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-gray-400 text-sm">De: <span className="line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span></p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-bold text-2xl">Por: <span className="text-green-400">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-green-600 text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg">
                                        -{discountPercent}%
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-b border-gray-800 py-4">
                            {isPromoActive ? (
                                <div className="flex items-center gap-3">
                                    <p className="text-4xl font-bold text-red-500">R$ {Number(product.sale_price).toFixed(2).replace('.',',')}</p>
                                    {!timeLeft && <span className="text-sm font-bold text-green-500 bg-green-900/50 px-2 py-0.5 rounded-md">{discountPercent}% OFF</span>}
                                </div>
                             ) : ( <p className="text-3xl font-bold text-white">R$ {Number(product.price).toFixed(2).replace('.',',')}</p> )}
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                                <CreditCardIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                <span>{getInstallmentSummary()}</span>
                                {!isLoadingInstallments && installments && installments.length > 0 && ( <button onClick={() => setIsInstallmentModalOpen(true)} className="text-amber-400 font-semibold hover:underline text-xs ml-2"> (ver mais)</button> )}
                            </div>
                        </div>

                        {/* Seletor na página principal (também controlado pelo estado da página) */}
                        {isClothing && ( 
                            <div className="mb-2">
                                <VariationSelector 
                                    product={product} 
                                    variations={productVariations} 
                                    selectedColor={selectedColor} 
                                    setSelectedColor={setSelectedColor} 
                                    selectedSize={selectedSize} 
                                    setSelectedSize={setSelectedSize} 
                                    error={selectionError} 
                                /> 
                                {/* --- BOTÃO DE GUIA DE MEDIDAS (DESKTOP E MOBILE PRINCIPAL) --- */}
                                {product.size_guide && (
                                    <div className="flex justify-end mt-4">
                                        <button 
                                            onClick={() => setIsSizeGuideModalOpen(true)}
                                            className="text-xs font-bold text-amber-400 hover:text-white flex items-center gap-1.5 transition-colors border border-amber-400/30 px-3 py-1.5 rounded hover:bg-amber-400/10"
                                        >
                                            <RulerIcon className="h-4 w-4"/> Tabela de Medidas
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- BLOCO DO BOTÃO "COMPRAR" / "ESGOTADO" --- */}
                        {!productOrVariationOutOfStock && (
                            <div className="flex items-center space-x-4">
                                <p className="font-semibold text-sm">Quantidade:</p>
                                <div className="flex items-center border border-gray-700 rounded-md overflow-hidden">
                                    <button onClick={() => handleQuantityChange(-1)} className="px-3 py-1.5 text-lg hover:bg-gray-800 transition-colors">-</button>
                                    <span className="px-4 py-1.5 font-bold text-base border-x border-gray-700">{quantity}</span>
                                    <button onClick={() => handleQuantityChange(1)} disabled={isQtyAtMax} className="px-3 py-1.5 text-lg hover:bg-gray-800 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent">+</button>
                                </div>
                                {stockLimit !== undefined && <span className="text-xs text-gray-500">({stockLimit} unid. disponíveis)</span>}
                                {isQtyAtMax && <span className="text-xs text-red-400">Limite atingido</span>}
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            {productOrVariationOutOfStock ? ( 
                                <div className="w-full bg-gray-800 border border-gray-700 text-gray-400 py-3.5 rounded-md text-base text-center font-bold"> 
                                    {isClothing && selectedVariation ? 'Tamanho Esgotado' : 'Produto Esgotado'} 
                                </div> 
                            ) : ( 
                                <> 
                                    <button onClick={() => handleAction('buyNow')} className="w-full bg-amber-400 text-black py-3.5 rounded-md text-base hover:bg-amber-300 transition font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2"> 
                                        Comprar Agora 
                                    </button> 
                                    <button onClick={() => handleAction('addToCart')} className="w-full bg-gray-800 border border-gray-700 text-white py-3 rounded-md text-base hover:bg-gray-700 transition font-bold shadow hover:shadow-md flex items-center justify-center gap-2"> 
                                        <CartIcon className="h-5 w-5" /> Adicionar ao Carrinho 
                                    </button> 
                                </> 
                            )}
                        </div>

                        <ShippingCalculator items={itemsForShipping} />
                    </div>
                </div>
                
                <div className="mt-16 lg:mt-24 pt-10 border-t border-gray-800">
                    <div className="flex justify-center border-b border-gray-800 mb-8 flex-wrap -mt-3">
                        <TabButton label="Descrição" tabName="description" />
                        <TabButton label="Tabela de Medidas" tabName="size_guide" isVisible={isClothing} />
                        <TabButton label="Notas Olfativas" tabName="notes" isVisible={isPerfume} />
                        <TabButton label="Como Usar" tabName="how_to_use" isVisible={isPerfume} />
                        <TabButton label="Ideal Para" tabName="ideal_for" isVisible={isPerfume} />
                        <TabButton label="Cuidados com a Peça" tabName="care" isVisible={isClothing} />
                    </div>
                    <div className="text-gray-300 leading-relaxed max-w-3xl mx-auto min-h-[100px] prose prose-invert prose-sm sm:prose-base">
                        {activeTab === 'description' && <p>{product.description || 'Descrição não disponível.'}</p>}
                        
                        {isClothing && activeTab === 'size_guide' && (
                            product.size_guide 
                            ? <SizeGuideDisplay dataString={product.size_guide} /> 
                            : <p className="text-center text-gray-500 italic">Guia de medidas não disponível para este produto.</p>
                        )}
                        
                        {isPerfume && activeTab === 'notes' && (product.notes ? parseTextToList(product.notes) : <p>Notas olfativas não disponíveis.</p>)}
                        {isPerfume && activeTab === 'how_to_use' && <p>{product.how_to_use || 'Instruções de uso não disponíveis.'}</p>}
                        {isPerfume && activeTab === 'ideal_for' && (product.ideal_for ? parseTextToList(product.ideal_for) : <p>Informação não disponível.</p>)}
                        {isClothing && activeTab === 'care' && (product.care_instructions ? parseTextToList(product.care_instructions) : <p>Instruções de cuidado não disponíveis.</p>)}
                    </div>
                </div>

                {crossSellProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={crossSellProducts} onNavigate={onNavigate} title="Quem comprou, levou também" /></div> )}
                {relatedProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={relatedProducts} onNavigate={onNavigate} title="Pode também gostar de..." /></div> )}

                <div className="mt-16 pt-10 border-t border-gray-800 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold mb-8 text-center">Avaliações de Clientes</h2>
                    <div className="space-y-8 mb-10">
                        {reviews.length > 0 ? (
                            reviews.map((review) => {
                                const reviewImages = parseJsonString(review.images, []);
                                return (
                                    <div key={review.id} className="border-b border-gray-800 pb-6 last:border-b-0 last:pb-0 relative group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                    <UserIcon className="h-5 w-5" />
                                                </div>
                                                <span className="font-semibold text-white text-sm">{review.user_name || 'Cliente'}</span>
                                            </div>
                                            
                                            {user && user.role === 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteReview(review.id)}
                                                    className="p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Excluir avaliação"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex">{[...Array(5)].map((_, j) => <StarIcon key={j} className={`h-5 w-5 ${j < review.rating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={j < review.rating}/>)}</div>
                                            <p className="text-xs font-semibold text-amber-500 ml-2">Compra verificada</p>
                                        </div>
                                        
                                        <p className="text-xs text-gray-500 mb-3">
                                            Avaliado no Brasil em {new Date(review.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        
                                        {review.comment && <p className="text-gray-300 text-sm leading-relaxed break-words mb-4">{review.comment}</p>}
                                        
                                        {reviewImages.length > 0 && (
                                            <div className="flex gap-2 mb-4 overflow-x-auto py-1">
                                                {reviewImages.map((img, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => setReviewLightboxImage(img)}
                                                        className="w-16 h-16 rounded-md border border-gray-700 overflow-hidden cursor-zoom-in flex-shrink-0"
                                                    >
                                                        <img src={img} alt="Foto do cliente" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mt-2">
                                            <button 
                                                onClick={() => handleHelpfulVote(review.id)}
                                                className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-amber-400 border border-gray-700 px-3 py-1.5 rounded-full transition-colors active:scale-95"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                                                Útil ({review.helpful_votes || 0})
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-center mb-8">Este produto ainda não possui avaliações.</p>
                        )}
                    </div>

                    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center shadow">
                        <h3 className="font-semibold text-white mb-2">Comprou este produto?</h3>
                        <p className="text-gray-400 text-sm mb-4">Compartilhe sua opinião para ajudar outros clientes!</p>
                        <p className="text-xs text-gray-500">Você pode avaliar os produtos comprados na seção <a href="#account/orders" onClick={(e) => {e.preventDefault(); onNavigate('account/orders')}} className="text-amber-400 underline hover:text-amber-300">Meus Pedidos</a>.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
