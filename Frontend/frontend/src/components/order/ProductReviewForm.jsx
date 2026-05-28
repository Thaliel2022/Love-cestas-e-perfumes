import React, { useState, useRef } from 'react';
import { apiImageUploadService, apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { CameraIcon, SpinnerIcon, StarIcon, XMarkIcon } from '../icons';

export const ProductReviewForm = ({ productId, orderId, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [images, setImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fileInputRef = useRef(null);
    const notification = useNotification();
    const MAX_COMMENT_LENGTH = 500;

    const handleCommentChange = (e) => {
        setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH));
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // --- NOVA VALIDAÇÃO DE SEGURANÇA E UX NO FRONTEND ---
        const validFiles = [];
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB em bytes

        for (const file of files) {
            // Verifica o tamanho do ficheiro
            if (file.size > MAX_FILE_SIZE) {
                notification.show(`A imagem ${file.name} é demasiado grande (Máx: 5MB).`, "error");
                continue;
            }
            // Verifica se é realmente uma imagem pelo MIME Type
            if (!file.type.startsWith('image/')) {
                notification.show(`O ficheiro ${file.name} não é uma imagem válida.`, "error");
                continue;
            }
            validFiles.push(file);
        }

        if (images.length + validFiles.length > 3) {
            notification.show("Pode enviar no máximo 3 fotos por avaliação.", "error");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (validFiles.length === 0) {
             if (fileInputRef.current) fileInputRef.current.value = '';
             return;
        }

        setIsUploading(true);
        try {
            // Faz o upload apenas dos ficheiros validados
            const uploadPromises = validFiles.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            
            setImages(prev => [...prev, ...newImageUrls]);
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (indexToRemove) => {
        setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            notification.show("Por favor, selecione uma nota clicando nas estrelas.", 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await apiService(`/reviews`, 'POST', {
                product_id: productId,
                order_id: orderId,
                rating: rating,
                comment: comment,
                images: images // Envia o array de imagens para o banco
            });
            notification.show("Avaliação enviada com sucesso!");
            if (onReviewSubmitted) {
                onReviewSubmitted();
            }
        } catch (error) {
            notification.show(error.message || "Não foi possível enviar sua avaliação.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 text-gray-800">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Sua Nota <span className="text-red-500">*</span></label>
                <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} onClick={() => setRating(i + 1)} className={`h-10 w-10 cursor-pointer transition-transform hover:scale-110 ${i < rating ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`} isFilled={i < rating} />
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Adicionar Fotos (Opcional)</label>
                <p className="text-xs text-gray-500 mb-3">Partilhe fotos do produto recebido (Máx 3 fotos de até 5MB cada).</p>
                
                <div className="flex gap-3 overflow-x-auto py-2">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 flex-shrink-0 rounded-lg border border-gray-200 shadow-sm group">
                            <img src={img} alt={`Foto ${idx+1}`} className="w-full h-full object-cover rounded-lg" />
                            <button 
                                type="button" 
                                onClick={() => removeImage(idx)} 
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                            >
                                <XMarkIcon className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    
                    {images.length < 3 && (
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current.click()} 
                            disabled={isUploading}
                            className="w-20 h-20 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        >
                            {isUploading ? <SpinnerIcon className="h-6 w-6"/> : <CameraIcon className="h-6 w-6"/>}
                            <span className="text-[10px] font-bold mt-1">Add Foto</span>
                        </button>
                    )}
                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">O Seu Comentário (Opcional)</label>
                <textarea 
                    value={comment} 
                    onChange={handleCommentChange} 
                    placeholder="Conte-nos o que achou da qualidade, entrega, tamanho..." 
                    className="w-full p-3 border border-gray-300 rounded-lg h-24 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                    maxLength={MAX_COMMENT_LENGTH}
                />
                <div className="text-right text-xs text-gray-500 mt-1 font-medium">
                    {comment.length} / {MAX_COMMENT_LENGTH}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
                <button type="submit" disabled={isSubmitting || rating === 0} className="bg-gray-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-black disabled:bg-gray-400 flex items-center justify-center shadow-md active:scale-95 transition-all">
                    {isSubmitting ? <SpinnerIcon /> : "Enviar Avaliação"}
                </button>
            </div>
        </form>
    );
};
