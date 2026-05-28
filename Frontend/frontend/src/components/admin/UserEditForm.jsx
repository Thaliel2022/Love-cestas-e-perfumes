import React, { useState } from 'react';
import { maskCPF, maskPhone } from '../../utils/validation';
import { WhatsappIcon } from '../icons';
export const UserEditForm = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        cpf: user.cpf || '',
        phone: user.phone || '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCpfChange = (e) => {
        setFormData(prev => ({ ...prev, cpf: maskCPF(e.target.value) }));
    };

    const handlePhoneChange = (e) => {
        setFormData(prev => ({ ...prev, phone: maskPhone(e.target.value) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">CPF</label>
                    <input type="text" name="cpf" value={formData.cpf} onChange={handleCpfChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Celular / WhatsApp</label>
                    <div className="relative">
                        <input type="text" name="phone" value={formData.phone} onChange={handlePhoneChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md pl-10"/>
                        <WhatsappIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Função</label>
                <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Deixe em branco para não alterar" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar Alterações</button>
            </div>
        </form>
    );
};
