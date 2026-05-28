import React, { useRef } from 'react';
import { getClothingColorSwatchStyle } from './clothingColors';
import { CameraIcon, CheckCircleIcon, TrashIcon, UploadIcon, XMarkIcon } from '../icons';
export const VariationInputRow = ({ variation, index, onVariationChange, onRemoveVariation, availableColors, availableSizes, onImageUpload, uploadStatus, isFirstOfColor }) => {
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileChange = (e) => {
        onImageUpload(e);
    };

    const handleRemoveImage = (imgIndex) => {
        const updatedImages = variation.images.filter((_, i) => i !== imgIndex);
        onVariationChange(index, 'images', updatedImages);
    };

    return (
        <div className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-white rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
            {/* Número da Variação (Visual) */}
            <div className="absolute -left-2 -top-2 w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold border border-gray-200 shadow-sm z-10">
                {index + 1}
            </div>

            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">Cor</label>
                <div className="relative">
                    <select 
                        value={variation.color} 
                        onChange={(e) => onVariationChange(index, 'color', e.target.value)} 
                        className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block transition-colors"
                    >
                        <option value="">Selecione...</option>
                        {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {variation.color && (
                        <div
                            className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-400 shadow-sm pointer-events-none"
                            style={getClothingColorSwatchStyle(variation.color)}
                            title={variation.color}
                            aria-hidden
                        />
                    )}
                </div>
            </div>
            
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Tamanho</label>
                <input 
                    type="text" 
                    list={`available-sizes-${index}`} 
                    value={variation.size} 
                    onChange={(e) => onVariationChange(index, 'size', e.target.value)} 
                    className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 uppercase transition-colors" 
                    placeholder="M, 42..."
                />
                <datalist id={`available-sizes-${index}`}>{availableSizes.map(s => <option key={s} value={s}>{s}</option>)}</datalist>
            </div>
            
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Estoque</label>
                <input 
                    type="number" 
                    min="0" 
                    value={variation.stock} 
                    onChange={(e) => onVariationChange(index, 'stock', parseInt(e.target.value, 10) || 0)} 
                    className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                    placeholder="0"
                />
            </div>

            <div className={`md:col-span-4 space-y-2 ${!isFirstOfColor ? 'opacity-50 grayscale' : ''}`}>
                 {isFirstOfColor ? (
                    <>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Imagens ({variation.color || 'Geral'})</label>
                        <div className="p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50 min-h-[64px] flex flex-wrap gap-2 items-center transition-colors hover:bg-gray-100">
                            {variation.images && variation.images.length > 0 ? (
                                variation.images.map((img, imgIndex) => (
                                    <div key={imgIndex} className="relative group/img w-10 h-10">
                                        <img src={img} alt="Var" className="w-full h-full object-cover rounded-md border border-gray-200 shadow-sm" />
                                        <button type="button" onClick={() => handleRemoveImage(imgIndex)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-all shadow-sm hover:bg-red-600 transform hover:scale-110">
                                            <XMarkIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))
                            ) : ( 
                                <span className="text-xs text-gray-400 w-full text-center">Sem imagens</span> 
                            )}
                            
                            <div className="flex gap-1 ml-auto">
                                <input type="file" multiple accept="image/*" ref={galleryInputRef} onChange={handleFileChange} className="hidden" />
                                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                                <button type="button" onClick={() => galleryInputRef.current.click()} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors" title="Galeria"><UploadIcon className="h-4 w-4" /></button>
                                <button type="button" onClick={() => cameraInputRef.current.click()} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors" title="Câmera"><CameraIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                        {uploadStatus && <p className={`text-[10px] font-medium mt-1 ${uploadStatus.startsWith('Erro') ? 'text-red-500' : 'text-green-600 flex items-center gap-1'} animate-pulse`}><CheckCircleIcon className="h-3 w-3 inline"/> {uploadStatus}</p>}
                    </>
                 ) : (
                    <div className="flex items-center h-full pt-4">
                        <p className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded border border-gray-100 w-full text-center">Imagens vinculadas à 1ª variação desta cor.</p>
                    </div>
                 )}
            </div>

            <div className="md:col-span-1 flex items-center justify-end h-full pt-6">
                <button type="button" onClick={() => onRemoveVariation(index)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all" title="Remover variação">
                    <TrashIcon className="h-5 w-5"/>
                </button>
            </div>
        </div>
    );
};
