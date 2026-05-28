import React, { useState, useEffect } from 'react';
export const AdminCrudForm = ({ item, onSave, onCancel, fieldsConfig }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const initialData = {};
        fieldsConfig.forEach(field => {
            let defaultValue = ''; // Valor padrão para campos de texto
            if (field.type === 'checkbox') {
                defaultValue = 0;
            } else if (field.type === 'select' && field.options && field.options.length > 0) {
                defaultValue = field.options[0].value; // Define o padrão como o valor da primeira opção
            }
            initialData[field.name] = item?.[field.name] ?? defaultValue;
        });
        setFormData(initialData);
    }, [item, fieldsConfig]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fieldsConfig.map(field => (
                <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                    {field.type === 'select' ? (
                        <select
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                        >
                            {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                            placeholder={field.placeholder || ''}
                        />
                    ) : field.type === 'checkbox' ? (
                        <div className="flex items-center pt-2">
                             <input
                                type="checkbox"
                                name={field.name}
                                checked={!!formData[field.name]}
                                onChange={handleChange}
                                className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                        </div>
                    ) : (
                        <input
                            type={field.type}
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                            placeholder={field.placeholder || ''}
                            readOnly={field.editable === false}
                            step={field.step}
                        />
                    )}
                </div>
            ))}
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};
