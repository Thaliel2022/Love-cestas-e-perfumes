import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useShop } from '../../contexts/ShopContext';
import { Modal } from '../../components/ui/Modal';
import { getFirstImage } from '../../utils/cloudinary';
import { maskCPF, maskPhone } from '../../utils/validation';
import {
    BoxIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, CreditCardIcon,
    CurrencyDollarIcon, EditIcon, EyeIcon, MapPinIcon, PackageIcon,
    SpinnerIcon, TruckIcon, UserIcon, WhatsappIcon, XCircleIcon, XMarkIcon
} from '../../components/icons';

export const AdminOrders = ({ appName }) => {
    const { pickupConfig } = useShop(); 
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editFormData, setEditFormData] = useState({ status: '', tracking_code: '' });
    const notification = useNotification();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const [showNewOrderNotification, setShowNewOrderNotification] = useState(true);
    const [itemsExpanded, setItemsExpanded] = useState(true);

    const ordersPerPage = 10;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        minPrice: '',
        maxPrice: '',
    });

    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundReason, setRefundReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const allStatuses = [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 
        'Pronto para Retirada', 'Enviado', 'Saiu para Entrega', 
        'Entregue', 'Pagamento Recusado', 'Cancelado'
    ];

    const getShippingDisplay = (method) => {
        const lower = method ? method.toLowerCase() : '';
        if (lower.includes('retirar') || lower.includes('loja')) {
            return { icon: <BoxIcon className="h-4 w-4"/>, label: 'Retirada', fullText: 'Retirada na Loja', classes: 'bg-purple-100 text-purple-700 border border-purple-200' };
        }
        if (lower.includes('motoboy') || lower.includes('delivery') || lower.includes('local')) {
            return { icon: <TruckIcon className="h-4 w-4"/>, label: 'Motoboy', fullText: 'Entrega Local (Moto)', classes: 'bg-blue-100 text-blue-700 border border-blue-200' };
        }
        return { icon: <TruckIcon className="h-4 w-4"/>, label: 'Correios', fullText: method || 'Envio Padrão', classes: 'bg-amber-100 text-amber-700 border border-amber-200' };
    };

    const TimelineDisplay = ({ order }) => {
        const isLocalDelivery = order.shipping_method && (order.shipping_method.toLowerCase().includes('motoboy') || order.shipping_method.toLowerCase().includes('entrega local'));
        const isPickup = order.shipping_method === 'Retirar na loja';
        
        let timelineOrder = [];
        let displayLabels = {};

        if (isLocalDelivery) {
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Saiu para Entrega': 'Em Rota', 'Entregue': 'Entregue' };
        } else if (isPickup) {
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Pronto para Retirada': 'Pronto', 'Entregue': 'Retirado' };
        } else { 
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Enviado': 'Enviado', 'Saiu para Entrega': 'Saiu p/ Entrega', 'Entregue': 'Entregue' };
        }

        if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(order.status)) {
            return (
                <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center gap-3 mb-6">
                     <XCircleIcon className="h-6 w-6 text-red-600" />
                     <div className="text-center">
                         <p className="font-bold text-red-800 text-lg uppercase tracking-wide">{order.status}</p>
                         <p className="text-xs text-red-600">O fluxo deste pedido foi interrompido.</p>
                     </div>
                </div>
            );
        }

        const currentStatusIndex = timelineOrder.indexOf(order.status);
        const progressWidth = currentStatusIndex >= 0 ? (currentStatusIndex / (timelineOrder.length - 1)) * 100 : 0;

        return (
            <div className="w-full py-6 mb-4">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-500 -z-10 rounded-full transition-all duration-500" style={{ width: `${progressWidth}%` }}></div>
                    {timelineOrder.map((statusKey, index) => {
                        const isCompleted = index <= currentStatusIndex;
                        const isCurrent = statusKey === order.status;
                        return (
                            <div key={statusKey} className="flex flex-col items-center group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 ${isCompleted ? 'bg-green-500 border-green-500 scale-110' : 'bg-white border-gray-300'}`}>
                                    {isCompleted && <CheckIcon className="h-4 w-4 text-white stroke-2" />}
                                </div>
                                <p className={`absolute -bottom-8 text-[10px] font-bold text-center w-20 transition-colors ${isCurrent ? 'text-green-700' : (isCompleted ? 'text-gray-600' : 'text-gray-400')}`}>
                                    {displayLabels[statusKey]}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const generateWhatsAppStatusMessage = (status, order, trackingCode) => {
        const customerName = order.user_name;
        const orderId = order.id;
        const firstName = customerName ? customerName.split(' ')[0] : 'Cliente';
        const isPickup = order.shipping_method === 'Retirar na loja';
        const isLocalDelivery = order.shipping_method && (order.shipping_method.toLowerCase().includes('motoboy') || order.shipping_method.toLowerCase().includes('entrega local'));
        
        const orderLink = `${window.location.origin}/#account/orders/${orderId}`;
        const paymentLink = `${window.location.origin}/#order-success/${orderId}`;

        const EMOJI = {
            PACKAGE: String.fromCodePoint(0x1F4E6), TRUCK: String.fromCodePoint(0x1F69A), DOC: String.fromCodePoint(0x1F4C4),
            LINK: String.fromCodePoint(0x1F517), MOTO: String.fromCodePoint(0x1F6F5), CHECK: String.fromCodePoint(0x2705),
            BAGS: String.fromCodePoint(0x1F6CD, 0xFE0F), PIN: String.fromCodePoint(0x1F4CD), CLOCK: String.fromCodePoint(0x23F0),
            MONEY: String.fromCodePoint(0x1F4B8), CROSS: String.fromCodePoint(0x274C), WARN: String.fromCodePoint(0x26A0, 0xFE0F),
            NEW: String.fromCodePoint(0x1F195), PHONE: String.fromCodePoint(0x1F4F1), HOUSE: String.fromCodePoint(0x1F3E0),
            PAY: String.fromCodePoint(0x1F4B3)
        };

        let text = `Olá, *${firstName}*.\n\n`;

        if (status === 'Pendente') {
             text += `🔔 *Lembrete de Pagamento: Pedido #${orderId}*\n\n`;
             text += `Recebemos seu pedido, mas ainda não identificamos a confirmação do pagamento.\n\n`;
             text += `${EMOJI.PAY} *Para realizar o pagamento, acesse:* \n${paymentLink}\n\n`;
             text += `⚠️ *Caso já tenha efetuado o pagamento:* \nPor favor, desconsidere esta mensagem.\n\n`;
             text += `${EMOJI.DOC} *Acompanhe o status aqui:* \n${orderLink}\n\n`;
             text += `Atenciosamente,\n*Equipe ${appName || 'da Loja'}*\n${EMOJI.PHONE} (83) 98737-9573`;
             return text;
        }

        text += `O status do seu pedido *#${orderId}* foi atualizado:\n\n`;

        switch (status) {
            case 'Separando Pedido': text += `${EMOJI.PACKAGE} *Novo Status: Preparado o pedido para envio*\nEstamos separando seus itens com cuidado.`; break;
            case 'Enviado': text += `${EMOJI.TRUCK} *Novo Status: Pedido Enviado*\n${trackingCode ? `\n${EMOJI.DOC} *Rastreio:* ${trackingCode}\n${EMOJI.LINK} *Acompanhe:* https://linketrack.com/track?codigo=${trackingCode}` : ''}`; break;
            case 'Saiu para Entrega':
                if (isLocalDelivery) text += `${EMOJI.MOTO} *Novo Status: Saiu para entrega (Motoboy)*\nO motorista já está a caminho.${trackingCode?.startsWith('http') ? `\n\n${EMOJI.LINK} *Acompanhe em tempo real:*\n${trackingCode}` : ''}`;
                else text += `${EMOJI.MOTO} *Novo Status: Saiu para Entrega*\nSeu pedido está em rota de entrega.`;
                break;
            case 'Entregue': text += `${EMOJI.CHECK} *Novo Status: Pedido entregue*\nConfirmamos a entrega. Esperamos que goste dos produtos!`; break;
            case 'Pronto para Retirada': text += `${EMOJI.BAGS} *Novo Status: Pronto para Retirada*\nJá disponível em nossa loja.`; break;
            case 'Pagamento Aprovado': text += `${EMOJI.MONEY} *Novo Status: Pagamento Aprovado*\nPagamento confirmado. Iniciaremos a separação.`; break;
            case 'Cancelado': text += `${EMOJI.CROSS} *Novo Status: Cancelado*\nO pedido foi cancelado. Se tiver dúvidas, estamos à disposição.`; break;
            case 'Pagamento Recusado': text += `${EMOJI.WARN} *Novo Status: Pagamento Recusado*\nO pagamento não foi autorizado. Tente novamente ou entre em contato.`; break;
            case 'Reembolsado': text += `${EMOJI.MONEY} *Novo Status: Reembolsado*\nO reembolso do seu pedido foi processado.`; break;
            default: text += `${EMOJI.NEW} *Novo Status:* ${status}`;
        }

        if (!['Cancelado', 'Reembolsado', 'Pagamento Recusado'].includes(status)) {
             text += `\n\n--------------------------------\n`;
             if (isPickup) {
                const pAddr = pickupConfig?.address;
                let pAddrStr = 'Endereço não configurado';
                if (typeof pAddr === 'object' && pAddr !== null) {
                    pAddrStr = `Rua: ${pAddr.rua}\nNº: ${pAddr.numero}\nBairro: ${pAddr.bairro}\nCidade: ${pAddr.cidade}\nEstado: ${pAddr.estado || pAddr.uf}\nCEP: ${pAddr.cep}`;
                } else if (typeof pAddr === 'string') {
                    pAddrStr = pAddr;
                }
                const pHours = pickupConfig?.hours || 'Seg a Sáb, 09h-11h30 e 15h-17h30';
                const pInst = pickupConfig?.instructions || 'Documento com foto e número do pedido.';
                const pMaps = pickupConfig?.mapsLink || '';

                text += `${EMOJI.PIN} *Local de Retirada:*\n${pAddrStr}\n`;
                if (pMaps) text += `\n${EMOJI.LINK} *Mapa:* ${pMaps}\n`;
                text += `\n${EMOJI.CLOCK} *Horário:* ${pHours}\n`;
                text += `\n${EMOJI.DOC} *Necessário:* ${pInst}`;
            } else {
                try {
                    const addr = JSON.parse(order.shipping_address);
                    if (addr) {
                        text += `${EMOJI.HOUSE} *Endereço de Entrega:*\n${addr.logradouro}, ${addr.numero}\n${addr.bairro ? `${addr.bairro} - ` : ''}${addr.localidade}/${addr.uf}`;
                    }
                } catch (e) { text += `${EMOJI.TRUCK} Envio para o endereço cadastrado.`; }
            }
        }

        text += `\n\n${EMOJI.LINK} *Detalhes no site:*\n${orderLink}\n\nAtenciosamente,\n*Equipe ${appName || 'da Loja'}*\n${EMOJI.PHONE} (83) 98737-9573`;
        return text;
    };

    const handleManualWhatsAppNotification = () => {
        if (!editingOrder || !editingOrder.user_phone) { notification.show("Telefone do cliente não disponível.", "error"); return; }
        const statusToSend = editFormData.status || editingOrder.status;
        const trackingToSend = editFormData.tracking_code || editingOrder.tracking_code;
        const message = generateWhatsAppStatusMessage(statusToSend, editingOrder, trackingToSend);
        const cleanPhone = editingOrder.user_phone.replace(/\D/g, '');
        if (cleanPhone.length >= 10) window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(message)}`, '_blank');
        else notification.show("Número de telefone do cliente inválido.", "error");
    };
    
    const fetchOrders = useCallback(() => {
        apiService('/orders')
            .then(data => {
                const sortedData = data.sort((a,b) => new Date(b.date) - new Date(a.date));
                setOrders(sortedData);
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recent = sortedData.filter(o => o?.date && !isNaN(new Date(o.date)) && new Date(o.date) > twentyFourHoursAgo);
                setNewOrdersCount(recent.length);
            }).catch(console.error);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    
    useEffect(() => {
        let temp = [...orders];
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            temp = temp.filter(o => String(o.id).includes(lowerTerm) || (o.user_name?.toLowerCase().includes(lowerTerm)) || (o.user_cpf?.includes(lowerTerm)));
        }
        if (filters.status) temp = temp.filter(o => o.status === filters.status);
        if (filters.minPrice) temp = temp.filter(o => Number(o.total) >= Number(filters.minPrice));
        if (filters.maxPrice) temp = temp.filter(o => Number(o.total) <= Number(filters.maxPrice));
        if (filters.startDate) {
            const start = new Date(filters.startDate); start.setHours(0,0,0,0);
            temp = temp.filter(o => new Date(o.date) >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate); end.setHours(23,59,59,999);
            temp = temp.filter(o => new Date(o.date) <= end);
        }
        setFilteredOrders(temp);
        setCurrentPage(1);
    }, [orders, filters, searchTerm]);

    const handleOpenEditModal = async (order) => {
        try {
            const fullDetails = await apiService(`/orders/${order.id}`);
            setEditingOrder(fullDetails);
            setEditFormData({ status: fullDetails.status, tracking_code: fullDetails.tracking_code || '' });
            setItemsExpanded(true); 
            setIsEditModalOpen(true);
        } catch (e) { notification.show("Erro ao abrir pedido.", "error"); }
    };

    const handleSaveOrder = async (e) => {
        e.preventDefault();
        if (!editingOrder) return;
        try {
            await apiService(`/orders/${editingOrder.id}`, 'PUT', editFormData);
            notification.show('Pedido atualizado!');
            fetchOrders();
            setIsEditModalOpen(false);
        } catch(e) { notification.show(e.message, 'error'); }
    };

    const DetailCard = ({ title, icon: Icon, children, className = "" }) => (
        <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm ${className}`}>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                {Icon && <Icon className="h-4 w-4 text-indigo-500"/>}
                {title}
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
                {children}
            </div>
        </div>
    );

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const getStatusLabel = (status, order) => {
        const isLocal = editingOrder?.shipping_method?.toLowerCase().includes('motoboy');
        if (isLocal) {
            if (status === 'Saiu para Entrega') return 'Saiu para entrega (Motoboy)';
            if (status === 'Separando Pedido') return 'Preparado p/ envio';
        }
        return status;
    };

    const handleOpenRefundModal = () => {
        if (!editingOrder) return;
        setRefundAmount(editingOrder.total); setRefundReason('');
        setIsEditModalOpen(false); setIsRefundModalOpen(true);
    };

    const handleRequestRefund = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            if (parseFloat(refundAmount) > parseFloat(editingOrder.total)) throw new Error("O valor do reembolso não pode ser maior que o total do pedido.");
            const result = await apiService('/refunds', 'POST', { order_id: editingOrder.id, amount: refundAmount, reason: refundReason });
            notification.show(result.message);
            setIsRefundModalOpen(false);
            fetchOrders();
        } catch (error) { notification.show(`Erro ao solicitar reembolso: ${error.message}`, 'error'); } 
        finally { setIsProcessing(false); }
    };

    const handleEditFormChange = (e) => setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const applyFilters = useCallback(() => { /* Lógica de filtro reativa já trata */ }, []);
    const clearFilters = () => { setFilters({ startDate: '', endDate: '', status: '', minPrice: '', maxPrice: '' }); setSearchTerm(''); setCurrentPage(1); }

    const getStatusChipClass = (status) => {
        const lowerStatus = status ? status.toLowerCase() : '';
        if (lowerStatus.includes('entregue')) return 'bg-green-100 text-green-800';
        if (lowerStatus.includes('cancelado') || lowerStatus.includes('recusado') || lowerStatus.includes('reembolsado')) return 'bg-red-100 text-red-800';
        if (lowerStatus.includes('pendente')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-blue-100 text-blue-800';
    };

    const renderUpdateOrderForm = () => {
        const isLocalDelivery = editingOrder.shipping_method && (editingOrder.shipping_method.toLowerCase().includes('motoboy') || editingOrder.shipping_method.toLowerCase().includes('entrega local'));
        const isPickup = editingOrder.shipping_method === 'Retirar na loja';
        const canRequestRefund = editingOrder.payment_status === 'approved' && !editingOrder.refund_id && !['Cancelado', 'Reembolsado'].includes(editingOrder.status);

        let availableStatuses = [];
        if (isLocalDelivery) availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue', 'Cancelado', 'Pagamento Recusado'];
        else if (isPickup) availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue', 'Cancelado', 'Pagamento Recusado'];
        else availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue', 'Cancelado', 'Pagamento Recusado'];

        if (!availableStatuses.includes(editingOrder.status)) availableStatuses.push(editingOrder.status);

        return (
            <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 mt-6 lg:mt-0">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
                    <EditIcon className="h-5 w-5 text-indigo-600"/> Atualizar Status e Entrega
                </h4>
                <form onSubmit={handleSaveOrder} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Pedido</label>
                            <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                {availableStatuses.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                            </select>
                        </div>
                        {!isPickup && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    {isLocalDelivery ? "Link de Acompanhamento (Uber/Moto)" : "Código de Rastreio"}
                                </label>
                                <input type="text" name="tracking_code" value={editFormData.tracking_code} onChange={handleEditFormChange} placeholder={isLocalDelivery ? "Cole o link da viagem aqui" : "Ex: AA123456789BR"} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                {isLocalDelivery && <p className="text-xs text-gray-500 mt-1">Link para o cliente acompanhar o motoboy.</p>}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col-reverse md:flex-row justify-between items-center pt-4 border-t border-gray-100 gap-4">
                        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-start">
                            {canRequestRefund ? (
                                <button type="button" onClick={handleOpenRefundModal} className="px-4 py-2.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-bold text-sm flex items-center gap-2 transition-colors flex-grow md:flex-grow-0 justify-center">
                                    <CurrencyDollarIcon className="h-5 w-5"/> Reembolso
                                </button>
                            ) : editingOrder.refund_id ? (
                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 self-center">Reembolso Solicitado</span>
                            ) : null}

                            {editingOrder.user_phone && (
                                <button type="button" onClick={handleManualWhatsAppNotification} className="px-4 py-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-bold text-sm flex items-center gap-2 transition-colors flex-grow md:flex-grow-0 justify-center">
                                    <WhatsappIcon className="h-5 w-5"/> Notificar
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 md:flex-none px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 md:flex-none px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md text-sm transition-colors flex items-center justify-center gap-2">
                                <CheckIcon className="h-5 w-5"/> Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div>
            <AnimatePresence>
                {isRefundModalOpen && editingOrder && (
                    <Modal isOpen={true} onClose={() => setIsRefundModalOpen(false)} title={`Solicitar Reembolso para Pedido #${editingOrder.id}`}>
                        <form onSubmit={handleRequestRefund} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor a Reembolsar</label>
                                <input type="number" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} max={editingOrder.total} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                                <p className="text-xs text-gray-500 mt-1">Valor total do pedido: R$ {Number(editingOrder.total).toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Motivo do Reembolso</label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center gap-2 disabled:bg-amber-300">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {editingOrder && (() => {
                    const isLocalDelivery = editingOrder.shipping_method && (editingOrder.shipping_method.toLowerCase().includes('motoboy') || editingOrder.shipping_method.toLowerCase().includes('entrega local'));
                    const isPickup = editingOrder.shipping_method === 'Retirar na loja';
                    const pAddress = pickupConfig?.address;
                    const isPAddressObj = typeof pAddress === 'object' && pAddress !== null;

                    return (
                        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Pedido #${editingOrder.id}`} size="3xl">
                            <div className="bg-gray-50/50 -m-6 p-4 sm:p-6 pb-24">
                                
                                {/* 1. Timeline */}
                                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Realizado em</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date(editingOrder.date).toLocaleString('pt-BR')}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border self-start sm:self-auto ${
                                            editingOrder.status === 'Entregue' ? 'bg-green-50 text-green-700 border-green-200' :
                                            editingOrder.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {editingOrder.status}
                                        </span>
                                    </div>
                                    <TimelineDisplay order={editingOrder} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* COLUNA DA ESQUERDA: Itens */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            {/* Header do Accordion */}
                                            <div 
                                                className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                                onClick={() => setItemsExpanded(!itemsExpanded)}
                                            >
                                                <h4 className="font-bold text-gray-700 flex items-center gap-2"><BoxIcon className="h-4 w-4"/> Itens do Pedido</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-500">{editingOrder.items?.length || 0} itens</span>
                                                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${itemsExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {/* Conteúdo do Accordion */}
                                            <AnimatePresence initial={false}>
                                                {itemsExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {/* Lista de Itens com Scroll e Badges */}
                                                        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                            {editingOrder.items?.map((item, idx) => {
                                                                let variation = item.variation;
                                                                if (typeof variation === 'string') {
                                                                    try { variation = JSON.parse(variation); } catch(e) {}
                                                                }
                                                                
                                                                const isClothing = !!variation;
                                                                const itemTypeLabel = isClothing ? 'ROUPA' : 'PERFUME';
                                                                const itemTypeClass = isClothing ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200';
                                                                
                                                                return (
                                                                <div key={idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                                                                    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex-shrink-0 p-1">
                                                                        <img src={getFirstImage(item.images)} alt="" className="w-full h-full object-contain"/>
                                                                    </div>
                                                                    <div className="flex-grow">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${itemTypeClass}`}>
                                                                                {itemTypeLabel}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                                                        {variation && (
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                                    Cor: {variation.color}
                                                                                </span>
                                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                                    Tam: {variation.size}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right w-full sm:w-auto">
                                                                        <p className="text-xs text-gray-500">{item.quantity} x R$ {Number(item.price).toFixed(2)}</p>
                                                                        <p className="text-sm font-bold text-gray-900">R$ {(item.quantity * item.price).toFixed(2)}</p>
                                                                    </div>
                                                                </div>
                                                            )})}
                                                        </div>
                                                        <div className="bg-gray-50 p-4 border-t border-gray-200 space-y-2">
                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                <span>Subtotal</span>
                                                                <span>R$ {(Number(editingOrder.total) - Number(editingOrder.shipping_cost) + Number(editingOrder.discount_amount)).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                <span>Frete ({editingOrder.shipping_method})</span>
                                                                <span>R$ {Number(editingOrder.shipping_cost).toFixed(2)}</span>
                                                            </div>
                                                            {Number(editingOrder.discount_amount) > 0 && (
                                                                <div className="flex justify-between text-xs text-green-600 font-medium">
                                                                    <span>Desconto ({editingOrder.coupon_code})</span>
                                                                    <span>- R$ {Number(editingOrder.discount_amount).toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                                <span>Total Geral</span>
                                                                <span>R$ {Number(editingOrder.total).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        
                                        {/* ATUALIZAR PEDIDO (Visível apenas em Desktop) */}
                                        <div className="hidden lg:block">
                                            {renderUpdateOrderForm()}
                                        </div>
                                    </div>

                                    {/* COLUNA DA DIREITA: Informações */}
                                    <div className="space-y-6">
                                        <DetailCard title="Cliente" icon={UserIcon}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                                    {editingOrder.user_name.charAt(0)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-gray-900 leading-tight truncate">{editingOrder.user_name}</p>
                                                    <p className="text-xs text-gray-500">ID: {editingOrder.user_id}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 text-right font-semibold text-gray-500">CPF:</div>
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{maskCPF(editingOrder.user_cpf || '---')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 text-right"><WhatsappIcon className="h-4 w-4 text-green-500 mx-auto"/></div>
                                                    <a href={`https://wa.me/55${editingOrder.user_phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-green-600">
                                                        {maskPhone(editingOrder.user_phone || '')}
                                                    </a>
                                                </div>
                                                {editingOrder.user_phone && (
                                                    <a 
                                                        href={`https://api.whatsapp.com/send?phone=55${editingOrder.user_phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-md hover:bg-green-600 font-bold transition-colors shadow-sm"
                                                        title="Abrir conversa no WhatsApp"
                                                    >
                                                        <WhatsappIcon className="h-4 w-4 text-white"/> Conversar no WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </DetailCard>

                                        <DetailCard title="Entrega" icon={MapPinIcon}>
                                            <div className="mb-3 pb-2 border-b border-gray-100">
                                                <span className="text-xs text-gray-500 block">Método Escolhido</span>
                                                <p className="font-bold text-indigo-700 text-sm">{editingOrder.shipping_method || 'Não informado'}</p>
                                            </div>

                                            {isPickup ? (
                                                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 space-y-1.5">
                                                    <p className="font-bold text-amber-900 mb-1">Retirada na Loja</p>
                                                    {isPAddressObj ? (
                                                        <div className="space-y-0.5 text-amber-900 bg-amber-100/50 p-2 rounded">
                                                            <div className="flex"><span className="font-semibold w-12">Rua:</span> <span>{pAddress.rua}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Nº:</span> <span>{pAddress.numero}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Bairro:</span> <span>{pAddress.bairro}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Cidade:</span> <span>{pAddress.cidade}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Estado:</span> <span>{pAddress.estado || pAddress.uf}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">CEP:</span> <span>{pAddress.cep}</span></div>
                                                        </div>
                                                    ) : (
                                                        <p>{pAddress || 'Endereço não configurado'}</p>
                                                    )}
                                                    
                                                    {pickupConfig?.mapsLink && (
                                                        <a href={pickupConfig.mapsLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold mt-2 inline-block">Ver no Mapa &rarr;</a>
                                                    )}

                                                    {editingOrder.pickup_details && (() => {
                                                        try {
                                                            const p = JSON.parse(editingOrder.pickup_details);
                                                            return <div className="mt-3 pt-2 border-t border-amber-200"><p className="font-semibold text-amber-900">Retirado por:</p><p>{p.personName} (CPF: {p.personCpf})</p></div>
                                                        } catch { return null; }
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="text-xs space-y-2">
                                                    {(() => {
                                                        try {
                                                            const addr = JSON.parse(editingOrder.shipping_address);
                                                            return (
                                                                <>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Rua:</span>
                                                                        <span className="text-gray-800 font-medium">{addr.logradouro}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Nº:</span>
                                                                        <span className="text-gray-800">{addr.numero} {addr.complemento ? `(${addr.complemento})` : ''}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Bairro:</span>
                                                                        <span className="text-gray-800">{addr.bairro}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Cidade:</span>
                                                                        <span className="text-gray-800">{addr.localidade}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Estado:</span>
                                                                        <span className="text-gray-800">{addr.uf}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">CEP:</span>
                                                                        <span className="font-mono text-gray-800 bg-gray-100 px-1 rounded">{addr.cep}</span>
                                                                    </div>
                                                                </>
                                                            );
                                                        } catch { return <p>Endereço inválido</p>; }
                                                    })()}
                                                </div>
                                            )}
                                        </DetailCard>

                                        <DetailCard title="Pagamento" icon={CreditCardIcon}>
                                            <div className="flex flex-col gap-2">
                                                {(() => {
                                                    let details = {};
                                                    try { 
                                                        const parsed = JSON.parse(editingOrder.payment_details); 
                                                        if (parsed && typeof parsed === 'object') details = parsed; 
                                                    } catch {}
                                                    
                                                    return (
                                                        <>
                                                            <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                                {details.method === 'pix' ? 'Pix' : details.method === 'boleto' ? 'Boleto' : details.method === 'credit_card' ? 'Cartão' : 'Outro'}
                                                            </span>
                                                            {details.method === 'credit_card' && (
                                                                <div className="text-xs text-gray-600">
                                                                    <p className="capitalize">{details.card_brand} •••• {details.card_last_four}</p>
                                                                    <p>{details.installments}x de R$ {(Number(editingOrder.total)/details.installments).toFixed(2)}</p>
                                                                </div>
                                                            )}
                                                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                                                <span className="text-xs text-gray-500">Status</span>
                                                                <span className={`text-xs font-bold ${editingOrder.payment_status === 'approved' ? 'text-green-600' : 'text-amber-600'}`}>
                                                                    {editingOrder.payment_status === 'approved' ? 'Aprovado' : 'Pendente'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </DetailCard>
                                    </div>
                                </div>
                                
                                {/* ATUALIZAR PEDIDO (Visível apenas em Mobile - FINAL DO FORMULÁRIO) */}
                                <div className="lg:hidden mt-6">
                                    {renderUpdateOrderForm()}
                                </div>

                            </div>
                        </Modal>
                    );
                })()}
            </AnimatePresence>
            
            <AnimatePresence>
                {newOrdersCount > 0 && showNewOrderNotification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="relative bg-blue-600 text-white p-4 rounded-lg shadow-lg mb-6 flex justify-between items-center"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-6 w-6"/>
                            <span className="font-semibold">
                                Você tem {newOrdersCount} novo(s) pedido(s) nas últimas 24 horas!
                            </span>
                        </div>
                        <button onClick={() => setShowNewOrderNotification(false)} className="p-1 rounded-full hover:bg-blue-500">
                            <XMarkIcon className="h-5 w-5"/>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6">Gerenciar Pedidos</h1>
            {/* ... Filtros ... */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6 space-y-4">
                <h2 className="text-xl font-semibold">Pesquisa Avançada</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" name="orderIdSearch" placeholder="Pesquisar por ID, Nome ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-md col-span-1 md:col-span-2 lg:col-span-4"/>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data de Início"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data Final"/>
                    <input type="number" name="minPrice" placeholder="Preço Mín." value={filters.minPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="number" name="maxPrice" placeholder="Preço Máx." value={filters.maxPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md bg-white">
                        <option value="">Todos os Status</option>
                        {[...new Set(allStatuses)].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                    <button onClick={applyFilters} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Aplicar Filtros</button>
                    <button onClick={clearFilters} className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500">Limpar Filtros</button>
                </div>
            </div>
            
            {/* Tabela de Listagem de Pedidos (COM ESTADO VAZIO) */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden lg:block overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">ID</th>
                                <th className="p-4 font-semibold text-gray-600">Cliente</th>
                                <th className="p-4 font-semibold text-gray-600">Contato</th>
                                <th className="p-4 font-semibold text-gray-600">Envio</th>
                                <th className="p-4 font-semibold text-gray-600">Total</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600">Ações</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {currentOrders.length > 0 ? (
                                currentOrders.map(o => {
                                    const shipInfo = getShippingDisplay(o.shipping_method);
                                    return (
                                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">#{o.id}</span>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(o.date).toLocaleDateString('pt-BR')}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-900">{o.user_name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <UserIcon className="h-3 w-3"/> {maskCPF(o.user_cpf || '')}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            {o.user_phone ? (
                                                <a href={`https://wa.me/55${o.user_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-600 font-bold hover:underline text-sm bg-green-50 px-2 py-1 rounded w-fit">
                                                    <WhatsappIcon className="h-4 w-4"/> {maskPhone(o.user_phone)}
                                                </a>
                                            ) : <span className="text-gray-400 text-xs">Sem contato</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md w-fit ${shipInfo.classes}`}>
                                                {shipInfo.icon}
                                                <span className="text-xs font-bold">{shipInfo.label}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">R$ {Number(o.total).toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => handleOpenEditModal(o)} className="text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50" title="Ver Detalhes">
                                                <EyeIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <PackageIcon className="h-12 w-12 text-gray-300 mb-3" />
                                            <h3 className="text-lg font-bold text-gray-700">Nenhum pedido encontrado</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {searchTerm || filters.status || filters.startDate || filters.endDate || filters.minPrice || filters.maxPrice 
                                                    ? 'Nenhum pedido corresponde aos filtros aplicados.' 
                                                    : 'Sua loja ainda não possui pedidos.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                         </tbody>
                     </table>
                </div>
                
                {/* Mobile List View (Cards Melhorados) */}
                <div className="lg:hidden space-y-4 p-4 bg-gray-50">
                    {currentOrders.length > 0 ? (
                        currentOrders.map(o => {
                            const shipInfo = getShippingDisplay(o.shipping_method);
                            return (
                            <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                {/* Faixa lateral de status */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${o.status === 'Entregue' ? 'bg-green-500' : (o.status === 'Cancelado' ? 'bg-red-500' : 'bg-indigo-500')}`}></div>
                                
                                <div className="pl-3">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-indigo-700 text-lg">#{o.id}</span>
                                                <span className="text-xs text-gray-400">{new Date(o.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <p className="font-bold text-gray-800 text-sm">{o.user_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">R$ {Number(o.total).toFixed(2)}</p>
                                            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                        </div>
                                    </div>

                                    {/* Dados do Cliente (Mobile) */}
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <UserIcon className="h-3.5 w-3.5 text-gray-400"/>
                                            <span className="font-mono">{maskCPF(o.user_cpf || '---')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <WhatsappIcon className="h-3.5 w-3.5 text-green-500"/>
                                            <span className="font-bold text-green-700">{maskPhone(o.user_phone || '---')}</span>
                                        </div>
                                    </div>

                                    {/* Dados de Envio (Mobile) */}
                                    <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${shipInfo.classes}`}>
                                        {shipInfo.icon}
                                        <span className="text-xs font-bold">{shipInfo.fullText}</span>
                                    </div>

                                    <button onClick={() => handleOpenEditModal(o)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md active:scale-95">
                                        <EyeIcon className="h-4 w-4"/> Ver Detalhes do Pedido
                                    </button>
                                </div>
                            </div>
                        )})
                    ) : (
                        <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <PackageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-700">Nenhum pedido encontrado</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {searchTerm || filters.status || filters.startDate || filters.endDate || filters.minPrice || filters.maxPrice 
                                    ? 'Tente limpar os filtros para ver mais resultados.' 
                                    : 'Ainda não há pedidos.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 font-bold text-gray-700">Anterior</button>
                    <span className="text-sm font-medium text-gray-600">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 font-bold text-gray-700">Próxima</button>
                </div>
            )}
        </div>
    );
};
