import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Modal } from '../../components/ui/Modal';
import { CollectionCategoryForm } from '../../components/admin/CollectionCategoryForm';
import { SortableCategoryCard } from '../../components/admin/SortableCategoryCard';
import { PlusIcon, SpinnerIcon } from '../../components/icons';

export const AdminCollections = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const notification = useNotification();
    const confirmation = useConfirmation();
    const sensors = useSensors(useSensor(PointerSensor));

    const fetchCategories = useCallback(() => {
        setIsLoading(true);
        apiService('/collections/admin')
            .then(data => {
                if (!Array.isArray(data)) {
                    notification.show("Erro: A resposta da API é inválida.", 'error');
                    setCategories([]);
                } else {
                    setCategories(data);
                }
            })
            .catch(err => {
                notification.show(`Erro ao buscar categorias: ${err.message}`, 'error');
                setCategories([]);
            })
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category = null) => {
        const initialData = category ? 
            {...category} : 
            { name: '', filter: '', image: '', is_active: 1, product_type_association: 'none', menu_section: 'Roupas'};
        setEditingCategory(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingCategory && editingCategory.id) {
                await apiService(`/collections/${editingCategory.id}`, 'PUT', formData);
                notification.show('Categoria atualizada com sucesso!');
            } else {
                await apiService('/collections/admin', 'POST', formData);
                notification.show('Categoria criada com sucesso!');
            }
            fetchCategories();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro ao salvar: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.", async () => {
            try {
                await apiService(`/collections/${id}`, 'DELETE');
                notification.show('Categoria deletada com sucesso.');
                fetchCategories();
            } catch (error) {
                notification.show(`Erro ao deletar: ${error.message}`, 'error');
            }
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);
            const newOrder = arrayMove(categories, oldIndex, newIndex);
            
            setCategories(newOrder); // Atualização otimista da UI

            setIsSavingOrder(true);
            const orderedIds = newOrder.map(c => c.id);
            try {
                await apiService('/collections/order', 'PUT', { orderedIds });
                notification.show('Ordem salva com sucesso!');
            } catch (error) {
                notification.show(`Erro ao salvar a ordem: ${error.message}`, 'error');
                fetchCategories(); // Reverte para a ordem do servidor em caso de erro
            } finally {
                setIsSavingOrder(false);
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory && editingCategory.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}>
                        <CollectionCategoryForm item={editingCategory} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Coleções</h1>
                <div className="flex items-center gap-4">
                    {isSavingOrder && <div className="flex items-center gap-2 text-sm text-gray-500"><SpinnerIcon/> Salvando ordem...</div>}
                    <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 flex-shrink-0">
                        <PlusIcon className="h-5 w-5"/> <span>Nova Categoria</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {categories.map(cat => (
                                <SortableCategoryCard key={cat.id} cat={cat} onEdit={handleOpenModal} onDelete={handleDelete} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};
