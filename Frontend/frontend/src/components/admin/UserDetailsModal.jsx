import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Modal } from '../ui/Modal';
import { UserEditForm } from './UserEditForm';
import { EditIcon, PaperAirplaneIcon, SpinnerIcon, TrashIcon } from '../icons';
export const UserDetailsModal = ({ user, onClose, onUserUpdate }) => {
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchDetails = useCallback(() => {
        if (user) {
            setIsLoading(true);
            apiService(`/users/${user.id}/details`)
                .then(setDetails)
                .catch(err => notification.show(`Erro ao buscar detalhes: ${err.message}`, 'error'))
                .finally(() => setIsLoading(false));
        }
    }, [user, notification]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleStatusChange = () => {
        if (!details) return;
        const newStatus = details.status === 'active' ? 'blocked' : 'active';
        const actionText = newStatus === 'blocked' ? 'bloquear' : 'desbloquear';

        confirmation.show(
            `Tem certeza que deseja ${actionText} este usuário? Esta ação requer confirmação.`, 
            async () => {
                try {
                    await apiService(`/users/${details.id}/status`, 'PUT', { status: newStatus });
                    notification.show(`Usuário ${actionText} com sucesso.`);
                    onUserUpdate();
                    fetchDetails();
                } catch (error) {
                    notification.show(`Erro ao ${actionText} usuário: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true }
        );
    };

    const handleSaveUser = async (formData) => {
        try {
            await apiService(`/users/${details.id}`, 'PUT', formData);
            notification.show('Usuário atualizado com sucesso!');
            setIsEditModalOpen(false);
            onUserUpdate();
            fetchDetails();
        } catch (error) {
            notification.show(`Erro ao atualizar usuário: ${error.message}`, 'error');
        }
    };
    
    const handleSendEmail = (e) => {
        e.preventDefault();
        
        confirmation.show(
            `Você está prestes a enviar um e-mail para ${details.name}. Por favor, confirme sua identidade para continuar.`,
            async () => {
                setIsSendingEmail(true);
                try {
                    const result = await apiService(`/users/${details.id}/send-email`, 'POST', {
                        subject: emailSubject,
                        message: emailMessage
                    });
                    notification.show(result.message);
                    setIsEmailModalOpen(false);
                    setEmailSubject('');
                    setEmailMessage('');
                } catch (error) {
                    notification.show(`Erro ao enviar e-mail: ${error.message}`, 'error');
                } finally {
                    setIsSendingEmail(false);
                }
            },
            { requiresAuth: true, confirmText: 'Confirmar e Enviar' }
        );
    };
    
    const handleDelete = () => {
        confirmation.show(
            "Tem certeza que deseja EXCLUIR este usuário? Esta ação não pode ser desfeita.", 
            async () => {
                try {
                    await apiService(`/users/${details.id}`, 'DELETE');
                    notification.show('Usuário excluído com sucesso.');
                    onUserUpdate();
                    onClose();
                } catch (error) {
                    notification.show(`Erro ao excluir usuário: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true, confirmText: 'Excluir Usuário', confirmColor: 'bg-red-600 hover:bg-red-700' }
        );
    };

    const openEditModalWithConfirmation = () => {
        confirmation.show(
            "Você está prestes a editar os dados de um usuário, incluindo permissões de acesso. Por favor, confirme sua identidade para continuar.",
            () => {
                setIsEditModalOpen(true);
            },
            { requiresAuth: true, confirmText: 'Continuar para Edição' }
        );
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalhes de ${user.name}`} size="3xl">
            <AnimatePresence>
                {isEditModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsEditModalOpen(false)} title={`Editar Usuário: ${details.name}`}>
                        <UserEditForm user={details} onSave={handleSaveUser} onCancel={() => setIsEditModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {isEmailModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsEmailModalOpen(false)} title={`Enviar E-mail para ${details.name}`}>
                        <form onSubmit={handleSendEmail} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Assunto</label>
                                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                                <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} required rows="6" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={isSendingEmail} className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold flex items-center gap-2 disabled:bg-gray-400">
                                    {isSendingEmail ? <SpinnerIcon className="h-5 w-5"/> : <PaperAirplaneIcon className="h-5 w-5"/>}
                                    {isSendingEmail ? 'Enviando...' : 'Enviar E-mail'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {isLoading || !details ? (
                <div className="flex justify-center items-center h-64"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Nome</h4>
                            <p className="truncate">{details.name}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Email</h4>
                            <p className="truncate">{details.email}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">CPF</h4>
                            <p>{details.cpf}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Status</h4>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${details.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {details.status === 'active' ? 'Ativo' : 'Bloqueado'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Últimos Pedidos (5)</h3>
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                {details.orders.length > 0 ? (
                                    <table className="w-full text-sm text-left"><tbody>
                                        {details.orders.map(order => (
                                            <tr key={order.id} className="border-b last:border-b-0"><td className="p-2 font-mono">#{order.id}</td><td className="p-2">{new Date(order.date).toLocaleDateString()}</td><td className="p-2">R$ {Number(order.total).toFixed(2)}</td><td className="p-2">{order.status}</td></tr>
                                        ))}
                                    </tbody></table>
                                ) : (<p className="text-center text-gray-500 p-4">Nenhum pedido encontrado.</p>)}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Últimos Logins (10)</h3>
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                               {details.loginHistory.length > 0 ? (
                                    <table className="w-full text-sm text-left"><tbody>
                                        {details.loginHistory.map((login, index) => (
                                            <tr key={index} className="border-b last:border-b-0"><td className="p-2">{new Date(login.created_at).toLocaleString('pt-BR')}</td><td className="p-2">{login.ip_address}</td><td className={`p-2 font-semibold ${login.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{login.status === 'success' ? 'Sucesso' : 'Falha'}</td></tr>
                                        ))}
                                    </tbody></table>
                               ) : (<p className="text-center text-gray-500 p-4">Nenhum histórico de login.</p>)}
                           </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                        <button onClick={handleDelete} className="px-4 py-2 rounded-md font-semibold text-red-600 bg-red-100 hover:bg-red-200 flex items-center gap-2"><TrashIcon className="h-4 w-4"/> Excluir</button>
                        <button onClick={openEditModalWithConfirmation} className="px-4 py-2 rounded-md font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 flex items-center gap-2"><EditIcon className="h-4 w-4"/> Editar</button>
                        <button onClick={() => setIsEmailModalOpen(true)} className="px-4 py-2 rounded-md font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 flex items-center gap-2"><PaperAirplaneIcon className="h-4 w-4"/> Enviar E-mail</button>
                        <button onClick={handleStatusChange} className={`px-6 py-2 rounded-md font-semibold text-white ${details.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                            {details.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
