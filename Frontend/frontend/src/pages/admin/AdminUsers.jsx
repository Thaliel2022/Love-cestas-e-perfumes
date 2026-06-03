import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { UserDetailsModal } from '../../components/admin/UserDetailsModal';
import { EyeIcon, SearchIcon, SpinnerIcon, UsersIcon } from '../../components/icons';

export const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
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

    const formatCpf = (cpf) => {
        const digits = String(cpf || '').replace(/\D/g, '');
        if (digits.length !== 11) return cpf || '-';
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    const roleLabel = (role) => role === 'admin' ? 'Administrador' : 'Cliente';

    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const numericTerm = searchTerm.replace(/\D/g, '');
        if (!term) return users;

        return users.filter(user => {
            const cpfDigits = String(user.cpf || '').replace(/\D/g, '');
            return [
                user.name,
                user.email,
                user.role,
                roleLabel(user.role)
            ].some(value => String(value || '').toLowerCase().includes(term)) ||
            (numericTerm && cpfDigits.includes(numericTerm));
        });
    }, [searchTerm, users]);

    const summary = useMemo(() => ({
        total: users.length,
        admins: users.filter(user => user.role === 'admin').length,
        active: users.filter(user => user.status === 'active').length,
        blocked: users.filter(user => user.status !== 'active').length
    }), [users]);

    return (
        <div className="space-y-6">
             <AnimatePresence>
                {isDetailModalOpen && (
                    <UserDetailsModal 
                        user={selectedUser} 
                        onClose={() => setIsDetailModalOpen(false)}
                        onUserUpdate={fetchUsers} // Passa a função para recarregar a lista
                    />
                )}
            </AnimatePresence>
            <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-white/10">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-bold uppercase tracking-wide border border-white/10">
                            <UsersIcon className="h-4 w-4" />
                            Clientes
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black mt-4">Gerenciar Usuários</h1>
                        <p className="text-slate-300 mt-2 max-w-2xl">
                            Consulte clientes e administradores, veja status da conta e abra os detalhes para ações administrativas.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white/10 border border-white/10 rounded-2xl p-4 min-w-[110px]">
                            <p className="text-xs text-slate-300">Total</p>
                            <p className="text-2xl font-black">{summary.total}</p>
                        </div>
                        <div className="bg-white/10 border border-white/10 rounded-2xl p-4 min-w-[110px]">
                            <p className="text-xs text-slate-300">Ativos</p>
                            <p className="text-2xl font-black">{summary.active}</p>
                        </div>
                        <div className="bg-white/10 border border-white/10 rounded-2xl p-4 min-w-[110px]">
                            <p className="text-xs text-slate-300">Bloqueados</p>
                            <p className="text-2xl font-black">{summary.blocked}</p>
                        </div>
                        <div className="bg-white/10 border border-white/10 rounded-2xl p-4 min-w-[110px]">
                            <p className="text-xs text-slate-300">Admins</p>
                            <p className="text-2xl font-black">{summary.admins}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Lista de clientes</h2>
                        <p className="text-sm text-slate-500">{filteredUsers.length} de {users.length} usuário(s) exibidos</p>
                    </div>
                    <div className="relative w-full md:max-w-md">
                        <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Pesquisar por CPF, nome, e-mail ou função..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center py-20 bg-white rounded-3xl border border-slate-200"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="bg-white shadow-sm rounded-3xl overflow-hidden border border-slate-200">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wide">Nome</th>
                                    <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wide">Email</th>
                                    <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wide">CPF</th>
                                    <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wide">Função</th>
                                    <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wide">Status</th>
                                    <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wide text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                                                    {String(u.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900">{u.name}</p>
                                                    <p className="text-xs text-slate-400">ID #{u.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600">{u.email}</td>
                                        <td className="p-4 font-mono text-slate-600">{formatCpf(u.cpf)}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-black rounded-full ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                                                {roleLabel(u.role)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-black rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleOpenDetails(u)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-xl transition-colors" title="Ver Detalhes">
                                                <EyeIcon className="h-5 w-5"/>
                                                Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {filteredUsers.map(u => (
                            <div key={u.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-900">{u.name}</p>
                                        <p className="text-sm text-slate-600 truncate">{u.email}</p>
                                        <p className="text-xs text-slate-400 font-mono mt-1">{formatCpf(u.cpf)}</p>
                                    </div>
                                    <button onClick={() => handleOpenDetails(u)} className="p-2 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors" title="Ver Detalhes">
                                        <EyeIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                                <div className="flex items-center justify-start gap-4 mt-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <strong className="text-slate-500 block text-xs">Função</strong>
                                        <span className={`px-2 py-1 text-xs font-black rounded-full ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                                            {roleLabel(u.role)}
                                        </span>
                                    </div>
                                    <div>
                                        <strong className="text-slate-500 block text-xs">Status</strong>
                                        <span className={`px-2 py-1 text-xs font-black rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredUsers.length === 0 && (
                        <div className="p-10 text-center text-slate-500">
                            Nenhum usuário encontrado para a pesquisa informada.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
