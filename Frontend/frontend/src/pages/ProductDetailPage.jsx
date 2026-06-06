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
    SparklesIcon, SpinnerIcon, StarIcon, TagIcon, TrashIcon, TruckIcon, UserIcon, XMarkIcon
} from '../components/icons';

const formatPrice = (value) => Number(value || 0).toFixed(2).replace('.', ',');

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

    const savingsAmount = useMemo(() => {
        if (isPromoActive && product) {
            return Math.max(0, product.price - product.sale_price);
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

    const getTextLines = (text) => String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
    const renderParagraphs = (text, emptyText) => {
        const lines = getTextLines(text);
        if (lines.length === 0) return <p className="text-gray-500 italic">{emptyText}</p>;
        return (
            <div className="space-y-4">
                {lines.map((line, index) => (
                    <p key={index} className="text-gray-300 leading-8">{line}</p>
                ))}
            </div>
        );
    };
    const renderInfoCards = (text, emptyText) => {
        const lines = getTextLines(text);
        if (lines.length === 0) return <p className="text-gray-500 italic">{emptyText}</p>;
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lines.map((line, index) => {
                    const [label, ...rest] = line.includes(':') ? line.split(':') : [];
                    const hasLabel = label && rest.length > 0;
                    return (
                        <div key={index} className="group bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-amber-400/40 hover:bg-amber-400/[0.04] transition-all">
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 h-6 w-6 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                                    <CheckIcon className="h-3.5 w-3.5" />
                                </span>
                                <div>
                                    {hasLabel ? (
                                        <>
                                            <p className="text-white font-bold text-sm">{label.trim()}</p>
                                            <p className="text-gray-400 text-sm leading-6 mt-1">{rest.join(':').trim()}</p>
                                        </>
                                    ) : (
                                        <p className="text-gray-300 text-sm leading-6">{line}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };
    const getInstallmentSummary = () => { if (isLoadingInstallments) { return <div className="h-5 bg-gray-700 rounded w-3/4 animate-pulse"></div>; } if (!installments || installments.length === 0) { return <span className="text-gray-500">Parcelamento indisponível.</span>; } const interestFreeLimit = Number(paymentInstallmentsConfig?.interest_free_installments) || 4; const noInterest = [...installments].reverse().find(p => p.installments <= interestFreeLimit); if (noInterest) { return <span>em até <span className="font-bold text-white">{noInterest.installments}x de R$ {noInterest.installment_amount.toFixed(2).replace('.', ',')}</span> sem juros</span>; } const lastInstallment = installments[installments.length - 1]; if (lastInstallment) { return <span>ou em até <span className="font-bold text-white">{lastInstallment.installments}x de R$ {lastInstallment.installment_amount.toFixed(2).replace('.', ',')}</span></span>; } return null; };

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

    const infoTabs = [
        { label: 'Descrição', tabName: 'description', icon: <ShieldCheckIcon className="h-5 w-5" />, visible: true, hint: 'Detalhes e diferenciais' },
        { label: 'Tabela de Medidas', tabName: 'size_guide', icon: <RulerIcon className="h-5 w-5" />, visible: isClothing, hint: 'Medidas da peça' },
        { label: 'Notas Olfativas', tabName: 'notes', icon: <SparklesIcon className="h-5 w-5" />, visible: isPerfume, hint: 'Família e composição' },
        { label: 'Como Usar', tabName: 'how_to_use', icon: <ClockIcon className="h-5 w-5" />, visible: isPerfume, hint: 'Aplicação recomendada' },
        { label: 'Ideal Para', tabName: 'ideal_for', icon: <UserIcon className="h-5 w-5" />, visible: isPerfume, hint: 'Ocasiões e estilo' },
        { label: 'Cuidados com a Peça', tabName: 'care', icon: <ShirtIcon className="h-5 w-5" />, visible: isClothing, hint: 'Conservação' },
    ].filter(tab => tab.visible);

    const currentInfoTab = infoTabs.find(tab => tab.tabName === activeTab) || infoTabs[0];

    const TabButton = ({ tab }) => (
        <button
            onClick={() => setActiveTab(tab.tabName)}
            className={`text-left rounded-2xl border p-4 transition-all duration-200 group ${
                activeTab === tab.tabName
                    ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-900/20'
                    : 'bg-gray-900/70 text-gray-300 border-gray-800 hover:border-amber-400/50 hover:bg-gray-800'
            }`}
        >
            <div className="flex items-center gap-3">
                <span className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activeTab === tab.tabName ? 'bg-black/10 text-black' : 'bg-amber-400/10 text-amber-400 group-hover:bg-amber-400/20'
                }`}>
                    {tab.icon}
                </span>
                <span>
                    <span className="block text-sm font-black">{tab.label}</span>
                    <span className={`block text-[11px] mt-0.5 ${activeTab === tab.tabName ? 'text-black/70' : 'text-gray-500'}`}>{tab.hint}</span>
                </span>
            </div>
        </button>
    );

    const renderInfoContent = () => {
        if (activeTab === 'description') {
            return (
                <div className="space-y-6">
                    {renderParagraphs(product.description, 'Descrição não disponível.')}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-black">Marca</p>
                            <p className="text-white font-bold mt-1">{product.brand || '-'}</p>
                        </div>
                        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-black">Categoria</p>
                            <p className="text-white font-bold mt-1">{product.category || '-'}</p>
                        </div>
                        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-black">{isPerfume ? 'Volume' : 'Tipo'}</p>
                            <p className="text-white font-bold mt-1">{isPerfume ? (product.volume || '-') : 'Moda'}</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (isClothing && activeTab === 'size_guide') {
            return product.size_guide
                ? <SizeGuideDisplay dataString={product.size_guide} />
                : <p className="text-gray-500 italic">Guia de medidas não disponível para este produto.</p>;
        }

        if (isPerfume && activeTab === 'notes') return renderInfoCards(product.notes, 'Notas olfativas não disponíveis.');
        if (isPerfume && activeTab === 'how_to_use') return renderInfoCards(product.how_to_use, 'Instruções de uso não disponíveis.');
        if (isPerfume && activeTab === 'ideal_for') return renderInfoCards(product.ideal_for, 'Informação não disponível.');
        if (isClothing && activeTab === 'care') return renderInfoCards(product.care_instructions, 'Instruções de cuidado não disponíveis.');

        return null;
    };

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
    const shouldShowThumbnailRail = Boolean(product.video_url) || galleryImages.length > 1;

    return (
        <div className="bg-black text-white pb-28 md:pb-12 relative overflow-hidden">
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
            
            <InstallmentModal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} installments={installments} interestFreeInstallments={Number(paymentInstallmentsConfig?.interest_free_installments) || 4}/>
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

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none"></div>
            <div className="container mx-auto px-4 py-8 lg:py-12 relative z-10">
                <div className="mb-6">
                    <button onClick={() => onNavigate('products')} className="text-sm text-amber-400 hover:text-amber-300 flex items-center w-fit transition-colors bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full font-bold"> <ArrowUturnLeftIcon className="h-4 w-4 mr-1.5"/> Voltar para todos os produtos </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                    {/* COLUNA GALERIA */}
                    <div className="lg:col-span-7 lg:sticky lg:top-24 self-start">
                        <div className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border border-gray-800 rounded-3xl p-3 md:p-4 shadow-2xl shadow-black/30">
                        <div className="flex flex-col lg:flex-row gap-4 align-stretch h-full">
                            
                            {/* Lista de Miniaturas */}
                            {shouldShowThumbnailRail && (
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
                                            className="relative w-16 h-16 lg:w-24 lg:h-24 flex-shrink-0 bg-black rounded-2xl cursor-pointer border-2 border-gray-800 hover:border-red-500 overflow-hidden group/video transition-all shadow-md"
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
                                            className={`relative w-16 h-16 lg:w-24 lg:h-32 flex-shrink-0 bg-white rounded-2xl cursor-pointer border-2 overflow-hidden transition-all duration-200 shadow-sm
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
                            )}

                            {/* Imagem Principal */}
                            <div className="w-full relative bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-800 order-1 lg:order-2 group flex justify-center items-center aspect-square lg:aspect-[3/4]">
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
                    </div>

                    {/* COLUNA DETALHES (Direita) */}
                    <div className="lg:col-span-5">
                        <div className="bg-gradient-to-br from-gray-900/95 via-gray-950/95 to-black border border-gray-800 rounded-3xl p-5 md:p-6 shadow-2xl shadow-black/30 space-y-6">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-xs text-amber-300 font-black tracking-wider bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">{product.brand.toUpperCase()}</span>
                                {product.category && <span className="text-xs text-gray-300 font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full">{product.category}</span>}
                            </div>
                            <h1 className="text-2xl lg:text-4xl font-black mb-2 leading-tight tracking-tight">{product.name}</h1>
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
                        <div className={`rounded-2xl p-5 relative overflow-hidden ${isPromoActive ? 'bg-gradient-to-br from-gray-900/90 to-black border border-amber-500/20 shadow-lg shadow-amber-900/10' : 'bg-black/40 border border-gray-800'}`}>
                            {isPromoActive && timeLeft && timeLeft !== 'Expirada' && (
                                <div className="mb-4 pb-4 border-b border-red-900/30">
                                    <div className="flex items-center gap-2 mb-3 text-red-400 font-bold uppercase tracking-wide text-xs">
                                        <SparklesIcon className="h-4 w-4 animate-pulse text-yellow-400" />
                                        Oferta por Tempo Limitado
                                    </div>
                                    <div className="text-white font-mono text-base sm:text-lg font-bold flex justify-start gap-2">
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[42px]">
                                            <span>{String(timeLeft.days).padStart(2, '0')}</span>
                                            <span className="text-[9px] font-sans font-normal text-gray-400">DIAS</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[42px]">
                                            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                                            <span className="text-[9px] font-sans font-normal text-gray-400">HORAS</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[42px]">
                                            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                                            <span className="text-[9px] font-sans font-normal text-gray-400">MIN</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[42px]">
                                            <span className="text-red-500">{String(timeLeft.seconds).padStart(2, '0')}</span>
                                            <span className="text-[9px] font-sans font-normal text-gray-400">SEG</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isPromoActive ? (
                                <div className="space-y-1.5">
                                    <p className="text-gray-400 text-base">
                                        De: <span className="line-through decoration-gray-500">R$ {formatPrice(product.price)}</span>
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <p className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                                            Por: <span className="text-amber-400">R$ {formatPrice(product.sale_price)}</span>
                                        </p>
                                        <span className="inline-flex items-center gap-1 text-sm font-black text-green-400 bg-green-900/40 px-3 py-1 rounded-full border border-green-700/50">
                                            🔥 {discountPercent}% OFF
                                        </span>
                                    </div>
                                    <p className="text-sm text-green-400 font-medium">
                                        Você economiza: <span className="font-bold text-green-300">R$ {formatPrice(savingsAmount)}</span>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-4xl font-black text-white tracking-tight">R$ {formatPrice(product.price)}</p>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-gray-300">
                                <CreditCardIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                <span>{getInstallmentSummary()}</span>
                                {!isLoadingInstallments && installments && installments.length > 0 && (
                                    <button onClick={() => setIsInstallmentModalOpen(true)} className="text-amber-400 font-semibold hover:underline text-base">(ver mais)</button>
                                )}
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
                            <div className="flex flex-wrap items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                                <p className="font-black text-sm text-gray-200">Quantidade</p>
                                <div className="flex items-center border border-gray-700 rounded-xl overflow-hidden bg-black/40">
                                    <button onClick={() => handleQuantityChange(-1)} className="px-4 py-2 text-lg hover:bg-gray-800 transition-colors">-</button>
                                    <span className="px-5 py-2 font-black text-base border-x border-gray-700">{quantity}</span>
                                    <button onClick={() => handleQuantityChange(1)} disabled={isQtyAtMax} className="px-4 py-2 text-lg hover:bg-gray-800 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent">+</button>
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
                                    <button onClick={() => handleAction('buyNow')} className="w-full bg-gradient-to-r from-amber-300 to-amber-500 text-black py-4 rounded-2xl text-base hover:from-amber-200 hover:to-amber-400 transition font-black shadow-lg shadow-amber-900/20 hover:shadow-xl flex items-center justify-center gap-2 active:scale-[0.99]"> 
                                        Comprar Agora 
                                    </button> 
                                    <button onClick={() => handleAction('addToCart')} className="w-full bg-white/5 border border-white/10 text-white py-3.5 rounded-2xl text-base hover:bg-white/10 hover:border-amber-400/40 transition font-black shadow hover:shadow-md flex items-center justify-center gap-2 active:scale-[0.99]"> 
                                        <CartIcon className="h-5 w-5" /> Adicionar ao Carrinho 
                                    </button> 
                                </> 
                            )}
                        </div>

                        <ShippingCalculator items={itemsForShipping} />
                        </div>
                    </div>
                </div>
                
                <div className="mt-16 lg:mt-24 pt-10 border-t border-gray-800">
                    <div className="text-center mb-8">
                        <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-black">Informações do produto</p>
                        <h2 className="text-2xl md:text-3xl font-black text-white mt-2">Conheça todos os detalhes</h2>
                        <p className="text-sm text-gray-500 mt-2 max-w-2xl mx-auto">Conteúdo organizado para ajudar você a escolher com mais segurança.</p>
                    </div>

                    <div className="max-w-6xl mx-auto bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/30">
                        <div className="grid grid-cols-1 lg:grid-cols-12">
                            <div className="lg:col-span-4 bg-black/30 border-b lg:border-b-0 lg:border-r border-gray-800 p-4 md:p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                                    {infoTabs.map(tab => <TabButton key={tab.tabName} tab={tab} />)}
                                </div>
                            </div>

                            <div className="lg:col-span-8 p-6 md:p-8 lg:p-10 min-h-[360px]">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="h-12 w-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20 flex-shrink-0">
                                            {currentInfoTab?.icon}
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-black">{currentInfoTab?.hint}</p>
                                            <h3 className="text-2xl font-black text-white mt-1">{currentInfoTab?.label}</h3>
                                        </div>
                                    </div>
                                    <div className="text-gray-300">
                                        {renderInfoContent()}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>

                {crossSellProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={crossSellProducts} onNavigate={onNavigate} title="Quem comprou, levou também" /></div> )}
                {relatedProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={relatedProducts} onNavigate={onNavigate} title="Pode também gostar de..." /></div> )}

                <div className="mt-16 pt-10 border-t border-gray-800 max-w-5xl mx-auto">
                    <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/30">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-black">Opinião dos clientes</p>
                            <h2 className="text-2xl md:text-3xl font-black mt-2">Avaliações de Clientes</h2>
                            <p className="text-sm text-gray-500 mt-2">Comentários reais de quem comprou este produto.</p>
                        </div>
                        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 min-w-[190px]">
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-black text-white">{avgRating ? avgRating.toFixed(1).replace('.', ',') : '0,0'}</span>
                                <span className="text-sm text-gray-500 mb-1">/ 5</span>
                            </div>
                            <div className="flex text-amber-400 mt-2">
                                {[...Array(5)].map((_, i) => <StarIcon key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? 'fill-current' : 'text-gray-700'}`} isFilled={i < Math.round(avgRating)} />)}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                        {reviews.length > 0 ? (
                            reviews.map((review) => {
                                const reviewImages = parseJsonString(review.images, []);
                                return (
                                    <div key={review.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 relative group hover:border-amber-400/30 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                                                    <UserIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <span className="font-black text-white text-sm">{review.user_name || 'Cliente'}</span>
                                                    <p className="text-[11px] text-green-400 font-bold">Compra verificada</p>
                                                </div>
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

                                        <div className="flex items-center gap-2 mb-2 mt-4">
                                            <div className="flex">{[...Array(5)].map((_, j) => <StarIcon key={j} className={`h-5 w-5 ${j < review.rating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={j < review.rating}/>)}</div>
                                        </div>
                                        
                                        <p className="text-xs text-gray-500 mb-3">
                                            Avaliado no Brasil em {new Date(review.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        
                                        {review.comment && <p className="text-gray-300 text-sm leading-7 break-words mb-4">{review.comment}</p>}
                                        
                                        {reviewImages.length > 0 && (
                                            <div className="flex gap-2 mb-4 overflow-x-auto py-1">
                                                {reviewImages.map((img, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => setReviewLightboxImage(img)}
                                                        className="w-20 h-20 rounded-xl border border-gray-700 overflow-hidden cursor-zoom-in flex-shrink-0 bg-black"
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
                            <div className="md:col-span-2 text-center border border-dashed border-gray-700 rounded-2xl p-10">
                                <p className="text-gray-400 font-bold">Este produto ainda não possui avaliações.</p>
                                <p className="text-gray-600 text-sm mt-1">Seja um dos primeiros clientes a compartilhar sua experiência.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-gradient-to-r from-amber-400/10 to-transparent p-6 rounded-2xl border border-amber-400/20 text-center shadow">
                        <h3 className="font-black text-white mb-2">Comprou este produto?</h3>
                        <p className="text-gray-400 text-sm mb-4">Compartilhe sua opinião para ajudar outros clientes!</p>
                        <p className="text-xs text-gray-500">Você pode avaliar os produtos comprados na seção <a href="#account/orders" onClick={(e) => {e.preventDefault(); onNavigate('account/orders')}} className="text-amber-400 underline hover:text-amber-300">Meus Pedidos</a>.</p>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
