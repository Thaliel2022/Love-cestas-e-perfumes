import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Payment as MercadoPagoPayment } from '@mercadopago/sdk-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useShop } from '../contexts/ShopContext';
import { getFirstImage } from '../utils/cloudinary';
import {
    ArrowUturnLeftIcon, CheckBadgeIcon, ExclamationCircleIcon, InstagramIcon,
    PackageIcon, ShieldCheckIcon, SpinnerIcon, TruckIcon, WhatsappIcon
} from '../components/icons';

export const OrderPaymentPage = ({ orderId, onNavigate }) => {
    const { user } = useAuth();
    const { clearOrderState } = useShop();
    const notification = useNotification();
    
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    
    const [showBrick, setShowBrick] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        apiService(`/orders/my-orders?id=${orderId}&t=${new Date().getTime()}`)
            .then(data => {
                if (data && data.length > 0) {
                    const foundOrder = data[0];
                    if (foundOrder.status !== 'Pendente') {
                        notification.show("Este pedido não está mais pendente de pagamento.", "error");
                        onNavigate(`account/orders/${orderId}`);
                    } else {
                        setOrder(foundOrder);
                    }
                } else {
                    notification.show("Pedido não encontrado.", "error");
                    onNavigate('account/orders');
                }
            })
            .catch(err => {
                console.error(err);
                notification.show("Erro ao carregar pedido.", "error");
            })
            .finally(() => setIsLoading(false));
    }, [orderId, onNavigate, notification]);

    const handlePaymentSubmit = async (mpResponse) => {
        return new Promise(async (resolve, reject) => {
            setIsProcessingPayment(true);
            try {
                const actualPaymentData = JSON.parse(JSON.stringify(mpResponse.formData || mpResponse));

                if (actualPaymentData.payer && order?.shipping_address && order.shipping_method !== 'Retirar na loja') {
                    try {
                        const addr = JSON.parse(order.shipping_address);
                        actualPaymentData.payer.address = {
                            zip_code: addr.cep.replace(/\D/g, ''),
                            street_name: addr.logradouro,
                            street_number: String(addr.numero),
                            neighborhood: addr.bairro,
                            city: addr.localidade,
                            federal_unit: addr.uf
                        };
                    } catch(e) {}
                }

                const paymentPayload = {
                    orderId: order.id,
                    paymentData: actualPaymentData 
                };

                await apiService('/process-payment', 'POST', paymentPayload);

                clearOrderState();
                onNavigate(`order-success/${order.id}`);
                resolve();

            } catch (error) {
                notification.show(`Erro ao processar pagamento: ${error.message}`, 'error');
                reject();
            } finally {
                setIsProcessingPayment(false);
            }
        });
    };

    const mpInitialization = useMemo(() => {
        const payer = {
            email: user?.email || '',
            entityType: 'individual'
        };

        if (user?.name) {
            const nameParts = user.name.trim().split(' ');
            payer.firstName = nameParts[0];
            payer.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Cliente';
        }
        
        if (user?.cpf) {
            payer.identification = {
                type: 'CPF',
                number: user.cpf.replace(/\D/g, '')
            };
        }
        
        if (order?.shipping_address && order.shipping_method !== 'Retirar na loja') {
            try {
                const addr = JSON.parse(order.shipping_address);
                if (addr && addr.cep && addr.logradouro) {
                    const rawNumero = String(addr.numero || '');
                    const safeNumero = rawNumero.replace(/\D/g, '') || '1';
                    
                    payer.address = {
                        zipCode: addr.cep.replace(/\D/g, ''),
                        streetName: addr.logradouro || 'Rua',
                        streetNumber: safeNumero,
                        neighborhood: addr.bairro || 'Bairro',
                        city: addr.localidade || 'Cidade',
                        federalUnit: addr.uf || 'PB'
                    };
                }
            } catch (e) {}
        }

        return {
            amount: Number(order?.total || 0),
            payer: payer
        };
    }, [order?.total, order?.shipping_address, order?.shipping_method, user]);

    const mpCustomization = useMemo(() => {
        return {
            paymentMethods: {
                ticket: "none",
                bankTransfer: "all",
                creditCard: "all",
                debitCard: "all",
            },
            visual: {
                texts: {
                    formSubmit: 'Confirmar Pagamento',
                },
                style: {
                    theme: 'dark',
                    customVariables: {
                        baseColor: '#fbbf24', 
                        baseColorFirstVariant: '#f59e0b', 
                        baseColorSecondVariant: '#d97706',
                        errorColor: '#ef4444', 
                    }
                }
            }
        };
    }, []);

    useEffect(() => {
        if (!order) return;
        setShowBrick(false);
        const timer = setTimeout(() => {
            setShowBrick(true);
        }, 500);
        return () => clearTimeout(timer);
    }, [order]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <SpinnerIcon className="h-12 w-12 text-amber-500 animate-spin" />
                <p className="text-amber-400 font-bold tracking-widest uppercase text-sm animate-pulse">Preparando Pagamento Seguro</p>
            </div>
        );
    }

    if (!order) return null;

    const subtotal = (Number(order.total) || 0) - (Number(order.shipping_cost) || 0) + (Number(order.discount_amount) || 0);

    return (
        <div className="bg-black text-white min-h-screen pt-8 pb-24 md:py-12 relative overflow-hidden">
            {/* Efeitos de fundo premium */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

            <AnimatePresence>
                {isProcessingPayment && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
                            <SpinnerIcon className="h-16 w-16 text-amber-400 mb-6 animate-spin" />
                            <h3 className="text-2xl font-extrabold text-white mb-2">Processando</h3>
                            <p className="text-sm font-medium text-gray-300">Validando com sua operadora. Por favor, aguarde...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4 max-w-5xl relative z-10">
                <button onClick={() => onNavigate(`account/orders/${order.id}`)} className="text-sm text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 mb-8 w-fit bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-800">
                    <ArrowUturnLeftIcon className="h-4 w-4"/> Voltar para Detalhes do Pedido
                </button>

                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-3">Finalizar Pagamento</h1>
                    <p className="text-amber-400 font-medium">Pedido #{order.id}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    
                    {/* Lado Direito no Desktop / Cima no Mobile: Resumo Fixo Premium */}
                    <div className="lg:col-span-5 lg:sticky lg:top-24 order-1 lg:order-2">
                        <div className="relative rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-900/90" />
                                <div className="absolute inset-0 backdrop-blur-xl" />
                            </div>
                            <div className="relative p-6 sm:p-8 isolate">
                            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
                                <PackageIcon className="h-6 w-6 text-amber-500" />
                                Resumo da Compra
                            </h2>
                            
                            <div className="space-y-4 mb-6 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                                {(order.items || []).map(item => (
                                    <div key={item.id} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-gray-800/50">
                                        <div className="w-14 h-14 bg-white rounded-lg p-1 flex-shrink-0">
                                            <img src={getFirstImage(item.images)} alt={item.name} className="w-full h-full object-contain [image-rendering:-webkit-optimize-contrast]" decoding="sync" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{item.quantity}x {item.name}</p>
                                            {item.variation && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {JSON.parse(item.variation_details || '{}').color} / {JSON.parse(item.variation_details || '{}').size}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-amber-400">R$ {Number(item.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-800">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Subtotal</span>
                                    <span className="text-gray-300">R$ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Frete ({order.shipping_method})</span>
                                    <span className="text-gray-300">R$ {Number(order.shipping_cost).toFixed(2)}</span>
                                </div>
                                {Number(order.discount_amount) > 0 && (
                                    <div className="flex justify-between text-sm text-green-400">
                                        <span>Desconto</span>
                                        <span>- R$ {Number(order.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-800">
                                    <span className="text-lg font-medium text-white">Total a Pagar</span>
                                    <span className="text-3xl font-black text-amber-500 tracking-tight">R$ {Number(order.total).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="mt-8 bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 flex items-start gap-3">
                                <ShieldCheckIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-200 leading-relaxed">
                                    Transação criptografada ponta a ponta. Seus dados financeiros não são armazenados em nossos servidores.
                                </p>
                            </div>
                            </div>
                        </div>
                    </div>

                    {/* Lado Esquerdo no Desktop / Baixo no Mobile: Formulário do Mercado Pago */}
                    <div className="lg:col-span-7 order-2 lg:order-1">
                        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-2 sm:p-4 shadow-2xl mp-custom-styles">
                            <style>{`
                                @media (min-width: 1024px) {
                                    .mp-custom-styles .mp-formAction,
                                    .mp-custom-styles [class*="formAction"] {
                                        display: flex !important;
                                        justify-content: center !important;
                                        width: 100% !important;
                                    }

                                    .mp-custom-styles button[type="submit"],
                                    .mp-custom-styles [data-testid="submit-button"],
                                    .mp-custom-styles .mp-button {
                                        width: 100% !important;
                                        max-width: 350px !important;
                                        margin-left: auto !important;
                                        margin-right: auto !important;
                                        border-radius: 8px !important;
                                    }
                                }
                            `}</style>
                            <div className="mb-4 p-3.5 bg-blue-900/30 border border-blue-800/50 rounded-xl flex items-start gap-3">
                                <ExclamationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-200 leading-relaxed">
                                    <strong className="text-blue-300 block mb-1">Dica sobre o pagamento via Pix:</strong> 
                                    O código Copia e Cola e o QR Code serão gerados <strong>aqui mesmo na tela</strong> no próximo passo, logo após você confirmar. O e-mail solicitado abaixo serve apenas para enviarmos o seu comprovante de pagamento.
                                </div>
                            </div>
                            
                            {showBrick ? (
                                <MercadoPagoPayment
                                    key={`mp-brick-order-${order.id}-${order.total}`}
                                    initialization={mpInitialization}
                                    customization={mpCustomization}
                                    onSubmit={handlePaymentSubmit}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 px-4 gap-3 bg-gray-800 rounded-xl border border-gray-700">
                                    <SpinnerIcon className="h-8 w-8 text-amber-500 animate-spin" />
                                    <p className="text-xs font-bold text-gray-400 text-center">Preparando ambiente seguro de pagamento...</p>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
