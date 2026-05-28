import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminIcon, SpinnerIcon } from '../icons';

export const MaintenancePage = () => {
    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
            <div className="text-center p-8 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full">
                <AdminIcon className="h-16 w-16 text-amber-400 mx-auto mb-6 animate-spin-slow" />
                <h1 className="text-3xl sm:text-4xl font-bold text-amber-400 mb-3">Site em Manutenção</h1>
                <p className="text-gray-300 text-lg">Estamos realizando melhorias para te atender melhor.</p>
                <p className="text-gray-400 mt-2">Voltamos em breve!</p>
            </div>
        </div>
    );
};

export const MaintenanceModeToggle = () => {
    const [isOn, setIsOn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();

    const fetchStatus = useCallback(() => {
        apiService('/settings/maintenance')
            .then(data => setIsOn(data.status === 'on'))
            .catch(err => notification.show(`Erro ao buscar status: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async () => {
        const newStatus = !isOn;
        setIsLoading(true);
        try {
            await apiService('/settings/maintenance', 'PUT', { status: newStatus ? 'on' : 'off' });
            setIsOn(newStatus);
            notification.show(`Modo de manutenção foi ${newStatus ? 'ATIVADO' : 'DESATIVADO'}.`);
            // Dispara um evento global para atualizar a barra do topo (AdminLayout) na hora
            window.dispatchEvent(new CustomEvent('maintenance-changed', { detail: newStatus ? 'on' : 'off' }));
        } catch (error) {
            notification.show(`Erro ao alterar status: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const spring = { type: "spring", stiffness: 700, damping: 30 };

    return (
        <div className={`bg-white p-6 rounded-lg shadow ${isOn ? 'border-l-4 border-red-500' : ''}`}>
            <h3 className="font-bold text-lg mb-3">Modo de Manutenção</h3>
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 max-w-xs">
                    {isOn 
                        ? "O site está em manutenção. Apenas administradores logados podem acessar." 
                        : "O site está online e acessível para todos os usuários."
                    }
                </p>
                {isLoading ? (
                    <SpinnerIcon className="h-6 w-6 text-gray-400"/>
                ) : (
                    <div 
                        className={`flex items-center w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${isOn ? 'bg-red-500 justify-end' : 'bg-gray-300 justify-start'}`}
                        onClick={handleToggle}
                    >
                        <motion.div 
                            className="w-6 h-6 bg-white rounded-full shadow-md" 
                            layout 
                            transition={spring} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
