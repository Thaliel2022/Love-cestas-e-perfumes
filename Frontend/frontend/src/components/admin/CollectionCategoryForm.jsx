import React, { useState, useRef } from 'react';
import { apiImageUploadService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { SpinnerIcon, UploadIcon } from '../icons';
export const CollectionCategoryForm = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const notification = useNotification();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadResult = await apiImageUploadService('/upload/image', file);
            setFormData(prev => ({ ...prev, image: uploadResult.imageUrl }));
            notification.show('Upload da imagem concluído!');
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const menuSections = ['Perfumaria', 'Roupas', 'Conjuntos', 'Moda Íntima', 'Calçados', 'Acessórios'];
    const productTypeAssociations = [{value: 'none', label: 'Nenhuma'}, {value: 'perfume', label: 'Perfume'}, {value: 'clothing', label: 'Roupa'}];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Valor do Filtro</label>
                <input type="text" name="filter" value={formData.filter} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Imagem</label>
                <div className="flex items-center gap-2 mt-1">
                    <img src={formData.image || 'https://placehold.co/100x100/eee/ccc?text=?'} alt="Preview" className="w-20 h-20 object-cover rounded-md border bg-gray-100"/>
                    <div className="flex-grow">
                        <input type="text" name="image" value={formData.image} onChange={handleChange} required placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <button type="button" onClick={() => fileInputRef.current.click()} disabled={isUploading} className="mt-2 w-full text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                            {isUploading ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Fazer Upload</>}
                        </button>
                    </div>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Seção Principal do Menu</label>
                <select name="menu_section" value={formData.menu_section} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                    {menuSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Associar à Categoria de Produto (no form de produto)</label>
                <select name="product_type_association" value={formData.product_type_association} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                     {productTypeAssociations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
             <div className="flex items-center">
                <input type="checkbox" name="is_active" id="is_active_form" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                <label htmlFor="is_active_form" className="ml-2 block text-sm text-gray-700">Ativa (visível na loja)</label>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};
