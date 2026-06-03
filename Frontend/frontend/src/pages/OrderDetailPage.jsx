import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiImageUploadService, apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../contexts/ShopContext';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { Modal } from '../components/ui/Modal';
import { TrackingModal } from '../components/order/TrackingModal';
import { OrderStatusTimeline, PickupOrderStatusTimeline, StatusDescriptionModal } from '../components/order/OrderStatus';
import { ProductReviewForm } from '../components/order/ProductReviewForm';
import { getFirstImage } from '../utils/cloudinary';
import { maskPhone } from '../utils/validation';
import {
    ArrowUturnLeftIcon, BoletoIcon, CameraIcon, CheckBadgeIcon,
    CheckCircleIcon, ChevronDownIcon, ClockIcon, CreditCardIcon,
    CurrencyDollarIcon, EloIcon, ExclamationCircleIcon, HomeIcon,
    InstagramIcon, MapPinIcon, MastercardIcon, PackageIcon, PixIcon,
    SpinnerIcon, TruckIcon, UserIcon, VisaIcon, WhatsappIcon, XCircleIcon,
    XMarkIcon
} from '../components/icons';

export const OrderDetailPage = ({ onNavigate, orderId }) => {
    const { user, logout } = useAuth(); 
    const { addToCart, markOrderAsSeen, pickupConfig } = useShop(); 
    const notification = useNotification();
    const confirmation = useConfirmation(); 
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isItemsExpanded, setIsItemsExpanded] = useState(true);
    
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatusDetails, setSelectedStatusDetails] = useState(null);
    
    const [reviewingItem, setReviewingItem] = useState(null);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    
    const [refundCategory, setRefundCategory] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [refundContactPhone, setRefundContactPhone] = useState('');
    const [isProcessingRefund, setIsProcessingRefund] = useState(false);
    const [refundImages, setRefundImages] = useState([]);
    const [isUploadingRefund, setIsUploadingRefund] = useState(false);
    const refundFileInputRef = useRef(null);
    
    const [isRepeatingOrder, setIsRepeatingOrder] = useState(false);

    useEffect(() => {
        if (orderId) {
            markOrderAsSeen(orderId);
        }
    }, [orderId, markOrderAsSeen]);

    const fetchOrderDetails = useCallback(() => {
        setIsLoading(true);
        return apiService(`/orders/my-orders?id=${orderId}&t=${new Date().getTime()}`)
            .then(data => {
                if (data && data.length > 0) {
                    setOrder(data[0]);
                } else {
                    setOrder(null);
                }
            })
            .catch(err => {
                console.error(err);
            })
            .finally(() => setIsLoading(false));
    }, [orderId]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    useEffect(() => {
        if (isRefundModalOpen && user?.phone && !refundContactPhone) {
            setRefundContactPhone(maskPhone(user.phone));
        }
    }, [isRefundModalOpen, user, refundContactPhone]);

    const handleReviewSuccess = () => {
        setReviewingItem(null);
        fetchOrderDetails();
    };

    const handleOpenStatusModal = (statusDetails) => {
        setSelectedStatusDetails(statusDetails);
        setIsStatusModalOpen(true);
    };

    const handleRetryPayment = () => {
        onNavigate(`order-payment/${order.id}`);
    };

    const handleRepeatOrder = async (orderItems) => {
        if (!orderItems || isRepeatingOrder) return;
        setIsRepeatingOrder(true);
        
        let count = 0;
        try {
            for (const item of (Array.isArray(orderItems) ? orderItems : [])) {
                if (item.product_type === 'clothing') {
                    notification.show(`Para adicionar "${item.name}" novamente, por favor, visite a página do produto.`, 'error');
                    continue;
                }
                try {
                    const fullProduct = await apiService(`/products/${item.product_id}`);
                    await addToCart(fullProduct, item.quantity, item.variation);
                    count++;
                } catch (err) {
                    notification.show(`Não foi possível adicionar "${item.name}": Produto esgotado ou indisponível.`, 'error');
                }
            }

            if (count > 0) {
                notification.show(`${count} item(ns) adicionado(s) ao carrinho!`, 'success');
                onNavigate('cart');
            }
        } finally {
            setIsRepeatingOrder(false);
        }
    };
    
    const handleRefundImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const validFiles = [];
        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                notification.show(`A imagem ${file.name} é muito grande (Máx: 5MB).`, "error");
                continue;
            }
            if (!file.type.startsWith('image/')) {
                notification.show(`O arquivo ${file.name} não é uma imagem válida.`, "error");
                continue;
            }
            validFiles.push(file);
        }

        if (refundImages.length + validFiles.length > 3) {
            notification.show("Você pode enviar no máximo 3 fotos.", "error");
            if (refundFileInputRef.current) refundFileInputRef.current.value = '';
            return;
        }

        if (validFiles.length === 0) {
             if (refundFileInputRef.current) refundFileInputRef.current.value = '';
             return;
        }

        setIsUploadingRefund(true);
        try {
            const uploadPromises = validFiles.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            setRefundImages(prev => [...prev, ...newImageUrls]);
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploadingRefund(false);
            if (refundFileInputRef.current) refundFileInputRef.current.value = '';
        }
    };

    const removeRefundImage = (indexToRemove) => {
        setRefundImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleCloseRefundModal = () => {
        setIsRefundModalOpen(false);
        setRefundCategory('');
        setRefundReason('');
        setRefundImages([]);
        setRefundContactPhone('');
    };

    const handleRequestRefund = async (e) => {
        e.preventDefault();

        if (!refundCategory) {
            notification.show("Por favor, selecione o motivo principal.", "error");
            return;
        }
        
        if (order.status === 'Entregue' && (!refundContactPhone || refundContactPhone.replace(/\D/g, '').length < 10)) {
            notification.show("Informe um WhatsApp válido para combinarmos a coleta.", "error");
            return;
        }

        if (order.status === 'Entregue' && refundImages.length === 0) {
            notification.show("Para devoluções de pedidos já entregues, é obrigatório anexar fotos do produto.", "error");
            return;
        }

        setIsProcessingRefund(true);
        try {
            const finalReason = `${refundCategory}: ${refundReason}`;

            const result = await apiService('/refunds/request', 'POST', {
                order_id: order.id,
                reason: finalReason,
                images: refundImages,
                contact_phone: refundContactPhone 
            });
            notification.show(result.message);
            handleCloseRefundModal();
            fetchOrderDetails(); 
        } catch (error) {
            notification.show(`Erro ao solicitar: ${error.message}`, 'error');
        } finally {
            setIsProcessingRefund(false);
        }
    };

    const getCardIcon = (brand) => {
        const lowerBrand = brand ? brand.toLowerCase() : '';
        switch (lowerBrand) {
            case 'visa': return VisaIcon;
            case 'master':
            case 'mastercard': return MastercardIcon;
            case 'elo': return EloIcon;
            default: return CreditCardIcon;
        }
    };
    
    const getRefundStatusInfo = (status) => {
        const statuses = {
            'pending_approval': { text: 'Cancelamento em análise', class: 'text-yellow-400 bg-yellow-900/50', icon: <ClockIcon className="h-4 w-4"/> },
            'processed': { text: 'Reembolso Concluído', class: 'text-green-400 bg-green-900/50', icon: <CheckCircleIcon className="h-4 w-4"/> },
            'denied': { text: 'Solicitação Negada', class: 'text-red-400 bg-red-900/50', icon: <XCircleIcon className="h-4 w-4"/> },
            'failed': { text: 'Falha no Reembolso', class: 'text-red-400 bg-red-900/50', icon: <ExclamationCircleIcon className="h-4 w-4"/> }
        };
        if (order && order.status === 'Entregue' && status === 'pending_approval') {
            statuses['pending_approval'].text = 'Devolução em análise';
        }
        return statuses[status] || { text: `Status: ${status}`, class: 'text-gray-400 bg-gray-700', icon: null };
    };

    const renderPaymentDetails = () => {
        if (!order || !order.payment_method) {
            return <p className="text-sm text-gray-400">Informação de pagamento não disponível.</p>;
        }

        const paymentDetails = order.payment_details ? JSON.parse(order.payment_details) : null;

        if (paymentDetails) {
            if (paymentDetails.method === 'pix') {
                return (
                    <div className="flex items-center gap-3">
                        <PixIcon className="h-7 w-7 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">Pagamento via Pix</p>
                            <p className="text-sm text-gray-400">Confirmado via Mercado Pago.</p>
                        </div>
                    </div>
                );
            }
            if (paymentDetails.method === 'credit_card' && paymentDetails.card_last_four) {
                const CardIconComponent = getCardIcon(paymentDetails.card_brand);
                return (
                     <div className="flex items-center gap-3">
                        <CardIconComponent className="h-8 w-8 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white capitalize">{paymentDetails.card_brand || 'Cartão de Crédito'} final {paymentDetails.card_last_four}</p>
                            <p className="text-sm text-gray-400">
                                {paymentDetails.installments > 1 
                                    ? `Pagamento em ${paymentDetails.installments}x de R$ ${(Number(order.total) / paymentDetails.installments).toFixed(2).replace('.', ',')}`
                                    : 'Pagamento em 1x (à vista)'
                                }
                            </p>
                        </div>
                    </div>
                );
            }
            if (paymentDetails.method === 'boleto') {
                return (
                    <div className="flex items-center gap-3">
                        <BoletoIcon className="h-7 w-7 text-gray-300 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">Boleto Bancário</p>
                            <p className="text-sm text-gray-400">Confirmado via Mercado Pago.</p>
                        </div>
                    </div>
                );
            }
        }

        return (
            <div className="flex items-center gap-3">
                <CreditCardIcon className="h-7 w-7 text-gray-300 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-white">Pagamento via Mercado Pago</p>
                    <p className="text-sm text-gray-400 capitalize">{paymentDetails?.method || 'Detalhes não disponíveis'}</p>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400 animate-spin"/></div>;
    
    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[60vh]">
                <div className="bg-gray-900 p-6 rounded-full mb-6 border-2 border-gray-800 shadow-xl">
                    <ExclamationCircleIcon className="h-16 w-16 text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Pedido não encontrado</h2>
                <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
                    Não conseguimos localizar este pedido. Isso pode acontecer se você estiver logado em uma conta diferente da que realizou a compra.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <button 
                        onClick={() => { logout(); onNavigate('login'); }} 
                        className="flex-1 px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <UserIcon className="h-5 w-5"/>
                        Sair e Trocar de Conta
                    </button>
                    <button 
                        onClick={() => onNavigate('home')} 
                        className="flex-1 px-6 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    const isPickupOrder = order.shipping_method === 'Retirar na loja';
    const isLocalDelivery = order.shipping_method && order.shipping_method.includes('Motoboy'); 
    const pickupDetails = isPickupOrder && order.pickup_details ? JSON.parse(order.pickup_details) : null;
    const safeHistory = Array.isArray(order.history) ? order.history : [];
    const shippingAddress = !isPickupOrder && order.shipping_address ? JSON.parse(order.shipping_address) : null;
    const subtotal = (Number(order.total) || 0) - (Number(order.shipping_cost) || 0) + (Number(order.discount_amount) || 0);
    
    // === LÓGICA DE REEMBOLSO REFINADA ===
    const isPaymentApproved = order.payment_status === 'approved';
    const cancellableStatuses = ['Pagamento Aprovado', 'Separando Pedido', 'Entregue'];
    const isStatusValid = cancellableStatuses.includes(order.status.trim());
    
    const isRefundDenied = order.refund_status === 'denied';
    const noActiveRefund = !order.refund_id || isRefundDenied;
    const refundDeniedReason = order.refund_notes || "Motivo não informado pelo administrador."; 

    // Prazo de 7 dias rigoroso
    const orderDate = new Date(order.date);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 7);
    const isWithin7Days = orderDate >= limitDate;
    
    // A opção de solicitar só aparece se:
    // 1. Pagamento aprovado no Mercado Pago
    // 2. O pedido está num status válido
    // 3. Não tem reembolso aberto ou o anterior foi negado
    // 4. Se já foi Entregue, tem que estar dentro dos 7 dias do CDC
    const canRequest = isPaymentApproved && isStatusValid && noActiveRefund && (order.status !== 'Entregue' || isWithin7Days);
        
    const actionText = order.status === 'Entregue' ? 'Devolver Produto' : 'Cancelar Pedido';
    const refundInfo = order.refund_id ? getRefundStatusInfo(order.refund_status) : null;
    const isOrderInactive = ['Cancelado', 'Reembolsado', 'Pagamento Recusado'].includes(order.status);

    const pAddress = pickupConfig?.address;
    const isPAddressObj = typeof pAddress === 'object' && pAddress !== null;
    const pickupMapsLink = pickupConfig?.mapsLink ? String(pickupConfig.mapsLink).replace(/&amp;/g, '&') : '';

    const LocalDeliveryTimeline = ({ history, currentStatus, onStatusClick }) => {
        const displayLabels = {
            'Pendente': 'Pedido Pendente',
            'Pagamento Aprovado': 'Pagamento Aprovado',
            'Separando Pedido': 'Preparado o pedido para envio',
            'Saiu para Entrega': 'Saiu para entrega (Motoboy)',
            'Entregue': 'Pedido entregue',
            'Reembolsado': 'Pedido Reembolsado',
            'Cancelado': 'Pedido Cancelado',
            'Pagamento Recusado': 'Pagamento Recusado'
        };

        const STATUS_DEFINITIONS = {
            'Pendente': { icon: <ClockIcon className="h-6 w-6" />, color: 'amber', title: displayLabels['Pendente'], description: 'Aguardando confirmação do pagamento.' },
            'Pagamento Aprovado': { icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green', title: displayLabels['Pagamento Aprovado'], description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido.' },
            'Separando Pedido': { icon: <PackageIcon className="h-6 w-6" />, color: 'blue', title: displayLabels['Separando Pedido'], description: 'Seu pedido está sendo separado e embalado.' },
            'Saiu para Entrega': { icon: <TruckIcon className="h-6 w-6" />, color: 'blue', title: displayLabels['Saiu para Entrega'], description: 'O motoboy/Uber saiu com seu pedido.' },
            'Entregue': { icon: <HomeIcon className="h-6 w-6" />, color: 'green', title: displayLabels['Entregue'], description: 'Pedido entregue com sucesso!' },
            'Reembolsado': { icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray', title: displayLabels['Reembolsado'], description: 'O valor foi estornado.' },
            'Cancelado': { icon: <XCircleIcon className="h-6 w-6" />, color: 'red', title: displayLabels['Cancelado'], description: 'Pedido cancelado.' },
            'Pagamento Recusado': { icon: <XCircleIcon className="h-6 w-6" />, color: 'red', title: displayLabels['Pagamento Recusado'], description: 'Pagamento não autorizado.' }
        };

        const colorClasses = {
            amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
            green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
            blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
            red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
            gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
        };

        if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
            const specialStatus = STATUS_DEFINITIONS[currentStatus];
            const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
            
            return (
                <div className="p-4 bg-gray-800 rounded-lg">
                    <div onClick={() => onStatusClick && onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                            {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                        </div>
                        <div>
                            <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                            <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                        </div>
                    </div>
                </div>
            );
        }

        const timelineOrder = [
            'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue'
        ];

        const historyMap = new Map((Array.isArray(history) ? history : []).filter(h => h.status).map(h => [h.status, h]));
        const currentStatusIndex = timelineOrder.indexOf(currentStatus);

        return (
            <div className="w-full">
                <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                    {timelineOrder.map((statusKey, index) => {
                        const statusInfo = historyMap.get(statusKey);
                        const isStepActive = index <= currentStatusIndex;
                        const definition = STATUS_DEFINITIONS[statusKey];
                        if (!definition) return null;
                        const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                        
                        return (
                            <React.Fragment key={statusKey}>
                                <div 
                                    className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isStepActive ? 'animate-pulse' : ''}`}>
                                        {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                    </div>
                                    <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{displayLabels[statusKey]}</p>
                                    {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className="md:hidden flex flex-col">
                    {timelineOrder.map((statusKey, index) => {
                        const statusInfo = historyMap.get(statusKey);
                        const isStepActive = index <= currentStatusIndex;
                        const definition = STATUS_DEFINITIONS[statusKey];
                        if (!definition) return null;
                        const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                        return (
                            <div key={statusKey} className="flex">
                                <div className="flex flex-col items-center mr-4">
                                    <div 
                                        className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                        onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                        {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                    </div>
                                    {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                                </div>
                                <div 
                                    className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    <p className={`font-semibold transition-all ${currentClasses.text}`}>{displayLabels[statusKey]}</p>
                                    {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <>
            <TrackingModal isOpen={isTrackingModalOpen} onClose={() => setIsTrackingModalOpen(false)} order={order} />
            <StatusDescriptionModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} details={selectedStatusDetails} />
            
            <AnimatePresence>
                {reviewingItem && (
                    <Modal isOpen={true} onClose={() => setReviewingItem(null)} title={`Avaliar: ${reviewingItem.name}`}>
                        <ProductReviewForm productId={reviewingItem.product_id} orderId={order.id} onReviewSubmitted={handleReviewSuccess} />
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isRefundModalOpen && (
                    <Modal isOpen={true} onClose={handleCloseRefundModal} title={`Solicitar ${actionText} do Pedido #${order.id}`}>
                        <form onSubmit={handleRequestRefund} className="space-y-4 text-gray-800">
                             
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Motivo Principal <span className="text-red-500">*</span></label>
                                <select 
                                    value={refundCategory} 
                                    onChange={(e) => setRefundCategory(e.target.value)} 
                                    required 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                                >
                                    <option value="">Selecione uma opção...</option>
                                    <option value="Produto danificado">Produto danificado ou quebrado na entrega</option>
                                    <option value="Produto errado">Recebi um item diferente do que comprei</option>
                                    <option value="Arrependimento">Arrependimento / Desisti da compra (Prazo 7 dias)</option>
                                    <option value="Atraso">Atraso excessivo na entrega</option>
                                    <option value="Outro">Outro motivo</option>
                                </select>
                            </div>

                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Detalhes do Motivo <span className="text-red-500">*</span></label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} required rows="3" placeholder="Explique detalhadamente o motivo da sua solicitação..." className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-amber-400 outline-none text-sm"></textarea>
                            </div>
                            
                            {/* CAMPO DE TELEFONE OBRIGATÓRIO PARA DEVOLUÇÃO LOCAL */}
                            {order.status === 'Entregue' && (isLocalDelivery || isPickupOrder) && (
                                <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                                    <label className="block text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                                        <WhatsappIcon className="h-4 w-4" /> 
                                        WhatsApp para contato <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-blue-700 mb-3">
                                        Como a entrega foi local, nossa equipe entrará em contato para combinar {isPickupOrder ? 'a devolução na loja' : 'a coleta via motoboy'}.
                                    </p>
                                    <input 
                                        type="text" 
                                        value={refundContactPhone} 
                                        onChange={e => setRefundContactPhone(maskPhone(e.target.value))} 
                                        required 
                                        placeholder="(83) 90000-0000" 
                                        className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold"
                                    />
                                </div>
                            )}

                            <div className={`p-4 border rounded-lg ${order.status === 'Entregue' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Fotos do Produto {order.status === 'Entregue' && <span className="text-red-500">* (Obrigatório)</span>}
                                </label>
                                <p className="text-xs text-gray-600 mb-3">
                                    {order.status === 'Entregue' 
                                        ? 'Como você já recebeu o pedido, é obrigatório enviar fotos nítidas (ex: caixa amassada, defeito do produto) para aprovação.' 
                                        : 'Opcional. Envie fotos caso ajude a explicar o motivo.'} (Máx 3 fotos).
                                </p>
                                <div className="flex gap-3 overflow-x-auto py-2">
                                    {refundImages.map((img, idx) => (
                                        <div key={idx} className="relative w-20 h-20 flex-shrink-0 rounded-lg border border-gray-300 shadow-sm group">
                                            <img src={img} alt={`Foto ${idx+1}`} className="w-full h-full object-cover rounded-lg" />
                                            <button 
                                                type="button" 
                                                onClick={() => removeRefundImage(idx)} 
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                            >
                                                <XMarkIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {refundImages.length < 3 && (
                                        <button 
                                            type="button" 
                                            onClick={() => refundFileInputRef.current.click()} 
                                            disabled={isUploadingRefund}
                                            className="w-20 h-20 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50 bg-white"
                                        >
                                            {isUploadingRefund ? <SpinnerIcon className="h-6 w-6"/> : <CameraIcon className="h-6 w-6"/>}
                                            <span className="text-[10px] font-bold mt-1">Add Foto</span>
                                        </button>
                                    )}
                                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple ref={refundFileInputRef} onChange={handleRefundImageUpload} className="hidden" />
                                </div>
                            </div>

                            <div className="bg-gray-100 p-3 rounded-md text-sm border border-gray-200">
                                <p><strong>Valor a ser devolvido:</strong> R$ {Number(order.total).toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-1">O valor será estornado no mesmo método de pagamento da compra após a aprovação da devolução.</p>
                            </div>
                             <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-2">
                                <button type="button" onClick={handleCloseRefundModal} className="px-4 py-2 bg-white border border-gray-300 rounded-md font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" disabled={isProcessingRefund || isUploadingRefund} className="px-6 py-2 bg-amber-500 text-black rounded-md flex items-center gap-2 font-bold hover:bg-amber-400 shadow-md disabled:bg-gray-300 disabled:text-gray-500 transition-colors">
                                    {isProcessingRefund && <SpinnerIcon className="h-5 w-5" />}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            
            <div>
                <button onClick={() => onNavigate('account/orders')} className="text-sm text-amber-400 hover:underline flex items-center mb-6 w-fit transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Voltar para todos os pedidos
                </button>
                <div className="border border-gray-800 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                        <div>
                            <p className="text-2xl font-bold">Detalhes do Pedido <span className="text-amber-400">#{order.id}</span></p>
                            <p className="text-sm text-gray-400">{new Date(order.date).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    {order.status === 'Pendente' && (
                        <div className="my-4 p-5 bg-gray-900 border border-gray-700 rounded-xl text-center shadow-lg">
                            <p className="font-bold text-amber-400 mb-2 text-xl">Pagamento Pendente</p>
                            <p className="text-gray-400 text-sm mb-5 max-w-md mx-auto">
                                Seu pedido está reservado! Finalize o pagamento para garantirmos o estoque e o envio dos seus produtos.
                            </p>
                            <button 
                                onClick={handleRetryPayment} 
                                className="bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold px-10 py-3.5 rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all shadow-md active:scale-95 flex items-center justify-center mx-auto gap-2"
                            >
                                <CreditCardIcon className="h-5 w-5" /> Ir para o Pagamento
                            </button>
                        </div>
                    )}
                    
                    {/* AVISO DE REEMBOLSO NEGADO COM EXPLICAÇÃO DO ADMIN */}
                    {isRefundDenied && (
                        <div className="my-6 p-5 bg-red-950/60 border border-red-600 rounded-lg animate-fade-in shadow-lg shadow-red-900/30">
                            <div className="flex items-start gap-3">
                                <ExclamationCircleIcon className="h-7 w-7 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-red-200 text-lg mb-2">Solicitação de Devolução Negada</h4>
                                    <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                                        Nossa equipe analisou sua solicitação e, infelizmente, ela não pôde ser aprovada no momento.
                                    </p>
                                    <div className="bg-black/40 p-4 rounded-md text-sm text-white border border-red-500/30 mb-3">
                                        <strong className="text-red-400 block mb-1">Motivo da recusa:</strong>
                                        <span className="italic">"{refundDeniedReason}"</span>
                                    </div>
                                    {/* MENSAGEM CLARA EXPLICANDO QUE PODE ENVIAR DE NOVO */}
                                    <p className="text-xs text-gray-400">
                                        Se você acredita que houve um erro ou deseja fornecer mais detalhes/fotos nítidas, clique em <strong>"Nova Solicitação"</strong> abaixo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="my-6">
                        {isLocalDelivery ? (
                            <LocalDeliveryTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                        ) : isPickupOrder ? (
                            <PickupOrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} /> 
                        ) : (
                            <OrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-200 mb-3">Resumo Financeiro</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-300">
                                    <span>Subtotal dos produtos</span>
                                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between text-gray-300">
                                    <span>Frete</span>
                                    <span>R$ {Number(order.shipping_cost).toFixed(2).replace('.', ',')}</span>
                                </div>
                                {Number(order.discount_amount) > 0 && (
                                    <div className="flex justify-between text-green-400">
                                        <span>Desconto ({order.coupon_code || 'Cupom'})</span>
                                        <span>- R$ {Number(order.discount_amount).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-white font-bold text-base border-t border-gray-700 pt-2 mt-2">
                                    <span>Total</span>
                                    <span className="text-amber-400">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-200 mb-2">Forma de Pagamento</h3>
                            {renderPaymentDetails()}
                        </div>
                    </div>

                    {isPickupOrder ? (
                        <div className="my-4 p-4 bg-gray-800 rounded-md text-sm space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPinIcon className="h-5 w-5 text-amber-500" />
                                <strong>Informações para Retirada:</strong>
                            </div>
                            
                            {isPAddressObj ? (
                                <div className="space-y-1 bg-gray-900 p-3 rounded-md border border-gray-700 mt-2">
                                    <div className="flex"><span className="font-semibold text-gray-500 w-16">Rua:</span> <span className="text-gray-200">{pAddress.rua}</span></div>
                                    <div className="flex"><span className="font-semibold text-gray-500 w-16">Nº:</span> <span className="text-gray-200">{pAddress.numero}</span></div>
                                    <div className="flex"><span className="font-semibold text-gray-500 w-16">Bairro:</span> <span className="text-gray-200">{pAddress.bairro}</span></div>
                                    <div className="flex"><span className="font-semibold text-gray-500 w-16">Cidade:</span> <span className="text-gray-200">{pAddress.cidade}</span></div>
                                    <div className="flex"><span className="font-semibold text-gray-500 w-16">Estado:</span> <span className="text-gray-200">{pAddress.estado || pAddress.uf}</span></div>
                                    <div className="flex"><span className="font-semibold text-gray-500 w-16">CEP:</span> <span className="text-gray-200 font-mono">{pAddress.cep}</span></div>
                                </div>
                            ) : (
                                <p className="text-gray-300 mt-2">{pAddress || 'Endereço não configurado'}</p>
                            )}

                            {pickupMapsLink && (
                                <a href={pickupMapsLink} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 hover:underline text-xs font-bold mt-1 inline-flex items-center gap-1 bg-amber-400/10 px-3 py-1.5 rounded-md border border-amber-400/30 transition-all">
                                    Ver localização no mapa <ArrowUturnLeftIcon className="h-3 w-3 rotate-180" />
                                </a>
                            )}
                            
                            <p className="pt-2 border-t border-gray-700 mt-3"><strong>Horário:</strong> {pickupConfig?.hours || 'Seg a Sáb, 09h-11h30 e 15h-17h30'}</p>
                            {pickupDetails?.personName && <p><strong>Pessoa autorizada:</strong> {pickupDetails.personName}</p>}
                            <p className="text-amber-300 text-xs mt-2 font-semibold bg-amber-900/20 p-2 rounded">Aguarde a notificação "Pronto para Retirada" e apresente documento com foto.</p>
                        </div>
                    ) : (
                        <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                            <p className="font-bold text-base mb-2">Endereço de Entrega:</p>
                            {shippingAddress ? (
                                <div className="space-y-1">
                                    <p><span className="font-semibold text-gray-400">Rua:</span> {shippingAddress.logradouro}</p>
                                    <p><span className="font-semibold text-gray-400">Nº:</span> {shippingAddress.numero} {shippingAddress.complemento && `- ${shippingAddress.complemento}`}</p>
                                    <p><span className="font-semibold text-gray-400">Bairro:</span> {shippingAddress.bairro}</p>
                                    <p><span className="font-semibold text-gray-400">Cidade:</span> {shippingAddress.localidade} - {shippingAddress.uf}</p>
                                    <p><span className="font-semibold text-gray-400">CEP:</span> {shippingAddress.cep}</p>
                                </div>
                            ) : <p>Endereço não informado.</p>}
                            
                            {order.tracking_code && !isOrderInactive && (
                                <div className="mt-4 pt-3 border-t border-gray-700">
                                    {isLocalDelivery ? (
                                        <a 
                                            href={order.tracking_code} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="block w-full text-center bg-black text-white font-bold py-3 rounded-md hover:bg-gray-900 border border-gray-600 transition-colors animate-pulse"
                                        >
                                            🚗 Acompanhar entrega em tempo real
                                        </a>
                                    ) : (
                                        <p className="font-mono text-amber-400"><strong>Cód. Rastreio:</strong> {order.tracking_code}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border-t border-gray-800 pt-4">
                        <button onClick={() => setIsItemsExpanded(!isItemsExpanded)} className="flex justify-between items-center w-full mb-2 text-left">
                            <h4 className="font-bold text-lg text-gray-200">Itens do Pedido ({(order.items || []).length})</h4>
                            <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isItemsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {isItemsExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="space-y-3 pt-2">
                                        {(order.items || []).map(item => (
                                            <div key={`${item.product_id}-${item.variation?.id || 'base'}`} className="bg-gray-800 p-3 rounded-md">
                                                <div className="flex items-center text-sm">
                                                    <div onClick={() => onNavigate(`product/${item.product_id}`)} className="cursor-pointer flex-shrink-0">
                                                        <img src={getFirstImage(item.images)} alt={item.name} className="h-16 w-16 object-contain mr-4 bg-white rounded"/>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-semibold text-white cursor-pointer hover:text-amber-400" onClick={() => onNavigate(`product/${item.product_id}`)}>{item.quantity}x {item.name}</p>
                                                        {item.variation && <span className="text-xs block text-gray-400">{item.variation.color} / {item.variation.size}</span>}
                                                        <p className="text-gray-300 mt-1">R$ {Number(item.price).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-800 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button onClick={() => handleRepeatOrder(order.items)} disabled={isRepeatingOrder} className="bg-amber-500 text-black text-sm font-bold px-4 py-1.5 rounded-md hover:bg-amber-400 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {isRepeatingOrder ? <><SpinnerIcon className="h-4 w-4"/> Proc...</> : 'Repetir Pedido'}
                            </button>
                            
                            {isPickupOrder ? (
                                <button onClick={() => setIsTrackingModalOpen(true)} className="bg-gray-800 text-white text-sm font-bold px-4 py-1.5 rounded-md hover:bg-gray-700 transition-colors">Ver Status da Retirada</button>
                            ) : (
                                order.tracking_code && !isLocalDelivery && !isOrderInactive && <button onClick={() => setIsTrackingModalOpen(true)} className="bg-gray-800 text-white text-sm font-bold px-4 py-1.5 rounded-md hover:bg-gray-700 transition-colors">Rastrear Pedido</button>
                            )}

                            {/* EXIBE O BOTÃO SOMENTE SE CANREQUEST FOR VERDADEIRO */}
                            {canRequest && (
                                <button onClick={() => setIsRefundModalOpen(true)} className="bg-red-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-red-700 font-bold shadow-lg transform hover:-translate-y-0.5 transition-transform">
                                    {isRefundDenied ? 'Nova Solicitação' : `Solicitar ${actionText}`}
                                </button>
                            )}

                            {/* OCULTA O BADGE DE "SOLICITAÇÃO NEGADA" SE O CLIENTE PUDER PEDIR DE NOVO (Para não poluir a tela com info repetida) */}
                            {refundInfo && (!isRefundDenied || !canRequest) && (
                                <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md ${refundInfo.class}`}>
                                    {refundInfo.icon}
                                    <span>{refundInfo.text}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-gray-400 w-full sm:w-auto">
                            <span>Dúvidas?</span>
                            <a href={`https://wa.me/5583987379573?text=Olá,%20gostaria%20de%20falar%20sobre%20meu%20pedido%20%23${order.id}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors" title="Contato via WhatsApp"><WhatsappIcon className="h-4 w-4" /></a>
                            <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors" title="Contato via Instagram"><InstagramIcon className="h-4 w-4" /></a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
