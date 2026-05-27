import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        try {
            await apiService('/logout', 'POST');
        } catch (error) {
            console.error("Erro na API de logout.", error);
        } finally {
            setUser(null);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('lovecestas_cached_location');
            
            // CORREÇÃO: Limpa o carrinho local ao sair da conta
            localStorage.removeItem('lovecestas_cart');
            
            // CORREÇÃO: Dispara um evento global para o ShopProvider resetar todos os estados
            window.dispatchEvent(new Event('user-logged-out'));
            
            if (window.location.hash !== '#home' && window.location.hash !== '') {
                 window.location.hash = '#login';
            }
        }
    }, []);

    const fetchUserProfile = useCallback(async () => {
        try {
            const userData = await apiService('/users/me', 'GET', null, { suppressAuthError: true });
            setUser(userData);
        } catch (error) {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    useEffect(() => {
        const handleAuthError = () => {
            console.log("Sessão expirada. Logout.");
            logout();
        };
        window.addEventListener('auth-error', handleAuthError);
        return () => window.removeEventListener('auth-error', handleAuthError);
    }, [logout]);

    const login = async (email, password) => {
        const response = await apiService('/login', 'POST', { email, password });
        if (response && response.user) {
            setUser(response.user);
            if (response.accessToken) localStorage.setItem('accessToken', response.accessToken);
            if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
        }
        return response;
    };
    
    const register = async (name, email, password, cpf, phone) => {
        return await apiService('/register', 'POST', { name, email, password, cpf, phone });
    };

    return <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading, setUser }}>{children}</AuthContext.Provider>;
};
