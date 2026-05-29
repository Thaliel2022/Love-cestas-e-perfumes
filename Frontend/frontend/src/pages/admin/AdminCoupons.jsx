import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Modal } from '../../components/ui/Modal';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons';

export const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [productsData, setProductsData] = useState({ brands: [], categories: [] });
    const [searchTerm, setSearchTerm] = useState(''); 
    const [selectedCoupons, setSelectedCoupons] = useState([]); 
    const notification = useNotification();
    const confirmation = useConfirmation();

    // Helper robusto para JSON
    const tryParse = (data) => {
        if (Array.isArray(data)) return data;
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    useEffect(() => {
        fetchCoupons();
        
        Promise.all([
            apiService('/products/all'),
            apiService('/collections/admin')
        ]).then(([products, collections]) => {
            const productBrands = products.map(p => p.brand).filter(b => b && b.trim() !== "");
            const productCats = products.map(p => p.category).filter(c => c && c.trim() !== "");
            const collectionCats = collections.map(c => c.filter || c.name).filter(c => c && c.trim() !== "");

            const uniqueBrands = [...new Set(productBrands)].sort();
            const uniqueCategories = [...new Set([...productCats, ...collectionCats])].sort();

            setProductsData({ brands: uniqueBrands, categories: uniqueCategories });
        }).catch(() => {});
    }, []);

    const fetchCoupons = () => {
        apiService('/coupons').then(setCoupons).catch(console.error);
    };

    const filteredCoupons = coupons.filter(coupon => {
        const term = searchTerm.toLowerCase();
        const codeMatch = coupon.code.toLowerCase().includes(term);
        return codeMatch;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedCoupons(filteredCoupons.map(c => c.id));
        else setSelectedCoupons([]);
    };

    const handleSelectCoupon = (id) => {
        setSelectedCoupons(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
    };

    const handleBulkAction = (action) => {
         if (selectedCoupons.length === 0) return;
         const actionText = action === 'delete' ? 'excluir' : (action === 'deactivate' ? 'desativar' : 'ativar');
         confirmation.show(`Confirmar ${actionText} ${selectedCoupons.length} cupom(ns)?`, async () => {
            try {
                const promises = selectedCoupons.map(id => {
                    if (action === 'delete') return apiService(`/coupons/${id}`, 'DELETE');
                    const original = coupons.find(c => c.id === id);
                    if (!original) return Promise.resolve();
                    return apiService(`/coupons/${id}`, 'PUT', { ...original, is_active: action === 'activate' ? 1 : 0 });
                });
                await Promise.all(promises);
                notification.show(`Ação concluída!`);
                setSelectedCoupons([]);
                fetchCoupons();
            } catch (e) { notification.show(e.message, 'error'); }
         });
    };
    
    const handleSave = async (formData) => {
        try {
            const hasRestrictions = (formData.allowed_categories && formData.allowed_categories.length > 0) || 
                                    (formData.allowed_brands && formData.allowed_brands.length > 0);
            
            const payload = {
                ...formData,
                is_global: hasRestrictions ? 0 : (formData.is_global ? 1 : 0),
                allowed_categories: hasRestrictions ? formData.allowed_categories : [],
                allowed_brands: hasRestrictions ? formData.allowed_brands : []
            };

            if (formData.id) {
                await apiService(`/coupons/${formData.id}`, 'PUT', payload);
                notification.show('Atualizado!');
            } else {
                await apiService('/coupons', 'POST', payload);
                notification.show('Criado!');
            }
            fetchCoupons();
            setIsModalOpen(false);
        } catch (error) { notification.show(error.message, 'error'); }
    };

    const handleDelete = (id) => {
        confirmation.show("Excluir este cupom?", async () => {
            try {
                await apiService(`/coupons/${id}`, 'DELETE');
                fetchCoupons();
                notification.show('Excluído.');
            } catch(e) { notification.show(e.message, 'error'); }
        });
    };

    const CouponCountdown = ({ createdAt, validityDays }) => {
        const [timeLeft, setTimeLeft] = useState('');
        useEffect(() => {
            if (!validityDays || Number(validityDays) === 0) { setTimeLeft('Permanente'); return; }
            const calc = () => {
                const exp = new Date(new Date(createdAt).getTime() + Number(validityDays) * 86400000);
                const diff = exp - new Date();
                if (diff <= 0) { setTimeLeft('Expirado'); return; }
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
            };
            calc();
            const i = setInterval(calc, 1000);
            return () => clearInterval(i);
        }, [createdAt, validityDays]);
        
        let color = 'text-gray-500';
        if(timeLeft === 'Expirado') color = 'text-red-500 font-bold';
        else if(timeLeft === 'Permanente') color = 'text-green-600 font-bold';
        else color = 'text-amber-600 font-mono';
        return <span className={`text-xs ${color}`}>{timeLeft}</span>;
    };

    const CouponForm = ({ item, onSave, onCancel }) => {
        const [form, setForm] = useState(item || {
            code: '', type: 'percentage', value: '', is_active: 1, is_global: 1,
            allowed_categories: [], allowed_brands: [], validity_days: '',
            is_first_purchase: 0, is_single_use_per_user: 0
        });

        const toggleSelection = (field, value) => {
            setForm(prev => {
                const list = prev[field] || [];
                if (list.includes(value)) {
                    return { ...prev, [field]: list.filter(v => v !== value) };
                } else {
                    return { ...prev, [field]: [...list, value], is_global: 0 };
                }
            });
        };

        return (
            <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold">Código</label>
                        <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full p-2 border rounded uppercase" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold">Tipo</label>
                        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2 border rounded">
                            <option value="percentage">%</option>
                            <option value="fixed">R$</option>
                            <option value="free_shipping">Frete Grátis</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     {form.type !== 'free_shipping' && (
                        <div>
                            <label className="block text-sm font-bold">Valor</label>
                            <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full p-2 border rounded" required />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold">Validade (Dias)</label>
                        <input type="number" value={form.validity_days} onChange={e => setForm({...form, validity_days: e.target.value})} placeholder="Vazio = Eterno" className="w-full p-2 border rounded" />
                    </div>
                </div>

                <div className="border-t pt-4">
                     <label className="flex items-center space-x-2 cursor-pointer mb-2 bg-gray-100 p-2 rounded">
                        <input 
                            type="checkbox" 
                            checked={!!form.is_global} 
                            onChange={e => {
                                const checked = e.target.checked;
                                setForm({...form, is_global: checked ? 1 : 0, allowed_categories: checked ? [] : form.allowed_categories, allowed_brands: checked ? [] : form.allowed_brands});
                            }} 
                        />
                        <span className="font-bold">Cupom Global</span>
                    </label>

                    {(!form.is_global || form.allowed_categories.length > 0 || form.allowed_brands.length > 0) && (
                        <div className="bg-white p-3 border rounded">
                             <p className="text-xs text-red-600 font-bold mb-2">*Restrições (Selecione para ativar):</p>
                             <div className="mb-2">
                                <span className="block text-xs font-bold uppercase">Categorias</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {productsData.categories.map(cat => (
                                        <button type="button" key={cat} onClick={() => toggleSelection('allowed_categories', cat)} className={`px-2 py-0.5 text-[10px] rounded border ${form.allowed_categories?.includes(cat) ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>{cat}</button>
                                    ))}
                                </div>
                             </div>
                             <div>
                                <span className="block text-xs font-bold uppercase">Marcas</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {productsData.brands.map(brand => (
                                        <button type="button" key={brand} onClick={() => toggleSelection('allowed_brands', brand)} className={`px-2 py-0.5 text-[10px] rounded border ${form.allowed_brands?.includes(brand) ? 'bg-purple-600 text-white' : 'bg-gray-50'}`}>{brand}</button>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
                
                 <div className="border-t pt-2 space-y-2 bg-yellow-50 p-2 rounded">
                     <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_first_purchase} onChange={e => setForm({...form, is_first_purchase: e.target.checked ? 1 : 0})}/> <span className="text-xs">Apenas 1ª Compra</span></label>
                     <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_single_use_per_user} onChange={e => setForm({...form, is_single_use_per_user: e.target.checked ? 1 : 0})}/> <span className="text-xs">Uso Único por Cliente</span></label>
                </div>
                <div className="pt-2"><label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked ? 1 : 0})}/> <span className="font-bold">Ativo</span></label></div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">Salvar</button>
                </div>
            </form>
        );
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingCoupon ? 'Editar' : 'Novo'}><CouponForm item={editingCoupon} onSave={handleSave} onCancel={() => setIsModalOpen(false)} /></Modal>}
            </AnimatePresence>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Gerenciar Cupons</h1>
                <button onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }} className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2"><PlusIcon className="h-5 w-5"/> Novo</button>
            </div>
            
            {/* Barra de Pesquisa */}
            <div className="mb-6 relative">
                <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 border rounded shadow-sm" />
                <div className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400"><SearchIcon className="h-5 w-5" /></div>
            </div>

            {/* Barra de Ações em Massa (Visível apenas se houver seleção) */}
            <AnimatePresence>
                {selectedCoupons.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-6 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 shadow-md"
                    >
                        <div className="text-sm font-bold text-blue-800">
                            {selectedCoupons.length} selecionado(s)
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleBulkAction('activate')} className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">Ativar</button>
                            <button onClick={() => handleBulkAction('deactivate')} className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded hover:bg-yellow-600">Desativar</button>
                            <button onClick={() => handleBulkAction('delete')} className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 flex items-center gap-1"><TrashIcon className="h-3 w-3"/> Excluir</button>
                            <button onClick={() => setSelectedCoupons([])} className="px-2 py-1 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100">Cancelar</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Seleção Múltipla Mobile (Apenas Checkbox) */}
            <div className="md:hidden flex items-center mb-4 px-1">
                <input 
                    type="checkbox" 
                    id="mobile-select-all"
                    onChange={handleSelectAll} 
                    checked={filteredCoupons.length > 0 && selectedCoupons.length === filteredCoupons.length}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5 mr-2"
                />
                <label htmlFor="mobile-select-all" className="text-sm font-bold text-gray-700">Selecionar Todos</label>
            </div>

            <div className="hidden md:block bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 w-10"><input type="checkbox" onChange={handleSelectAll} checked={filteredCoupons.length > 0 && selectedCoupons.length === filteredCoupons.length}/></th>
                            <th className="p-3">Código</th><th className="p-3">Regra</th><th className="p-3">Desc.</th><th className="p-3">Restrições</th><th className="p-3">Valid.</th><th className="p-3">Status</th><th className="p-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCoupons.map(c => (
                            <tr key={c.id} className="border-b hover:bg-gray-50">
                                <td className="p-3"><input type="checkbox" checked={selectedCoupons.includes(c.id)} onChange={() => handleSelectCoupon(c.id)}/></td>
                                <td className="p-3 font-mono font-bold text-blue-600">{c.code}</td>
                                <td className="p-3 text-xs">{c.is_global ? <span className="text-green-600 font-bold">Global</span> : <span className="text-amber-600 font-bold">Restrito</span>}</td>
                                <td className="p-3 text-sm">{c.type === 'free_shipping' ? 'Grátis' : (c.type === 'percentage' ? `${c.value}%` : `R$${c.value}`)}</td>
                                <td className="p-3 text-xs text-gray-500">
                                    {!c.is_global && (
                                        <div className="flex flex-col gap-1">
                                            {tryParse(c.allowed_brands).length > 0 && <span className="text-purple-700">M: {tryParse(c.allowed_brands).join(', ')}</span>}
                                            {tryParse(c.allowed_categories).length > 0 && <span className="text-blue-700">C: {tryParse(c.allowed_categories).join(', ')}</span>}
                                        </div>
                                    )}
                                    {!!c.is_first_purchase && <div className="text-amber-700 font-semibold">• 1ª Compra</div>}
                                    {!!c.is_single_use_per_user && <div className="text-blue-700 font-semibold">• Uso Único</div>}
                                </td>
                                <td className="p-3"><CouponCountdown createdAt={c.created_at} validityDays={c.validity_days}/></td>
                                <td className="p-3"><span className={`px-2 py-0.5 text-xs rounded ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => { setEditingCoupon({ ...c, allowed_categories: tryParse(c.allowed_categories), allowed_brands: tryParse(c.allowed_brands) }); setIsModalOpen(true); }}><EditIcon className="h-4 w-4 text-gray-500"/></button>
                                    <button onClick={() => handleDelete(c.id)}><TrashIcon className="h-4 w-4 text-red-500"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="md:hidden space-y-3">
                 {filteredCoupons.map(c => (
                    <div key={c.id} className={`bg-white border rounded p-3 relative ${selectedCoupons.includes(c.id) ? 'border-blue-400 ring-1 ring-blue-400' : ''}`}>
                         <div className="flex justify-between">
                            <div><h3 className="font-bold text-blue-700">{c.code}</h3><p className="text-xs">{c.type === 'free_shipping' ? 'Frete Grátis' : `${c.value}${c.type==='percentage'?'%':'R$'}`}</p></div>
                            <input type="checkbox" checked={selectedCoupons.includes(c.id)} onChange={() => handleSelectCoupon(c.id)}/>
                         </div>
                         
                         <div className="flex justify-between mt-2 text-xs text-gray-500 items-center">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{c.is_global ? 'Global' : 'Restrito'}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {c.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <CouponCountdown createdAt={c.created_at} validityDays={c.validity_days}/>
                         </div>

                         <div className="text-xs mt-2">
                            {!c.is_global && (
                                <div className="flex flex-col gap-1 text-gray-600 bg-gray-50 p-1 rounded">
                                    {tryParse(c.allowed_brands).length > 0 && <span>M: {tryParse(c.allowed_brands).join(', ')}</span>}
                                    {tryParse(c.allowed_categories).length > 0 && <span>C: {tryParse(c.allowed_categories).join(', ')}</span>}
                                </div>
                            )}
                            {!!c.is_first_purchase && <span className="block text-amber-700 font-semibold">• 1ª Compra</span>}
                            {!!c.is_single_use_per_user && <span className="block text-blue-700 font-semibold">• Uso Único</span>}
                         </div>
                         <div className="flex justify-end gap-3 mt-2 border-t pt-2">
                            <button onClick={() => { setEditingCoupon({ ...c, allowed_categories: tryParse(c.allowed_categories), allowed_brands: tryParse(c.allowed_brands) }); setIsModalOpen(true); }} className="text-blue-600 text-xs font-bold flex gap-1"><EditIcon className="h-3 w-3"/> Edit</button>
                            <button onClick={() => handleDelete(c.id)} className="text-red-600 text-xs font-bold flex gap-1"><TrashIcon className="h-3 w-3"/> Del</button>
                         </div>
                    </div>
                 ))}
            </div>
        </div>
    );
};
