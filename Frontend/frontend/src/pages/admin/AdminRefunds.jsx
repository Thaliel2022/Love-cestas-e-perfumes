import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Modal } from '../../components/ui/Modal';
import { maskCPF, maskPhone } from '../../utils/validation';
import { CheckIcon, CurrencyDollarArrowIcon, SpinnerIcon, WhatsappIcon, XMarkIcon } from '../../components/icons';

export const AdminRefunds = ({ onNavigate }) => {
    const [refunds, setRefunds] = useState([]);
    const [filteredRefunds, setFilteredRefunds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [isDenyModalOpen, setIsDenyModalOpen] = useState(false);
    const [denyReason, setDenyReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Novo estado para o Lightbox no painel Admin
    const [lightboxImage, setLightboxImage] = useState(null);
    
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchRefunds = useCallback(() => {
        setIsLoading(true);
        apiService('/refunds')
            .then(data => {
                setRefunds(data);
                setFilteredRefunds(data);
            })
            .catch(err => notification.show(`Erro ao buscar reembolsos: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    const handleApprove = (refund) => {
        confirmation.show(
            `Tem certeza que deseja aprovar e processar o reembolso de R$ ${Number(refund.amount).toFixed(2)} para o pedido #${refund.order_id}? Esta ação é irreversível.`,
            async () => {
                try {
                    const result = await apiService(`/refunds/${refund.id}/approve`, 'POST');
                    notification.show(result.message);
                    fetchRefunds();
                } catch (error) {
                    notification.show(`Erro ao aprovar: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true, confirmText: 'Aprovar e Processar', confirmColor: 'bg-green-600 hover:bg-green-700' }
        );
    };

    const handleDeny = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const result = await apiService(`/refunds/${selectedRefund.id}/deny`, 'POST', { reason: denyReason });
            notification.show(result.message);
            setIsDenyModalOpen(false);
            setDenyReason('');
            fetchRefunds();
        } catch (error) {
            notification.show(`Erro ao negar: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusChip = (status) => {
        const statuses = {
            'pending_approval': { text: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
            'approved': { text: 'Aprovado', class: 'bg-blue-100 text-blue-800' },
            'denied': { text: 'Negado', class: 'bg-red-100 text-red-800' },
            'processed': { text: 'Processado', class: 'bg-green-100 text-green-800' },
            'failed': { text: 'Falhou', class: 'bg-gray-200 text-gray-800' }
        };
        const s = statuses[status] || { text: 'Desconhecido', class: 'bg-gray-200 text-gray-800' };
        return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${s.class}`}>{s.text}</span>;
    };
    
    const getPaymentMethodName = (method, details) => {
        if (method === 'mercadopago') {
            try {
                const parsedDetails = JSON.parse(details);
                if (parsedDetails.method === 'credit_card') return 'Cartão de Crédito';
                if (parsedDetails.method === 'pix') return 'Pix';
                if (parsedDetails.method === 'boleto') return 'Boleto';
            } catch (e) { /* cai para o fallback */ }
        }
        return method?.replace('_', ' ') || 'N/A';
    };

    const Lightbox = ({ mainImage, onClose }) => ( 
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={onClose}> 
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white text-5xl leading-none z-[1000] p-2 hover:text-red-500 transition-colors">×</button> 
            <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <img src={mainImage} alt="Imagem ampliada" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            </div> 
        </div> 
    );

    // FUNÇÃO SEGURA PARA LER IMAGENS E ITENS
    const safeParseJSON = (data, fallback = []) => {
        if (!data) return fallback;
        try {
            let parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Para duplo stringify
            return Array.isArray(parsed) ? parsed : fallback;
        } catch (e) {
            return fallback;
        }
    };

    return (
        <div>
            {lightboxImage && (
                 <Lightbox mainImage={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}

            <AnimatePresence>
                {isDenyModalOpen && selectedRefund && (
                     <Modal isOpen={true} onClose={() => setIsDenyModalOpen(false)} title={`Negar Reembolso #${selectedRefund.id}`}>
                        <form onSubmit={handleDeny}>
                            <label className="block text-sm font-medium text-gray-700">Por favor, informe o motivo da negação (será registrado internamente e visível para o cliente):</label>
                            <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                                <button type="button" onClick={() => setIsDenyModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md font-semibold text-gray-700 hover:bg-gray-300 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-gray-800 text-white rounded-md font-bold hover:bg-gray-900 transition-colors flex items-center gap-2 disabled:bg-gray-400">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Confirmar Negação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6 text-slate-800 tracking-tight">Gerenciar Devoluções e Reembolsos</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-indigo-600" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Pedido</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Cliente e Contato</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Valor / Data</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs w-1/3">Itens e Motivo</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Status</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRefunds.length > 0 ? (
                                    filteredRefunds.map(r => {
                                        const images = safeParseJSON(r.images);
                                        const items = safeParseJSON(r.order_items);

                                        return (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors align-top">
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div className="font-mono font-bold text-indigo-600 text-base">#{r.order_id}</div>
                                                    {r.request_count > 1 && (
                                                        <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded border border-orange-200 font-bold uppercase animate-pulse">
                                                            Reaberto ({r.request_count}ª vez)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Atualizado em:<br/>{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                                            </td>
                                            
                                            <td className="p-4">
                                                <p className="font-bold text-gray-900">{r.customer_name}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">CPF: {maskCPF(r.customer_cpf || '---')}</p>
                                                
                                                {/* Contato para Coleta */}
                                                {r.contact_phone ? (
                                                    <div className="mt-2 bg-blue-50 border border-blue-100 p-2 rounded-md inline-block">
                                                        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1">WhatsApp Coleta:</p>
                                                        <a href={`https://wa.me/55${r.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-green-700 font-bold hover:underline text-xs">
                                                            <WhatsappIcon className="h-4 w-4"/> {maskPhone(r.contact_phone)}
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 mt-2 italic">Telefone p/ coleta não informado.</p>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <p className="font-bold text-green-600 text-lg">R$ {Number(r.amount).toFixed(2)}</p>
                                                <p className="text-xs text-gray-500 mt-1 capitalize">{getPaymentMethodName(r.payment_method, r.payment_details)}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">Pago em: {new Date(r.order_date).toLocaleDateString('pt-BR')}</p>
                                            </td>
                                            
                                            <td className="p-4">
                                                {/* Lista de Produtos */}
                                                <div className="mb-3 bg-gray-100 p-2 rounded border border-gray-200">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Itens do Pedido:</p>
                                                    <ul className="text-xs text-gray-700 space-y-1">
                                                        {items.map((item, idx) => (
                                                            <li key={idx} className="flex gap-1 truncate">
                                                                <span className="font-bold">{item.quantity}x</span> {item.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                                                    <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1">Motivo / Relato:</p>
                                                    <p className="text-sm text-gray-800 font-medium break-words leading-snug">{r.reason}</p>
                                                </div>

                                                {/* Galeria de Fotos */}
                                                {images.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fotos Anexadas ({images.length}):</p>
                                                        <div className="flex gap-2 overflow-x-auto py-1">
                                                            {images.map((img, idx) => (
                                                                <div key={idx} onClick={() => setLightboxImage(img)} className="w-12 h-12 flex-shrink-0 cursor-zoom-in rounded border border-gray-300 shadow-sm overflow-hidden hover:scale-110 transition-transform bg-white">
                                                                    <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            
                                            <td className="p-4 align-middle">
                                                {getStatusChip(r.status)}
                                            </td>
                                            
                                            <td className="p-4 align-middle text-center">
                                                {r.status === 'pending_approval' ? (
                                                    <div className="flex flex-col gap-2 items-center">
                                                        <button onClick={() => handleApprove(r)} className="w-full py-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-bold rounded-lg transition-colors border border-green-200 text-xs shadow-sm flex items-center justify-center gap-1">
                                                            <CheckIcon className="h-4 w-4"/> Aprovar
                                                        </button>
                                                        <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="w-full py-2 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-bold rounded-lg transition-colors border border-red-200 text-xs shadow-sm flex items-center justify-center gap-1">
                                                            <XMarkIcon className="h-4 w-4"/> Negar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Finalizado</span>
                                                )}
                                            </td>
                                        </tr>
                                    )})
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <CurrencyDollarArrowIcon className="h-12 w-12 text-gray-300 mb-3" />
                                                <h3 className="text-lg font-bold text-gray-700">Nenhum reembolso encontrado</h3>
                                                <p className="text-sm text-gray-500 mt-1">Ainda não há solicitações de reembolso no sistema.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                     {/* Mobile Card View */}
                     <div className="md:hidden p-4 bg-gray-50 space-y-4">
                        {filteredRefunds.length > 0 ? (
                            filteredRefunds.map(r => {
                                const images = safeParseJSON(r.images);
                                const items = safeParseJSON(r.order_items);
                                return (
                                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-sm">
                                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                                        <div className="flex flex-col gap-1 items-start">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-indigo-700 text-lg">Pedido #{r.order_id}</p>
                                            </div>
                                            {r.request_count > 1 && (
                                                <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded border border-orange-200 font-bold uppercase animate-pulse mb-1">
                                                    Reaberto ({r.request_count}ª vez)
                                                </span>
                                            )}
                                            <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
                                        </div>
                                        {getStatusChip(r.status)}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                                        <div>
                                            <strong className="text-gray-500 block text-[10px] uppercase tracking-wide">Cliente</strong> 
                                            <span className="font-medium text-gray-900">{r.customer_name}</span>
                                            <span className="block text-xs font-mono text-gray-500">{maskCPF(r.customer_cpf || '')}</span>
                                        </div>
                                        <div>
                                            <strong className="text-gray-500 block text-[10px] uppercase tracking-wide">Valor do Reembolso</strong> 
                                            <span className="font-bold text-green-600 text-lg">R$ {Number(r.amount).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Whatsapp da Coleta Mobile */}
                                    {r.contact_phone && (
                                        <div className="mb-3 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                                            <strong className="text-blue-800 block text-[10px] uppercase tracking-wide mb-1">Agendar Coleta (WhatsApp)</strong>
                                            <a href={`https://wa.me/55${r.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-green-700 font-bold hover:underline text-sm">
                                                <WhatsappIcon className="h-5 w-5"/> {maskPhone(r.contact_phone)}
                                            </a>
                                        </div>
                                    )}

                                    {/* Itens do Pedido Mobile */}
                                    <div className="mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <strong className="text-gray-500 block text-[10px] uppercase tracking-wide mb-1.5">Itens Comprados</strong>
                                        <ul className="text-xs text-gray-700 space-y-1">
                                            {items.map((item, idx) => (
                                                <li key={idx} className="flex gap-1">
                                                    <span className="font-bold">{item.quantity}x</span> <span className="truncate">{item.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="border-t border-gray-100 pt-3">
                                        <strong className="text-gray-500 block text-[10px] uppercase tracking-wide mb-1">Motivo do Cliente</strong>
                                        <p className="text-gray-900 break-words bg-yellow-50 p-3 rounded-lg border border-yellow-100 font-medium leading-snug">{r.reason}</p>
                                        
                                        {images.length > 0 && (
                                            <div className="mt-3">
                                                <strong className="text-gray-500 block text-[10px] uppercase tracking-wide mb-2">Fotos Anexadas</strong>
                                                <div className="flex gap-2 overflow-x-auto py-1">
                                                    {images.map((img, idx) => (
                                                        <div key={idx} onClick={() => setLightboxImage(img)} className="w-16 h-16 flex-shrink-0 cursor-zoom-in rounded-lg border border-gray-300 shadow-sm overflow-hidden active:scale-95 transition-transform bg-white">
                                                            <img src={img} alt="Anexo do cliente" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {r.status === 'pending_approval' && (
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                            <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl transition-colors shadow-sm">Negar</button>
                                            <button onClick={() => handleApprove(r)} className="flex-1 py-3 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold rounded-xl transition-colors shadow-sm">Aprovar</button>
                                        </div>
                                    )}
                                </div>
                            )})
                        ) : (
                            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <CurrencyDollarArrowIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-gray-700">Nenhum reembolso</h3>
                                <p className="text-sm text-gray-500 mt-1">Ainda não há solicitações.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
