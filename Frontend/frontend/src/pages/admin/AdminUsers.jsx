import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { UserDetailsModal } from '../../components/admin/UserDetailsModal';
import { EyeIcon, SpinnerIcon } from '../../components/icons';

export const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const notification = useNotification();

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        apiService('/users')
            .then(setUsers)
            .catch(err => notification.show(`Erro ao buscar usuários: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleOpenDetails = (user) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };

    return (
        <div>
             <AnimatePresence>
                {isDetailModalOpen && (
                    <UserDetailsModal 
                        user={selectedUser} 
                        onClose={() => setIsDetailModalOpen(false)}
                        onUserUpdate={fetchUsers} // Passa a função para recarregar a lista
                    />
                )}
            </AnimatePresence>
            <h1 className="text-3xl font-bold mb-6">Gerenciar Usuários</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Nome</th>
                                    <th className="p-4 font-semibold">Email</th>
                                    <th className="p-4 font-semibold">Função</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                        <td className="p-4 font-medium">{u.name}</td>
                                        <td className="p-4 text-gray-600">{u.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                                <EyeIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {users.map(u => (
                            <div key={u.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{u.name}</p>
                                        <p className="text-sm text-gray-600">{u.email}</p>
                                    </div>
                                    <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                        <EyeIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                                <div className="flex items-center justify-start gap-4 mt-4 pt-4 border-t">
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Função</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {u.role}
                                        </span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Status</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
