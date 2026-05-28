import React from 'react';

export const ColorPickerRow = ({ label, field, desc, value, onChange }) => (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
        <div className="pr-4">
            <p className="font-bold text-gray-800 text-sm">{label}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-tight mt-0.5">{desc}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="hidden sm:inline text-xs font-mono text-gray-500 uppercase">{value}</span>
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-gray-300 shadow-inner cursor-pointer flex-shrink-0">
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(field, e.target.value)}
                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                />
            </div>
        </div>
    </div>
);
