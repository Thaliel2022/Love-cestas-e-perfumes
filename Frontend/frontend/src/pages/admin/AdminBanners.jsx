import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Modal } from '../../components/ui/Modal';
import { BannerForm } from '../../components/admin/BannerForm';
import { SortableBannerCard, StaticBannerCard } from '../../components/admin/BannerCards';
import { ClockIcon, EditIcon, PlusIcon, SparklesIcon, SpinnerIcon, TrashIcon } from '../../components/icons';

export const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('promo'); 
    const [editingBanner, setEditingBanner] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();
    
    // Configuração dos sensores com distância de ativação para permitir scroll no mobile
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const fetchBanners = useCallback(() => {
        setIsLoading(true);
        apiService('/banners/admin')
            .then(data => {
                if (Array.isArray(data)) {
                    setBanners(data);
                } else {
                    setBanners([]);
                }
            })
            .catch(err => notification.show(`Erro ao buscar banners: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => { fetchBanners() }, [fetchBanners]);

    // --- POPULAR BANCO DE DADOS (ACIONA O BACKEND) ---
    const handleInitializeDefaults = async () => {
        confirmation.show("Deseja popular o banco com as campanhas sazonais padrão? (Não duplicará existentes)", async () => {
            setIsGenerating(true);
            try {
                const response = await apiService('/banners/seed-defaults', 'POST');
                notification.show(response.message);
                fetchBanners();
            } catch (error) {
                notification.show(`Erro ao popular: ${error.message}`, 'error');
            } finally {
                setIsGenerating(false);
            }
        });
    };

    // Separação dos banners vindos do Banco
    const carouselBanners = banners.filter(b => b.display_order < 50).sort((a, b) => a.display_order - b.display_order);
    
    // Lista de Destaques (Ordem 50)
    const promoBanners = banners.filter(b => b.display_order === 50).sort((a, b) => {
        if (!a.start_date) return -1;
        if (!b.start_date) return 1;
        return new Date(a.start_date) - new Date(b.start_date);
    });

    const card1 = banners.find(b => b.display_order === 60);
    const card2 = banners.find(b => b.display_order === 61);

    const handleOpenModal = (banner, section) => {
        let initialData = banner ? { ...banner } : {};
        
        if (!banner) {
            if (section === 'carousel') {
                const maxOrder = carouselBanners.length > 0 ? Math.max(...carouselBanners.map(b => b.display_order)) : -1;
                initialData = { 
                    name: '', link_url: '', image_url: '', image_url_mobile: '', is_active: 1, 
                    cta_enabled: 1, cta_text: 'Ver Mais', display_order: maxOrder + 1 
                };
            } else if (section === 'promo') {
                initialData = { name: '', link_url: '', image_url: '', is_active: 1, cta_enabled: 1, display_order: 50 };
            } else if (section === 'cards') {
                // Tenta preencher o slot vazio (60 ou 61)
                const nextSlot = !card1 ? 60 : 61;
                initialData = { name: '', link_url: '', image_url: '', is_active: 1, cta_enabled: 1, display_order: nextSlot };
            }
        }
        setEditingBanner(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            const payload = { ...formData, display_order: parseInt(formData.display_order) };
            if (!payload.start_date) payload.start_date = null;
            if (!payload.end_date) payload.end_date = null;

            if (formData.id) {
                await apiService(`/banners/${formData.id}`, 'PUT', payload);
                notification.show('Atualizado!');
            } else {
                await apiService('/banners/admin', 'POST', payload);
                notification.show('Criado!');
            }
            fetchBanners();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        if (!id) return;
        confirmation.show(
            "Excluir este banner permanentemente?", 
            async () => {
                try {
                    await apiService(`/banners/${id}`, 'DELETE');
                    notification.show('Excluído.');
                    fetchBanners();
                } catch (error) {
                    notification.show(`Erro: ${error.message}`, 'error');
                }
            },
            { 
                confirmText: "Excluir", 
                confirmColor: "bg-red-600 hover:bg-red-700",
                requiresAuth: true // Segurança adicionada
            }
        );
    };
    
    // Drag & Drop do Carrossel (Topo)
    const handleDragEndCarousel = async (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = carouselBanners.findIndex((b) => b.id === active.id);
            const newIndex = carouselBanners.findIndex((b) => b.id === over.id);
            
            // Reordena o array
            const newOrder = arrayMove(carouselBanners, oldIndex, newIndex);
            
            // Atualiza o display_order localmente para evitar o flicker do React
            const updatedNewOrder = newOrder.map((banner, index) => ({
                ...banner,
                display_order: index
            }));
            
            // Atualiza UI localmente
            const others = banners.filter(b => b.display_order >= 50);
            setBanners([...updatedNewOrder, ...others]);

            const orderedIds = updatedNewOrder.map(b => b.id);
            try {
                await apiService('/banners/order', 'PUT', { orderedIds });
                notification.show('Ordem salva!');
            } catch (error) {
                notification.show('Erro ao salvar ordem.', 'error');
                fetchBanners();
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editor de Banner">
                         <BannerForm item={editingBanner} section={activeTab} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestão Visual</h1>
                    <p className="text-gray-500">Controle total via Banco de Dados.</p>
                </div>
                
                {/* Botão de Inicialização (Seed) - Visível se não houver destaques */}
                {promoBanners.length === 0 && (
                    <button 
                        onClick={handleInitializeDefaults} 
                        disabled={isGenerating}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-bold shadow-md animate-pulse"
                    >
                        {isGenerating ? <SpinnerIcon/> : <SparklesIcon className="h-5 w-5"/>}
                        Inicializar Banco com Padrões
                    </button>
                )}
            </div>

            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm">
                {['promo', 'cards', 'carousel'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)} 
                        className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 capitalize ${activeTab === tab ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        {tab === 'promo' ? 'Destaques Agendados' : (tab === 'cards' ? 'Cards Inferiores' : 'Carrossel Topo')}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <>
                    {/* --- ABA DESTAQUES (CAMPANHAS) --- */}
                    {activeTab === 'promo' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div>
                                    <h3 className="font-bold text-blue-900">Campanhas de Destaque</h3>
                                    <p className="text-xs text-blue-700">Listagem direta do banco. Apenas 1 banner (o com data válida mais próxima) aparecerá na Home.</p>
                                </div>
                                <button onClick={() => handleOpenModal(null, 'promo')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-bold shadow-sm">
                                    <PlusIcon className="h-4 w-4"/> Criar Campanha
                                </button>
                            </div>

                            {promoBanners.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {promoBanners.map(banner => {
                                        const now = new Date();
                                        const start = banner.start_date ? new Date(banner.start_date) : null;
                                        const end = banner.end_date ? new Date(banner.end_date) : null;
                                        
                                        const isActiveNow = !!banner.is_active && (!start || now >= start) && (!end || now <= end);
                                        const isDefault = !start && !end;
                                        
                                        return (
                                            <div key={banner.id} className={`flex flex-col md:flex-row bg-white border rounded-lg overflow-hidden shadow-sm ${isActiveNow ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200 opacity-80'}`}>
                                                <div className="w-full md:w-48 h-32 bg-gray-100 relative">
                                                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover"/>
                                                    {isActiveNow && <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded font-bold shadow">NO AR</span>}
                                                    {isDefault && <span className="absolute bottom-2 left-2 bg-gray-600 text-white text-[10px] px-2 py-1 rounded font-bold shadow">PADRÃO</span>}
                                                </div>
                                                <div className="p-4 flex-grow flex flex-col justify-center">
                                                    <h4 className="font-bold text-gray-800 text-lg">{banner.title}</h4>
                                                    <p className="text-sm text-gray-500">{banner.subtitle}</p>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                                        {start ? (
                                                            <>
                                                                <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100"><ClockIcon className="h-3 w-3 inline mr-1"/> De: {start.toLocaleDateString()}</span>
                                                                <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100">Até: {end ? end.toLocaleDateString() : 'Indefinido'}</span>
                                                            </>
                                                        ) : (
                                                            <span className="bg-gray-100 px-2 py-1 rounded border">Sem agendamento (Exibido se nenhum outro estiver ativo)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-4 flex md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l bg-gray-50">
                                                    <button onClick={() => handleOpenModal(banner, 'promo')} className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 font-bold text-xs flex items-center justify-center gap-1">
                                                        <EditIcon className="h-4 w-4"/> Editar
                                                    </button>
                                                    <button onClick={() => handleDelete(banner.id)} className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 font-bold text-xs flex items-center justify-center gap-1">
                                                        <TrashIcon className="h-4 w-4"/> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                                    <p className="text-gray-400 mb-4">Nenhuma campanha no banco. Clique em "Inicializar Banco" acima.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- ABA CARDS --- */}
                    {activeTab === 'cards' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <p className="text-sm text-purple-800">Cards fixos inferiores (Posições 60 e 61).</p>
                                {(!card1 || !card2) && <button onClick={() => handleOpenModal(null, 'cards')} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">Adicionar Card</button>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[card1, card2].map((card, idx) => (
                                    card ? (
                                        <StaticBannerCard 
                                            key={card.id} 
                                            banner={card} 
                                            onEdit={() => handleOpenModal(card, 'cards')} 
                                            onDelete={() => handleDelete(card.id)} 
                                            customLabel={idx === 0 ? "ESQUERDA" : "DIREITA"}
                                            customColor="bg-purple-600 text-white"
                                        />
                                    ) : (
                                        <div key={idx} className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                            <p className="text-sm font-bold">Slot {idx === 0 ? 'Esquerdo' : 'Direito'} Vazio</p>
                                            <button onClick={() => handleOpenModal(null, 'cards')} className="text-amber-600 hover:underline text-sm font-bold flex items-center gap-1 mt-2">
                                                <PlusIcon className="h-4 w-4"/> Adicionar Manualmente
                                            </button>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- ABA CARROSSEL --- */}
                    {activeTab === 'carousel' && (
                         <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600">Banners do topo. Arraste para ordenar.</p>
                                <button onClick={() => handleOpenModal(null, 'carousel')} className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">Novo Banner</button>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCarousel}>
                                <SortableContext items={carouselBanners} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {carouselBanners.map((banner) => (
                                            <SortableBannerCard 
                                                key={banner.id} 
                                                banner={banner} 
                                                onEdit={(b) => handleOpenModal(b, 'carousel')} 
                                                onDelete={() => handleDelete(banner.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                            {carouselBanners.length === 0 && <p className="text-center text-gray-400 py-10">Carrossel vazio.</p>}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
