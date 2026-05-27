import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, CloseIcon, ExclamationIcon } from '../components/icons';

const NotificationContext = createContext(null);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const remove = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const show = useCallback((message, type = 'success', duration = 5000) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { id, message, type }]);
        
        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }
    }, [remove]);

    // CORREÇÃO CRÍTICA: Memoização garante que o contexto não mude a cada notificação, 
    // evitando que outros componentes recarreguem dados do banco acidentalmente.
    const contextValue = useMemo(() => ({ show }), [show]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            <div className="fixed bottom-5 right-5 z-[100] space-y-3">
                <AnimatePresence>
                    {notifications.map(n => 
                        <ToastMessage 
                            key={n.id} 
                            message={n.message} 
                            type={n.type}
                            onClose={() => remove(n.id)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};

const ToastMessage = ({ message, type, onClose }) => {
    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`pl-6 pr-10 py-4 rounded-lg shadow-xl text-white font-semibold flex items-center space-x-3 relative ${typeClasses[type]}`}
        >
            {type === 'success' ? <CheckCircleIcon className="h-6 w-6 flex-shrink-0"/> : <ExclamationIcon className="h-6 w-6 flex-shrink-0"/>}
            <span>{message}</span>
            <button 
                onClick={onClose} 
                className="absolute top-1/2 right-2 transform -translate-y-1/2 text-white/70 hover:text-white p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
            >
                <CloseIcon className="h-5 w-5"/>
            </button>
        </motion.div>
    );
};
