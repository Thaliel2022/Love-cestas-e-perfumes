import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductReviewForm } from '../components/order/ProductReviewForm';
import { getFirstImage } from '../utils/cloudinary';
import { CheckIcon, PackageIcon, SpinnerIcon } from '../components/icons';

export const MyOrdersListPage = ({ onNavigate }) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();
    const [orderToReview, setOrderToReview] = useState(null);
    const [itemToReview, setItemToReview] = useState(null);

    const fetchOrders = useCallback(() => {
        return apiService('/orders/my-orders')
            .then(data => setOrders(data.sort((a, b) => new Date(b.date) - new Date(a.date))))
            .catch(err => {
                console.error("Falha ao buscar pedidos:", err);
                if (!window.ordersErrorShown) {
                    notification.show("Falha ao buscar pedidos.", 'error');
                    window.ordersErrorShown = true;
                    setTimeout(() => { window.ordersErrorShown = false; }, 5000);
                }
            });
    }, [notification]);

    useEffect(() => {
        setIsLoading(true);
        fetchOrders().finally(() => {
            setIsLoading(false);
        });
    }, [fetchOrders]);

    const handleReviewSuccess = async () => {
        try {
            const newOrders = await apiService('/orders/my-orders');
            const sortedOrders = newOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setOrders(sortedOrders);
            setItemToReview(null);
            setOrderToReview(null);
        } catch (err) {
            console.error("Falha ao recarregar pedidos após avaliação:", err);
            notification.show("Não foi possível atualizar a lista de pedidos.", 'error');
            setItemToReview(null);
            setOrderToReview(null);
        }
    };

    const getStatusChipClass = (status) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('entregue')) return 'bg-[#86efac] text-green-900'; 
        if (lowerStatus.includes('cancelado') || lowerStatus.includes('recusado')) return 'bg-red-200 text-red-800';
        if (lowerStatus.includes('pendente')) return 'bg-[#fde047] text-yellow-900'; 
        return 'bg-blue-200 text-blue-800';
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Pedidos</h2>

            <AnimatePresence>
                {orderToReview && (
                    <Modal isOpen={true} onClose={() => setOrderToReview(null)} title={`Avaliar Itens do Pedido #${orderToReview.id}`}>
                        <div className="space-y-3">
                            {(orderToReview.items || []).map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-4 p-2 bg-gray-100 rounded-md">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <img src={getFirstImage(item.images)} alt={item.name} className="w-12 h-12 object-contain bg-white rounded-md flex-shrink-0"/>
                                        <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {!item.is_reviewed ? (
                                            <button onClick={() => setItemToReview(item)} className="bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-md hover:bg-amber-400 transition">Avaliar</button>
                                        ) : (
                                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon className="h-4 w-4"/> Avaliado</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {itemToReview && (
                    <Modal isOpen={true} onClose={() => { setItemToReview(null); setOrderToReview(null); }} title={`Deixe sua opinião sobre: ${itemToReview.name}`}>
                        <ProductReviewForm 
                            productId={itemToReview.product_id}
                            orderId={orderToReview.id}
                            onReviewSubmitted={handleReviewSuccess}
                        />
                    </Modal>
                )}
            </AnimatePresence>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400 animate-spin" /></div>
            ) : orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map((order, idx) => {
                        const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                        const canReviewOrder = order.status === 'Entregue' && order.items?.some(item => !item.is_reviewed);
                        const hasNotification = !!order.has_unseen_update;

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * idx }}
                                className={`bg-gray-800 p-5 rounded-lg border relative transition-all ${hasNotification ? 'border-amber-500 shadow-lg shadow-amber-900/20' : 'border-gray-700'}`}
                            >
                                {hasNotification && (
                                    <div className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border-2 border-gray-900 z-10 flex items-center gap-1.5 animate-bounce">
                                        <span className="h-1.5 w-1.5 bg-white rounded-full inline-block"></span>
                                        Nova Atualização
                                    </div>
                                )}

                                {firstItem && (
                                    <div className="flex items-center gap-4 border-b border-gray-600 pb-4 mb-4">
                                        <div onClick={() => onNavigate(`product/${firstItem.product_id}`)} className="cursor-pointer flex-shrink-0">
                                            <img src={getFirstImage(firstItem.images)} alt={firstItem.name} className="w-14 h-14 object-contain bg-white rounded p-1"/>
                                        </div>
                                        <div className="flex-grow overflow-hidden">
                                            <p onClick={() => onNavigate(`product/${firstItem.product_id}`)} className="font-bold text-gray-200 text-sm truncate cursor-pointer hover:text-amber-400 transition-colors">
                                                {firstItem.name}
                                            </p>
                                            {order.items.length > 1 && ( <p className="text-xs text-gray-400 mt-1">+ {order.items.length - 1} outro(s) item(ns)</p> )}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-gray-400 mb-1">Pedido</span>
                                            <span className="font-bold text-white text-sm">#{order.id}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-gray-400 mb-1">Data</span>
                                            <span className="font-bold text-white text-sm">{new Date(order.date).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[11px] text-gray-400 mb-1">Status</span>
                                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full w-fit ${getStatusChipClass(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-gray-400 mb-1">Total</span>
                                            <span className="font-bold text-amber-400 text-sm">R$ {Number(order.total).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0 w-full sm:w-auto flex flex-col items-stretch gap-2 mt-2 sm:mt-0">
                                        <button 
                                            onClick={() => onNavigate(`account/orders/${order.id}`)} 
                                            className={`w-full sm:w-auto font-bold px-4 py-2 rounded-md transition shadow-md active:scale-95 text-xs sm:text-sm border ${
                                                (order.status === 'Pendente' || hasNotification)
                                                    ? 'bg-amber-400 text-black border-amber-400 hover:bg-amber-300' 
                                                    : 'bg-[#374151] text-gray-200 border-gray-600 hover:bg-gray-600 hover:text-white'
                                            }`}
                                        >
                                            {order.status === 'Pendente' ? 'Pagar / Ver Detalhes' : hasNotification ? 'Ver Atualização' : 'Ver Detalhes'}
                                        </button>
                                        
                                        {canReviewOrder && (
                                             <button 
                                                onClick={() => setOrderToReview(order)} 
                                                className="w-full sm:w-auto bg-transparent text-amber-400 font-bold px-4 py-2 rounded-md border border-amber-400 hover:bg-amber-400 hover:text-black transition shadow-md active:scale-95 text-xs sm:text-sm"
                                             >
                                                Avaliar Pedido
                                             </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : ( <EmptyState icon={<PackageIcon className="h-12 w-12" />} title="Nenhum pedido encontrado" message="Você ainda não fez nenhuma compra." buttonText="Ver Produtos" onButtonClick={() => onNavigate('products')}/> )}
        </div>
    );
};
