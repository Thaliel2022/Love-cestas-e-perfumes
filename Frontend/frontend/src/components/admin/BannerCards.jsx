import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarsGripIcon, EditIcon, TrashIcon } from '../icons';

export const SortableBannerCard = ({ banner, onEdit, onDelete, isLastItem }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: banner.id });
    
    // CORREÇÃO: Removido o touchAction: 'none' daqui para liberar o scroll na foto
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg shadow-sm overflow-hidden group relative ${!banner.is_active ? 'opacity-50' : ''} ${isLastItem ? 'border-2 border-amber-500 ring-2 ring-amber-100' : ''}`}>
             {isLastItem && (
                 <div className="absolute top-0 left-0 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 z-20 shadow-md">
                     DESTAQUE (HOME)
                 </div>
             )}
             
             {/* CORREÇÃO: touchAction: 'none' colocado APENAS no botão de arrastar */}
             <div 
                {...attributes} 
                {...listeners} 
                style={{ touchAction: 'none' }}
                className="absolute top-2 right-2 p-2 bg-black/40 rounded-full cursor-grab active:cursor-grabbing text-white opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                title="Arraste para reordenar"
             >
                <BarsGripIcon className="h-5 w-5" />
            </div>
            
            <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-32 object-cover"/>
            <div className="p-3">
                <p className="font-bold text-sm truncate">{banner.title || "Banner sem título"}</p>
                <p className="text-xs text-gray-500 truncate">Link: {banner.link_url}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => onEdit(banner)} className="p-1 text-gray-400 hover:text-amber-600"><EditIcon className="h-5 w-5"/></button>
                        <button onClick={() => onDelete(banner.id)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StaticBannerCard = ({ banner, onEdit, onDelete, customLabel, customColor }) => {
    return (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden relative">
             <div className={`absolute top-0 left-0 text-[10px] font-bold px-2 py-1 z-20 shadow-md ${customColor || 'bg-gray-600 text-white'}`}>
                 {customLabel}
             </div>
            <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-32 object-cover"/>
            <div className="p-3">
                <p className="font-bold text-sm truncate">{banner.title || "Banner sem título"}</p>
                <p className="text-xs text-gray-500 truncate">Link: {banner.link_url}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => onEdit(banner)} className="p-1 text-gray-400 hover:text-amber-600"><EditIcon className="h-5 w-5"/></button>
                        <button onClick={() => onDelete(banner.id)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};
