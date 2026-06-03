import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Payment as MercadoPagoPayment } from '@mercadopago/sdk-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useShop } from '../contexts/ShopContext';
import { Modal } from '../components/ui/Modal';
import { CheckoutSection } from '../components/ui/CheckoutSection';
import { AddressForm, AddressSelectionModal } from '../components/checkout/CheckoutAddress';
import { getFirstImage } from '../utils/cloudinary';
import { maskCPF, maskPhone, validateCPF, validatePhone } from '../utils/validation';
import {
    ArrowUturnLeftIcon, BoxIcon, CheckCircleIcon, ClockIcon, EditIcon,
    ExclamationCircleIcon, MapPinIcon, PlusIcon, SpinnerIcon, TruckIcon,
    WhatsappIcon
} from '../components/icons';
export const CheckoutPage = ({ onNavigate }) => {
    const { user } = useAuth();
    const {
        cart, autoCalculatedShipping, appliedCoupon, clearOrderState, addresses,
        fetchAddresses, shippingLocation, setShippingLocation, shippingOptions,
        setAutoCalculatedShipping, setSelectedShippingName, pickupConfig,
        couponCode, setCouponCode, applyCoupon, removeCoupon, couponMessage,
        paymentInstallmentsConfig
    } = useShop();
    const notification = useNotification();

    const [displayAddress, setDisplayAddress] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('mercadopago');
    const [isLoading, setIsLoading] = useState(false);
    const [isAddressLoading, setIsAddressLoading] = useState(true);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
    const [isSomeoneElsePickingUp, setIsSomeoneElsePickingUp] = useState(false);
    const [pickupPersonName, setPickupPersonName] = useState('');
    const [pickupPersonCpf, setPickupPersonCpf] = useState('');
    const [whatsapp, setWhatsapp] = useState(''); 
    
    const [showBrick, setShowBrick] = useState(false);

    useEffect(() => {
        const pendingOrderId = localStorage.getItem('pendingOrderId');
        if (pendingOrderId) {
            onNavigate(`order-success/${pendingOrderId}`);
        }
    }, [onNavigate]);

    useEffect(() => {
        setIsAddressLoading(true);
        if (user && user.phone) setWhatsapp(maskPhone(user.phone));

        fetchAddresses().then(userAddresses => {
            let addressToSet = null;
            if (shippingLocation && shippingLocation.cep) {
                const matchingSavedAddress = userAddresses.find(addr =>
                    addr.cep === shippingLocation.cep && addr.logradouro && addr.numero && addr.bairro 
                );
                if (matchingSavedAddress) addressToSet = matchingSavedAddress;
                else addressToSet = { cep: shippingLocation.cep, localidade: shippingLocation.city, uf: shippingLocation.state, alias: 'Endereço Incompleto (Preencha os dados)', logradouro: '', numero: '', bairro: '', is_incomplete: true };
            }
            if (!addressToSet) addressToSet = userAddresses.find(addr => addr.is_default) || userAddresses[0] || null;
            setDisplayAddress(addressToSet);
            if (addressToSet && addressToSet.cep && addressToSet.cep !== shippingLocation?.cep) {
                 setShippingLocation({ cep: addressToSet.cep, city: addressToSet.localidade, state: addressToSet.uf, alias: addressToSet.alias });
            }
        }).finally(() => setIsAddressLoading(false));
    }, [fetchAddresses, shippingLocation, setShippingLocation, user]);

    useEffect(() => {
        if (user && !isSomeoneElsePickingUp) {
            setPickupPersonName(user.name || ''); setPickupPersonCpf(maskCPF(user.cpf || '')); 
        } else {
            setPickupPersonName(''); setPickupPersonCpf('');
        }
    }, [user, isSomeoneElsePickingUp]);

    const handleSelectShipping = (option) => {
        setAutoCalculatedShipping(option);
        setSelectedShippingName(option.name);
        if(option.isPickup) {
            setDisplayAddress(null);
            if (!isSomeoneElsePickingUp && user) {
                setPickupPersonName(user.name || ''); setPickupPersonCpf(maskCPF(user.cpf || '')); 
            } else {
                 setPickupPersonName(''); setPickupPersonCpf('');
            }
        } else if (!displayAddress && addresses.length > 0) {
             const defaultOrFirst = addresses.find(addr => addr.is_default) || addresses[0];
             if (defaultOrFirst) {
                setDisplayAddress(defaultOrFirst);
                setShippingLocation({ cep: defaultOrFirst.cep, city: defaultOrFirst.localidade, state: defaultOrFirst.uf, alias: defaultOrFirst.alias });
             }
        }
    };

    const handleAddressSelection = (address) => {
        setDisplayAddress(address);
        setShippingLocation({ cep: address.cep, city: address.localidade, state: address.uf, alias: address.alias });
        setIsAddressModalOpen(false);
    };
    
    const handleAddNewAddress = () => { setIsAddressModalOpen(false); setIsNewAddressModalOpen(true); };
    
    const handleSaveNewAddress = async (formData) => {
        try {
            const savedAddress = await apiService('/addresses', 'POST', formData);
            notification.show('Endereço salvo com sucesso!');
            const updatedAddresses = await fetchAddresses();
            const newAddress = updatedAddresses.find(a => a.id === savedAddress.id) || savedAddress;
            setDisplayAddress(newAddress);
            setShippingLocation({ cep: newAddress.cep, city: newAddress.localidade, state: newAddress.uf, alias: newAddress.alias });
            setIsNewAddressModalOpen(false);
        } catch (error) { notification.show(`Erro ao salvar endereço: ${error.message}`, 'error'); }
    };

    const handleWhatsappChange = (e) => setWhatsapp(maskPhone(e.target.value));

    const handleApplyCoupon = (e) => {
        e.preventDefault();
        if (couponCode.trim()) {
            applyCoupon(couponCode);
        }
    };

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + ((Number(item.is_on_sale && item.sale_price ? item.sale_price : item.price) || 0) * (Number(item.qty) || 0)), 0), [cart]);
    const shippingCost = useMemo(() => Number(autoCalculatedShipping?.price) || 0, [autoCalculatedShipping]);
    
    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        let val = 0;
        const couponValue = Number(appliedCoupon.value) || 0;
        const currentSubtotal = Number(subtotal) || 0;
        const currentShippingCost = Number(shippingCost) || 0;
        if (appliedCoupon.type === 'percentage') val = currentSubtotal * (couponValue / 100);
        else if (appliedCoupon.type === 'fixed') val = couponValue;
        else if (appliedCoupon.type === 'free_shipping') val = currentShippingCost;
        const currentTotalBeforeDiscount = currentSubtotal + currentShippingCost;
        return Math.max(0, (appliedCoupon.type !== 'free_shipping' && val > currentTotalBeforeDiscount) ? currentTotalBeforeDiscount : val);
    }, [appliedCoupon, subtotal, shippingCost]);
    
    const total = useMemo(() => Math.max(0, (Number(subtotal) || 0) - (Number(discount) || 0) + (Number(shippingCost) || 0)), [subtotal, discount, shippingCost]);

    const installmentSummary = useMemo(() => {
        const interestFreeInstallments = Number(paymentInstallmentsConfig?.interest_free_installments) || 4;
        const minInstallmentAmount = Number(paymentInstallmentsConfig?.min_installment_amount) || 0;
        if (total <= 0 || total < minInstallmentAmount || interestFreeInstallments <= 1) return null;
        return `${interestFreeInstallments}x de R$ ${(total / interestFreeInstallments).toFixed(2).replace('.', ',')} sem juros`;
    }, [paymentInstallmentsConfig, total]);

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
        
        const billingAddress = displayAddress || addresses?.find(a => a.is_default) || addresses?.[0];
        
        if (billingAddress && billingAddress.cep && billingAddress.logradouro) {
            const rawNumero = String(billingAddress.numero || '');
            const safeNumero = rawNumero.replace(/\D/g, '') || '1';
            
            payer.address = {
                zipCode: billingAddress.cep.replace(/\D/g, ''),
                streetName: billingAddress.logradouro || 'Rua',
                streetNumber: safeNumero,
                neighborhood: billingAddress.bairro || 'Bairro',
                city: billingAddress.localidade || 'Cidade',
                federalUnit: billingAddress.uf || 'PB'
            };
        }

        return {
            amount: Number(total.toFixed(2)),
            payer: payer
        };
    }, [total, user, displayAddress, addresses]);

    const mpCustomization = useMemo(() => {
        const minInstallmentAmount = Number(paymentInstallmentsConfig?.min_installment_amount) || 0;
        const configuredMax = Number(paymentInstallmentsConfig?.max_installments) || 10;
        const allowedMaxInstallments = total >= minInstallmentAmount ? configuredMax : 1;
        return {
            paymentMethods: {
                excludedPaymentTypes: ["ticket"],
                bankTransfer: "all",
                creditCard: "all",
                debitCard: "all",
                minInstallments: 1,
                maxInstallments: allowedMaxInstallments,
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
    }, [paymentInstallmentsConfig, total]);

    const getDeliveryDateText = (deliveryTime) => {
        if (typeof deliveryTime === 'string' && deliveryTime.includes('Receba até')) return `${deliveryTime} (1 dia útil)`;
        const timeInDays = Number(deliveryTime);
        if (isNaN(timeInDays) || timeInDays <= 0) return 'Prazo indisponível';
        const date = new Date();
        let addedBusinessDays = 0;
        date.setDate(date.getDate() + 1);
        if (date.getDay() === 0) date.setDate(date.getDate() + 1);
        else if (date.getDay() === 6) date.setDate(date.getDate() + 2);
        while (addedBusinessDays < timeInDays) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) addedBusinessDays++;
        }
        return `Previsão: ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;
    };

    const handlePickupNameBlur = (e) => setPickupPersonName(e.target.value);
    const handleCpfInputChangeMask = (e) => e.target.value = maskCPF(e.target.value);
    const handlePickupCpfBlur = (e) => setPickupPersonCpf(maskCPF(e.target.value));

    const canPlaceOrder = useMemo(() => {
        if (autoCalculatedShipping?.isPickup) {
            return isSomeoneElsePickingUp ? pickupPersonName.trim().length > 3 && pickupPersonCpf.replace(/\D/g, '').length >= 11 : true;
        }
        if (!displayAddress) return false;
        return displayAddress.logradouro && displayAddress.logradouro !== 'N/A' && displayAddress.logradouro.trim() !== '' &&
               displayAddress.numero && displayAddress.numero !== 'N/A' && displayAddress.numero.trim() !== '' &&
               displayAddress.bairro && displayAddress.bairro !== 'N/A' && displayAddress.bairro.trim() !== '' &&
               !displayAddress.is_incomplete;
    }, [displayAddress, autoCalculatedShipping, isSomeoneElsePickingUp, pickupPersonName, pickupPersonCpf]);

    useEffect(() => {
        setShowBrick(false);
        const timer = setTimeout(() => {
            if (canPlaceOrder && autoCalculatedShipping && cart.length > 0) {
                setShowBrick(true);
            }
        }, 500); 
        return () => clearTimeout(timer);
    }, [total, canPlaceOrder, autoCalculatedShipping, cart.length]);

    const handlePaymentSubmit = async (mpResponse) => {
        // Envolve tudo em uma Promise para o SDK do Mercado Pago entender quando terminou ou falhou
        return new Promise(async (resolve, reject) => {
            const isPickup = autoCalculatedShipping?.isPickup;
            if (!canPlaceOrder && !isPickup) {
                 notification.show("Por favor, complete o endereço de entrega para continuar.", 'error');
                 setIsNewAddressModalOpen(true); 
                 reject();
                 return;
            }
            if (!whatsapp || !validatePhone(whatsapp)) { 
                notification.show("Por favor, informe um número de WhatsApp válido.", 'error'); 
                reject();
                return; 
            }
            
            const nameToCheck = isSomeoneElsePickingUp ? pickupPersonName : user?.name;
            const cpfToCheck = isSomeoneElsePickingUp ? pickupPersonCpf : user?.cpf;
            
            if (isPickup && (!nameToCheck || !validateCPF(cpfToCheck))) {
                notification.show("Preencha nome e CPF válidos para quem vai retirar.", 'error');
                reject();
                return;
            }

            setIsLoading(true);
            try {
                const finalShippingAddress = (isPickup || !displayAddress || !displayAddress.id) ? null : displayAddress;
                const cpfToSend = (isSomeoneElsePickingUp ? pickupPersonCpf : user?.cpf)?.replace(/\D/g, '') || '';
                const nameToSend = isSomeoneElsePickingUp ? pickupPersonName : user?.name;

                const orderPayload = {
                    items: cart.map(item => ({ id: item.id, qty: item.qty, price: (item.is_on_sale && item.sale_price ? item.sale_price : item.price), variation: item.variation })),
                    total, shippingAddress: finalShippingAddress, paymentMethod, shipping_method: autoCalculatedShipping.name, shipping_cost: shippingCost,
                    coupon_code: appliedCoupon?.code || null, discount_amount: discount, pickup_details: isPickup ? JSON.stringify({ personName: nameToSend, personCpf: cpfToSend }) : null,
                    phone: whatsapp.replace(/\D/g, '')
                };
                
                const { orderId } = await apiService('/orders', 'POST', orderPayload);

                const actualPaymentData = JSON.parse(JSON.stringify(mpResponse.formData || mpResponse));

                if (actualPaymentData.payer && displayAddress && !isPickup) {
                    actualPaymentData.payer.address = {
                        zip_code: displayAddress.cep.replace(/\D/g, ''),
                        street_name: displayAddress.logradouro,
                        street_number: String(displayAddress.numero),
                        neighborhood: displayAddress.bairro,
                        city: displayAddress.localidade,
                        federal_unit: displayAddress.uf
                    };
                }

                const paymentPayload = {
                    orderId,
                    paymentData: actualPaymentData 
                };

                // Envia o pagamento para a nossa API
                await apiService('/process-payment', 'POST', paymentPayload);

                // IMPORTANTE: Agora nós redirecionamos para a tela de OrderSuccess INDEPENDENTE do status.
                // Se foi recusado, a tela OrderSuccess mostrará o status "Pagamento Recusado" lindamente.
                // Isso tira o usuário do checkout, limpa o carrinho e impede compras duplicadas por acidente.
                clearOrderState();
                onNavigate(`order-success/${orderId}`);
                resolve();

            } catch (error) {
                notification.show(`Erro ao processar: ${error.message}`, 'error');
                reject();
            } finally {
                setIsLoading(false);
            }
        });
    };

    const pAddress = pickupConfig?.address;
    const isPAddressObj = typeof pAddress === 'object' && pAddress !== null;
    const pickupMapsLink = pickupConfig?.mapsLink ? String(pickupConfig.mapsLink).replace(/&amp;/g, '&') : '';

    return (
        <>
            <AnimatePresence>
                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform transition-all ring-1 ring-amber-500/30">
                            <SpinnerIcon className="h-16 w-16 text-amber-400 mb-6 animate-spin" />
                            <h3 className="text-2xl font-extrabold text-white mb-2">Processando Pagamento</h3>
                            <p className="text-sm font-medium text-gray-300">Estamos validando seus dados de forma segura...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AddressSelectionModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} addresses={addresses} onSelectAddress={handleAddressSelection} onAddNewAddress={handleAddNewAddress} />
            <Modal isOpen={isNewAddressModalOpen} onClose={() => setIsNewAddressModalOpen(false)} title="Adicionar Novo Endereço"><AddressForm onSave={handleSaveNewAddress} onCancel={() => setIsNewAddressModalOpen(false)} /></Modal>

            <div className="bg-black text-white pt-8 pb-28 sm:pt-12 sm:pb-12">
                <div className="container mx-auto px-4">
                    <button onClick={() => onNavigate('cart')} className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 mb-6 w-fit bg-gray-800/50 hover:bg-gray-700/50 px-3 py-1.5 rounded-md border border-gray-700">
                        <ArrowUturnLeftIcon className="h-4 w-4"/> Voltar ao Carrinho
                    </button>

                    <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center sm:text-left">Finalizar Pedido</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                        <div className="lg:col-span-7 space-y-8">
                            <CheckoutSection title="Contato para Status" step={1} icon={WhatsappIcon}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp para notificações do pedido <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input type="text" value={whatsapp} onChange={handleWhatsappChange} placeholder="(00) 00000-0000" className="w-full pl-10 p-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 text-white" />
                                            <WhatsappIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                                        </div>
                                    </div>
                                    <div className="bg-blue-900/30 border border-blue-800 p-3 rounded-md flex gap-3 items-start">
                                        <ExclamationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-blue-200">Manteremos você informado sobre cada etapa do seu pedido através deste número.<br/><span className="text-xs text-gray-400 mt-1 block">Caso altere o número aqui, seu cadastro será atualizado automaticamente.</span></p>
                                    </div>
                                </div>
                            </CheckoutSection>

                            <CheckoutSection title="Forma de Entrega" step={2} icon={TruckIcon}>
                                <div className="space-y-3">
                                    {shippingOptions.map(option => (
                                        <div key={option.name} onClick={() => handleSelectShipping(option)} className={`relative p-4 rounded-lg border-2 transition cursor-pointer flex items-center justify-between gap-4 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400 bg-gray-800 shadow-inner' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}>
                                            <div className="absolute top-3 left-3 w-5 h-5 flex items-center justify-center">
                                                <div className={`w-4 h-4 rounded-full border-2 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400' : 'border-gray-500'}`}>
                                                    {autoCalculatedShipping?.name === option.name && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                                </div>
                                            </div>
                                            <div className="pl-8 flex-grow">
                                                <span className="font-bold text-base">{option.name}</span>
                                                <p className="text-xs text-gray-400 mt-0.5">{option.isPickup ? `Retire em nosso endereço físico.` : getDeliveryDateText(option.delivery_time)}</p>
                                            </div>
                                            <span className="font-bold text-amber-400 text-lg flex-shrink-0">{option.price > 0 ? `R$ ${option.price.toFixed(2)}` : 'Grátis'}</span>
                                        </div>
                                    ))}
                                </div>
                            </CheckoutSection>

                            {autoCalculatedShipping?.isPickup ? (
                                <CheckoutSection title="Detalhes da Retirada" icon={BoxIcon}>
                                    <div className="bg-gray-800/80 p-5 sm:p-6 rounded-xl border border-gray-700 mb-5">
                                        <div className="mb-6">
                                            <div className="flex items-center gap-2 mb-3">
                                                <MapPinIcon className="h-5 w-5 text-amber-400" />
                                                <h4 className="font-bold text-white">Endereço de Retirada:</h4>
                                            </div>
                                            
                                            {isPAddressObj ? (
                                                <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-800 ml-7 space-y-1.5 text-sm">
                                                    <div className="flex"><span className="text-gray-500 w-16">Rua:</span> <span className="text-gray-200">{pAddress.rua}</span></div>
                                                    <div className="flex"><span className="text-gray-500 w-16">Nº:</span> <span className="text-gray-200">{pAddress.numero}</span></div>
                                                    <div className="flex"><span className="text-gray-500 w-16">Bairro:</span> <span className="text-gray-200">{pAddress.bairro}</span></div>
                                                    <div className="flex"><span className="text-gray-500 w-16">Cidade:</span> <span className="text-gray-200">{pAddress.cidade}</span></div>
                                                    <div className="flex"><span className="text-gray-500 w-16">Estado:</span> <span className="text-gray-200">{pAddress.estado || pAddress.uf}</span></div>
                                                    <div className="flex"><span className="text-gray-500 w-16">CEP:</span> <span className="text-gray-200 font-mono">{pAddress.cep}</span></div>
                                                </div>
                                            ) : (
                                                <p className="text-gray-300 ml-7 text-sm">{pAddress || 'Endereço não configurado'}</p>
                                            )}

                                            {pickupMapsLink && (
                                                <a 
                                                    href={pickupMapsLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="ml-7 mt-4 inline-flex items-center gap-2 px-4 py-2 border border-amber-500/50 text-amber-400 text-sm font-semibold rounded-md hover:bg-amber-500/10 transition-colors"
                                                >
                                                    Ver localização no mapa <span className="text-lg leading-none mt-[-2px]">→</span>
                                                </a>
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ClockIcon className="h-5 w-5 text-gray-400" />
                                                <h4 className="font-bold text-white">Horário de Funcionamento:</h4>
                                            </div>
                                            <p className="text-gray-300 text-sm ml-7">
                                                {pickupConfig?.hours || 'Segunda a Sábado, das 9h às 11h30 e das 15h às 17h30 (exceto feriados).'}
                                            </p>
                                        </div>

                                        <div className="ml-7 mt-4 bg-amber-900/20 border border-amber-700/50 rounded-md p-3 flex items-start sm:items-center gap-2">
                                            <ExclamationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                            <span className="text-amber-500 font-semibold text-sm">
                                                Aguarde a notificação "Pronto para Retirada" antes de se dirigir ao local.
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 px-1">
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                id="pickup-checkbox" 
                                                checked={isSomeoneElsePickingUp} 
                                                onChange={(e) => setIsSomeoneElsePickingUp(e.target.checked)} 
                                                className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-600 ring-offset-gray-900 cursor-pointer"
                                            />
                                            <label htmlFor="pickup-checkbox" className="ml-3 text-sm text-gray-300 font-medium cursor-pointer select-none">
                                                Outra pessoa vai retirar?
                                            </label>
                                        </div>
                                        {isSomeoneElsePickingUp && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="space-y-3 overflow-hidden bg-gray-800 p-4 rounded-lg border border-gray-700 mt-2"
                                            >
                                                <input 
                                                    type="text" 
                                                    value={pickupPersonName} 
                                                    onChange={(e) => setPickupPersonName(e.target.value)} 
                                                    placeholder="Nome completo de quem vai retirar" 
                                                    className="w-full p-3 bg-gray-700 border-gray-600 border rounded-md text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={pickupPersonCpf} 
                                                    onChange={(e) => setPickupPersonCpf(maskCPF(e.target.value))} 
                                                    placeholder="CPF de quem vai retirar" 
                                                    maxLength="14" 
                                                    className="w-full p-3 bg-gray-700 border-gray-600 border rounded-md text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none"
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </CheckoutSection>
                            ) : (
                                <CheckoutSection title="Endereço de Entrega" icon={MapPinIcon}>
                                     {isAddressLoading ? (
                                        <div className="flex justify-center items-center h-24"><SpinnerIcon className="h-6 w-6 text-amber-400"/></div>
                                    ) : displayAddress && !displayAddress.is_incomplete ? (
                                        <div className="p-4 bg-gray-800 rounded-md border border-gray-700 relative">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-lg mb-2 text-white">{displayAddress.alias}</p>
                                                {!!displayAddress.is_default && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Padrão</span>}
                                            </div>
                                            <div className="space-y-1 text-gray-300 text-sm">
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Rua:</span> {displayAddress.logradouro}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Nº:</span> {displayAddress.numero} {displayAddress.complemento && `- ${displayAddress.complemento}`}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Bairro:</span> {displayAddress.bairro}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Cidade:</span> {displayAddress.localidade} - {displayAddress.uf}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">CEP:</span> {displayAddress.cep}</p>
                                            </div>
                                            <button onClick={() => setIsAddressModalOpen(true)} className="text-amber-400 hover:text-amber-300 mt-4 font-semibold text-sm flex items-center gap-1">
                                                <EditIcon className="h-4 w-4"/> Alterar Endereço
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 bg-red-900/20 rounded-md border border-red-800">
                                            <MapPinIcon className="h-10 w-10 mx-auto text-red-500 mb-3"/>
                                            <p className="text-red-200 font-bold mb-2 text-sm">Endereço Incompleto</p>
                                            <p className="text-gray-400 mb-4 text-xs">Precisamos do nome da rua e número para entregar.</p>
                                            <button onClick={() => setIsNewAddressModalOpen(true)} className="bg-amber-500 text-black px-5 py-2 rounded-md hover:bg-amber-400 font-bold text-sm flex items-center gap-2 mx-auto animate-pulse">
                                                <PlusIcon className="h-4 w-4"/> Preencher Endereço
                                            </button>
                                        </div>
                                    )}
                                </CheckoutSection>
                            )}
                        </div> 

                        <div className="lg:col-span-5">
                             <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 lg:p-6 shadow-lg h-fit lg:sticky lg:top-24">
                                <h2 className="text-xl font-bold mb-5 text-amber-400 border-b border-gray-700 pb-3">Resumo do Pedido</h2>
                                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {cart.map(item => (
                                        <div key={item.cartItemId} className="flex justify-between items-start text-gray-300 text-sm py-2 gap-2 border-b border-gray-800 last:border-0">
                                            <div className="flex items-start gap-3 overflow-hidden">
                                                 <img src={getFirstImage(item.images)} alt={item.name} className="w-10 h-10 object-contain bg-white rounded flex-shrink-0"/>
                                                <div>
                                                    <span className="block font-semibold text-white truncate max-w-[150px]">{item.qty}x {item.name}</span>
                                                    {item.variation && (
                                                        <div className="text-xs text-gray-400 mt-0.5 flex flex-col">
                                                            <span>Cor: {item.variation.color}</span>
                                                            <span>Tam: {item.variation.size}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-medium flex-shrink-0">R$ {( (Number(item.is_on_sale && item.sale_price ? item.sale_price : item.price) || 0) * (Number(item.qty) || 0) ).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="font-medium text-gray-300">R$ {subtotal.toFixed(2)}</span></div>
                                    {autoCalculatedShipping ? (
                                        <div className="flex justify-between text-gray-400">
                                            <span>Frete ({autoCalculatedShipping.name.includes('PAC') ? 'PAC' : autoCalculatedShipping.name})</span>
                                            <span className="font-medium text-gray-300">{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'Grátis'}</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-center py-1">Calcule o frete</div>
                                    )}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-green-400">
                                            <span>Desconto ({appliedCoupon.code})</span>
                                            <span className="font-medium">- R$ {discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-xl mb-6">
                                        <span>Total</span>
                                        <span className="text-amber-400">R$ {total.toFixed(2)}</span>
                                    </div>
                                    {installmentSummary && (
                                        <p className="text-right text-xs text-gray-400 -mt-4 mb-4">
                                            ou em até <span className="font-bold text-gray-200">{installmentSummary}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="mb-6 mt-6">
                                    {!appliedCoupon ? (
                                        <>
                                        <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} type="text" placeholder="Código do Cupom" className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm text-white" />
                                            <button type="submit" className="px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 text-sm transition-colors">Aplicar</button>
                                        </form>
                                        {couponMessage && <p className={`text-xs mt-2 text-center ${couponMessage.includes('aplicado') ? 'text-green-400' : 'text-red-400'}`}>{couponMessage}</p>}
                                        </>
                                    ) : (
                                        <div className="flex justify-between items-center bg-green-900/50 p-3 rounded-md border border-green-700">
                                            <p className="text-sm text-green-300 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/> Cupom <strong>{appliedCoupon.code}</strong> aplicado!</p>
                                            <button onClick={removeCoupon} className="text-xs text-red-400 hover:underline flex-shrink-0">Remover</button>
                                        </div>
                                    )}
                                </div>

                                {(!canPlaceOrder || !autoCalculatedShipping || cart.length === 0) ? (
                                    <div className="text-center p-4 bg-gray-800 border border-gray-700 rounded-lg">
                                        <p className="text-sm text-gray-400">Preencha o contato e a forma de entrega para liberar o pagamento.</p>
                                    </div>
                                ) : (
                                    <div className="mt-4 pt-4 border-t border-gray-700 mp-custom-styles">
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
                                                <span className="block mt-2 text-blue-100">
                                                    Parcelamento da loja: até {Number(paymentInstallmentsConfig?.interest_free_installments) || 4}x sem juros e até {Number(paymentInstallmentsConfig?.max_installments) || 10}x no total. As taxas exibidas no formulário são calculadas pelo Mercado Pago conforme a bandeira do cartão.
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {showBrick ? (
                                            <MercadoPagoPayment
                                                key={`mp-brick-checkout-${total}-${displayAddress?.cep || 'no-cep'}`}
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
