import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { BoxIcon, ExclamationCircleIcon, MapPinIcon, PlusCircleIcon, SpinnerIcon, TruckIcon } from '../icons';
import { Modal } from '../ui/Modal';
import { useNotification } from '../../contexts/NotificationContext';
import { useShop } from '../../contexts/ShopContext';
import { maskCEP } from '../../utils/validation';

export const ShippingCalculator = memo(({ items: itemsFromProp }) => {
    const { 
        cart,
        addresses, 
        shippingLocation, 
        setShippingLocation,
        shippingOptions,
        isLoadingShipping,
        shippingError,
        autoCalculatedShipping,
        setAutoCalculatedShipping,
        setPreviewShippingItem,
        setSelectedShippingName,
        isGeolocating 
    } = useShop();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualCep, setManualCep] = useState('');
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (itemsFromProp && itemsFromProp.length > 0) {
            setPreviewShippingItem(itemsFromProp);
        }
        
        return () => {
            if (itemsFromProp && itemsFromProp.length > 0) {
                setPreviewShippingItem(null);
            }
        };
    }, [itemsFromProp, setPreviewShippingItem]);
    
    const handleSelectShipping = (option) => {
        setAutoCalculatedShipping(option);
        setSelectedShippingName(option.name);
    };

    const handleSelectAddress = (addr) => {
        setShippingLocation({ cep: addr.cep, city: addr.localidade, state: addr.uf, alias: addr.alias });
        setIsModalOpen(false);
    };

    const handleManualCepSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        const cleanCep = manualCep.replace(/\D/g, '');
        if (cleanCep.length !== 8) { setApiError("CEP inválido."); return; }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) { setApiError("CEP não encontrado."); } else {
                setShippingLocation({ cep: manualCep, city: data.localidade, state: data.uf, alias: `CEP ${manualCep}` });
                setIsModalOpen(false);
                setManualCep('');
            }
        } catch { setApiError("Não foi possível buscar o CEP."); }
    };
    
    const handleCepInputChange = (e) => {
        setManualCep(maskCEP(e.target.value));
        if (apiError) setApiError('');
    };

    const getDeliveryDate = (deliveryTime) => {
        // Correção: Se já for uma string formatada pelo ShopProvider para Motoboy
        if (typeof deliveryTime === 'string' && deliveryTime.includes('Receba até')) {
             return `${deliveryTime} (1 dia útil)`;
        }

        if (!deliveryTime || isNaN(deliveryTime)) return 'Prazo indisponível';
        
        const date = new Date();
        let addedDays = 0;
        while (addedDays < deliveryTime) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) addedDays++;
        }
        return `Previsão de entrega para ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;
    };

    // Correção: Mostra o nome do endereço salvo (Alias) se ele existir e for válido
    const locationTitle = shippingLocation.alias && shippingLocation.alias !== 'Localização Atual' && !shippingLocation.alias.startsWith('CEP') 
        ? `Opções para ${shippingLocation.alias} (${shippingLocation.cep})` 
        : `Opções para ${shippingLocation.cep}`;

    return (
        <>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Alterar Endereço de Entrega" size="md">
                <div className="space-y-4">
                    {addresses && addresses.length > 0 && addresses.map(addr => (
                         <div key={addr.id} onClick={() => handleSelectAddress(addr)} className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50">
                             <p className="font-bold text-gray-800">{addr.alias}</p>
                             <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero} - {addr.bairro}</p>
                         </div>
                    ))}
                    <div className="pt-4 border-t">
                        <form onSubmit={handleManualCepSubmit} className="space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Calcular frete para um novo CEP</label>
                             <div className="flex gap-2">
                                <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="00000-000" className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
                                <button type="submit" className="bg-gray-800 text-white font-bold px-4 rounded-md hover:bg-black">OK</button>
                             </div>
                             {apiError && <p className="text-red-500 text-xs mt-1">{apiError}</p>}
                        </form>
                    </div>
                </div>
            </Modal>

            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="min-h-[60px]">
                    {shippingLocation.cep.replace(/\D/g, '').length === 8 ? (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-300">
                                    <MapPinIcon className="h-5 w-5 flex-shrink-0 text-amber-400" />
                                    {/* Aplicando a formatação corrigida aqui */}
                                    <span className="truncate">{locationTitle}</span>
                                </div>
                                <button onClick={() => setIsModalOpen(true)} className="text-amber-400 hover:underline flex-shrink-0 text-sm font-semibold">
                                    Alterar
                                </button>
                            </div>
                            {isLoadingShipping && <div className="flex items-center gap-2 animate-pulse"><SpinnerIcon className="h-5 w-5 text-amber-400" /><span className="text-gray-400">Calculando...</span></div>}
                            {!isLoadingShipping && shippingError && (<div className="text-red-400 text-sm">{shippingError}</div>)}
                            {!isLoadingShipping && shippingOptions.length > 0 && (
                                <div className="space-y-3">
                                    {shippingOptions.map(option => (
                                        <div key={option.name} onClick={() => handleSelectShipping(option)} className={`flex items-center justify-between p-3 rounded-md border-2 transition-all cursor-pointer ${autoCalculatedShipping?.name === option.name ? 'border-amber-400 bg-amber-900/40' : 'border-gray-700 hover:bg-gray-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 flex items-center justify-center">
                                                    <div className={`w-4 h-4 rounded-full border-2 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400' : 'border-gray-500'}`}>
                                                        {autoCalculatedShipping?.name === option.name && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                                    </div>
                                                </div>
                                                <div className="text-gray-300">{option.isPickup ? <BoxIcon className="h-6 w-6"/> : <TruckIcon className="h-6 w-6"/>}</div>
                                                <div>
                                                    <p className="font-semibold text-white">{option.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {option.isPickup ? option.delivery_time : getDeliveryDate(option.delivery_time)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-bold text-lg text-amber-400">{option.price > 0 ? `R$ ${option.price.toFixed(2)}` : 'Grátis'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoadingShipping && shippingOptions.length === 0 && !shippingError && (
                                <div><p className="text-gray-400 text-sm">Nenhuma opção de entrega encontrada para este CEP.</p></div>
                            )}
                        </>
                    ) : (
                        isGeolocating ? (
                            <div className="flex items-center gap-2 animate-pulse py-4">
                                <SpinnerIcon className="h-5 w-5 text-amber-400" />
                                <span className="text-gray-400 text-sm">Obtendo sua localização para calcular o frete...</span>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-medium text-gray-200 mb-2">Calcular frete e prazo</p>
                                <form onSubmit={handleManualCepSubmit} className="flex gap-2">
                                    <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="Digite seu CEP" className="w-full p-2 bg-gray-800 border-gray-700 border rounded-md text-white"/>
                                    <button type="submit" className="bg-amber-400 text-black font-bold px-4 rounded-md hover:bg-amber-300">Calcular</button>
                                </form>
                                {apiError && <p className="text-red-500 text-xs mt-1">{apiError}</p>}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
});

export const AddressForm = ({ initialData = {}, onSave, onCancel, isFirstAddress = false }) => {
    const isEditing = Boolean(initialData?.id);
    const inputClass = "w-full p-3 bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/50 transition-all";

    const [formData, setFormData] = useState({
        alias: initialData.alias || '',
        cep: initialData.cep || '',
        logradouro: initialData.logradouro || '',
        numero: initialData.numero || '',
        complemento: initialData.complemento || '',
        bairro: initialData.bairro || '',
        localidade: initialData.localidade || '',
        uf: initialData.uf || '',
        is_default: isEditing ? !!initialData.is_default : isFirstAddress,
    });
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();

    const handleCepLookup = useCallback(async (cepValue) => {
        const cep = cepValue.replace(/\D/g, '');
        if (cep.length !== 8) return;
        
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Falha na resposta da API de CEP.');
            
            const data = await response.json();
            if (!data.erro) {
                setFormData(prev => ({ 
                    ...prev, 
                    logradouro: data.logradouro, 
                    bairro: data.bairro, 
                    localidade: data.localidade, 
                    uf: data.uf
                }));
            } else {
                notification.show("CEP não encontrado.", "error");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            notification.show("Não foi possível buscar o CEP. Tente novamente.", "error");
        }
    }, [notification]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCepChange = (e) => {
        const newCep = maskCEP(e.target.value);
        setFormData(prev => ({ ...prev, cep: newCep }));
        if (newCep.replace(/\D/g, '').length === 8) {
            handleCepLookup(newCep);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };
    
    const isFormValid = useMemo(() => {
        const { alias, cep, logradouro, numero, bairro, localidade, uf } = formData;
        return alias && cep.replace(/\D/g, '').length === 8 && logradouro && numero && bairro && localidade && uf;
    }, [formData]);

    // Identifica quais campos exatos estão faltando
    const missingFields = useMemo(() => {
        const missing = [];
        if (!formData.alias) missing.push('Apelido');
        if (!formData.cep || formData.cep.replace(/\D/g, '').length !== 8) missing.push('CEP Válido');
        if (!formData.logradouro) missing.push('Rua');
        if (!formData.numero) missing.push('Número');
        if (!formData.bairro) missing.push('Bairro');
        if (!formData.localidade) missing.push('Cidade');
        if (!formData.uf) missing.push('UF');
        return missing;
    }, [formData]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-200">
            <input name="alias" value={formData.alias} onChange={handleChange} placeholder="Apelido do Endereço (ex: Casa, Trabalho)" className={inputClass} required />
            <input name="cep" value={formData.cep} onChange={handleCepChange} placeholder="CEP" className={inputClass} required />
            <input name="logradouro" value={formData.logradouro} onChange={handleChange} placeholder="Rua / Logradouro" className={inputClass} required />
            <div className="flex space-x-4">
                <input name="numero" value={formData.numero} onChange={handleChange} placeholder="Número" className={`w-1/2 ${inputClass}`} required />
                <input name="complemento" value={formData.complemento} onChange={handleChange} placeholder="Complemento (Opcional)" className={`w-1/2 ${inputClass}`} />
            </div>
            <input name="bairro" value={formData.bairro} onChange={handleChange} placeholder="Bairro" className={inputClass} required />
            <div className="flex space-x-4">
                <input name="localidade" value={formData.localidade} onChange={handleChange} placeholder="Cidade" className={`flex-grow ${inputClass}`} required />
                <input name="uf" value={formData.uf} onChange={handleChange} placeholder="UF" maxLength="2" className={`w-1/4 ${inputClass} uppercase`} required />
            </div>
            <div className="flex items-center pt-2 px-1 py-2 rounded-lg bg-gray-800/50 border border-gray-700/80">
                <input type="checkbox" id="is_default" name="is_default" checked={formData.is_default} onChange={handleChange} className="h-4 w-4 text-amber-500 bg-gray-900 border-gray-600 rounded focus:ring-amber-400 cursor-pointer" />
                <label htmlFor="is_default" className="ml-2 block text-sm font-semibold text-gray-300 cursor-pointer">Salvar como meu endereço padrão</label>
            </div>
            {isFirstAddress && !isEditing && (
                <p className="text-xs text-amber-400/90 pl-1">Como este é seu primeiro endereço, ele será salvo como padrão automaticamente.</p>
            )}
            {!isFormValid && (
                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-300 font-medium flex items-start gap-2">
                    <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-400" />
                    <span>Falta preencher: <strong className="text-red-200">{missingFields.join(', ')}</strong></span>
                </div>
            )}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-2">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 font-bold text-gray-300 transition-colors">Cancelar</button>
                <button
                    type="submit"
                    disabled={!isFormValid || isSaving}
                    className="px-6 py-2.5 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 active:scale-95 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center transition-all"
                >
                    {isSaving ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Salvar Endereço'}
                </button>
            </div>
        </form>
    );
};

export const AddressSelectionModal = ({ isOpen, onClose, addresses, onSelectAddress, onAddNewAddress }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selecione um Endereço de Entrega" size="md">
            <div className="space-y-3">
                {addresses.map(addr => (
                    <div 
                        key={addr.id} 
                        onClick={() => onSelectAddress(addr)}
                        className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50"
                    >
                        <p className="font-bold text-gray-800">{addr.alias} {addr.is_default ? <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full ml-2">Padrão</span> : ''}</p>
                        <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero}</p>
                        <p className="text-sm text-gray-500">{addr.bairro}, {addr.localidade} - {addr.uf}</p>
                        <p className="text-sm text-gray-500">{addr.cep}</p>
                    </div>
                ))}
                {addresses.length < 5 && (
                    <button 
                        onClick={onAddNewAddress}
                        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
                    >
                        <PlusCircleIcon className="h-6 w-6" />
                        <span>Adicionar Novo Endereço</span>
                    </button>
                )}
            </div>
        </Modal>
    );
};
