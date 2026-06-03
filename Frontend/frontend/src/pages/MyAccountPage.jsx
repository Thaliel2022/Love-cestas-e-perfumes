import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useShop } from '../contexts/ShopContext';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { AddressForm } from '../components/checkout/CheckoutAddress';
import { OrderDetailPage } from './OrderDetailPage';
import { MyOrdersListPage } from './MyOrdersListPage';
import { OrderStatusTimeline, PickupOrderStatusTimeline, StatusDescriptionModal } from '../components/order/OrderStatus';
import { ProductReviewForm } from '../components/order/ProductReviewForm';
import { TrackingModal } from '../components/order/TrackingModal';
import { getFirstImage } from '../utils/cloudinary';
import {
    CheckIcon, EditIcon, ExclamationCircleIcon, EyeIcon, EyeOffIcon,
    FingerprintIcon, InstagramIcon, MapPinIcon, PackageIcon, PlusIcon,
    ShieldCheckIcon, SpinnerIcon, TrashIcon, UserIcon, WhatsappIcon
} from '../components/icons';

export const MyAccountPage = ({ onNavigate, path }) => {
    const { user, logout } = useAuth();
    const { orderNotificationCount } = useShop(); 
    
    const pathParts = (path || 'orders').split('/');
    const activeTab = pathParts[0];
    const detailId = pathParts[1];

    const handleNavigation = (tab) => {
        onNavigate(`account/${tab}`);
    };

    const tabs = [
        { 
            key: 'orders', 
            label: 'Meus Pedidos', 
            icon: <PackageIcon className="h-5 w-5"/>,
            notification: orderNotificationCount 
        },
        { key: 'addresses', label: 'Meus Endereços', icon: <MapPinIcon className="h-5 w-5"/> },
        { key: 'profile', label: 'Meus Dados', icon: <UserIcon className="h-5 w-5"/> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'addresses':
                return <MyAddressesSection />;
            case 'profile':
                return <MyProfileSection user={user} />;
            case 'orders':
            default:
                if (detailId && !isNaN(detailId)) {
                    return <OrderDetailPage orderId={detailId} onNavigate={onNavigate} />;
                }
                return <MyOrdersListPage onNavigate={onNavigate} />;
        }
    };

    return (
        // CORREÇÃO: Removido o 'min-h-screen' que criava o buraco preto no desktop
        <div className="bg-black text-white pt-8 pb-28 sm:pt-12 sm:pb-12">
            <div className="container mx-auto px-4">
                {!detailId && <h1 className="text-3xl md:text-4xl font-bold mb-8">Minha Conta</h1>}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1">
                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-2">
                            {tabs.map(tab => (
                                <button 
                                    key={tab.key} 
                                    onClick={() => handleNavigation(tab.key)} 
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-left transition-colors ${activeTab === tab.key ? 'bg-amber-500 text-black font-bold' : 'hover:bg-gray-800'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </div>
                                    {tab.notification > 0 && (
                                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                            {tab.notification}
                                        </span>
                                    )}
                                </button>
                            ))}
                            <button onClick={() => { logout(); onNavigate('home'); }} className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors hover:bg-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span>Sair</span>
                            </button>
                        </div>
                    </aside>
                    <main className="lg:col-span-3">
                        <div className="bg-gray-900 p-4 sm:p-6 rounded-lg border border-gray-800">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

const MyOrdersSection = ({ onNavigate }) => {
    const { addToCart, pickupConfig } = useShop();
    const notification = useNotification();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderForTracking, setOrderForTracking] = useState(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatusDetails, setSelectedStatusDetails] = useState(null);
    const [orderToReview, setOrderToReview] = useState(null);
    const [itemToReview, setItemToReview] = useState(null);
    
    // NOVO ESTADO: Controle para evitar duplo clique
    const [isRepeatingOrder, setIsRepeatingOrder] = useState(false);

    const fetchOrders = useCallback(() => {
        return apiService('/orders/my-orders')
            .then(data => setOrders(data))
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

    const handleRetryPayment = (orderId) => {
        onNavigate(`account/orders/${orderId}`);
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

    const handleOpenStatusModal = (statusDetails) => {
        setSelectedStatusDetails(statusDetails);
        setIsStatusModalOpen(true);
    };

    const pickupAddress = pickupConfig?.address;
    const isPickupAddressObj = typeof pickupAddress === 'object' && pickupAddress !== null;
    const pickupAddressText = isPickupAddressObj
        ? [
            pickupAddress.rua,
            pickupAddress.numero,
            pickupAddress.bairro,
            pickupAddress.cidade,
            pickupAddress.estado || pickupAddress.uf,
            pickupAddress.cep
        ].filter(Boolean).join(', ')
        : (pickupAddress || 'Endereço não configurado');

    const handleReviewSuccess = async () => {
        try {
            const newOrders = await apiService('/orders/my-orders');
            setOrders(newOrders);
            setItemToReview(null);
            setOrderToReview(null);
        } catch (err) {
            console.error("Falha ao recarregar pedidos após avaliação:", err);
            notification.show("Não foi possível atualizar a lista de pedidos.", 'error');
            setItemToReview(null);
            setOrderToReview(null);
        }
    };
    
    if (isLoading) return <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400"/></div>;

    return (
        <>
            <TrackingModal isOpen={!!orderForTracking} onClose={() => setOrderForTracking(null)} order={orderForTracking} />
            <StatusDescriptionModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} details={selectedStatusDetails} />
            
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

            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Pedidos</h2>
            {orders.length > 0 ? (
                <div className="space-y-6">
                    {orders.map(order => {
                        const isPickupOrder = order.shipping_method === 'Retirar na loja';
                        let pickupDetails = null;
                        if (isPickupOrder && typeof order.pickup_details === 'string') {
                            try {
                                pickupDetails = JSON.parse(order.pickup_details);
                            } catch (e) {
                                console.error("Erro ao parsear detalhes da retirada:", e);
                                pickupDetails = {};
                            }
                        }

                        const safeHistory = Array.isArray(order.history) ? order.history : [];
                        const orderDate = new Date(order.date);
                        const formattedDate = !isNaN(orderDate) ? orderDate.toLocaleString('pt-BR') : 'Data indisponível';
                        const canReviewOrder = order.status === 'Entregue' && order.items?.some(item => !item.is_reviewed);

                        return (
                            <div key={order.id} className="border border-gray-800 rounded-lg p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                                    <div>
                                        <p className="text-lg">Pedido <span className="font-bold text-amber-400">#{order.id}</span></p>
                                        <p className="text-sm text-gray-400">{formattedDate}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <p className="text-left sm:text-right"><strong>Total:</strong> <span className="text-amber-400 font-bold text-lg">R$ {Number(order.total).toFixed(2)}</span></p>
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

                                {order.status === 'Pendente' && (
                                    <div className="my-4 p-4 bg-amber-900/50 border border-amber-700 rounded-lg text-center">
                                        <p className="font-semibold text-amber-300 mb-3">Este pedido está aguardando pagamento.</p>
                                        <button
                                            onClick={() => handleRetryPayment(order.id)}
                                            className="bg-amber-400 text-black font-bold px-8 py-2 rounded-md hover:bg-amber-300 transition-all flex items-center justify-center mx-auto"
                                        >
                                            Pagar Agora
                                        </button>
                                    </div>
                                )}

                                <div className="my-6">
                                    {isPickupOrder ? (
                                        <PickupOrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                                    ) : (
                                        <OrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                                    )}
                                </div>
                                
                                {isPickupOrder ? (
                                    <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                                        <p><strong>Informações para Retirada:</strong></p>
                                        <p><strong>Endereço:</strong> {pickupAddressText}</p>
                                        {pickupConfig?.mapsLink && (
                                            <a href={pickupConfig.mapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex text-amber-400 hover:text-amber-300 hover:underline text-xs font-bold">
                                                Ver localização no mapa
                                            </a>
                                        )}
                                        <p><strong>Horário:</strong> {pickupConfig?.hours || 'Seg a Sáb, 09h-11h30 e 15h-17h30'}</p>
                                        {pickupDetails?.personName && <p><strong>Pessoa autorizada:</strong> {pickupDetails.personName}</p>}
                                        <p className="text-amber-300 text-xs mt-2">{pickupConfig?.instructions || 'Apresente um documento com foto e o número do pedido no momento da retirada.'}</p>
                                    </div>
                                ) : (
                                     order.tracking_code && <p className="my-4 p-3 bg-gray-800 rounded-md text-sm"><strong>Cód. Rastreio:</strong> {order.tracking_code}</p>
                                )}

                                <div className="space-y-2 mb-4 border-t border-gray-800 pt-4">
                                    {(Array.isArray(order.items) ? order.items : []).map(item => (
                                        <div key={item.id} className="flex items-center text-sm">
                                            <img src={getFirstImage(item.images)} alt={item.name} className="h-10 w-10 object-contain mr-3 bg-white rounded"/>
                                            <div className="flex-grow">
                                                <span>{item.quantity}x {item.name}</span>
                                                {item.variation && <span className="text-xs block text-gray-400">{item.variation.color} / {item.variation.size}</span>}
                                            </div>
                                            <span className="ml-auto">R$ {Number(item.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-800 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button onClick={() => handleRepeatOrder(order.items)} disabled={isRepeatingOrder} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                            {isRepeatingOrder ? <><SpinnerIcon className="h-4 w-4"/> Proc...</> : 'Repetir Pedido'}
                                        </button>
                                        {isPickupOrder ? (
                                            <button onClick={() => setOrderForTracking(order)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Ver Status da Retirada</button>
                                        ) : (
                                            order.tracking_code && <button onClick={() => setOrderForTracking(order)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Rastrear Pedido</button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                                        <span>Dúvidas?</span>
                                        <a href={`https://wa.me/5583987379573?text=Olá,%20gostaria%20de%20falar%20sobre%20meu%20pedido%20%23${order.id}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors" title="Contato via WhatsApp">
                                            <WhatsappIcon className="h-4 w-4" />
                                        </a>
                                        <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors" title="Contato via Instagram">
                                            <InstagramIcon className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                 <EmptyState 
                    icon={<PackageIcon className="h-12 w-12"/>}
                    title="Nenhum pedido encontrado"
                    message="Você ainda não fez nenhuma compra. Explore nossos produtos!"
                    buttonText="Ver Produtos"
                    onButtonClick={() => onNavigate('products')}
                />
            )}
        </>
    );
};

const MyAddressesSection = () => {
    const { addresses, fetchAddresses, determineShippingLocation } = useShop();
    const notification = useNotification();
    const confirmation = useConfirmation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);

    const handleOpenModal = (address = null) => {
        if (!address && addresses.length >= 5) {
            notification.show("Você já possui 5 endereços cadastrados. Exclua um para adicionar outro.", "error");
            return;
        }
        setEditingAddress(address);
        setIsModalOpen(true);
    };

    const handleSaveAddress = async (formData) => {
        try {
            if (editingAddress) {
                await apiService(`/addresses/${editingAddress.id}`, 'PUT', formData);
                notification.show('Endereço atualizado!');
            } else {
                await apiService('/addresses', 'POST', formData);
                notification.show('Endereço adicionado!');
            }
            await fetchAddresses();
            determineShippingLocation(); 
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    const handleDeleteAddress = (id) => {
        confirmation.show("Tem certeza que deseja excluir este endereço?", async () => {
            try {
                await apiService(`/addresses/${id}`, 'DELETE');
                notification.show('Endereço excluído.');
                await fetchAddresses();
                determineShippingLocation(); 
            } catch (error) {
                notification.show(`Erro: ${error.message}`, 'error');
            }
        });
    };
    
    const handleSetDefault = async (id) => {
        try {
            await apiService(`/addresses/${id}/default`, 'PUT');
            notification.show('Endereço padrão atualizado.');
            await fetchAddresses();
            determineShippingLocation();
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    return (
        <>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAddress ? 'Editar Endereço' : 'Adicionar Endereço'}>
                        <AddressForm initialData={editingAddress} onSave={handleSaveAddress} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-amber-400">Meus Endereços</h2>
                <button 
                    onClick={() => handleOpenModal()} 
                    disabled={addresses.length >= 5}
                    className="bg-amber-500 text-black px-4 py-2 rounded-md hover:bg-amber-400 font-bold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    Adicionar Novo
                </button>
            </div>
             {addresses.length >= 5 && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm p-3 rounded-md mb-6 flex items-center gap-2">
                    <ExclamationCircleIcon className="h-5 w-5" />
                    Você atingiu o limite de 5 endereços. Para adicionar um novo, por favor, exclua um existente.
                </div>
            )}
            {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map(addr => (
                        <div key={addr.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">{addr.alias}</h3>
                                {addr.is_default ? (
                                    <span className="text-xs bg-amber-400 text-black px-3 py-1 rounded-full font-semibold flex items-center gap-1"><CheckIcon className="h-3 w-3"/> Padrão</span>
                                ) : (
                                    <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-amber-400 hover:underline">Tornar Padrão</button>
                                )}
                            </div>
                            <div className="text-sm text-gray-300 flex-grow">
                                <p>{addr.logradouro}, {addr.numero} {addr.complemento && `- ${addr.complemento}`}</p>
                                <p>{addr.bairro}, {addr.localidade} - {addr.uf}</p>
                                <p>{addr.cep}</p>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-700">
                                <button onClick={() => handleOpenModal(addr)} className="p-2 text-gray-400 hover:text-white"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDeleteAddress(addr.id)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={<MapPinIcon className="h-12 w-12"/>}
                    title="Nenhum endereço cadastrado"
                    message="Adicione seu primeiro endereço para agilizar suas compras."
                    buttonText="Adicionar Endereço"
                    onButtonClick={() => handleOpenModal()}
                />
            )}
        </>
    );
};

const MyProfileSection = () => {
    const { user, setUser } = useAuth();
    const notification = useNotification();

    // Estados para o Modal de Senha
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    
    // Estados visuais do Modal de Senha
    const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);

    // Estados para o Modal de 2FA
    const [is2faModalOpen, setIs2faModalOpen] = useState(false);
    const [is2faDisableModalOpen, setIs2faDisableModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [disableVerificationCode, setDisableVerificationCode] = useState(''); 
    const [is2faLoading, setIs2faLoading] = useState(false);

    // Estado para Biometria
    const [isBiometricLoading, setIsBiometricLoading] = useState(false);

    // Helper para calcular força da senha no Modal
    const getPasswordStrength = (pass) => {
        if (!pass) return { label: '', color: '' };
        const hasLettersAndNumbers = /^(?=.*[A-Za-z])(?=.*\d)/.test(pass);
        
        if (pass.length < 8 || !hasLettersAndNumbers) return { label: 'Fraca (Mín. 8 + Letras e Números)', color: 'text-red-500' };
        if (pass.length >= 8 && pass.length < 12 && hasLettersAndNumbers) return { label: 'Média', color: 'text-yellow-500' };
        return { label: 'Forte', color: 'text-green-500' };
    };

    const passStrength = getPasswordStrength(newPassword);
    const isNewPasswordValid = newPassword.length >= 8 && /^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (!currentPassword) {
            notification.show("Digite sua senha atual.", "error");
            return;
        }

        if (!isNewPasswordValid) {
            notification.show("A nova senha não atende aos requisitos de segurança.", "error");
            return;
        }

        setIsPasswordLoading(true);
        try {
            await apiService('/users/me/password', 'PUT', { 
                currentPassword: currentPassword,
                newPassword: newPassword 
            });
            notification.show('Senha alterada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setIsPasswordModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        } finally {
            setIsPasswordLoading(false);
        }
    };

    // --- LÓGICA DE CADASTRO BIOMÉTRICO ---
    const handleRegisterBiometrics = async () => {
        try {
            const startReg = window.SimpleWebAuthnBrowser ? window.SimpleWebAuthnBrowser.startRegistration : null;
            if (!startReg) {
                notification.show("A biblioteca de biometria não está carregada.", "error");
                return;
            }

            setIsBiometricLoading(true);

            const options = await apiService('/webauthn/generate-registration-options');

            let attResp;
            try {
                attResp = await startReg(options);
            } catch (err) {
                if (err.name === 'InvalidStateError') {
                    notification.show("Esta biometria já está cadastrada.", "error");
                } else {
                    console.log("Biometria cancelada:", err);
                }
                setIsBiometricLoading(false);
                return;
            }

            const verification = await apiService('/webauthn/verify-registration', 'POST', attResp);

            if (verification && verification.verified) {
                notification.show("Biometria cadastrada com sucesso! Você já pode usar no próximo login.");
                const updatedUser = { ...user, has_biometrics: true };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                notification.show("Não foi possível salvar a biometria.", "error");
            }
        } catch (err) {
            console.error("Erro ao registrar biometria:", err);
            notification.show(err.message || "Erro ao configurar biometria.", "error");
        } finally {
            setIsBiometricLoading(false);
        }
    };

    // --- LÓGICA PARA REMOVER BIOMETRIA ---
    const handleRemoveBiometrics = async () => {
        setIsBiometricLoading(true);
        try {
            await apiService('/webauthn/remove', 'DELETE');
            notification.show('Biometria desativada com sucesso.');
            const updatedUser = { ...user, has_biometrics: false };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (err) {
            notification.show('Erro ao remover biometria.', 'error');
        } finally {
            setIsBiometricLoading(false);
        }
    };

    const handleGenerate2FA = async () => {
        setIs2faLoading(true);
        try {
            const data = await apiService('/2fa/generate', 'POST');
            setQrCodeUrl(data.qrCodeUrl);
            setTwoFactorSecret(data.secret);
            setIs2faModalOpen(true);
        } catch (error) {
            notification.show(`Erro ao gerar código 2FA: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    const handleVerifyAndEnable2FA = async (e) => {
        e.preventDefault();
        setIs2faLoading(true);
        try {
            await apiService('/2fa/verify-enable', 'POST', { token: verificationCode });
            notification.show('Autenticação de Dois Fatores ativada com sucesso!');
            const updatedUser = { ...user, is_two_factor_enabled: 1 };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIs2faModalOpen(false);
        } catch (error) {
            notification.show(`Erro na verificação: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    const handleDisable2FA = async (e) => {
        e.preventDefault();
        setIs2faLoading(true);
        try {
            await apiService('/2fa/disable', 'POST', { 
                password: disablePassword,
                token: disableVerificationCode 
            });
            notification.show('Autenticação de Dois Fatores desativada.');
            const updatedUser = { ...user, is_two_factor_enabled: 0 };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIs2faDisableModalOpen(false);
            setDisablePassword('');
            setDisableVerificationCode(''); 
        } catch (error) {
            notification.show(`Erro ao desativar: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <Modal isOpen={isPasswordModalOpen} onClose={() => {
                        setIsPasswordModalOpen(false);
                        setCurrentPassword('');
                        setNewPassword('');
                    }} title="Alterar Senha de Acesso">
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="bg-gray-50 border border-gray-200 p-3 rounded-md mb-4 text-xs text-gray-600 flex gap-2 items-start">
                                <ShieldCheckIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                <p>Para proteger sua conta, exigimos que você informe sua senha atual antes de cadastrar uma nova.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        type={isCurrentPasswordVisible ? 'text' : 'password'} 
                                        value={currentPassword} 
                                        onChange={e => setCurrentPassword(e.target.value)} 
                                        required
                                        placeholder="Digite sua senha atual" 
                                        className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 outline-none pr-10" 
                                    />
                                    <button type="button" onClick={() => setIsCurrentPasswordVisible(!isCurrentPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-500">
                                        {isCurrentPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        type={isNewPasswordVisible ? 'text' : 'password'} 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                        required
                                        placeholder="Mínimo 8 caracteres (letras e números)" 
                                        className={`w-full p-2.5 bg-white text-gray-900 border rounded-md focus:ring-2 outline-none pr-10 ${newPassword && !isNewPasswordValid ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-amber-400'}`} 
                                    />
                                    <button type="button" onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-500">
                                        {isNewPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                    </button>
                                </div>
                                <div className="flex justify-end items-center mt-1.5 px-1 min-h-[20px]">
                                    {newPassword && (
                                        <div className="text-right text-xs font-medium">
                                            <span className="text-gray-500 mr-1">Força:</span>
                                            <span className={`${passStrength.color} font-bold`}>{passStrength.label}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={isPasswordLoading || !currentPassword || !isNewPasswordValid} 
                                className="w-full bg-amber-500 text-black font-bold py-3 mt-2 rounded-md hover:bg-amber-400 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isPasswordLoading ? <SpinnerIcon className="h-5 w-5"/> : "Salvar Nova Senha"}
                            </button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {is2faModalOpen && (
                    <Modal isOpen={true} onClose={() => setIs2faModalOpen(false)} title="Ativar Autenticação de Dois Fatores">
                        <div className="text-center space-y-4">
                            <p className="text-gray-600">1. Escaneie este QR Code com seu aplicativo autenticador (Google Authenticator, Authy, etc).</p>
                            <img src={qrCodeUrl} alt="QR Code para 2FA" className="mx-auto border-4 border-white shadow-lg"/>
                            <p className="text-gray-600 text-sm">Se não puder escanear, insira esta chave manualmente:</p>
                            <p className="font-mono bg-gray-200 p-2 rounded-md text-gray-800 break-all">{twoFactorSecret}</p>
                            <form onSubmit={handleVerifyAndEnable2FA} className="space-y-3 pt-4 border-t">
                                <label className="block text-sm font-medium text-gray-700">2. Insira o código de 6 dígitos gerado:</label>
                                <input 
                                    type="text" 
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value)}
                                    maxLength="6"
                                    placeholder="123456"
                                    className="w-full max-w-xs mx-auto text-center tracking-[0.5em] p-2 bg-gray-100 text-gray-900 border border-gray-300 rounded-md text-xl font-mono"
                                />
                                <button type="submit" disabled={is2faLoading} className="w-full max-w-xs mx-auto bg-green-600 text-white font-bold py-2 rounded-md hover:bg-green-700 flex justify-center items-center disabled:opacity-50">
                                    {is2faLoading ? <SpinnerIcon/> : "Ativar e Verificar"}
                                </button>
                            </form>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {is2faDisableModalOpen && (
                     <Modal isOpen={true} onClose={() => setIs2faDisableModalOpen(false)} title="Desativar Autenticação de Dois Fatores">
                        <form onSubmit={handleDisable2FA} className="space-y-4">
                            <p className="text-red-700 bg-red-100 p-3 rounded-md text-sm">Atenção: Para desativar o 2FA, por segurança, você deve fornecer sua **senha** e um **código de autenticação** válido.</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sua Senha</label>
                                <input type="password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} required className="w-full p-2 bg-gray-100 text-gray-900 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Autenticação (2FA)</label>
                                <input 
                                    type="text" 
                                    value={disableVerificationCode} 
                                    onChange={e => setDisableVerificationCode(e.target.value)}
                                    maxLength="6"
                                    placeholder="123456"
                                    required 
                                    className="w-full p-2 bg-gray-100 text-gray-900 border border-gray-300 rounded-md text-center font-mono tracking-widest"
                                />
                            </div>
                            <button type="submit" disabled={is2faLoading} className="w-full bg-red-600 text-white font-bold py-2 rounded-md hover:bg-red-700 flex justify-center items-center disabled:opacity-50">
                                {is2faLoading ? <SpinnerIcon/> : "Confirmar e Desativar"}
                            </button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Dados</h2>
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center"><strong className="w-24 text-gray-400 flex-shrink-0">Nome:</strong><span className="text-white">{user?.name}</span></div>
                <div className="flex flex-col sm:flex-row sm:items-center"><strong className="w-24 text-gray-400 flex-shrink-0">Email:</strong><span className="text-white">{user?.email}</span></div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-xl font-bold text-amber-400 mb-4">Segurança e Acesso</h3>
                
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h4 className="font-bold flex items-center gap-2">Senha de Acesso</h4>
                            <p className="text-sm text-gray-400 mt-1">Atualize sua senha periodicamente para manter a conta segura.</p>
                        </div>
                        <button onClick={() => setIsPasswordModalOpen(true)} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-600 flex-shrink-0">Alterar Senha</button>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h4 className="font-bold flex items-center gap-2"><FingerprintIcon className="h-5 w-5 text-amber-400"/> Login Biométrico / Face ID</h4>
                            <p className="text-sm text-gray-400 mt-1">Acesse mais rápido e com segurança usando reconhecimento biométrico (Passkeys).</p>
                        </div>
                        
                        {user?.has_biometrics ? (
                            <div className="text-center flex-shrink-0">
                                <p className="text-sm font-semibold text-green-400 bg-green-900/50 px-3 py-1 rounded-full mb-2">Ativo</p>
                                <button onClick={handleRemoveBiometrics} disabled={isBiometricLoading} className="text-xs text-red-400 hover:underline">Remover</button>
                            </div>
                        ) : (
                            <button 
                                onClick={handleRegisterBiometrics} 
                                disabled={isBiometricLoading}
                                className="bg-gray-700 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-600 flex items-center justify-center disabled:opacity-50 flex-shrink-0 gap-2"
                            >
                                {isBiometricLoading ? <SpinnerIcon/> : <FingerprintIcon className="h-5 w-5" />}
                                Ativar Biometria
                            </button>
                        )}
                    </div>

                    {user?.role === 'admin' && (
                        <div className="bg-gray-800 p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-indigo-900/50">
                            <div>
                                <h4 className="font-bold flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-indigo-400"/> Autenticação de Dois Fatores (Admin)</h4>
                                <p className="text-sm text-gray-400 mt-1">Exija um código de verificação via app ao fazer login no painel administrativo.</p>
                            </div>
                            {user.is_two_factor_enabled ? (
                                <div className="text-center flex-shrink-0">
                                    <p className="text-sm font-semibold text-green-400 bg-green-900/50 px-3 py-1 rounded-full mb-2">Ativo</p>
                                    <button onClick={() => setIs2faDisableModalOpen(true)} className="text-xs text-red-400 hover:underline">Desativar</button>
                                </div>
                            ) : (
                                <button onClick={handleGenerate2FA} disabled={is2faLoading} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center disabled:opacity-50 flex-shrink-0">
                                    {is2faLoading ? <SpinnerIcon/> : "Ativar 2FA"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

