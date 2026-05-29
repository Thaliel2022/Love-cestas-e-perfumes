import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Modal } from '../../components/ui/Modal';
import {
    BoxIcon, CheckIcon, ClockIcon, MapPinIcon, SpinnerIcon,
    TagIcon, TrashIcon, TruckIcon
} from '../../components/icons';

export const AdminShippingSettings = () => {
    const [activeTab, setActiveTab] = useState('pickup'); 
    
    const [config, setConfig] = useState({ base_price: 20, rules: [] });
    const [productsData, setProductsData] = useState({ brands: [], categories: [] });
    const [newRule, setNewRule] = useState({ type: 'category', value: '', action: 'free_shipping', amount: 0 });

    const [pickupConfig, setPickupConfig] = useState({ 
        address: { rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }, 
        hours: '', 
        instructions: '', 
        mapsLink: '' 
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInput, setAuthInput] = useState('');
    const [isAuthVerify, setIsAuthVerify] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [configData, pickupData, products, collections] = await Promise.all([
                    apiService('/settings/shipping-local'),
                    apiService('/settings/pickup'),
                    apiService('/products/all'),
                    apiService('/collections/admin')
                ]);

                setConfig({
                    base_price: parseFloat(configData.base_price) || 20,
                    rules: Array.isArray(configData.rules) ? configData.rules : []
                });

                if (pickupData) {
                    setPickupConfig({
                        address: typeof pickupData.address === 'object' && pickupData.address !== null 
                            ? { ...pickupData.address, estado: pickupData.address.estado || pickupData.address.uf || '' }
                            : { rua: pickupData.address || '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
                        hours: pickupData.hours || '',
                        instructions: pickupData.instructions || '',
                        mapsLink: pickupData.mapsLink || ''
                    });
                }

                const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
                const uniqueCats = [...new Set([...products.map(p => p.category), ...collections.map(c => c.filter)].filter(Boolean))].sort();

                setProductsData({ brands: uniqueBrands, categories: uniqueCats });
            } catch (err) {
                notification.show("Erro ao carregar configurações.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddRule = () => {
        if (!newRule.value) { notification.show("Selecione um valor para a regra.", "error"); return; }
        setConfig(prev => ({ ...prev, rules: [...prev.rules, { ...newRule, id: Date.now(), amount: parseFloat(newRule.amount) || 0 }] }));
        setNewRule({ type: 'category', value: '', action: 'free_shipping', amount: 0 });
    };

    const handleRemoveRule = (id) => {
        setConfig(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== id) }));
    };

    const handlePickupChange = (e) => {
        const { name, value } = e.target;
        setPickupConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setPickupConfig(prev => ({ 
            ...prev, 
            address: { ...prev.address, [name]: value } 
        }));
    };

    const handleSave = () => {
        setIsAuthModalOpen(true);
    };

    const confirmSaveWithAuth = async (e) => {
        e.preventDefault();
        setIsAuthVerify(true);
        setIsSaving(true);
        
        try {
            if (activeTab === 'motoboy') {
                const payload = {
                    base_price: parseFloat(config.base_price),
                    rules: config.rules.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })),
                    password: authInput, 
                    token: authInput.length === 6 && !isNaN(authInput) ? authInput : null 
                };
                await apiService('/settings/shipping-local', 'PUT', payload);
                notification.show("Configurações de frete salvas com sucesso!");
            } else {
                const payload = {
                    config: pickupConfig,
                    password: authInput, 
                    token: authInput.length === 6 && !isNaN(authInput) ? authInput : null 
                };
                await apiService('/settings/pickup', 'PUT', payload);
                notification.show("Configurações de retirada salvas com sucesso!");
            }
            
            setIsAuthModalOpen(false);
            setAuthInput('');
        } catch (err) {
            notification.show(err.message || "Erro ao salvar. Verifique sua senha/token.", "error");
        } finally {
            setIsSaving(false);
            setIsAuthVerify(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><SpinnerIcon className="h-8 w-8 text-indigo-600"/></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <AnimatePresence>
                {isAuthModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsAuthModalOpen(false)} title="Confirmação de Segurança">
                        <form onSubmit={confirmSaveWithAuth} className="space-y-4">
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                <p className="text-sm text-yellow-700">
                                    Esta é uma alteração crítica. Por favor, confirme sua <strong>Senha</strong> ou código <strong>2FA</strong> para continuar.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Senha ou Código 2FA</label>
                                <input 
                                    type="password" 
                                    value={authInput} 
                                    onChange={(e) => setAuthInput(e.target.value)} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Digite sua senha ou token..."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAuthModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700">Cancelar</button>
                                <button type="submit" disabled={isAuthVerify} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
                                    {isAuthVerify && <SpinnerIcon className="h-4 w-4"/>}
                                    Confirmar e Salvar
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <div>
                <h1 className="text-3xl font-bold text-slate-800">Métodos de Entrega e Retirada</h1>
                <p className="text-slate-500">Configure as opções locais oferecidas aos clientes.</p>
            </div>

            <div className="flex border-b border-gray-200 bg-white rounded-t-lg shadow-sm">
                <button 
                    onClick={() => setActiveTab('pickup')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 flex justify-center items-center gap-2 ${activeTab === 'pickup' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    <BoxIcon className="h-5 w-5"/> Retirada na Loja
                </button>
                <button 
                    onClick={() => setActiveTab('motoboy')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 flex justify-center items-center gap-2 ${activeTab === 'motoboy' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    <TruckIcon className="h-5 w-5"/> Frete Local (Motoboy)
                </button>
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'pickup' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <MapPinIcon className="h-5 w-5 text-indigo-600"/> Endereço Principal
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Este é o local onde o cliente buscará o pedido.</p>
                            
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="md:col-span-8">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Rua</label>
                                        <input type="text" name="rua" value={pickupConfig.address?.rua || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Rua / Avenida" />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Número</label>
                                        <input type="text" name="numero" value={pickupConfig.address?.numero || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="123" />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Bairro</label>
                                        <input type="text" name="bairro" value={pickupConfig.address?.bairro || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Bairro" />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cidade</label>
                                        <input type="text" name="cidade" value={pickupConfig.address?.cidade || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Sua Cidade" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Estado</label>
                                        <input type="text" name="estado" value={pickupConfig.address?.estado || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Paraíba" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">CEP</label>
                                        <input type="text" name="cep" value={pickupConfig.address?.cep || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="00000-000" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Link do Google Maps (Opcional, mas recomendado)</label>
                                    <input 
                                        type="url" 
                                        name="mapsLink"
                                        value={pickupConfig.mapsLink}
                                        onChange={handlePickupChange}
                                        placeholder="https://maps.app.goo.gl/..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <ClockIcon className="h-5 w-5 text-indigo-600"/> Detalhes do Funcionamento
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Informações importantes exibidas no Checkout e Rastreador.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Horário de Atendimento</label>
                                    <textarea 
                                        name="hours"
                                        value={pickupConfig.hours}
                                        onChange={handlePickupChange}
                                        rows="2"
                                        placeholder="Segunda a Sábado, das 9h às 18h."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Instruções / O que levar</label>
                                    <textarea 
                                        name="instructions"
                                        value={pickupConfig.instructions}
                                        onChange={handlePickupChange}
                                        rows="2"
                                        placeholder="Apresentar documento com foto e número do pedido."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'motoboy' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TruckIcon className="h-5 w-5 text-indigo-600"/> Preço Base
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 max-w-xs">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Padrão (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={config.base_price} 
                                        onChange={(e) => setConfig({...config, base_price: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex-1 text-sm text-gray-500 pt-6">
                                    Este valor será cobrado se nenhuma regra específica for aplicada.
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TagIcon className="h-5 w-5 text-indigo-600"/> Regras Específicas
                            </h3>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Se</label>
                                    <select value={newRule.type} onChange={(e) => setNewRule({...newRule, type: e.target.value, value: ''})} className="w-full p-2 text-sm border rounded-md">
                                        <option value="category">Categoria</option>
                                        <option value="brand">Marca</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">For Igual A</label>
                                    <select value={newRule.value} onChange={(e) => setNewRule({...newRule, value: e.target.value})} className="w-full p-2 text-sm border rounded-md">
                                        <option value="">Selecione...</option>
                                        {newRule.type === 'category' 
                                            ? productsData.categories.map(c => <option key={c} value={c}>{c}</option>)
                                            : productsData.brands.map(b => <option key={b} value={b}>{b}</option>)
                                        }
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Aplicar</label>
                                    <select value={newRule.action} onChange={(e) => setNewRule({...newRule, action: e.target.value})} className="w-full p-2 text-sm border rounded-md">
                                        <option value="free_shipping">Frete Grátis</option>
                                        <option value="surcharge">Acréscimo (+R$)</option>
                                        <option value="discount">Desconto (-R$)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Valor</label>
                                    <input type="number" disabled={newRule.action === 'free_shipping'} value={newRule.amount} onChange={(e) => setNewRule({...newRule, amount: e.target.value})} className={`w-full p-2 text-sm border rounded-md ${newRule.action === 'free_shipping' ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}`} placeholder="0.00" />
                                </div>
                                <div className="md:col-span-2">
                                    <button onClick={handleAddRule} className="w-full bg-indigo-600 text-white p-2 rounded-md font-bold text-sm hover:bg-indigo-700 transition-colors">+ Adicionar</button>
                                </div>
                            </div>

                            {config.rules.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-sm">Nenhuma regra configurada.</p>
                            ) : (
                                <div className="space-y-2">
                                    {config.rules.map((rule, index) => (
                                        <div key={rule.id || index} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 capitalize">{rule.type === 'category' ? 'Categoria' : 'Marca'}</span>
                                                <span className="text-gray-400">é</span>
                                                <span className="font-bold text-indigo-700">{rule.value}</span>
                                                <span className="text-gray-400">→</span>
                                                {rule.action === 'free_shipping' && <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Frete Grátis</span>}
                                                {rule.action === 'surcharge' && <span className="text-red-600 font-bold">Acréscimo de R$ {Number(rule.amount).toFixed(2)}</span>}
                                                {rule.action === 'discount' && <span className="text-blue-600 font-bold">Desconto de R$ {Number(rule.amount).toFixed(2)}</span>}
                                            </div>
                                            <button onClick={() => handleRemoveRule(rule.id)} className="text-red-400 hover:text-red-600 p-1"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>

            <div className="flex justify-end pt-4">
                <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-70 active:scale-95 transition-all">
                    {isSaving ? <SpinnerIcon className="h-5 w-5"/> : <CheckIcon className="h-5 w-5"/>}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};
