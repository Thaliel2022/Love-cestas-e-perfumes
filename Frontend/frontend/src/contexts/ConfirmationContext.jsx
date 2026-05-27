import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import { Modal } from '../components/ui/Modal';
import { SpinnerIcon } from '../components/icons';

const ConfirmationContext = createContext(null);

export const useConfirmation = () => useContext(ConfirmationContext);

export const ConfirmationProvider = ({ children }) => {
    const { user } = useAuth();
    const [confirmationState, setConfirmationState] = useState({ isOpen: false });
    const [verificationInput, setVerificationInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    const close = () => {
        setConfirmationState({ isOpen: false });
        setVerificationInput('');
        setVerificationError('');
        setIsVerifying(false);
    };

    const handleConfirm = async () => {
        const { onConfirm, requiresAuth } = confirmationState;

        if (requiresAuth) {
            setIsVerifying(true);
            setVerificationError('');
            try {
                const payload = user.is_two_factor_enabled 
                    ? { token: verificationInput } 
                    : { password: verificationInput };
                
                await apiService('/auth/verify-action', 'POST', payload);
                
                onConfirm();
                close();
            } catch (error) {
                setVerificationError(error.message || "Falha na verificação.");
            } finally {
                setIsVerifying(false);
            }
        } else {
            onConfirm();
            close();
        }
    };
    
    const show = useCallback((message, onConfirm, options = {}) => {
        setConfirmationState({
            isOpen: true,
            message,
            onConfirm,
            onCancel: close,
            requiresAuth: options.requiresAuth || false,
            confirmText: options.confirmText || 'Confirmar',
            confirmColor: options.confirmColor || 'bg-red-600 hover:bg-red-700',
        });
    }, []);

    const is2fa = user?.role === 'admin' && user?.is_two_factor_enabled;

    return (
        <ConfirmationContext.Provider value={{ show }}>
            {children}
            <AnimatePresence>
                {confirmationState.isOpen && (
                    <Modal isOpen={true} onClose={confirmationState.onCancel} title="Confirmação">
                        <p className="text-gray-700 mb-6">{confirmationState.message}</p>
                        
                        {confirmationState.requiresAuth && (
                            <div className="space-y-3 my-4 p-4 bg-gray-100 rounded-md border">
                                <label className="block text-sm font-medium text-gray-700">
                                    {is2fa ? "Código de Autenticação (2FA)" : "Confirme sua Senha"}
                                </label>
                                <input 
                                    type={is2fa ? "text" : "password"}
                                    value={verificationInput}
                                    onChange={(e) => setVerificationInput(e.target.value)}
                                    maxLength={is2fa ? 6 : undefined}
                                    placeholder={is2fa ? "123456" : "••••••••"}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                {verificationError && <p className="text-red-500 text-sm mt-1">{verificationError}</p>}
                            </div>
                        )}

                        <div className="flex justify-end space-x-4">
                            <button onClick={confirmationState.onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button 
                                onClick={handleConfirm} 
                                disabled={isVerifying}
                                className={`px-4 py-2 text-white rounded-md flex items-center justify-center disabled:opacity-50 ${confirmationState.confirmColor}`}
                            >
                                {isVerifying ? <SpinnerIcon /> : confirmationState.confirmText}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </ConfirmationContext.Provider>
    );
};
