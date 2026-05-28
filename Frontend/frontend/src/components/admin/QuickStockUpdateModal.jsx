import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../ui/Modal';
import { SpinnerIcon } from '../icons';
export const QuickStockUpdateModal = ({ item, onClose, onSave }) => {
    const [stock, setStock] = useState(item.stock);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();

    const handleSave = async () => {
       // console.log('QuickStockUpdateModal - Item recebido:', JSON.stringify(item, null, 2)); // Removido ou comentado
        setIsSaving(true);
        try {
            const payload = {
            productId: item.id,
            newStock: parseInt(stock, 10),
            // CORREÇÃO: Certifica que o objeto `variation` está sendo enviado corretamente
            // O `item` recebido já contém a estrutura correta vinda do `lowStockProducts`
            variation: item.product_type === 'clothing' ? item.variation : null
        };
        // console.log('QuickStockUpdateModal - Payload a ser enviado:', JSON.stringify(payload, null, 2)); // Removido ou comentado
            // CORREÇÃO: Removido o "/api" duplicado.
            await apiService('/products/stock-update', 'PUT', payload);
            notification.show('Estoque atualizado com sucesso!');
            onSave(); // Fecha o modal e atualiza a lista
        } catch (error) {
            notification.show(`Erro ao atualizar estoque: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Atualização Rápida de Estoque" size="sm">
            <div className="space-y-4">
                <p className="font-semibold text-lg">{item.name}</p>
                <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700">Novo Estoque:</label>
                    <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center"
                    >
                        {isSaving ? <SpinnerIcon /> : 'Salvar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
