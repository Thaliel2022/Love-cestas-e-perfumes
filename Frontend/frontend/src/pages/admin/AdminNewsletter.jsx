import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { PaperAirplaneIcon, SparklesIcon, SpinnerIcon, TagIcon } from '../../components/icons';

export const AdminNewsletter = ({ appName }) => {
    const [subscribers, setSubscribers] = useState([]);
    const [products, setProducts] = useState([]); // Lista de produtos para o select
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('compose');
    
    // Estados do Formulário
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [ctaLink, setCtaLink] = useState('');
    const [ctaText, setCtaText] = useState('');
    
    // Novos Estados para Produto
    const [selectedProductId, setSelectedProductId] = useState('');
    const [discountText, setDiscountText] = useState('');

    const [isSending, setIsSending] = useState(false);
    
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchData = useCallback(() => {
        setIsLoading(true);
        Promise.all([
            apiService('/newsletter/subscribers'),
            apiService('/products') // Busca produtos para o dropdown
        ])
        .then(([subsData, productsData]) => {
            setSubscribers(subsData || []);
            // CORREÇÃO: Garante que é array independente do formato retornado
            const productsArray = Array.isArray(productsData) ? productsData : (productsData.products || []);
            setProducts(productsArray);
        })
        .catch(err => notification.show('Erro ao carregar dados.', 'error'))
        .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => { fetchData() }, [fetchData]);

    const handleSend = (e) => {
        e.preventDefault();
        
        if (subscribers.length === 0) {
            notification.show("Sua lista de e-mails está vazia.", "error");
            return;
        }

        confirmation.show(
            `Confirmar envio para ${subscribers.length} pessoas? Esta ação não pode ser desfeita.`,
            async () => {
                setIsSending(true);
                try {
                    const response = await apiService('/newsletter/broadcast', 'POST', {
                        subject,
                        message,
                        ctaLink,
                        ctaText,
                        productId: selectedProductId || null, 
                        discountText
                    });
                    notification.show(response.message, 'success');
                    
                    // Limpar formulário
                    setSubject('');
                    setMessage('');
                    setCtaLink('');
                    setCtaText('');
                    setSelectedProductId('');
                    setDiscountText('');
                } catch (error) {
                    notification.show(error.message, 'error');
                } finally {
                    setIsSending(false);
                }
            },
            { 
                confirmText: "ENVIAR CAMPANHA", 
                confirmColor: "bg-green-600 hover:bg-green-700",
                requiresAuth: true // Exige Senha/2FA para enviar
            }
        );
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Marketing & Clube VIP</h1>
                <p className="text-gray-500">Gerencie sua lista e envie ofertas exclusivas.</p>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total de Inscritos</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{subscribers.length}</p>
                </div>
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-lg shadow-md text-white">
                    <h3 className="text-white/80 text-xs font-bold uppercase tracking-wider">Potencial de Venda</h3>
                    <p className="text-3xl font-bold mt-2 flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6"/> Alto
                    </p>
                    <p className="text-xs text-white/80 mt-1">Sua lista é seu maior ativo.</p>
                </div>
            </div>

            {/* Abas */}
            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm">
                <button 
                    onClick={() => setActiveTab('compose')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'compose' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Nova Campanha
                </button>
                <button 
                    onClick={() => setActiveTab('list')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'list' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Ver Lista ({subscribers.length})
                </button>
            </div>

            {activeTab === 'compose' && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm animate-fade-in">
                    <form onSubmit={handleSend} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Assunto do E-mail</label>
                            <input 
                                type="text" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Ex: 🔥 Oferta Relâmpago: 20% OFF só hoje!" 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Mensagem Principal</label>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escreva sua mensagem aqui... Dica: Seja breve e direto." 
                                rows="6"
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                            <h4 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                                <TagIcon className="h-4 w-4"/> Destaque de Produto (Opcional)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 mb-1">Selecionar Produto</label>
                                    <select 
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full p-2 border border-blue-300 rounded-md text-sm bg-white"
                                    >
                                        <option value="">-- Nenhum Produto Selecionado --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.sale_price || p.price).toFixed(2)}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedProductId && (
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 mb-1">Texto do Desconto/Chamada</label>
                                        <input 
                                            type="text" 
                                            value={discountText}
                                            onChange={(e) => setDiscountText(e.target.value)}
                                            placeholder="Ex: 20% OFF SOMENTE HOJE" 
                                            className="w-full p-2 border border-blue-300 rounded-md text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-blue-600 mt-2">
                                *Se selecionado, um card com a foto, nome e preço do produto será inserido automaticamente no meio do e-mail.
                            </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                            <h4 className="font-bold text-gray-700 text-sm mb-3">Botão de Ação Extra (Opcional)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Texto do Botão</label>
                                    <input 
                                        type="text" 
                                        value={ctaText}
                                        onChange={(e) => setCtaText(e.target.value)}
                                        placeholder="Ex: Ver Toda a Loja" 
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Link de Destino</label>
                                    <input 
                                        type="text" 
                                        value={ctaLink}
                                        onChange={(e) => setCtaLink(e.target.value)}
                                        placeholder="Ex: https://loja.com.br" 
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end pt-4 border-t">
                            <button 
                                type="submit" 
                                disabled={isSending}
                                className="bg-green-600 text-white px-8 py-3 rounded-md font-bold hover:bg-green-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {isSending ? <SpinnerIcon className="h-5 w-5"/> : <PaperAirplaneIcon className="h-5 w-5"/>}
                                {isSending ? 'Enviando...' : 'Enviar para Todos'}
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-4">
                            Você recebeu este e-mail porque se inscreveu no Clube VIP da {appName || 'loja'}.
                        </p>
                    </form>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-bold text-gray-600">Email</th>
                                <th className="p-4 font-bold text-gray-600">Data de Inscrição</th>
                                <th className="p-4 font-bold text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {subscribers.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{sub.email}</td>
                                    <td className="p-4 text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Ativo</span>
                                    </td>
                                </tr>
                            ))}
                            {subscribers.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-400">Nenhum inscrito ainda.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
