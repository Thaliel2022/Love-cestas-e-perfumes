import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarsGripIcon, EditIcon, TrashIcon } from '../icons';

export const SortableCategoryCard = ({ cat, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: cat.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg shadow-sm overflow-hidden group flex flex-col relative ${!cat.is_active ? 'opacity-60' : ''}`}>
            <div 
                {...attributes} 
                {...listeners} 
                style={{ touchAction: 'none' }} // Aplica a regra de toque apenas no ícone
                className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Arraste para reordenar"
            >
                <BarsGripIcon className="h-5 w-5 text-white" />
            </div>

            <div className="relative aspect-[4/5]">
                <img src={cat.image || 'https://placehold.co/400x500/eee/ccc?text=Sem+Imagem'} alt={cat.name} className="w-full h-full object-cover"/>
                <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white rounded-full ${cat.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {cat.is_active ? 'Ativa' : 'Inativa'}
                </div>
            </div>
            <div className="p-3 bg-gray-50 flex-grow flex flex-col">
                <h3 className="font-semibold text-gray-800 text-sm text-center truncate flex-grow" title={cat.name}>{cat.name}</h3>
                <div className="flex items-center justify-center space-x-4 mt-3 pt-3 border-t">
                    <button onClick={() => onEdit(cat)} className="p-2 text-gray-500 hover:text-amber-600" title="Editar"><EditIcon className="h-5 w-5"/></button>
                    <button onClick={() => onDelete(cat.id)} className="p-2 text-gray-500 hover:text-red-600" title="Excluir"><TrashIcon className="h-5 w-5"/></button>
                </div>
            </div>
        </div>
    );
};
