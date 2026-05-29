import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { SpinnerIcon } from '../../components/icons';

export const AdminLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();

    useEffect(() => {
        apiService('/admin-logs')
            .then(data => {
                if(Array.isArray(data)) {
                    setLogs(data);
                } else {
                    setLogs([]);
                    notification.show('A resposta da API de logs é inválida.', 'error');
                }
            })
            .catch(err => notification.show(`Erro ao buscar logs: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Histórico de Ações e Auditoria</h1>
            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Data</th>
                                    <th className="p-4 font-semibold">Administrador</th>
                                    <th className="p-4 font-semibold">IP</th> {/* Nova Coluna */}
                                    <th className="p-4 font-semibold">Ação</th>
                                    <th className="p-4 font-semibold">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 whitespace-nowrap text-gray-600">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                        <td className="p-4 font-medium">{log.user_name}</td>
                                        <td className="p-4 font-mono text-xs text-gray-500">{log.ip_address || 'N/A'}</td> {/* Exibição do IP */}
                                        <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full capitalize">{log.action.replace(/_/g, ' ')}</span></td>
                                        <td className="p-4 text-gray-700 break-words">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {logs.map(log => (
                            <div key={log.id} className="bg-white border rounded-lg p-4 shadow-sm text-sm">
                                <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                    <div>
                                        <p className="font-bold">{log.user_name}</p>
                                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full capitalize">{log.action.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">IP:</span> <span className="font-mono text-xs">{log.ip_address || 'N/A'}</span>
                                </div>
                                <div>
                                    <p className="text-gray-700 break-words">{log.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
