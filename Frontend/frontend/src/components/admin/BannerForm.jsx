import React, { useState, useEffect, useRef } from 'react';
import { apiImageUploadService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { SpinnerIcon, UploadIcon } from '../icons';
export const BannerForm = ({ item, section, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);
    const [uploading, setUploading] = useState({ desktop: false, mobile: false });
    const desktopInputRef = useRef(null);
    const mobileInputRef = useRef(null);
    const notification = useNotification();

    // Garante atualização se o item mudar (ex: ao clicar num template)
    useEffect(() => {
        setFormData(item);
    }, [item]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleFileChange = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [type]: true }));
        try {
            const uploadResult = await apiImageUploadService('/upload/image', file);
            const fieldName = type === 'desktop' ? 'image_url' : 'image_url_mobile';
            setFormData(prev => ({ ...prev, [fieldName]: uploadResult.imageUrl }));
            notification.show(`Upload concluído!`);
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
            event.target.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const getHints = () => {
        switch(section) {
            case 'promo': return { title: "Destaque Agendável (Meio)", sizeDesktop: "1920 x 600 px", showMobile: false, showSchedule: true, aspectDesktop: "aspect-[21/9]", aspectMobile: "aspect-[4/5]" };
            case 'cards': return { title: "Card de Categoria (Inferior)", sizeDesktop: "600 x 800 px", showMobile: false, showSchedule: false, aspectDesktop: "aspect-[3/4]", aspectMobile: "aspect-[3/4]" };
            default: return { title: "Banner Rotativo (Topo)", sizeDesktop: "1920 x 720 px", showMobile: true, showSchedule: false, aspectDesktop: "aspect-[21/9]", aspectMobile: "aspect-[4/5]" };
        }
    };

    const hints = getHints();

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <h3 className="font-bold text-gray-800">{hints.title}</h3>
                <p className="text-sm text-gray-500">Configure as imagens e textos para esta área.</p>
            </div>

            {/* Agendamento (Apenas para Promoção) */}
            {hints.showSchedule && (
                <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div>
                        <label className="block text-xs font-bold text-blue-800 mb-1">Início (Opcional)</label>
                        <input type="datetime-local" name="start_date" value={formData.start_date || ''} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-800 mb-1">Fim (Opcional)</label>
                        <input type="datetime-local" name="end_date" value={formData.end_date || ''} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded text-sm"/>
                    </div>
                    <p className="col-span-2 text-[10px] text-blue-600">*Deixe em branco para exibir imediatamente e sem prazo de validade.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Imagem Principal</label>
                    <p className="text-xs text-amber-600 mt-1 font-semibold">Recomendado: {hints.sizeDesktop} (Proporção real mantida)</p>
                    <div className="flex flex-col gap-2 mt-2">
                        <div className={`w-full bg-gray-100 rounded-md border border-gray-300 flex items-center justify-center overflow-hidden shadow-inner ${hints.aspectDesktop}`}>
                            <img src={formData.image_url || 'https://placehold.co/1920x720/eee/ccc?text=Sem+Imagem'} alt="Preview" className="w-full h-full object-cover"/>
                        </div>
                        <input type="text" name="image_url" value={formData.image_url || ''} onChange={handleChange} required placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"/>
                        <input type="file" ref={desktopInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'desktop')} />
                        <button type="button" onClick={() => desktopInputRef.current.click()} disabled={uploading.desktop} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                            {uploading.desktop ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Upload Imagem</>}
                        </button>
                    </div>
                </div>
                
                {hints.showMobile && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Imagem Mobile (Opcional)</label>
                        <p className="text-xs text-amber-600 mt-1 font-semibold">Recomendado: 1080 x 1350 px (Proporção real mantida)</p>
                        <div className="flex flex-col gap-2 mt-2">
                            <div className={`w-full max-w-[200px] mx-auto bg-gray-100 rounded-md border border-gray-300 flex items-center justify-center overflow-hidden shadow-inner ${hints.aspectMobile}`}>
                                <img src={formData.image_url_mobile || 'https://placehold.co/1080x1350/eee/ccc?text=Mobile'} alt="Preview Mobile" className="w-full h-full object-cover"/>
                            </div>
                            <input type="text" name="image_url_mobile" value={formData.image_url_mobile || ''} onChange={handleChange} placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"/>
                            <input type="file" ref={mobileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'mobile')} />
                            <button type="button" onClick={() => mobileInputRef.current.click()} disabled={uploading.mobile} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                                {uploading.mobile ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Upload Mobile</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

             <div>
                <label className="block text-sm font-medium text-gray-700">Link de Destino</label>
                <input type="text" name="link_url" value={formData.link_url} onChange={handleChange} required placeholder="Ex: products?category=Blusas" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Título</label>
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subtítulo</label>
                    <input type="text" name="subtitle" value={formData.subtitle || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                 <div className="flex items-center pt-2">
                    <input type="checkbox" name="cta_enabled" id="cta_enabled_form" checked={!!formData.cta_enabled} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                    <label htmlFor="cta_enabled_form" className="ml-2 block text-sm font-medium text-gray-700">Exibir Botão?</label>
                </div>
                {!!formData.cta_enabled && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Texto do Botão</label>
                        <input type="text" name="cta_text" value={formData.cta_text || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                )}
            </div>

             <div className="flex items-center">
                <input type="checkbox" name="is_active" id="is_active_form" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                <label htmlFor="is_active_form" className="ml-2 block text-sm text-gray-700 font-bold">Banner Ativo</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-amber-500 text-black rounded-md hover:bg-amber-400 font-bold shadow-md">Salvar</button>
            </div>
        </form>
    );
};
