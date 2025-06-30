import React, { useState, useEffect, createContext, useContext, useCallback, memo, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// --- Constante da API ---
const API_URL = process.env.REACT_APP_API_URL || 'https://love-cestas-e-perfumes.onrender.com/api';

// --- ÍCONES SVG ---
// (Ícones existentes)
const CartIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const HeartIcon = ({ className, filled }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>;
const UserIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdminIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const MenuIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const CloseIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const StarIcon = memo(({ className, isFilled, onClick }) => <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill={isFilled ? "currentColor" : "none"} stroke="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>);
const PlusIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const TrashIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const EditIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const ChartIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const BoxIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const TruckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h2a1 1 0 001-1V6a1 1 0 00-1-1h-2v11z" /></svg>;
const UsersIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A6.995 6.995 0 0112 12a6.995 6.995 0 016-3.803M15 21a6 6 0 00-9-5.197" /></svg>;
const TagIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm0 0v11a2 2 0 002 2h5a2 2 0 002-2l-7-7z" /></svg>;
const FileIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const UploadIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const InstagramIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const WhatsappIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.26l.16.288-1.035 3.803 3.91-1.019.28.169z"/></svg>;
const SearchIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CheckCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const CreditCardIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const SpinnerIcon = ({ className }) => <svg className={className || "h-5 w-5 animate-spin"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const ClockIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// ---> ATUALIZAÇÃO: Novos Ícones para a Linha do Tempo de Status
const PackageIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const CheckBadgeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const HomeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const XCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CurrencyDollarIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0 1H9m3 0h3m-3 10v-1m0 1h3m-3 0H9m12-6a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


// --- FUNÇÕES AUXILIARES DE FORMATAÇÃO E VALIDAÇÃO ---
const validateCPF = (cpf) => {
    cpf = String(cpf).replace(/[^\d]/g, ''); 
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};

const maskCPF = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .substring(0, 14);
};

const maskCEP = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 9);
};

// --- SERVIÇO DE API (COM ABORTCONTROLLER) ---
async function apiService(endpoint, method = 'GET', body = null, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        signal: options.signal,
    };
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
        config.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
            let errorData;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                errorData = await response.json();
            } else {
                errorData = { message: await response.text() };
            }
            throw new Error(errorData.message || `Erro ${response.status}`);
        }
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return response.text();
    } catch (error) {
        if (error.name === 'AbortError') {
             console.log(`API fetch aborted: ${endpoint}`);
        } else {
             console.error(`Erro na API (${endpoint}):`, error);
        }
        if (error instanceof TypeError) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.');
        }
        throw error;
    }
}


async function apiUploadService(endpoint, file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const config = {
        method: 'POST',
        headers: {},
        body: formData,
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload (${endpoint}):`, error);
        throw error;
    }
}

async function apiImageUploadService(endpoint, file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', file);

    const config = {
        method: 'POST',
        headers: {},
        body: formData,
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload da imagem (${endpoint}):`, error);
        throw error;
    }
}


// --- FUNÇÕES AUXILIARES PARA IMAGENS ---
const parseImages = (imagesJsonString, placeholder) => {
    if (!imagesJsonString || typeof imagesJsonString !== 'string') {
        return placeholder === null ? [] : [placeholder];
    }
    try {
        const parsed = JSON.parse(imagesJsonString);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
        return placeholder === null ? [] : [placeholder];
    } catch (e) {
        try {
            const cleaned = imagesJsonString.replace(/\\"/g, '"');
            const reparsed = JSON.parse(cleaned);
            if (Array.isArray(reparsed) && reparsed.length > 0) {
                return reparsed;
            }
            return placeholder === null ? [] : [placeholder];
        } catch (e2) {
            console.error("Falha ao parsear JSON de imagens:", imagesJsonString, e2);
            return placeholder === null ? [] : [placeholder];
        }
    }
};


const getFirstImage = (imagesJsonString, placeholder = 'https://placehold.co/600x400/222/fff?text=Produto') => {
    const images = parseImages(imagesJsonString, placeholder);
    return images[0] || placeholder;
};


// --- CONTEXTOS GLOBAIS ---
const AuthContext = createContext(null);
const ShopContext = createContext(null);
const NotificationContext = createContext(null);
const ConfirmationContext = createContext(null);

const useAuth = () => useContext(AuthContext);
const useShop = () => useContext(ShopContext);
const useNotification = () => useContext(NotificationContext);
const useConfirmation = () => useContext(ConfirmationContext);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch (e) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email, password) => {
        const { user: loggedUser, token: authToken } = await apiService('/login', 'POST', { email, password });
        localStorage.setItem('user', JSON.stringify(loggedUser));
        localStorage.setItem('token', authToken);
        setUser(loggedUser);
        setToken(authToken);
        return loggedUser;
    };
    
    const register = async (name, email, password, cpf) => {
        return await apiService('/register', 'POST', { name, email, password, cpf });
    };

    const logout = useCallback(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
    }, []);

    return <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!user, isLoading }}>{children}</AuthContext.Provider>;
};

const ShopProvider = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [shippingCep, setShippingCep] = useState('');
    const [shippingOptions, setShippingOptions] = useState([]);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [isLoadingShipping, setIsLoadingShipping] = useState(false);
    const [shippingError, setShippingError] = useState('');
    const [couponCode, setCouponCode] = useState("");
    const [couponMessage, setCouponMessage] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const fetchPersistentCart = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const dbCart = await apiService('/cart');
            setCart(dbCart || []);
        } catch (err) {
            console.error("Falha ao buscar carrinho persistente:", err);
            setCart([]);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isLoading || !isAuthenticated) {
            if (!isAuthenticated) {
                setCart([]);
                setWishlist([]);
                setShippingCep('');
                setShippingOptions([]);
                setSelectedShipping(null);
                setCouponCode('');
                setAppliedCoupon(null);
                setCouponMessage('');
            }
            return;
        }

        fetchPersistentCart();
        
        apiService('/wishlist')
            .then(setWishlist)
            .catch(err => {
                console.error("Falha ao buscar lista de desejos:", err);
                setWishlist([]);
            });
    }, [isAuthenticated, isLoading, fetchPersistentCart]);
    
    const addToCart = useCallback(async (productToAdd, qty = 1) => {
        setCart(currentCart => {
            const existing = currentCart.find(item => item.id === productToAdd.id);
            let updatedCart;
            if (existing) {
                const newQty = existing.qty + qty;
                updatedCart = currentCart.map(item => item.id === productToAdd.id ? { ...item, qty: newQty } : item);
                if (isAuthenticated) {
                    apiService('/cart', 'POST', { productId: productToAdd.id, quantity: newQty });
                }
            } else {
                updatedCart = [...currentCart, { ...productToAdd, qty }];
                if (isAuthenticated) {
                    apiService('/cart', 'POST', { productId: productToAdd.id, quantity: qty });
                }
            }
            return updatedCart;
        });
    }, [isAuthenticated]);
    
    const removeFromCart = useCallback(async (productId) => {
        const updatedCart = cart.filter(item => item.id !== productId);
        setCart(updatedCart);
        if (isAuthenticated) {
            await apiService(`/cart/${productId}`, 'DELETE');
        }
    }, [cart, isAuthenticated]);

    const updateQuantity = useCallback(async (productId, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(productId);
            return;
        }
        const updatedCart = cart.map(item => item.id === productId ? {...item, qty: newQuantity } : item);
        setCart(updatedCart);
        if (isAuthenticated) {
            await apiService('/cart', 'POST', { productId, quantity: newQuantity });
        }
    }, [cart, isAuthenticated, removeFromCart]);

    
    const clearCart = useCallback(async () => {
        setCart([]);
        if (isAuthenticated) {
            await apiService('/cart', 'DELETE');
        }
    }, [isAuthenticated]);

    const addToWishlist = useCallback(async (productToAdd) => {
        if (!isAuthenticated) return; 
        if (wishlist.some(p => p.id === productToAdd.id)) return;
        try {
            const addedProduct = await apiService('/wishlist', 'POST', { productId: productToAdd.id });
            setWishlist(current => [...current, addedProduct]);
            return { success: true, message: `${productToAdd.name} adicionado à lista de desejos!` };
        } catch (error) {
            console.error("Erro ao adicionar na lista de desejos:", error);
            return { success: false, message: `Não foi possível adicionar o item: ${error.message}` };
        }
    }, [isAuthenticated, wishlist]);

    const removeFromWishlist = useCallback(async (productId) => {
        if (!isAuthenticated) return;
        try {
            await apiService(`/wishlist/${productId}`, 'DELETE');
            setWishlist(current => current.filter(p => p.id !== productId));
        } catch (error) {
            console.error("Erro ao remover da lista de desejos:", error);
        }
    }, [isAuthenticated]);

    const calculateShipping = useCallback(async (cep, items) => {
        if (!cep || !items || items.length === 0) return;
        setIsLoadingShipping(true);
        setShippingError('');
        setShippingOptions([]);
        setSelectedShipping(null);
        setShippingCep(cep);
        try {
            const productsPayload = items.map(item => ({
                id: String(item.id),
                price: item.price,
                quantity: item.qty || 1,
            }));
            const data = await apiService('/shipping/calculate', 'POST', {
                cep_destino: cep,
                products: productsPayload,
            });
            setShippingOptions(data);
        } catch (error) {
            setShippingError(error.message || 'Não foi possível calcular o frete.');
        } finally {
            setIsLoadingShipping(false);
        }
    }, []);
    
    const removeCoupon = useCallback(() => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponMessage('');
    }, []);

    const applyCoupon = useCallback(async (code) => {
        setCouponCode(code);
        try {
            const response = await apiService('/coupons/validate', 'POST', { code });
            setAppliedCoupon(response.coupon);
            setCouponMessage(`Cupom "${response.coupon.code}" aplicado!`);
        } catch (error) {
            removeCoupon();
            setCouponMessage(error.message || "Não foi possível aplicar o cupom.");
        }
    }, [removeCoupon]);
    

    const clearOrderState = useCallback(() => {
        clearCart();
        setShippingCep('');
        setShippingOptions([]);
        setSelectedShipping(null);
        removeCoupon();
    }, [clearCart, removeCoupon]);

    return (
        <ShopContext.Provider value={{
            cart, setCart, clearOrderState,
            wishlist, addToCart, 
            addToWishlist, removeFromWishlist,
            updateQuantity, removeFromCart,
            shippingCep, setShippingCep,
            shippingOptions, setShippingOptions,
            selectedShipping, setSelectedShipping,
            isLoadingShipping,
            shippingError,
            calculateShipping,
            couponCode, setCouponCode,
            couponMessage,
            applyCoupon,
            appliedCoupon,
            removeCoupon
        }}>
            {children}
        </ShopContext.Provider>
    );
};

const NotificationProvider = ({ children }) => {
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

    return (
        <NotificationContext.Provider value={{ show }}>
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

const ConfirmationProvider = ({ children }) => {
    const [confirmationState, setConfirmationState] = useState({ isOpen: false });

    const show = useCallback((message, onConfirm) => {
        setConfirmationState({
            isOpen: true,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmationState({ isOpen: false });
            },
            onCancel: () => {
                setConfirmationState({ isOpen: false });
            }
        });
    }, []);

    return (
        <ConfirmationContext.Provider value={{ show }}>
            {children}
            <AnimatePresence>
                {confirmationState.isOpen && (
                    <Modal isOpen={true} onClose={confirmationState.onCancel} title="Confirmação">
                        <p className="text-gray-700 mb-6">{confirmationState.message}</p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={confirmationState.onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button onClick={confirmationState.onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Confirmar</button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </ConfirmationContext.Provider>
    );
};


// --- COMPONENTES DA UI ---
const Modal = memo(({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const backdropVariants = {
      visible: { opacity: 1 },
      hidden: { opacity: 0 }
  };

  const modalVariants = {
      hidden: { y: "-50vh", opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
      exit: { y: "50vh", opacity: 0 }
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" 
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <motion.div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col" 
        style={{ maxHeight: '90vh' }} 
        variants={modalVariants}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 pb-4 flex justify-between items-center border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600 leading-none">&times;</button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
});

const TrackingModal = memo(({ isOpen, onClose, trackingCode }) => {
    const [trackingInfo, setTrackingInfo] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && trackingCode) {
            const fetchTracking = async () => {
                setIsLoading(true);
                setError('');
                setTrackingInfo([]);
                try {
                    const data = await apiService(`/track/${trackingCode}`);
                    setTrackingInfo(data);
                } catch (err) {
                    setError(err.message || "Não foi possível obter informações de rastreio.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchTracking();
        }
    }, [isOpen, trackingCode]);

    return (
        <AnimatePresence>
            {isOpen && (
                <Modal isOpen={isOpen} onClose={onClose} title={`Rastreio do Pedido: ${trackingCode}`}>
                    {isLoading && <p>Buscando informações...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="space-y-6">
                            {trackingInfo.map((event, index) => (
                                <div key={index} className="flex space-x-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                            {index === 0 && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>
                                        {index < trackingInfo.length - 1 && <div className="w-px h-full bg-gray-300"></div>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{event.status}</p>
                                        <p className="text-sm text-gray-600">{event.location}</p>
                                        <p className="text-xs text-gray-400">{new Date(event.date).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>
            )}
        </AnimatePresence>
    );
});


const ProductCard = memo(({ product, onNavigate }) => {
    const { addToCart } = useShop();
    const notification = useNotification();
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isBuyingNow, setIsBuyingNow] = useState(false);
    
    const imageUrl = getFirstImage(product.images);
    const avgRating = Math.round(product.avg_rating || 0);

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        setIsAddingToCart(true);
        try {
            await addToCart(product);
            notification.show(`${product.name} adicionado ao carrinho!`);
        } catch (error) {
            notification.show(error.message || "Erro ao adicionar ao carrinho", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleBuyNow = async (e) => {
        e.stopPropagation();
        setIsBuyingNow(true);
        try {
            await addToCart(product);
            onNavigate('cart');
        } catch (error) {
            notification.show(error.message || "Erro ao iniciar compra", "error");
            setIsBuyingNow(false);
        }
    };
    
    const WishlistButton = ({ product }) => {
        const { wishlist, addToWishlist, removeFromWishlist } = useShop();
        const { isAuthenticated } = useAuth();
        const notification = useNotification();
        const isWishlisted = wishlist.some(item => item.id === product.id);

        const handleWishlistToggle = async (e) => {
            e.stopPropagation();
            if (!isAuthenticated) {
                notification.show("Faça login para adicionar à lista de desejos", "error");
                return;
            }
            if (isWishlisted) {
                await removeFromWishlist(product.id);
                notification.show(`${product.name} removido da lista de desejos.`, 'error');
            } else {
                const result = await addToWishlist(product);
                if (result.success) {
                    notification.show(result.message);
                } else {
                    notification.show(result.message, "error");
                }
            }
        };

        return (
            <button onClick={handleWishlistToggle} className={`absolute top-3 right-3 bg-black/50 p-2 rounded-full text-white transition ${isWishlisted ? 'text-amber-400' : 'hover:text-amber-400'}`}>
                <HeartIcon className="h-6 w-6" filled={isWishlisted} />
            </button>
        );
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div 
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.02, boxShadow: "0px 15px 30px -5px rgba(212, 175, 55, 0.2)" }}
            className="bg-black border border-gray-800 rounded-lg overflow-hidden flex flex-col group text-white h-full"
        >
            <div className="relative h-64 bg-white">
                <img src={imageUrl} alt={product.name} className="w-full h-full object-contain cursor-pointer" onClick={() => onNavigate(`product/${product.id}`)} />
                 <WishlistButton product={product} />
            </div>
            <div className="p-5 flex-grow flex flex-col">
                 <p className="text-xs text-amber-400 font-semibold tracking-wider">{product.brand.toUpperCase()}</p>
                <h4 className="text-xl font-bold tracking-wider mt-1 cursor-pointer hover:text-amber-400" onClick={() => onNavigate(`product/${product.id}`)}>{product.name}</h4>
                <div className="flex items-center mt-2">
                    {[...Array(5)].map((_, i) => (
                        <StarIcon 
                            key={i} 
                            className={`h-5 w-5 ${i < avgRating ? 'text-amber-400' : 'text-gray-600'}`} 
                            isFilled={i < avgRating}
                        />
                    ))}
                </div>
                <div className="flex-grow"/>
                <p className="text-2xl font-light text-white mt-4">R$ {Number(product.price).toFixed(2)}</p>
                <div className="mt-4 flex items-stretch space-x-2">
                    <button onClick={handleBuyNow} disabled={isBuyingNow || isAddingToCart} className="flex-grow bg-amber-400 text-black py-2 px-4 rounded-md hover:bg-amber-300 transition font-bold text-center flex items-center justify-center disabled:opacity-50">
                        {isBuyingNow ? <SpinnerIcon /> : 'Comprar'}
                    </button>
                    <button onClick={handleAddToCart} disabled={isAddingToCart || isBuyingNow} title="Adicionar ao Carrinho" className="flex-shrink-0 border border-amber-400 text-amber-400 p-2 rounded-md hover:bg-amber-400 hover:text-black transition flex items-center justify-center disabled:opacity-50">
                        {isAddingToCart ? <SpinnerIcon className="text-amber-400" /> : <CartIcon className="h-6 w-6"/>}
                    </button>
                </div>
            </div>
        </motion.div>
    );
});

const ProductCarousel = memo(({ products, onNavigate, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(4);

    const updateItemsPerPage = useCallback(() => {
        if (window.innerWidth < 640) setItemsPerPage(1);
        else if (window.innerWidth < 1024) setItemsPerPage(2);
        else setItemsPerPage(4);
    }, []);

    useEffect(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, [updateItemsPerPage]);
    
    const goNext = () => {
        setCurrentIndex(prev => Math.min(prev + 1, products.length - itemsPerPage));
    };

    const goPrev = () => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    };
    
    if (!products || products.length === 0) {
        return null;
    }

    const canGoPrev = currentIndex > 0;
    const canGoNext = products && products.length > itemsPerPage && currentIndex < products.length - itemsPerPage;

    const carouselContainerVariants = {
        hidden: {},
        visible: {
            transition: { staggerChildren: 0.15 }
        }
    };

    return (
        <div className="relative">
            {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
            <div className="overflow-hidden">
                <motion.div
                    variants={carouselContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex -mx-2 md:-mx-4 transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)` }}
                >
                    {products.map(product => (
                        <div 
                            key={product.id} 
                            className="flex-shrink-0 px-2 md:px-4"
                            style={{ width: `${100 / itemsPerPage}%` }}
                        >
                            <ProductCard product={product} onNavigate={onNavigate} />
                        </div>
                    ))}
                </motion.div>
            </div>

            {products.length > itemsPerPage && (
                <>
                    <button onClick={goPrev} disabled={!canGoPrev} className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goNext} disabled={!canGoNext} className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </>
            )}
        </div>
    );
});


const Header = memo(({ onNavigate }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { cart, wishlist } = useShop();
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Animação do carrinho
    const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const prevTotalCartItems = useRef(totalCartItems);
    const cartAnimationControls = useAnimation();

    useEffect(() => {
        // Inicia a animação apenas se um item for ADICIONADO (não removido)
        if (totalCartItems > prevTotalCartItems.current) {
            cartAnimationControls.start({
                scale: [1, 1.25, 0.9, 1.1, 1],
                transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }
            });
        }
        prevTotalCartItems.current = totalCartItems;
    }, [totalCartItems, cartAnimationControls]);
    // Fim da animação do carrinho

    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchSuggestions([]);
            return;
        }

        const debounceTimer = setTimeout(() => {
            apiService(`/products/search-suggestions?q=${searchTerm}`)
                .then(data => setSearchSuggestions(data))
                .catch(err => console.error(err));
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onNavigate(`products?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
            setSearchSuggestions([]);
            setIsMenuOpen(false);
        }
    };
    
    const handleSuggestionClick = (productName) => {
        onNavigate(`products?search=${encodeURIComponent(productName)}`);
        setSearchTerm('');
        setSearchSuggestions([]);
        setIsMenuOpen(false);
    };

    const navLinks = (
        <>
            <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); setIsMenuOpen(false); }} className="block md:inline-block py-2 md:py-0 hover:text-amber-400 transition">Início</a>
            <a href="#products" onClick={(e) => { e.preventDefault(); onNavigate('products'); setIsMenuOpen(false); }} className="block md:inline-block py-2 md:py-0 hover:text-amber-400 transition">Catálogo</a>
            <a href="#ajuda" onClick={(e) => { e.preventDefault(); onNavigate('ajuda'); setIsMenuOpen(false); }} className="block md:inline-block py-2 md:py-0 hover:text-amber-400 transition">Ajuda</a>
        </>
    );

    const mobileMenuVariants = {
        open: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.3 } },
        closed: { opacity: 0, y: "-100%", transition: { ease: "easeIn", duration: 0.2 } },
    }

    return (
        <header className="bg-black/80 backdrop-blur-md text-white shadow-lg sticky top-0 z-40">
            <nav className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="text-xl font-bold tracking-wide text-amber-400">LovecestasePerfumes</a>
                
                <div className="hidden md:flex items-center space-x-8">
                    {navLinks}
                </div>

                <div className="flex items-center space-x-4">
                     <div className="relative hidden md:block">
                        <form onSubmit={handleSearchSubmit} className="flex items-center bg-gray-800 rounded-full">
                           <input 
                                type="text" value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                placeholder="Buscar..." 
                                className="bg-transparent text-white px-4 py-1 rounded-l-full focus:outline-none w-32 md:w-40 transition-all duration-300 focus:w-48"/>
                           <button type="submit" className="p-2 text-gray-400 hover:text-white rounded-r-full"><SearchIcon className="h-5 w-5" /></button>
                        </form>
                        {isSearchFocused && searchSuggestions.length > 0 && (
                            <div className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50">
                                {searchSuggestions.map(p => (
                                    <div key={p.id} onClick={() => handleSuggestionClick(p.name)}
                                        className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-white"
                                    >
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {isAuthenticated && user.role === 'admin' && (
                        <button onClick={() => onNavigate('admin/dashboard')} className="hidden md:flex items-center space-x-2 bg-amber-500 text-black px-3 py-1 rounded-md hover:bg-amber-400 font-bold transition">
                            <AdminIcon className="h-5 w-5" />
                            <span>Admin</span>
                        </button>
                    )}

                    <button onClick={() => onNavigate('wishlist')} className="relative hover:text-amber-400 transition">
                        <HeartIcon className="h-6 w-6"/>
                        {wishlist.length > 0 && <span className="absolute -top-2 -right-2 bg-amber-400 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{wishlist.length}</span>}
                    </button>
                    
                    <motion.button animate={cartAnimationControls} onClick={() => onNavigate('cart')} className="relative hover:text-amber-400 transition">
                        <CartIcon className="h-6 w-6"/>
                        {totalCartItems > 0 && <span className="absolute -top-2 -right-2 bg-amber-400 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{totalCartItems}</span>}
                    </motion.button>
                    
                    <div className="hidden md:block">
                        {isAuthenticated ? (
                            <div className="relative group">
                               <button className="hover:text-amber-400 transition p-1"><UserIcon className="h-6 w-6"/></button>
                               <div className="absolute top-full right-0 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-20 invisible group-hover:visible border border-gray-800">
                                   <span className="block px-4 py-2 text-sm text-gray-400">Olá, {user.name}</span>
                                   <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Minha Conta</a>
                                   <a href="#logout" onClick={(e) => {e.preventDefault(); logout(); onNavigate('home');}} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Sair</a>
                               </div>
                            </div>
                        ) : (
                            <button onClick={() => onNavigate('login')} className="bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold">Login</button>
                        )}
                    </div>

                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 hover:text-amber-400">
                        {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                    </button>
                </div>
            </nav>

            <AnimatePresence>
                {isMenuOpen && (
                     <motion.div 
                        variants={mobileMenuVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-sm z-30 px-6 pb-6 space-y-4 origin-top"
                     >
                         <div className="relative">
                            <form onSubmit={handleSearchSubmit} className="flex items-center bg-gray-800 rounded-full w-full">
                               <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} placeholder="Buscar..." className="bg-transparent text-white px-4 py-2 rounded-l-full focus:outline-none w-full"/>
                               <button type="submit" className="p-2 text-gray-400 hover:text-white rounded-r-full"><SearchIcon className="h-5 w-5" /></button>
                            </form>
                            {isSearchFocused && searchSuggestions.length > 0 && (
                                <div className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50">
                                    {searchSuggestions.map(p => (
                                        <div key={p.id} onClick={() => handleSuggestionClick(p.name)} className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm text-white">{p.name}</div>
                                    ))}
                                </div>
                            )}
                         </div>
                        {navLinks}
                        <div className="border-t border-gray-800 pt-4 space-y-3">
                            {isAuthenticated ? (
                                <>
                                    <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); setIsMenuOpen(false); }} className="block text-white hover:text-amber-400">Minha Conta</a>
                                    {user.role === 'admin' && <a href="#admin" onClick={(e) => { e.preventDefault(); onNavigate('admin/dashboard'); setIsMenuOpen(false);}} className="block text-amber-400 hover:text-amber-300">Painel Admin</a>}
                                    <button onClick={() => { logout(); onNavigate('home'); setIsMenuOpen(false); }} className="w-full text-left text-white hover:text-amber-400">Sair</button>
                                </>
                            ) : (
                                <button onClick={() => { onNavigate('login'); setIsMenuOpen(false); }} className="w-full text-left bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold">Login</button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
});

// --- PÁGINAS DO CLIENTE ---
const HomePage = ({ onNavigate }) => {
    const [products, setProducts] = useState({ newArrivals: [], bestSellers: [] });

    useEffect(() => { 
        apiService('/products')
            .then(data => {
                const sortedByDate = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const sortedBySales = [...data].sort((a, b) => (b.sales || 0) - (a.sales || 0));
                
                setProducts({
                    newArrivals: sortedByDate,
                    bestSellers: sortedBySales
                });
            })
            .catch(err => console.error("Falha ao buscar produtos:", err));
    }, []);

    const categoryCards = [
        { name: "Masculino", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop", filter: "Masculino" },
        { name: "Feminino", image: "https://images.unsplash.com/photo-1594035918258-744872047526?q=80&w=800&auto=format&fit=crop", filter: "Feminino" },
        { name: "Unissex", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop", filter: "Unissex" }
    ];

    const bannerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.3, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { type: 'spring', stiffness: 100 }
        }
    };

    return (
      <>
        <section className="relative h-[90vh] sm:h-[70vh] flex items-center justify-center text-white bg-black">
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{backgroundImage: "url('https://img.freepik.com/premium-photo/black-gold-background-with-perfume-bottle-word-perfume-it_871710-18683.jpg')"}}></div>
          <motion.div 
            className="relative z-10 text-center p-4"
            variants={bannerVariants}
            initial="hidden"
            animate="visible"
          >
              <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-wider drop-shadow-lg">Elegância em Cada Gota</motion.h1>
              <motion.p variants={itemVariants} className="text-lg md:text-xl mt-4 text-gray-300">Descubra fragrâncias que definem momentos.</motion.p>
              <motion.div variants={itemVariants}>
                <button onClick={() => onNavigate('products')} className="mt-8 bg-amber-400 text-black px-8 sm:px-10 py-3 rounded-md text-lg font-bold hover:bg-amber-300 transition-colors">Explorar Coleção</button>
              </motion.div>
          </motion.div>
        </section>
        
        <section className="bg-black text-white py-12 md:py-16">
          <div className="container mx-auto px-4">
              <ProductCarousel products={products.newArrivals} onNavigate={onNavigate} title="Novidades"/>
          </div>
        </section>
        
        <section className="bg-gray-900 text-white py-12 md:py-16">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Navegue por Categoria</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                    {categoryCards.map(cat => (
                        <div key={cat.name} className="relative rounded-lg overflow-hidden h-64 md:h-80 group cursor-pointer" onClick={() => onNavigate(`products?category=${cat.filter}`)}>
                            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-wider">{cat.name}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
        
        <section className="bg-black text-white py-12 md:py-16">
          <div className="container mx-auto px-4">
             <ProductCarousel products={products.bestSellers} onNavigate={onNavigate} title="Mais Vendidos"/>
          </div>
        </section>
      </>
    );
};

const ProductsPage = ({ onNavigate, initialSearch = '', initialCategory = '', initialBrand = '' }) => {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [filters, setFilters] = useState({ search: initialSearch, brand: initialBrand, category: initialCategory });
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const productsPerPage = 12;

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        apiService('/products', 'GET', null, { signal: controller.signal })
            .then(data => {
                setAllProducts(data);
            })
            .catch(err => {
                 if (err.name !== 'AbortError') console.error("Falha ao buscar produtos:", err);
            })
            .finally(() => setIsLoading(false));

        return () => controller.abort();
    }, []);
    
    useEffect(() => {
        setFilters(prev => ({...prev, search: initialSearch, category: initialCategory, brand: initialBrand}));
    }, [initialSearch, initialCategory, initialBrand]);


    useEffect(() => {
        let result = allProducts;
        if (filters.search) result = result.filter(p => p.name.toLowerCase().includes(filters.search.toLowerCase()) || p.brand.toLowerCase().includes(filters.search.toLowerCase()));
        if (filters.brand) result = result.filter(p => p.brand === filters.brand);
        if (filters.category) result = result.filter(p => p.category === filters.category);
        setFilteredProducts(result);
        setCurrentPage(1);
    }, [filters, allProducts]);
    
    const uniqueBrands = [...new Set(allProducts.map(p => p.brand))];
    const uniqueCategories = [...new Set(allProducts.map(p => p.category))];
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    const ProductSkeleton = () => (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full animate-pulse">
            <div className="h-64 bg-gray-700"></div>
            <div className="p-5 flex-grow flex flex-col">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-5 bg-gray-700 rounded w-1/2 mb-auto"></div>
                <div className="h-8 bg-gray-700 rounded w-1/3 mt-4"></div>
                <div className="mt-4 flex items-stretch space-x-2">
                    <div className="h-10 bg-gray-700 rounded flex-grow"></div>
                    <div className="h-10 w-12 bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>
    );
    
    const gridContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    return (
        <div className="bg-black text-white py-12 min-h-screen">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Nossa Coleção</h2>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1 bg-gray-900 p-6 rounded-lg shadow-md h-fit lg:sticky lg:top-28">
                        <h3 className="text-xl font-bold mb-4 text-amber-400">Filtros</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Buscar por nome..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                             <select value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                                <option value="">Todas as Marcas</option>
                                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                                <option value="">Todas as Categorias</option>
                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </aside>
                    <main className="lg:col-span-3">
                        <motion.div 
                            variants={gridContainerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                        >
                           {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
                            ) : currentProducts.length > 0 ? (
                                currentProducts.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)
                            ) : (
                                <p className="col-span-full text-center text-gray-500">Nenhum produto encontrado para sua busca.</p>
                            )}
                        </motion.div>
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-8 items-center space-x-2 sm:space-x-4">
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50">Anterior</button>
                                <span className="text-sm sm:text-base">Página {currentPage} de {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50">Próxima</button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

const InstallmentModal = memo(({ isOpen, onClose, installments }) => {
    if (!isOpen || !installments || installments.length === 0) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Opções de Parcelamento">
            <div className="space-y-3">
                {installments.map(p => (
                    <div key={p.installments} className="flex justify-between items-center p-3 border border-gray-200 rounded-md transition-colors hover:bg-gray-50">
                        <div>
                            <p className="font-bold text-lg text-gray-800">{p.recommended_message.replace('.', ',')}</p>
                            <p className="text-sm text-gray-500">Total: R$ {p.total_amount.toFixed(2).replace('.', ',')}</p>
                        </div>
                        {p.installment_rate === 0 ? (
                            <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">Sem juros</span>
                        ) : (
                             <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full whitespace-nowrap">Com juros</span>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-6 text-center">Você poderá escolher o número de parcelas na hora de fechar a compra.</p>
        </Modal>
    );
});


const ProductDetailPage = ({ productId, onNavigate }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [crossSellProducts, setCrossSellProducts] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
    const { addToCart, calculateShipping, shippingCep, setShippingCep, shippingOptions, isLoadingShipping, shippingError, selectedShipping, setSelectedShipping } = useShop();
    const notification = useNotification();
    const [mainImage, setMainImage] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [thumbnailIndex, setThumbnailIndex] = useState(0);
    
    const [installments, setInstallments] = useState([]);
    const [isLoadingInstallments, setIsLoadingInstallments] = useState(true);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    
    const productImages = useMemo(() => parseImages(product?.images, null), [product]);

    const fetchProductData = useCallback(async (id) => {
        const controller = new AbortController();
        setIsLoading(true);
        try {
            const [productData, reviewsData, allProductsData, crossSellData] = await Promise.all([
                apiService(`/products/${id}`, 'GET', null, { signal: controller.signal }),
                apiService(`/products/${id}/reviews`, 'GET', null, { signal: controller.signal }),
                apiService('/products', 'GET', null, { signal: controller.signal }),
                apiService(`/products/${id}/related-by-purchase`, 'GET', null, { signal: controller.signal }).catch(() => []) 
            ]);
            
            const images = parseImages(productData.images, 'https://placehold.co/600x400/222/fff?text=Produto');
            setMainImage(images[0] || 'https://placehold.co/600x400/222/fff?text=Produto');
            setProduct(productData);
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);
            setCrossSellProducts(Array.isArray(crossSellData) ? crossSellData : []);

            if (productData && allProductsData) {
                const related = allProductsData.filter(p =>
                    p.id !== productData.id && (p.brand === productData.brand || p.category === productData.category)
                ).slice(0, 8); 
                setRelatedProducts(related);
            }

        } catch (err) {
            if (err.name !== 'AbortError') {
                 console.error("Falha ao buscar dados do produto:", err);
                 setProduct({ error: true, message: "Produto não encontrado ou ocorreu um erro." });
            }
        } finally {
            setIsLoading(false);
        }
        
        return () => controller.abort();
    }, []);

    useEffect(() => {
        fetchProductData(productId);
        window.scrollTo(0, 0);
    }, [productId, fetchProductData]);
    
    useEffect(() => {
        const fetchInstallments = async (price) => {
            if (!price || price <= 0) return;
            setIsLoadingInstallments(true);
            setInstallments([]);
            try {
                const installmentData = await apiService(`/mercadopago/installments?amount=${price}`);
                setInstallments(installmentData || []);
            } catch (error) {
                console.warn("Não foi possível carregar as opções de parcelamento.", error);
            } finally {
                setIsLoadingInstallments(false);
            }
        };

        if (product && !product.error) {
            fetchInstallments(product.price);
        }
    }, [product]);


    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            notification.show("Você precisa estar logado para avaliar.", 'error');
            onNavigate('login');
            return;
        }
        if (newReview.rating === 0) {
            notification.show("Por favor, selecione uma nota (clicando nas estrelas).", 'error');
            return;
        }
        try {
            await apiService(`/reviews`, 'POST', {
                product_id: productId,
                rating: newReview.rating,
                comment: newReview.comment,
            });
            notification.show("Avaliação enviada com sucesso!");
            setNewReview({ rating: 0, comment: '' });
            fetchProductData(productId); 
        } catch (error) {
            notification.show(`Erro ao enviar avaliação: ${error.message}`, 'error');
        }
    };
    
    const handleQuantityChange = (amount) => {
        setQuantity(prev => Math.max(1, prev + amount));
    };

    const handleAddToCart = () => {
        if(product) {
            addToCart(product, quantity);
            notification.show(`${quantity}x ${product.name} adicionado(s) ao carrinho!`);
        }
    };
    
    const handleBuyNow = () => {
        if(product) {
            addToCart(product, quantity);
            onNavigate('cart');
        }
    };
    
    const handleCalculateShipping = (e) => {
        e.preventDefault();
        if (product) {
            calculateShipping(shippingCep, [{...product, qty: quantity}]);
        }
    };
    
    const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length || 0;
    
    const TabButton = ({ label, tabName }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 md:px-6 py-2 text-base md:text-lg font-semibold border-b-2 transition-colors duration-300
                ${activeTab === tabName 
                    ? 'border-amber-400 text-amber-400' 
                    : 'border-transparent text-gray-500 hover:text-white hover:border-gray-500'}`
            }
        >
            {label}
        </button>
    );

    const parseTextToList = (text) => {
        if (!text || text.trim() === '') return null;
        return (
          <ul className="space-y-2">
            {text.split('\n').map((line, index) => (
              <li key={index} className="flex items-start">
                <span className="text-amber-400 mr-2 mt-1">&#10003;</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        );
    };

    const Lightbox = ({ images, onClose }) => (
        <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white text-4xl z-[1000]">&times;</button>
            <div className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center">
                <img src={mainImage} alt="Imagem ampliada" className="max-w-full max-h-full object-contain" />
            </div>
        </div>
    );
    
    const THUMBNAIL_ITEM_HEIGHT = 92; 
    const VISIBLE_THUMBNAILS = 5; 
    const canScrollUp = thumbnailIndex > 0;
    const canScrollDown = productImages.length > VISIBLE_THUMBNAILS && thumbnailIndex < productImages.length - VISIBLE_THUMBNAILS;

    const scrollThumbs = (direction) => {
        setThumbnailIndex(prev => {
            const newIndex = prev + direction;
            if (newIndex < 0) return 0;
            if (newIndex > productImages.length - VISIBLE_THUMBNAILS) return productImages.length - VISIBLE_THUMBNAILS;
            return newIndex;
        });
    };
    const UpArrow = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
    const DownArrow = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;

    const getInstallmentSummary = () => {
        if (isLoadingInstallments) {
            return <div className="h-5 bg-gray-700 rounded w-3/4 animate-pulse"></div>;
        }
        if (!installments || installments.length === 0) {
            return <span className="text-gray-500">Opções de parcelamento indisponíveis.</span>;
        }

        const noInterest = [...installments].reverse().find(p => p.installment_rate === 0);
        if (noInterest) {
            return (
                <span>
                    em até <span className="font-bold">{noInterest.installments}x de R$&nbsp;{noInterest.installment_amount.toFixed(2).replace('.', ',')}</span> sem juros
                </span>
            );
        }

        const lastInstallment = installments[installments.length - 1];
        if (lastInstallment) {
            return (
                <span>
                    ou em até <span className="font-bold">{lastInstallment.installments}x de R$&nbsp;{lastInstallment.installment_amount.toFixed(2).replace('.', ',')}</span>
                </span>
            );
        }
        return null;
    };

    if (isLoading) return <div className="text-white text-center py-20 bg-black min-h-screen">Carregando...</div>;
    if (product?.error) return <div className="text-white text-center py-20 bg-black min-h-screen">{product.message}</div>;
    if (!product) return <div className="bg-black min-h-screen"></div>;

    return (
        <div className="bg-black text-white min-h-screen">
            <InstallmentModal
                isOpen={isInstallmentModalOpen}
                onClose={() => setIsInstallmentModalOpen(false)}
                installments={installments}
            />
            {isLightboxOpen && productImages.length > 0 && (
                <Lightbox images={productImages} onClose={() => setIsLightboxOpen(false)} />
            )}
            <div className="container mx-auto px-4 py-8">
                 <div className="mb-4">
                    <a href="#products" onClick={(e) => { e.preventDefault(); onNavigate('products'); }} className="text-sm text-amber-400 hover:underline flex items-center w-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Voltar para todos os produtos
                    </a>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 flex flex-col-reverse sm:flex-row gap-4 lg:self-start">
                        <div className="relative flex-shrink-0 w-full sm:w-24 flex sm:flex-col items-center">
                            <AnimatePresence>
                            {canScrollUp && (
                                <motion.button 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    onClick={() => scrollThumbs(-1)} 
                                    className="hidden sm:flex items-center justify-center absolute top-0 left-1/2 -translate-x-1/2 z-10 w-8 h-8 bg-black/40 hover:bg-black/70 rounded-full text-white disabled:cursor-default transition-all"
                                    disabled={!canScrollUp}
                                >
                                    <UpArrow />
                                </motion.button>
                            )}
                            </AnimatePresence>
                            
                            <div className="w-full sm:h-[460px] overflow-x-auto sm:overflow-hidden scrollbar-hide py-10">
                                <motion.div
                                    className="flex sm:flex-col gap-3"
                                    animate={{ y: `-${thumbnailIndex * THUMBNAIL_ITEM_HEIGHT}px` }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                >
                                    {productImages.map((img, index) => (
                                        <div key={index} onMouseEnter={() => setMainImage(img)} className={`w-20 h-20 flex-shrink-0 bg-white p-1 rounded-md cursor-pointer border-2 transition-all ${mainImage === img ? 'border-amber-400' : 'border-transparent hover:border-gray-500'}`}>
                                            <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-contain" />
                                        </div>
                                    ))}
                                </motion.div>
                            </div>

                            <AnimatePresence>
                            {canScrollDown && (
                                <motion.button 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    onClick={() => scrollThumbs(1)} 
                                    className="hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2 z-10 w-8 h-8 bg-black/40 hover:bg-black/70 rounded-full text-white disabled:cursor-default transition-all"
                                    disabled={!canScrollDown}
                                >
                                    <DownArrow />
                                </motion.button>
                            )}
                            </AnimatePresence>
                        </div>

                        <div onClick={() => setIsLightboxOpen(true)} className="flex-grow bg-white p-4 rounded-lg flex items-center justify-center h-80 sm:h-[500px] cursor-zoom-in">
                            <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <p className="text-sm text-amber-400 font-semibold tracking-wider">{product.brand.toUpperCase()}</p>
                            <h1 className="text-3xl lg:text-4xl font-bold my-1">{product.name}</h1>
                            <h2 className="text-lg font-light text-gray-300">{product.volume}</h2>
                            <div className="flex items-center mt-2">
                                {[...Array(5)].map((_, i) => <StarIcon key={i} className={`h-5 w-5 ${i < Math.round(avgRating) ? 'text-amber-400' : 'text-gray-600'}`} isFilled={i < Math.round(avgRating)} />)}
                                {reviews.length > 0 && <span className="text-sm text-gray-400 ml-3">({reviews.length} avaliações)</span>}
                            </div>
                        </div>

                        <p className="text-4xl font-light text-white">R$ {Number(product.price).toFixed(2)}</p>
                        
                        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                            <div className="flex items-start">
                                <CreditCardIcon className="h-6 w-6 text-amber-400 mr-4 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-gray-300">{getInstallmentSummary()}</p>
                                    <button
                                        onClick={() => setIsInstallmentModalOpen(true)}
                                        className="text-amber-400 font-semibold hover:underline mt-1 disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed"
                                        disabled={isLoadingInstallments || !installments || installments.length === 0}
                                    >
                                        Ver parcelas disponíveis
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <p className="font-semibold">Quantidade:</p>
                            <div className="flex items-center border border-gray-700 rounded-md">
                                <button onClick={() => handleQuantityChange(-1)} className="px-4 py-2 text-xl hover:bg-gray-800 rounded-l-md">-</button>
                                <span className="px-5 py-2 font-bold text-lg">{quantity}</span>
                                <button onClick={() => handleQuantityChange(1)} className="px-4 py-2 text-xl hover:bg-gray-800 rounded-r-md">+</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button onClick={handleBuyNow} className="w-full bg-amber-400 text-black py-4 rounded-md text-lg hover:bg-amber-300 transition font-bold">Comprar Agora</button>
                            <button onClick={handleAddToCart} className="w-full bg-gray-700 text-white py-3 rounded-md text-lg hover:bg-gray-600 transition font-bold">Adicionar ao Carrinho</button>
                        </div>
                        
                        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                            <h4 className="font-bold text-base mb-3 text-amber-400">Calcular Frete e Prazo</h4>
                            <form onSubmit={handleCalculateShipping} className="flex">
                                <input type="text" value={shippingCep} onChange={e => setShippingCep(maskCEP(e.target.value))} placeholder="00000-000" className="w-full p-2 bg-gray-800 border border-gray-700 rounded-l-md focus:ring-amber-400 focus:border-amber-400 text-sm" />
                                <button type="submit" className="bg-amber-500 text-black font-bold px-4 rounded-r-md hover:bg-amber-400 transition-colors flex items-center justify-center" disabled={isLoadingShipping}>
                                    {isLoadingShipping ? <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'OK'}
                                </button>
                            </form>
                            {shippingError && <p className="text-red-400 mt-2 text-sm">{shippingError}</p>}
                             <div className="mt-4 space-y-2">
                                {shippingOptions.map((option, index) => (
                                    <div 
                                        key={index} 
                                        onClick={() => setSelectedShipping(option)} 
                                        className={`flex justify-between items-center text-sm p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedShipping?.name === option.name ? 'border-amber-400 bg-amber-400/10' : 'border-gray-700 hover:border-gray-600'}`}
                                    >
                                        <div className="flex items-center">
                                            {option.company?.picture && <img src={option.company.picture} alt={option.company.name} className="w-5 h-5 mr-3 rounded-full"/>}
                                            <div className="flex flex-col">
                                               <span className="font-semibold text-white">{option.name}</span>
                                               {option.delivery_time && <span className="text-xs text-gray-400">{option.delivery_time} dias úteis</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="font-bold text-amber-400 mr-4">R$ {option.price.toFixed(2)}</p>
                                            {selectedShipping?.name === option.name && <CheckCircleIcon className="h-5 w-5 text-amber-500" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 pt-10 border-t border-gray-800">
                    <div className="flex justify-center border-b border-gray-800 mb-6 flex-wrap">
                        <TabButton label="Descrição" tabName="description" />
                        <TabButton label="Notas Olfativas" tabName="notes" />
                        <TabButton label="Como Usar" tabName="how_to_use" />
                        <TabButton label="Ideal Para" tabName="ideal_for" />
                    </div>
                    <div className="text-gray-300 leading-relaxed max-w-4xl mx-auto min-h-[100px]">
                        {activeTab === 'description' && <p>{product.description || 'Descrição não disponível.'}</p>}
                        {activeTab === 'notes' && (product.notes ? parseTextToList(product.notes) : <p>Notas olfativas não disponíveis.</p>)}
                        {activeTab === 'how_to_use' && <p>{product.how_to_use || 'Instruções de uso não disponíveis.'}</p>}
                        {activeTab === 'ideal_for' && (product.ideal_for ? parseTextToList(product.ideal_for) : <p>Informação não disponível.</p>)}
                    </div>
                </div>


                {crossSellProducts.length > 0 && (
                    <div className="mt-20 pt-10 border-t border-gray-800">
                        <ProductCarousel products={crossSellProducts} onNavigate={onNavigate} title="Quem comprou, levou também" />
                    </div>
                )}
                
                {relatedProducts.length > 0 && (
                    <div className="mt-20 pt-10 border-t border-gray-800">
                        <ProductCarousel products={relatedProducts} onNavigate={onNavigate} title="Pode também gostar de..." />
                    </div>
                )}
                
                <div className="mt-20 pt-10 border-t border-gray-800 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold mb-6 text-center">Avaliações de Clientes</h2>
                    <div className="space-y-6 mb-8">
                        {reviews.length > 0 ? reviews.map((review) => (
                             <div key={review.id} className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                                <div className="flex items-center mb-2">
                                    <p className="font-bold mr-4">{review.user_name}</p>
                                    <div className="flex">{[...Array(5)].map((_, j) => <StarIcon key={j} className={`h-5 w-5 ${j < review.rating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={j < review.rating}/>)}</div>
                                </div>
                                <p className="text-gray-300">{review.comment}</p>
                            </div>
                        )) : <p className="text-gray-500 text-center mb-8">Seja o primeiro a avaliar!</p>}
                    </div>
                     {user ? (
                         <form onSubmit={handleReviewSubmit} className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                           <h3 className="text-xl font-bold mb-4">Deixe sua avaliação</h3>
                           <div className="flex items-center space-x-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon key={i} onClick={() => setNewReview({...newReview, rating: i + 1})} className={`h-8 w-8 cursor-pointer ${i < newReview.rating ? 'text-amber-400' : 'text-gray-600 hover:text-amber-300'}`} isFilled={i < newReview.rating} />
                                ))}
                           </div>
                           <textarea value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} placeholder="Escreva seu comentário..." className="w-full p-3 bg-gray-800 border border-gray-700 rounded h-28 mb-4 focus:ring-amber-400 focus:border-amber-400" required></textarea>
                           <button type="submit" className="bg-amber-400 text-black px-6 py-2 rounded-md font-bold">Enviar Avaliação</button>
                        </form>
                     ) : (
                        <p className="text-gray-400 text-center">Você precisa estar <a href="#login" onClick={(e) => {e.preventDefault(); onNavigate('login');}} className="text-amber-400 underline">logado</a> para deixar uma avaliação.</p>
                     )}
                </div>
            </div>
        </div>
    );
};
const LoginPage = ({ onNavigate }) => {
    const { login } = useAuth();
    const notification = useNotification();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            notification.show('Login bem-sucedido!');
            window.location.hash = '#home';
        } catch (err) {
            setError(err.message || "Ocorreu um erro desconhecido.");
            notification.show(err.message || "Ocorreu um erro desconhecido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-gray-900 text-white p-8 rounded-2xl shadow-lg border border-gray-800"
            >
                <h2 className="text-3xl font-bold text-center mb-6 text-amber-400">Login</h2>
                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md">{error}</p>}
                <form onSubmit={handleLogin} className="space-y-6">
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <button type="submit" disabled={isLoading} className="w-full py-2 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60">
                         {isLoading ? <SpinnerIcon /> : 'Entrar'}
                    </button>
                </form>
                <div className="flex justify-between items-center mt-4">
                    <a href="#register" onClick={(e) => {e.preventDefault(); onNavigate('register')}} className="text-sm text-amber-400 hover:underline">Não tem uma conta? Registre-se</a>
                    <a href="#forgot-password" onClick={(e) => {e.preventDefault(); onNavigate('forgot-password')}} className="text-sm text-gray-400 hover:underline">Esqueci minha senha</a>
                </div>
            </motion.div>
        </div>
    );
};

const RegisterPage = ({ onNavigate }) => {
    const { register } = useAuth();
    const notification = useNotification();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cpf, setCpf] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
             setError("A senha deve ter pelo menos 6 caracteres.");
             return;
        }
        if (!validateCPF(cpf)) {
            setError("O CPF informado é inválido.");
            return;
        }
        
        setIsLoading(true);
        try {
            await register(name, email, password, cpf);
            notification.show("Usuário registrado com sucesso! Você já pode fazer o login.");
            setTimeout(() => onNavigate('login'), 2000);
        } catch (err) {
            setError(err.message);
            notification.show(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCpfChange = (e) => {
        setCpf(maskCPF(e.target.value));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-gray-900 text-white p-8 rounded-2xl shadow-lg border border-gray-800"
            >
                <h2 className="text-3xl font-bold text-center mb-6 text-amber-400">Criar Conta</h2>
                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md">{error}</p>}
                <form onSubmit={handleRegister} className="space-y-6">
                    <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="text" placeholder="CPF" value={cpf} onChange={handleCpfChange} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <button type="submit" disabled={isLoading} className="w-full py-2 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60">
                        {isLoading ? <SpinnerIcon /> : 'Registrar'}
                    </button>
                </form>
                 <div className="text-center mt-4">
                    <a href="#login" onClick={(e) => {e.preventDefault(); onNavigate('login')}} className="text-sm text-amber-400 hover:underline">Já tem uma conta? Faça o login</a>
                </div>
            </motion.div>
        </div>
    );
};

const ForgotPasswordPage = ({ onNavigate }) => {
    const notification = useNotification();
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);

    const handleValidation = async (e) => {
        e.preventDefault();
        setError('');
        if (!validateCPF(cpf)) {
            setError("O CPF informado é inválido.");
            return;
        }

        try {
            await apiService('/forgot-password', 'POST', { email, cpf });
            notification.show('Usuário validado com sucesso. Por favor, crie uma nova senha.');
            setStep(2);
        } catch (err) {
            setError(err.message || 'E-mail ou CPF não correspondem a um usuário cadastrado.');
            notification.show(err.message || 'Dados inválidos.', 'error');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            setError("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        try {
            await apiService('/reset-password', 'POST', { email, cpf, newPassword });
            notification.show('Senha redefinida com sucesso! Você já pode fazer login.');
            setTimeout(() => onNavigate('login'), 2000);
        } catch (err) {
            setError(err.message);
            notification.show(err.message, 'error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-gray-900 text-white p-8 rounded-2xl shadow-lg border border-gray-800"
            >
                <h2 className="text-3xl font-bold text-center mb-6 text-amber-400">Recuperar Senha</h2>
                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md">{error}</p>}
                
                {step === 1 ? (
                    <form onSubmit={handleValidation} className="space-y-6">
                        <p className="text-sm text-gray-400 text-center">Para começar, por favor, insira seu e-mail e CPF cadastrados.</p>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <input type="text" placeholder="CPF" value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <button type="submit" className="w-full py-2 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition">Verificar</button>
                    </form>
                ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-6">
                        <p className="text-sm text-gray-400 text-center">Usuário validado! Agora, crie sua nova senha.</p>
                        <input type="password" placeholder="Nova Senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <button type="submit" className="w-full py-2 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition">Redefinir Senha</button>
                    </form>
                )}

                <div className="text-center mt-4">
                    <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} className="text-sm text-gray-400 hover:underline">Voltar para o Login</a>
                </div>
            </motion.div>
        </div>
    );
};

const CartPage = ({ onNavigate }) => {
    const { 
        cart,
        updateQuantity,
        removeFromCart,
        shippingCep, setShippingCep, 
        shippingOptions, calculateShipping, 
        isLoadingShipping, shippingError,
        selectedShipping, setSelectedShipping,
        couponCode, setCouponCode,
        applyCoupon, removeCoupon,
        couponMessage, appliedCoupon
    } = useShop();

    const handleCalculateShipping = (e) => {
        e.preventDefault();
        calculateShipping(shippingCep, cart);
    };

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
    const shippingCost = useMemo(() => selectedShipping ? selectedShipping.price : 0, [selectedShipping]);

    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        let discountValue = 0;
        if (appliedCoupon.type === 'percentage') {
            discountValue = subtotal * (parseFloat(appliedCoupon.value) / 100);
        } else if (appliedCoupon.type === 'fixed') {
            discountValue = parseFloat(appliedCoupon.value);
        } else if (appliedCoupon.type === 'free_shipping') {
            discountValue = shippingCost;
        }
        return discountValue;
    }, [appliedCoupon, subtotal, shippingCost]);

    
    const handleApplyCoupon = (e) => {
        e.preventDefault();
        if (couponCode.trim()) {
            applyCoupon(couponCode);
        }
    }
    
    const total = useMemo(() => subtotal - discount + shippingCost, [subtotal, discount, shippingCost]);


    return (
        <div className="bg-black text-white min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-8">Carrinho de Compras</h1>
                {cart.length === 0 ? (
                    <div className="text-center py-16 bg-gray-900 rounded-lg border border-gray-800">
                        <p className="text-gray-400 text-xl">Seu carrinho está vazio.</p>
                        <button onClick={() => onNavigate('products')} className="mt-6 bg-amber-400 text-black px-6 py-2 rounded-md hover:bg-amber-300 font-bold">Ver produtos</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 space-y-4">
                                {cart.map(item => (
                                    <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-700 pb-4 last:border-b-0 gap-4">
                                        <div className="flex items-center w-full sm:w-auto">
                                            <div 
                                                className="w-20 h-20 bg-white rounded-md flex-shrink-0 cursor-pointer"
                                                onClick={() => onNavigate(`product/${item.id}`)}
                                            >
                                                <img src={getFirstImage(item.images, 'https://placehold.co/80x80/222/fff?text=Img')} alt={item.name} className="w-full h-full object-contain"/>
                                            </div>
                                            <div className="flex-grow px-4">
                                                <h3 className="font-bold text-lg cursor-pointer hover:text-amber-400 transition" onClick={() => onNavigate(`product/${item.id}`)}>{item.name}</h3>
                                                <p className="text-sm text-amber-400">R$ {Number(item.price).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between w-full sm:w-auto">
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="px-3 py-1 border border-gray-700 rounded">-</button>
                                                <span className="w-8 text-center">{item.qty}</span>
                                                <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="px-3 py-1 border border-gray-700 rounded">+</button>
                                            </div>
                                            <p className="font-bold w-28 text-right">R$ {(item.price * item.qty).toFixed(2)}</p>
                                            <button onClick={() => removeFromCart(item.id)} className="ml-4 text-gray-500 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
                                <h4 className="font-bold text-lg mb-3 text-amber-400">Calcular Frete</h4>
                                <form onSubmit={handleCalculateShipping} className="flex">
                                    <input type="text" value={shippingCep} onChange={e => setShippingCep(maskCEP(e.target.value))} placeholder="00000-000" className="w-full p-2 bg-gray-800 border border-gray-700 rounded-l-md focus:ring-amber-400 focus:border-amber-400 text-sm" />
                                    <button type="submit" className="bg-amber-500 text-black font-bold px-4 rounded-r-md hover:bg-amber-400 transition-colors flex items-center justify-center" disabled={isLoadingShipping}>
                                        {isLoadingShipping ? <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'OK'}
                                    </button>
                                </form>
                                {shippingError && <p className="text-red-400 mt-2 text-sm">{shippingError}</p>}
                                <div className="mt-4 space-y-2">
                                    {shippingOptions.map((option, index) => (
                                        <div key={index} onClick={() => setSelectedShipping(option)} className={`flex justify-between items-center text-sm p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedShipping?.name === option.name ? 'border-amber-400 bg-amber-400/20' : 'border-gray-700 hover:border-gray-600'}`}>
                                            <div className="flex items-center">
                                                <img src={option.company.picture} alt={option.company.name} className="w-6 h-6 mr-3 rounded-full"/>
                                                <div className="flex flex-col">
                                                   <span className="font-semibold text-white">{option.name}</span>
                                                   <span className="text-xs text-gray-400">{option.delivery_time} dias úteis</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <p className="font-bold text-amber-400 mr-4">R$ {option.price.toFixed(2)}</p>
                                                {selectedShipping?.name === option.name && <CheckCircleIcon className="h-6 w-6 text-amber-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 bg-gray-900 rounded-lg border border-gray-800 p-6 h-fit lg:sticky lg:top-28">
                            <h2 className="text-2xl font-bold mb-4">Resumo</h2>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-gray-300"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                                {selectedShipping && (
                                    <div className="flex justify-between text-gray-300">
                                        <span>Frete ({selectedShipping.name})</span>
                                        <span>R$ {shippingCost.toFixed(2)}</span>
                                    </div>
                                )}
                                {appliedCoupon && (
                                    <div className="flex justify-between text-green-400">
                                        <span>Desconto ({appliedCoupon.code})</span>
                                        <span>- R$ {discount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-gray-700 pt-4 mt-4 flex justify-between font-bold text-xl mb-6">
                                <span>Total</span>
                                <span className="text-amber-400">R$ {total.toFixed(2)}</span>
                            </div>
                            
                            {!appliedCoupon ? (
                                <>
                                <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} type="text" placeholder="Cupom de Desconto" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                                    <button type="submit" className="px-4 bg-amber-400 text-black font-bold rounded hover:bg-amber-300">Aplicar</button>
                                </form>
                                {couponMessage && <p className={`text-sm mt-2 ${couponMessage.includes('aplicado') ? 'text-green-400' : 'text-red-400'}`}>{couponMessage}</p>}
                                </>
                            ) : (
                                <div className="flex justify-between items-center bg-green-900/50 p-3 rounded-md">
                                    <p className="text-sm text-green-400 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/>{couponMessage}</p>
                                    <button onClick={removeCoupon} className="text-xs text-red-400 hover:underline">Remover</button>
                                </div>
                            )}
                            
                            <button onClick={() => onNavigate('checkout')} className="w-full mt-6 bg-amber-400 text-black py-3 rounded-md hover:bg-amber-300 font-bold disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!selectedShipping || cart.length === 0}>Ir para o Checkout</button>
                            {!selectedShipping && cart.length > 0 && <p className="text-center text-xs text-gray-400 mt-2">Por favor, calcule e selecione uma opção de frete para continuar.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
const WishlistPage = ({ onNavigate }) => {
    const { wishlist, removeFromWishlist } = useShop();
    const notification = useNotification();
    
    const handleRemove = async (item) => {
        await removeFromWishlist(item.id);
        notification.show(`${item.name} removido da lista de desejos.`, 'error');
    };

    return (
        <div className="bg-black text-white min-h-screen py-12">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl md:text-4xl font-bold mb-8">Lista de Desejos</h1>
                 {wishlist.length === 0 ? (
                    <div className="text-center py-16 bg-gray-900 rounded-lg border border-gray-800">
                        <p className="text-gray-400 text-xl">Sua lista de desejos está vazia.</p>
                        <button onClick={() => onNavigate('products')} className="mt-6 bg-amber-400 text-black px-6 py-2 rounded-md hover:bg-amber-300 font-bold">Ver produtos</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {wishlist.map(item => (
                            <div key={item.id} className="bg-gray-900 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between border border-gray-800 gap-4">
                                <div className="flex items-center flex-grow w-full sm:w-auto">
                                    <div className="w-20 h-20 bg-white p-1 rounded-md flex-shrink-0">
                                        <img src={getFirstImage(item.images, 'https://placehold.co/80x80/222/fff?text=Img')} alt={item.name} className="w-full h-full object-contain"/>
                                    </div>
                                    <h3 className="font-bold text-lg flex-grow px-4 sm:px-6 cursor-pointer hover:text-amber-400" onClick={() => onNavigate(`product/${item.id}`)}>{item.name}</h3>
                                </div>
                                <div className="flex items-center space-x-4 flex-shrink-0">
                                    <button onClick={() => onNavigate(`product/${item.id}`)} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600">Ver Produto</button>
                                    <button onClick={() => handleRemove(item)} className="text-gray-500 hover:text-red-500 p-2"><TrashIcon className="h-5 w-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
        </div>
    );
};const CheckoutPage = ({ onNavigate }) => {
    const { cart, selectedShipping, appliedCoupon, clearOrderState, shippingCep } = useShop();
    const notification = useNotification();
    
    const [shippingAddress, setShippingAddress] = useState({ 
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', localidade: '', uf: '' 
    });
    const [addressErrors, setAddressErrors] = useState({ numero: false });
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
    const shippingCost = useMemo(() => selectedShipping ? selectedShipping.price : 0, [selectedShipping]);
    
    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        let discountValue = 0;
        if (appliedCoupon.type === 'percentage') {
            discountValue = subtotal * (parseFloat(appliedCoupon.value) / 100);
        } else if (appliedCoupon.type === 'fixed') {
            discountValue = parseFloat(appliedCoupon.value);
        } else if (appliedCoupon.type === 'free_shipping') {
            discountValue = shippingCost;
        }
        return discountValue;
    }, [appliedCoupon, subtotal, shippingCost]);
    
    const total = useMemo(() => subtotal - discount + shippingCost, [subtotal, discount, shippingCost]);
    
    const handleCepLookup = useCallback(async (cepValue) => {
        const cep = cepValue.replace(/\D/g, '');
        if (cep.length !== 8) return;
        
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Falha na resposta da API de CEP.');
            
            const data = await response.json();
            if (!data.erro) {
                setShippingAddress(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, localidade: data.localidade, uf: data.uf, numero: '', complemento: '' }));
            } else {
                notification.show("CEP não encontrado.", "error");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            notification.show("Não foi possível buscar o CEP. Tente novamente.", "error");
        }
    }, [notification]);
    
    useEffect(() => {
        if (shippingCep) {
            const maskedCep = maskCEP(shippingCep);
            setShippingAddress(prev => ({ ...prev, cep: maskedCep }));
            handleCepLookup(maskedCep);
        }
    }, [shippingCep, handleCepLookup]);
    
    useEffect(() => {
        const { cep, logradouro, numero, bairro, localidade, uf } = shippingAddress;
        const addressComplete = cep.replace(/\D/g, '').length === 8 && logradouro && numero && bairro && localidade && uf;
        const paymentSelected = paymentMethod !== '';
        const isAddressValid = !Object.values(addressErrors).some(err => err);
        setIsFormValid(addressComplete && paymentSelected && !!selectedShipping && isAddressValid);
    }, [shippingAddress, paymentMethod, selectedShipping, addressErrors]);

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'numero') {
            const isValid = /^[0-9]+[a-zA-Z-]*$/.test(value) || value === '';
            setAddressErrors(prev => ({...prev, numero: !isValid}));
        }

        setShippingAddress(prev => ({...prev, [name]: value}));
    };

    const handleCepChange = (e) => {
        const newCep = maskCEP(e.target.value);
        setShippingAddress(prev => ({...prev, cep: newCep}));
        if (newCep.replace(/\D/g, '').length === 8) {
            handleCepLookup(newCep);
        }
    };
    
    const handlePlaceOrderAndPay = async () => {
        if (!isFormValid) {
            notification.show("Por favor, preencha todos os campos corretamente e selecione a forma de pagamento.", 'error');
            return;
        }
        setIsLoading(true);

        try {
            const orderPayload = {
                items: cart.map(item => ({ id: item.id, qty: item.qty, price: item.price })),
                total: total,
                shippingAddress: shippingAddress,
                paymentMethod: paymentMethod,
                shipping_method: selectedShipping.name,
                shipping_cost: shippingCost,
                coupon_code: appliedCoupon ? appliedCoupon.code : null,
                discount_amount: discount
            };
            const orderResult = await apiService('/orders', 'POST', orderPayload);
            const { orderId } = orderResult;

            if (paymentMethod === 'mercadopago') {
                const mpPayload = { orderId };
                
                const paymentResult = await apiService('/create-mercadopago-payment', 'POST', mpPayload);
                
                if (paymentResult && paymentResult.init_point) {
                    window.location.href = paymentResult.init_point;
                } else {
                    throw new Error("Não foi possível obter o link de pagamento.");
                }

            } else {
                clearOrderState();
                onNavigate(`order-success/${orderId}`);
            }

        } catch (error) {
            notification.show(`Erro ao processar pedido: ${error.message}`, 'error');
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-black text-white min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-8">Finalizar Pedido</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* COLUNA ESQUERDA: Formulários */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                            <h2 className="text-2xl font-bold mb-4 text-amber-400">1. Endereço de Entrega</h2>
                            <div className="space-y-4">
                                <input value={shippingAddress.cep} onChange={handleCepChange} placeholder="CEP" className="w-full p-3 bg-gray-800 border border-gray-700 rounded"/>
                                <input name="logradouro" value={shippingAddress.logradouro} onChange={handleAddressChange} placeholder="Rua / Logradouro" className="w-full p-3 bg-gray-800 border border-gray-700 rounded"/>
                                <div className="flex space-x-4">
                                   <div className="w-1/2">
                                        <input 
                                            name="numero" 
                                            value={shippingAddress.numero} 
                                            onChange={handleAddressChange} 
                                            placeholder="Número" 
                                            className={`w-full p-3 bg-gray-800 border rounded ${addressErrors.numero ? 'border-red-500' : 'border-gray-700'}`}
                                        />
                                        {addressErrors.numero && <p className="text-red-500 text-xs mt-1">Número inválido.</p>}
                                   </div>
                                   <input name="complemento" value={shippingAddress.complemento} onChange={handleAddressChange} placeholder="Complemento (Opcional)" className="w-1/2 p-3 bg-gray-800 border border-gray-700 rounded"/>
                                </div>
                                <input name="bairro" value={shippingAddress.bairro} onChange={handleAddressChange} placeholder="Bairro" className="w-full p-3 bg-gray-800 border border-gray-700 rounded"/>
                                <div className="flex space-x-4">
                                    <input name="localidade" value={shippingAddress.localidade} onChange={handleAddressChange} placeholder="Cidade" className="w-full p-3 bg-gray-800 border border-gray-700 rounded"/>
                                    <input name="uf" value={shippingAddress.uf} onChange={handleAddressChange} placeholder="UF" className="w-1/4 p-3 bg-gray-800 border border-gray-700 rounded"/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                            <h2 className="text-2xl font-bold mb-4 text-amber-400">2. Forma de Pagamento</h2>
                            <div className="space-y-3">
                                <button onClick={() => setPaymentMethod('mercadopago')} className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition ${paymentMethod === 'mercadopago' ? 'border-amber-400 bg-amber-900/50' : 'border-gray-700 hover:border-gray-600'}`}>
                                    <CreditCardIcon className="h-6 w-6 text-amber-400"/>
                                    <span className="font-bold">Cartão, Pix e Boleto via Mercado Pago</span>
                                </button>
                            </div>
                        </div>
                    </div>
                     {/* COLUNA DIREITA: Resumo */}
                    <div className="lg:col-span-1">
                        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 h-fit md:sticky md:top-28">
                            <h2 className="text-2xl font-bold mb-4">Resumo do Pedido</h2>
                            {cart.map(item => <div key={item.id} className="flex justify-between text-gray-300 py-1"><span>{item.qty}x {item.name}</span><span>R$ {(item.price * item.qty).toFixed(2)}</span></div>)}
                            <div className="border-t border-gray-700 mt-4 pt-4">
                                {appliedCoupon && <div className="flex justify-between text-green-400 py-1"><span>Desconto ({appliedCoupon.code})</span><span>- R$ {discount.toFixed(2)}</span></div>}
                                {selectedShipping ? (
                                    <div className="flex justify-between text-gray-300 py-1">
                                        <span>Frete ({selectedShipping.name})</span>
                                        <span>R$ {shippingCost.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-sm text-center py-1">Selecione o frete na página anterior.</div>
                                )}
                                <div className="flex justify-between font-bold text-xl mt-2"><span>Total</span><span className="text-amber-400">R$ {total.toFixed(2)}</span></div>
                            </div>
                            
                            <button onClick={handlePlaceOrderAndPay} disabled={!isFormValid || isLoading} className="w-full mt-6 bg-amber-400 text-black py-3 rounded-md hover:bg-amber-300 font-bold text-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
                                {isLoading ? (
                                    <div className="w-6 h-6 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
                                ) : (
                                    'Finalizar e Pagar'
                                )}
                            </button>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

const OrderSuccessPage = ({ orderId, onNavigate }) => {
    const { clearOrderState } = useShop();
    const [pageStatus, setPageStatus] = useState('processing'); // 'processing', 'success', 'timeout'
    const [finalOrderStatus, setFinalOrderStatus] = useState('');

    useEffect(() => {
        clearOrderState();

        const pollIntervalRef = useRef(null);
        const timeoutRef = useRef(null);

        const cleanup = () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };

        const pollStatus = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const response = await apiService(`/orders/${orderId}/status`); 
                if (response.status && response.status !== 'Pendente') {
                    setFinalOrderStatus(response.status);
                    setPageStatus('success');
                    cleanup();
                }
            } catch (err) {
                console.error("Erro ao verificar status, continuando a verificação.", err);
            }
        };
        
        pollIntervalRef.current = setInterval(pollStatus, 3000);

        timeoutRef.current = setTimeout(() => {
            if (pageStatus === 'processing') {
                setPageStatus('timeout');
                cleanup();
            }
        }, 45000);

        return cleanup;
    }, [orderId, clearOrderState, pageStatus]);


    const renderContent = () => {
        switch (pageStatus) {
            case 'success':
                return {
                    icon: <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />,
                    title: "Pagamento Aprovado!",
                    message: `Seu pedido #${orderId} foi confirmado e está com o status "${finalOrderStatus}". Já estamos preparando tudo para o envio!`
                };
            case 'timeout':
                return {
                    icon: <ClockIcon className="h-16 w-16 text-amber-500 mx-auto mb-4" />,
                    title: "Pedido Recebido!",
                    message: `Seu pedido #${orderId} foi recebido. A confirmação do pagamento pode levar alguns minutos. Você pode acompanhar o status final na sua área de cliente.`
                };
            case 'processing':
            default:
                return {
                    icon: (
                        <div className="relative mb-6">
                            <SpinnerIcon className="h-16 w-16 text-amber-500 mx-auto" />
                            <ClockIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white" />
                        </div>
                    ),
                    title: "Confirmando Pagamento...",
                    message: "Aguarde um instante, estamos confirmando seu pagamento com a operadora."
                };
        }
    };

    const { icon, title, message } = renderContent();

    return (
        <div className="bg-black text-white min-h-screen flex items-center justify-center p-4">
            <div className="text-center p-8 bg-gray-900 rounded-lg shadow-lg border border-gray-800 max-w-lg w-full">
                {icon}
                <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-2">{title}</h1>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                    <button onClick={() => onNavigate('account')} className="bg-amber-500 text-black px-6 py-2 rounded-md font-bold hover:bg-amber-400">Ver Meus Pedidos</button>
                    <button onClick={() => onNavigate('home')} className="bg-gray-700 text-white px-6 py-2 rounded-md font-bold hover:bg-gray-600">Voltar à Página Inicial</button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE DE LINHA DO TEMPO TOTALMENTE RESPONSIVO ---
const OrderStatusTimeline = ({ history, currentStatus, onStatusClick }) => {
    const STATUS_DEFINITIONS = useMemo(() => ({
        'Pendente': { title: 'Pedido Pendente', description: 'Aguardando a confirmação do pagamento. Se você pagou com boleto, pode levar até 2 dias úteis.', icon: <ClockIcon className="h-6 w-6" />, color: 'amber' },
        'Pagamento Aprovado': { title: 'Pagamento Aprovado', description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido para o envio.', icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green' },
        'Pagamento Recusado': { title: 'Pagamento Recusado', description: 'A operadora não autorizou o pagamento. Por favor, tente novamente ou use outra forma de pagamento.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Separando Pedido': { title: 'Separando Pedido', description: 'Seu pedido está sendo cuidadosamente separado e embalado em nosso estoque.', icon: <PackageIcon className="h-6 w-6" />, color: 'blue' },
        'Enviado': { title: 'Pedido Enviado', description: 'Seu pedido foi coletado pela transportadora e está a caminho do seu endereço. Use o código de rastreio para acompanhar.', icon: <TruckIcon className="h-6 w-6" />, color: 'cyan' },
        'Saiu para Entrega': { title: 'Saiu para Entrega', description: 'O carteiro ou entregador saiu com sua encomenda para fazer a entrega no seu endereço hoje.', icon: <TruckIcon className="h-6 w-6" />, color: 'indigo' },
        'Entregue': { title: 'Pedido Entregue', description: 'Seu pedido foi entregue com sucesso! Esperamos que goste.', icon: <HomeIcon className="h-6 w-6" />, color: 'teal' },
        'Cancelado': { title: 'Pedido Cancelado', description: 'Este pedido foi cancelado. Se tiver alguma dúvida, entre em contato conosco.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Reembolsado': { title: 'Pedido Reembolsado', description: 'O valor deste pedido foi estornado. O prazo para aparecer na sua fatura depende da operadora do cartão.', icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray' }
    }), []);

    const colorClasses = useMemo(() => ({
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
        blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
        red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
        gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
    }), []);
    
    const timelineOrder = useMemo(() => [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue'
    ], []);

    const historyMap = useMemo(() => new Map(history.map(h => [h.status, h])), [history]);
    const currentStatusIndex = timelineOrder.indexOf(currentStatus);

    if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
        const specialStatus = STATUS_DEFINITIONS[currentStatus];
        const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
        return (
            <div className="p-4 bg-gray-800 rounded-lg">
                <div onClick={() => onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                        {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                        <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* --- LAYOUT DESKTOP (md e acima) --- */}
            <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = statusInfo || index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                    
                    return (
                        <React.Fragment key={statusKey}>
                            <div 
                                className={`flex flex-col items-center ${isStepActive ? 'cursor-pointer group' : 'cursor-default'}`} 
                                onClick={isStepActive ? () => onStatusClick(definition) : undefined}>
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                            </div>
                            {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${currentClasses.bg}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* --- LAYOUT MOBILE (abaixo de md) --- */}
            <div className="md:hidden flex flex-col">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = statusInfo || index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                    return (
                        <div key={statusKey} className="flex">
                            <div className="flex flex-col items-center mr-4">
                                <div 
                                    className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}
                                    onClick={isStepActive ? () => onStatusClick(definition) : undefined}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${currentClasses.bg}`}></div>}
                            </div>
                            <div 
                                className={`pt-1.5 pb-8 ${isStepActive ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={isStepActive ? () => onStatusClick(definition) : undefined}>
                                <p className={`font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// --- ATUALIZAÇÃO: NOVO MODAL DE DESCRIÇÃO DE STATUS ---
const StatusDescriptionModal = ({ isOpen, onClose, details }) => {
    if (!isOpen || !details) return null;

    const modalColor = details.color || 'gray';
    const bgColor = `bg-${modalColor}-100`;
    const textColor = `text-${modalColor}-600`;
    const titleColor = `text-${modalColor}-700`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Status">
             <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${bgColor} ${textColor} mb-4`}>
                    {React.cloneElement(details.icon, { className: 'h-8 w-8' })}
                </div>
                <h3 className={`text-xl font-bold ${titleColor} mb-2`}>{details.title}</h3>
                <p className="text-gray-600">{details.description}</p>
            </div>
        </Modal>
    );
};


// --- PÁGINA "MINHA CONTA" ---
const MyAccountPage = ({ onNavigate }) => {
    const { user, logout } = useAuth();
    const { addToCart } = useShop();
    const notification = useNotification();
    
    const [orders, setOrders] = useState([]);
    const [message, setMessage] = useState('');

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [addressForm, setAddressForm] = useState({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', localidade: '', uf: '' });
    const [isAddressFormValid, setIsAddressFormValid] = useState(false);

    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [currentTrackingCode, setCurrentTrackingCode] = useState('');
    
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatusDetails, setSelectedStatusDetails] = useState(null);

    const fetchUserData = useCallback(() => {
        if (!user) return;
        apiService('/orders/my-orders')
            .then(data => setOrders(data.sort((a, b) => new Date(b.date) - new Date(a.date))))
            .catch(err => {
                console.error("Falha ao buscar pedidos:", err);
                setMessage("Falha ao buscar histórico de pedidos.");
            });
    }, [user]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        const { cep, logradouro, numero, bairro, localidade, uf } = addressForm;
        const isValid = cep.replace(/\D/g, '').length === 8 && logradouro && numero && bairro && localidade && uf;
        setIsAddressFormValid(isValid);
    }, [addressForm]);
    
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage('');
        if(newPassword.length < 6) {
            notification.show("A nova senha deve ter pelo menos 6 caracteres.", "error");
            return;
        }
        try {
            await apiService('/users/me/password', 'PUT', { password: newPassword });
            notification.show('Senha alterada com sucesso!');
            setNewPassword('');
            setIsPasswordModalOpen(false);
        } catch (error) {
             notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    const handleOpenAddressModal = (order) => {
        try {
            const currentAddress = order.shipping_address ? JSON.parse(order.shipping_address) : {};
            setAddressForm({
                cep: currentAddress.cep || '', logradouro: currentAddress.logradouro || '',
                numero: currentAddress.numero || '', complemento: currentAddress.complemento || '',
                bairro: currentAddress.bairro || '', localidade: currentAddress.localidade || '',
                uf: currentAddress.uf || ''
            });
        } catch (error) {
            console.error("Failed to parse shipping address:", error);
            notification.show("O endereço deste pedido está mal formatado.", "error");
            setAddressForm({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', localidade: '', uf: '' });
        }
        setEditingOrder(order);
        setIsAddressModalOpen(true);
    };
    
    const handleAddressFormChange = (e) => {
        const { name, value } = e.target;
        setAddressForm(prev => ({...prev, [name]: value}));
    };

    const handleCepLookupInModal = async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        setAddressForm(prev => ({...prev, cep: e.target.value}));
        if (cep.length !== 8) return;
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if(!data.erro) {
                setAddressForm(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, localidade: data.localidade, uf: data.uf, numero: '', complemento: '' }));
            } else {
                notification.show("CEP não encontrado.", "error");
            }
        } catch(error) {
            console.error("Erro ao buscar CEP:", error);
        }
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        if (!editingOrder || !isAddressFormValid) return;
        try {
            await apiService(`/orders/${editingOrder.id}/address`, 'PUT', { address: addressForm });
            notification.show('Endereço atualizado com sucesso!');
            setIsAddressModalOpen(false);
            fetchUserData();
        } catch (error) {
            notification.show(`Erro ao atualizar endereço: ${error.message}`, "error");
        }
    };
    
    const handleRepeatOrder = (orderItems) => {
        if (!orderItems) return;
        let count = 0;
        orderItems.forEach(item => {
            const product = {
                id: item.product_id,
                name: item.name,
                price: item.price,
                images: item.images,
            };
            addToCart(product, item.quantity);
            count++;
        });
        notification.show(`${count} item(ns) adicionado(s) ao carrinho!`);
        onNavigate('cart');
    }

    const handleOpenTrackingModal = (trackingCode) => {
        setCurrentTrackingCode(trackingCode);
        setIsTrackingModalOpen(true);
    };

    const handleOpenStatusModal = (statusDetails) => {
        setSelectedStatusDetails(statusDetails);
        setIsStatusModalOpen(true);
    };


    return (
        <>
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Alterar Senha">
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    placeholder="Mínimo 6 caracteres" 
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                            <button type="submit" className="w-full bg-amber-500 text-black font-bold py-2 rounded-md hover:bg-amber-400">Confirmar Alteração</button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
            {isAddressModalOpen && (
                <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title={`Alterar Endereço do Pedido #${editingOrder?.id}`}>
                     <form onSubmit={handleSaveAddress} className="space-y-4">
                        <input name="cep" value={addressForm.cep} onBlur={handleCepLookupInModal} onChange={handleAddressFormChange} placeholder="CEP" className="w-full p-2 bg-gray-100 border border-gray-300 rounded"/>
                        <input name="logradouro" value={addressForm.logradouro} onChange={handleAddressFormChange} placeholder="Rua" className="w-full p-2 bg-gray-100 border border-gray-300 rounded"/>
                        <div className="flex space-x-2">
                            <input name="numero" value={addressForm.numero} onChange={handleAddressFormChange} placeholder="Nº" className="w-1/3 p-2 bg-gray-100 border border-gray-300 rounded"/>
                            <input name="complemento" value={addressForm.complemento} onChange={handleAddressFormChange} placeholder="Compl." className="w-2/3 p-2 bg-gray-100 border border-gray-300 rounded"/>
                        </div>
                        <input name="bairro" value={addressForm.bairro} onChange={handleAddressFormChange} placeholder="Bairro" className="w-full p-2 bg-gray-100 border border-gray-300 rounded"/>
                        <div className="flex space-x-2">
                            <input name="localidade" value={addressForm.localidade} onChange={handleAddressFormChange} placeholder="Cidade" className="w-2/3 p-2 bg-gray-100 border border-gray-300 rounded"/>
                            <input name="uf" value={addressForm.uf} onChange={handleAddressFormChange} placeholder="UF" className="w-1/3 p-2 bg-gray-100 border border-gray-300 rounded"/>
                        </div>
                        <button type="submit" disabled={!isAddressFormValid} className="w-full bg-gray-800 text-white font-bold py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Salvar Endereço</button>
                     </form>
                </Modal>
            )}
            </AnimatePresence>

            <TrackingModal 
                isOpen={isTrackingModalOpen}
                onClose={() => setIsTrackingModalOpen(false)}
                trackingCode={currentTrackingCode}
            />
            
             <StatusDescriptionModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                details={selectedStatusDetails}
            />

            <div className="bg-black text-white min-h-screen py-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-3xl md:text-4xl font-bold mb-8">Minha Conta</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-8">
                             <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                                 <h2 className="text-2xl font-bold text-amber-400 mb-4">Meus Dados</h2>
                                 <div className="space-y-2">
                                     <p><strong>Nome:</strong> {user?.name}</p>
                                     <p><strong>Email:</strong> {user?.email}</p>
                                     <button onClick={() => setIsPasswordModalOpen(true)} className="w-full mt-4 bg-amber-500 text-black font-bold py-2 rounded-md hover:bg-amber-400">Alterar Senha</button>
                                     <button onClick={() => { logout(); onNavigate('home'); }} className="w-full mt-2 bg-red-800 text-white font-bold py-2 rounded-md hover:bg-red-700">Sair</button>
                                 </div>
                             </div>
                        </div>
                        <div className="lg:col-span-2">
                            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                               <h2 className="text-2xl font-bold text-amber-400 mb-4">Histórico de Pedidos</h2>
                               {orders.length > 0 ? (
                                   <div className="space-y-6">
                                       {orders.map(order => (
                                           <div key={order.id} className="border border-gray-800 rounded-lg p-4 sm:p-6">
                                               <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                                                    <div>
                                                       <p className="text-lg">Pedido <span className="font-bold text-amber-400">#{order.id}</span></p>
                                                       <p className="text-sm text-gray-400">{new Date(order.date).toLocaleString('pt-BR')}</p>
                                                    </div>
                                                    <div className="text-left sm:text-right">
                                                       <p><strong>Total:</strong> <span className="text-amber-400 font-bold text-lg">R$ {Number(order.total).toFixed(2)}</span></p>
                                                    </div>
                                               </div>
                                               
                                               <div className="my-6">
                                                    <OrderStatusTimeline
                                                        history={order.history || []}
                                                        currentStatus={order.status}
                                                        onStatusClick={handleOpenStatusModal}
                                                    />
                                               </div>

                                                {order.tracking_code && (
                                                    <div className="my-4 p-3 bg-gray-800 rounded-md">
                                                        <p className="text-sm">
                                                            <strong>Cód. Rastreio:</strong> {order.tracking_code}
                                                        </p>
                                                    </div>
                                                )}

                                               <div className="space-y-2 mb-4 border-t border-gray-800 pt-4">
                                                   {order.items.map(item => (
                                                       <div key={item.id} className="flex items-center text-sm">
                                                            <img src={getFirstImage(item.images)} alt={item.name} className="h-10 w-10 object-contain mr-3 bg-white rounded"/>
                                                            <span>{item.quantity}x {item.name}</span>
                                                            <span className="ml-auto">R$ {Number(item.price).toFixed(2)}</span>
                                                       </div>
                                                   ))}
                                               </div>
                                                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
                                                    <button onClick={() => handleRepeatOrder(order.items)} className="bg-gray-700 text-white text-sm px-4 py-1 rounded-md hover:bg-gray-600">Repetir Pedido</button>
                                                    {(order.status === 'Pendente' || order.status === 'Pagamento Aprovado') && (
                                                        <button onClick={() => handleOpenAddressModal(order)} className="bg-blue-600 text-white text-sm px-4 py-1 rounded-md hover:bg-blue-700">
                                                            Alterar Endereço
                                                        </button>
                                                    )}
                                                    {order.tracking_code && (
                                                        <button onClick={() => handleOpenTrackingModal(order.tracking_code)} className="bg-green-600 text-white text-sm px-4 py-1 rounded-md hover:bg-green-700">
                                                            Rastrear Pedido
                                                        </button>
                                                    )}
                                                </div>
                                           </div>
                                       ))}
                                   </div>
                               ) : (
                                   <p className="text-gray-500">{message || "Você ainda não fez nenhum pedido."}</p>
                               )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};


const AjudaPage = ({ onNavigate }) => (
    <div className="bg-black text-white min-h-screen py-12">
        <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-8 text-amber-400">Central de Ajuda</h1>
            <div className="max-w-md mx-auto bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Fale Conosco</h2>
                    <p className="text-gray-400">Tem alguma dúvida ou precisa de ajuda com seu pedido? Entre em contato pelos nossos canais oficiais.</p>
                </div>
                <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-3 bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition">
                    <InstagramIcon className="h-8 w-8 text-amber-400" />
                    <span className="text-lg">@lovecestaseperfumesjp</span>
                </a>
                 <div className="flex items-center justify-center space-x-3 bg-gray-800 p-4 rounded-lg">
                    <WhatsappIcon className="h-8 w-8 text-amber-400" />
                    <span className="text-lg">83 98787-8878</span>
                </div>
            </div>
        </div>
    </div>
);

// --- PAINEL DO ADMINISTRADOR ---
const AdminLayout = memo(({ activePage, onNavigate, children }) => {
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        onNavigate('home');
    }
    return (
        <div className="min-h-screen flex bg-gray-100 text-gray-800">
            {/* Sidebar */}
            <aside className={`bg-gray-900 text-white w-64 fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out z-50 flex flex-col`}>
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800 flex-shrink-0">
                    <span className="text-xl font-bold text-amber-400">ADMIN</span>
                    <button className="lg:hidden p-2" onClick={() => setIsSidebarOpen(false)}>
                        <CloseIcon className="h-6 w-6"/>
                    </button>
                </div>
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {[
                        { key: 'dashboard', label: 'Dashboard', icon: <ChartIcon className="h-5 w-5"/> },
                        { key: 'products', label: 'Produtos', icon: <BoxIcon className="h-5 w-5"/> },
                        { key: 'orders', label: 'Pedidos', icon: <TruckIcon className="h-5 w-5"/> },
                        { key: 'users', label: 'Usuários', icon: <UsersIcon className="h-5 w-5"/> },
                        { key: 'coupons', label: 'Cupons', icon: <TagIcon className="h-5 w-5"/> },
                        { key: 'reports', label: 'Relatórios', icon: <FileIcon className="h-5 w-5"/> },
                    ].map(item => (
                        <a href="#" key={item.key} onClick={(e) => { e.preventDefault(); onNavigate(`admin/${item.key}`); setIsSidebarOpen(false); }} className={`flex items-center px-4 py-2 space-x-3 rounded-md transition-colors ${activePage === item.key ? 'bg-amber-500 text-black' : 'hover:bg-gray-800'}`}>
                            {item.icon}<span>{item.label}</span>
                        </a>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-800 flex-shrink-0">
                    <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="w-full text-left flex items-center px-4 py-2 rounded-md hover:bg-gray-800 mb-2">🏠 Voltar à Loja</a>
                    <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2 rounded-md hover:bg-gray-800">🚪 Sair</button>
                </div>
            </aside>
             {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-md lg:hidden h-16 flex items-center px-4 flex-shrink-0">
                     <button onClick={() => setIsSidebarOpen(true)} className="p-2">
                        <MenuIcon className="h-6 w-6 text-gray-600"/>
                     </button>
                     <h1 className="text-lg font-bold ml-4 capitalize">{activePage}</h1>
                </header>
                <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
});

// ... (Restante dos componentes do admin permanecem iguais, com exceção de AdminOrders) ...

const AdminDashboard = () => {
    const [stats, setStats] = useState({ totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0 });
    
    useEffect(() => {
        Promise.all([
            apiService('/orders').catch(() => []),
            apiService('/users').catch(() => []), 
            apiService('/products/all').catch(() => [])
        ]).then(([orders, users, products]) => {
            const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
            setStats({
                totalRevenue,
                totalSales: orders.length,
                pendingOrders: orders.filter(o => o.status.toLowerCase() === 'pendente').length,
                newCustomers: users.length, 
            });

            if (window.Chart) {
                const salesCtx = document.getElementById('salesChart')?.getContext('2d');
                if(salesCtx) {
                    if (window.mySalesChart) window.mySalesChart.destroy();
                    const monthlyRevenue = orders.reduce((acc, order) => {
                        const month = new Date(order.date).toLocaleString('default', { month: 'short', year: '2-digit' });
                        acc[month] = (acc[month] || 0) + parseFloat(order.total);
                        return acc;
                    }, {});
                    const sortedMonths = Object.keys(monthlyRevenue).sort((a, b) => {
                        const [m1, y1] = a.split(' ');
                        const [m2, y2] = b.split(' ');
                        return new Date(`01 ${m1} 20${y1}`) - new Date(`01 ${m2} 20${y2}`);
                    });
                    window.mySalesChart = new window.Chart(salesCtx, { type: 'line', data: {labels: sortedMonths, datasets: [{ label: 'Faturamento Mensal', data: sortedMonths.map(m => monthlyRevenue[m]), borderColor: '#D4AF37', tension: 0.1 }]}});
                }

                const bestSellersCtx = document.getElementById('bestSellersChart')?.getContext('2d');
                if(bestSellersCtx) {
                    if (window.myBestSellersChart) window.myBestSellersChart.destroy();
                    const sortedProducts = [...products].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);
                    window.myBestSellersChart = new window.Chart(bestSellersCtx, { type: 'bar', data: {labels: sortedProducts.map(p=>p.name), datasets: [{ label: 'Unidades Vendidas', data: sortedProducts.map(p=>p.sales || 0), backgroundColor: '#D4AF37' }]}});
                }
            }
        });
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow"><h4 className="text-gray-500">Faturamento Total</h4><p className="text-3xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-lg shadow"><h4 className="text-gray-500">Vendas Totais</h4><p className="text-3xl font-bold">{stats.totalSales}</p></div>
                 <div className="bg-white p-6 rounded-lg shadow"><h4 className="text-gray-500">Total de Clientes</h4><p className="text-3xl font-bold">{stats.newCustomers}</p></div>
                <div className="bg-white p-6 rounded-lg shadow"><h4 className="text-gray-500">Pedidos Pendentes</h4><p className="text-3xl font-bold">{stats.pendingOrders}</p></div>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow"><h3 className="font-bold mb-4">Vendas Mensais</h3><canvas id="salesChart"></canvas></div>
                <div className="bg-white p-6 rounded-lg shadow"><h3 className="font-bold mb-4">Produtos Mais Vendidos</h3><canvas id="bestSellersChart"></canvas></div>
             </div>
        </div>
    );
};

const CrudForm = ({ item, onSave, onCancel, fieldsConfig, brands = [], categories = [] }) => {
    const [formData, setFormData] = useState({});
    const [uploadStatus, setUploadStatus] = useState('');

    useEffect(() => {
        const initialData = {};
        fieldsConfig.forEach(field => {
            initialData[field.name] = item?.[field.name] ?? 
                (field.type === 'select' ? (field.options[0]?.value || '') : 
                (field.type === 'checkbox' ? 0 : 
                (field.name === 'images' ? [] : '')));
        });
        
        if (item?.images) {
            initialData.images = parseImages(item.images, null);
        }

        setFormData(initialData);
    }, [item, fieldsConfig]);

    useEffect(() => {
        if (formData.type === 'free_shipping') {
            setFormData(prev => ({ ...prev, value: '' }));
        }
    }, [formData.type]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
    };

    const handleImageArrayChange = (index, value) => {
        const newImages = [...(formData.images || [])];
        newImages[index] = value;
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const addImageField = () => {
        setFormData(prev => ({...prev, images: [...(prev.images || []), '']}));
    };

    const removeImageField = (index) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadStatus('Enviando imagem...');
        try {
            const response = await apiImageUploadService('/upload/image', file);
            setFormData(prev => ({...prev, images: [...(prev.images || []), response.imageUrl]}));
            setUploadStatus('Upload concluído com sucesso!');
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error) {
            setUploadStatus(`Erro no upload: ${error.message}`);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };

        if (dataToSubmit.volume && !isNaN(dataToSubmit.volume) && !dataToSubmit.volume.toLowerCase().includes('ml')) {
            dataToSubmit.volume = `${dataToSubmit.volume}ml`;
        }
        
        fieldsConfig.forEach(field => {
            if (field.editable === false) {
                delete dataToSubmit[field.name];
            }
        });

        const imagesToSave = dataToSubmit.images ? dataToSubmit.images.filter(img => img && img.trim() !== '') : [];
        const finalData = { ...dataToSubmit, images: JSON.stringify(imagesToSave) };
        delete finalData.images_upload; 

        onSave(finalData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fieldsConfig.map(field => {
                 if (field.name === 'brand') {
                    return (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                            <input
                                type="text"
                                name={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleChange}
                                list="brands-datalist"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                required={field.required}
                            />
                            <datalist id="brands-datalist">
                                {brands.map(b => <option key={b} value={b} />)}
                            </datalist>
                        </div>
                    );
                }
                if (field.name === 'category') {
                    return (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                            <input
                                type="text"
                                name={field.name}
                                value={formData[field.name] || ''}
                                onChange={handleChange}
                                list="categories-datalist"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                required={field.required}
                            />
                            <datalist id="categories-datalist">
                                {categories.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    );
                }
                if(field.name === 'images') {
                    return (
                        <div key="images-section">
                             <label className="block text-sm font-medium text-gray-700">URLs das Imagens</label>
                             {(formData.images || []).map((img, index) => (
                                <div key={index} className="flex items-center space-x-2 mt-2">
                                    <img src={img || 'https://placehold.co/40x40/eee/ccc?text=?'} alt="Thumbnail" className="w-10 h-10 object-cover rounded-md border" />
                                    <input type="text" value={img} onChange={(e) => handleImageArrayChange(index, e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder={`URL da Imagem ${index + 1}`} />
                                    <button type="button" onClick={() => removeImageField(index)} className="p-2 bg-red-500 text-white rounded-md flex-shrink-0 hover:bg-red-600"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                             ))}
                             <button type="button" onClick={addImageField} className="mt-3 text-sm text-blue-600 hover:text-blue-800">Adicionar mais uma imagem</button>
                        </div>
                    );
                }
                if (field.name === 'images_upload') {
                     return (
                        <div key={field.name}>
                             <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                             <input type="file" name={field.name} accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
                             {uploadStatus && <p className={`text-sm mt-2 ${uploadStatus.startsWith('Erro') ? 'text-red-500' : 'text-green-500'}`}>{uploadStatus}</p>}
                        </div>
                    );
                }
                if (field.name === 'value' && formData.type === 'free_shipping') {
                    return null;
                }
                return(
                    <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                        {field.type === 'textarea' ? (
                            <textarea name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-24" required={field.required}></textarea>
                        ) : field.type === 'select' ? (
                            <select name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required={field.required}>
                                 {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        ) : (
                            <div className="flex items-center">
                                <input type={field.type} name={field.name} value={formData[field.name] || ''} checked={field.type === 'checkbox' ? !!formData[field.name] : undefined} onChange={handleChange} className={`mt-1 block border border-gray-300 rounded-md shadow-sm ${field.type === 'checkbox' ? 'h-4 w-4' : 'w-full px-3 py-2'}`} required={field.required} step={field.step} disabled={field.editable === false} />
                            </div>
                        )}
                    </div>
                );
            })}
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900">Salvar</button>
            </div>
        </form>
    );
};

const FileUploadArea = ({ onFileSelect }) => {
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    const handleDragEvents = (e, isDragging) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(isDragging);
    };

    const handleDrop = (e) => {
        handleDragEvents(e, false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
            onFileSelect(files[0]);
        }
    };
    
    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
            onFileSelect(files[0]);
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current.click();

    return (
        <div 
            className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
            />
            <UploadIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
            {fileName ? (
                <div>
                    <p className="font-semibold text-gray-800">{fileName}</p>
                    <p className="text-xs text-gray-500">Clique ou arraste outro arquivo para substituir</p>
                </div>
            ) : (
                <p className="text-gray-600">Arraste e solte o arquivo CSV aqui, ou <span className="text-amber-600 font-semibold">clique para selecionar</span>.</p>
            )}
        </div>
    );
}

const DownloadTemplateButton = () => {
    const handleDownload = () => {
        const headers = "name,brand,category,price,stock,images,description,notes,how_to_use,ideal_for,volume,weight,width,height,length,is_active";
        const exampleRow = "Meu Perfume,Minha Marca,Unissex,199.90,50,https://example.com/img1.png,Descrição do meu perfume,Topo: Limão\\nCorpo: Jasmim,Aplicar na pele,\"Para todos os momentos, dia e noite\",100ml,0.4,12,18,12,1";
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + exampleRow;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_produtos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button onClick={handleDownload} className="text-sm text-blue-600 hover:text-blue-800 underline">
            Baixar modelo CSV
        </button>
    );
};


const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const confirmation = useConfirmation();
  const notification = useNotification();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [uniqueBrands, setUniqueBrands] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);

  const fetchProducts = useCallback((currentSearchTerm) => {
    const query = currentSearchTerm ? `?search=${encodeURIComponent(currentSearchTerm)}` : '';
    apiService(`/products/all${query}`)
        .then(data => {
            setProducts(data);
            const brands = [...new Set(data.map(p => p.brand).filter(b => b))];
            const categories = [...new Set(data.map(p => p.category).filter(c => c))];
            setUniqueBrands(brands);
            setUniqueCategories(categories);
        })
        .catch(err => console.error("Falha ao buscar produtos:", err));
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
        fetchProducts(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm, fetchProducts]);

  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };
  
  const handleSave = async (formData) => {
      try {
        if (editingProduct) {
            await apiService(`/products/${editingProduct.id}`, 'PUT', formData);
            notification.show('Produto atualizado com sucesso!');
        } else {
            await apiService('/products', 'POST', formData);
            notification.show('Produto criado com sucesso!');
        }
        fetchProducts(searchTerm);
        setIsModalOpen(false);
      } catch (error) {
          notification.show(`Erro ao salvar produto: ${error.message}`, 'error');
      }
  };

  const handleDelete = (id) => {
      confirmation.show("Tem certeza que deseja deletar este produto? Esta ação não pode ser desfeita.", async () => {
          try {
            await apiService(`/products/${id}`, 'DELETE');
            fetchProducts(searchTerm);
            notification.show('Produto deletado com sucesso.');
          } catch(error) {
            notification.show(`Erro ao deletar produto: ${error.message}`, 'error');
          }
      });
  };
  
  const productFields = [
      { name: 'name', label: 'Nome do Produto', type: 'text', required: true },
      { name: 'brand', label: 'Marca', type: 'text', required: true },
      { name: 'category', label: 'Categoria', type: 'text', required: true },
      { name: 'price', label: 'Preço', type: 'number', required: true, step: '0.01' },
      { name: 'stock', label: 'Estoque', type: 'number', required: true },
      { name: 'images_upload', label: 'Fazer Upload de Nova Imagem', type: 'file' },
      { name: 'images', label: 'URLs das Imagens', type: 'text_array' },
      { name: 'description', label: 'Descrição', type: 'textarea' },
      { name: 'notes', label: 'Notas Olfativas (Ex: Topo: Maçã\\nCorpo: Canela)', type: 'textarea' },
      { name: 'how_to_use', label: 'Como Usar', type: 'textarea' },
      { name: 'ideal_for', label: 'Ideal Para', type: 'textarea' },
      { name: 'volume', label: 'Volume (ex: 100ml)', type: 'text' },
      { name: 'weight', label: 'Peso (kg)', type: 'number', step: '0.01', required: true },
      { name: 'width', label: 'Largura (cm)', type: 'number', required: true },
      { name: 'height', label: 'Altura (cm)', type: 'number', required: true },
      { name: 'length', label: 'Comprimento (cm)', type: 'number', required: true },
      { name: 'is_active', label: 'Ativo', type: 'checkbox' },
  ];

  const handleFileSelect = (file) => {
      setImportMessage('');
      setSelectedFile(file);
  };

  const handleImport = async () => {
      if (!selectedFile) {
          setImportMessage('Por favor, selecione um arquivo.');
          return;
      }
      setIsImporting(true);
      setImportMessage('Importando, por favor aguarde...');
      try {
          const result = await apiUploadService('/products/import', selectedFile);
          setImportMessage(result.message);
          notification.show(result.message);
          fetchProducts(searchTerm);
          setTimeout(() => {
            setIsImportModalOpen(false);
            setImportMessage('');
            setSelectedFile(null);
          }, 2000);
      } catch (error) {
          setImportMessage(`Erro: ${error.message}`);
          notification.show(`Erro na importação: ${error.message}`, 'error');
      } finally {
          setIsImporting(false);
      }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prevSelected => {
        if (prevSelected.includes(productId)) {
            return prevSelected.filter(id => id !== productId);
        } else {
            return [...prevSelected, productId];
        }
    });
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const allProductIds = products.map(p => p.id);
          setSelectedProducts(allProductIds);
      } else {
          setSelectedProducts([]);
      }
  };

  const handleDeleteSelected = async () => {
      if (selectedProducts.length === 0) return;
      
      confirmation.show(`Tem certeza que deseja deletar ${selectedProducts.length} produtos?`, async () => {
          try {
              const result = await apiService('/products', 'DELETE', { ids: selectedProducts });
              fetchProducts(searchTerm); 
              setSelectedProducts([]); 
              notification.show(result.message || `${selectedProducts.length} produtos deletados.`);
          } catch (error) {
              notification.show(`Erro ao deletar produtos: ${error.message}`, 'error');
          }
      });
  };

  return (
    <div>
        <AnimatePresence>
            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Editar Produto' : 'Adicionar Produto'}>
                    <CrudForm 
                        item={editingProduct} 
                        onSave={handleSave} 
                        onCancel={() => setIsModalOpen(false)} 
                        fieldsConfig={productFields}
                        brands={uniqueBrands}
                        categories={uniqueCategories}
                    />
                </Modal>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isImportModalOpen && (
                <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Produtos via CSV">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-lg mb-2">Instruções</h3>
                            <p className="text-sm text-gray-600 mb-2">
                                O arquivo CSV deve conter um cabeçalho com as colunas exatamente como no modelo. 
                            </p>
                             <DownloadTemplateButton />
                        </div>
                        
                        <FileUploadArea onFileSelect={handleFileSelect} />

                        <button onClick={handleImport} disabled={!selectedFile || isImporting} className="w-full bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
                            {isImporting ? <SpinnerIcon /> : 'Fazer Upload e Importar'}
                        </button>
                        {importMessage && <p className={`mt-4 text-center text-sm font-semibold ${importMessage.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}>{importMessage}</p>}
                    </div>
                </Modal>
            )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
            <div className="flex flex-wrap gap-2">
                {selectedProducts.length > 0 && (
                    <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2">
                        <TrashIcon className="h-5 w-5"/> <span>Deletar ({selectedProducts.length})</span>
                    </button>
                )}
                <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2">
                    <UploadIcon className="h-5 w-5"/> <span>Importar</span>
                </button>
                <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2">
                    <PlusIcon className="h-5 w-5"/> <span>Novo Produto</span>
                </button>
            </div>
        </div>
        <div className="mb-6">
            <input 
                type="text" 
                placeholder="Pesquisar por nome, marca ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 w-4">
                                <input type="checkbox" onChange={handleSelectAll} checked={products.length > 0 && selectedProducts.length === products.length} />
                            </th>
                            <th className="p-4">Produto</th>
                            <th className="p-4">Marca</th>
                            <th className="p-4">Preço</th>
                            <th className="p-4">Estoque</th>
                            <th className="p-4">Vendas</th>
                            <th className="p-4">Ativo</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className={`border-b ${selectedProducts.includes(p.id) ? 'bg-amber-100' : ''}`}>
                                <td className="p-4"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} /></td>
                                <td className="p-4 flex items-center">
                                    <div className="w-10 h-10 mr-4 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                                        <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="max-h-full max-w-full object-contain" alt={p.name}/>
                                    </div>
                                    <p className="font-semibold">{p.name}</p>
                                </td>
                                <td className="p-4">{p.brand}</td>
                                <td className="p-4">R$ {Number(p.price).toFixed(2)}</td>
                                <td className="p-4">{p.stock}</td>
                                <td className="p-4">{p.sales || 0}</td>
                                <td className="p-4">{p.is_active ? 'Sim' : 'Não'}</td>
                                <td className="p-4 space-x-2"><button onClick={() => handleOpenModal(p)}><EditIcon className="h-5 w-5"/></button><button onClick={() => handleDelete(p.id)}><TrashIcon className="h-5 w-5"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="md:hidden space-y-4 p-4">
                {products.map(p => (
                    <div key={p.id} className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                             <div className="flex items-center">
                                <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} className="mr-4"/>
                                <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="h-12 w-12 object-contain mr-3 bg-gray-100 rounded"/>
                                <div>
                                    <p className="font-bold">{p.name}</p>
                                    <p className="text-sm text-gray-500">{p.brand}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm border-t pt-4">
                             <div><strong className="text-gray-500 block">Preço</strong> R$ {Number(p.price).toFixed(2)}</div>
                             <div><strong className="text-gray-500 block">Estoque</strong> {p.stock}</div>
                             <div><strong className="text-gray-500 block">Vendas</strong> {p.sales || 0}</div>
                        </div>
                         <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                            <button onClick={() => handleOpenModal(p)} className="p-2 text-blue-600"><EditIcon className="h-5 w-5"/></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600"><TrashIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  )
};

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const confirmation = useConfirmation();
    const notification = useNotification();

    const fetchUsers = useCallback(() => {
        apiService('/users').then(setUsers).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleOpenUserModal = (user) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (formData) => {
        try {
            await apiService(`/users/${editingUser.id}`, 'PUT', formData);
            fetchUsers();
            setIsUserModalOpen(false);
            notification.show('Usuário atualizado com sucesso!');
        } catch (error) {
            notification.show(`Erro ao atualizar usuário: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja remover este usuário?", async () => {
            try {
                await apiService(`/users/${id}`, 'DELETE');
                fetchUsers();
                notification.show('Usuário deletado.');
            } catch (err) {
                notification.show(`Erro ao deletar: ${err.message}`, 'error');
            }
        });
    };
    
    const userFields = [
        { name: 'name', label: 'Nome', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'cpf', label: 'CPF', type: 'text', required: false, editable: false },
        { name: 'role', label: 'Função', type: 'select', options: [{value: 'user', label: 'Usuário'}, {value: 'admin', label: 'Administrador'}] },
        { name: 'password', label: 'Nova Senha (deixe em branco para não alterar)', type: 'password', required: false },
    ];

    return (
        <div>
             <AnimatePresence>
                {isUserModalOpen && (
                    <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Editar Usuário">
                        <CrudForm item={editingUser} onSave={handleSaveUser} onCancel={() => setIsUserModalOpen(false)} fieldsConfig={userFields} />
                    </Modal>
                )}
            </AnimatePresence>
            <h1 className="text-3xl font-bold mb-6">Gerenciar Usuários</h1>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden md:block">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                             <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Ações</th>
                             </tr>
                        </thead>
                         <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b">
                                    <td className="p-4">{u.id}</td>
                                    <td className="p-4">{u.name}</td>
                                    <td className="p-4">{u.email}</td>
                                    <td className="p-4"><span className={`px-2 py-1 text-xs rounded-full ${u.role === 'admin' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>{u.role}</span></td>
                                    <td className="p-4 space-x-2"><button onClick={() => handleOpenUserModal(u)}><EditIcon className="h-5 w-5"/></button><button onClick={() => handleDelete(u.id)}><TrashIcon className="h-5 w-5"/></button></td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
                 <div className="md:hidden space-y-4 p-4">
                    {users.map(u => (
                        <div key={u.id} className="bg-white border rounded-lg p-4 shadow-sm">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold">{u.name}</p>
                                    <p className="text-sm text-gray-500">{u.email}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${u.role === 'admin' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>{u.role}</span>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                                <button onClick={() => handleOpenUserModal(u)} className="p-2 text-blue-600"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDelete(u.id)} className="p-2 text-red-600"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CouponCountdown = ({ createdAt, validityDays }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!validityDays || !createdAt) {
            setTimeLeft('Permanente');
            return;
        }

        const interval = setInterval(() => {
            const expirationDate = new Date(new Date(createdAt).getTime() + validityDays * 24 * 60 * 60 * 1000);
            const now = new Date();
            const difference = expirationDate - now;

            if (difference <= 0) {
                setTimeLeft('Expirado');
                clearInterval(interval);
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);
            
            let displayString = '';
            if (days > 0) displayString += `${days}d `;
            displayString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            setTimeLeft(displayString);
        }, 1000);

        return () => clearInterval(interval);
    }, [createdAt, validityDays]);

    const colorClass = timeLeft === 'Expirado' ? 'text-red-500' : 'text-green-600';

    return <span className={`font-mono text-sm ${colorClass}`}>{timeLeft}</span>;
};

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const confirmation = useConfirmation();
    const notification = useNotification();

    const fetchCoupons = useCallback(() => {
        apiService('/coupons').then(data => {
            setCoupons(data.sort((a,b) => b.id - a.id));
        }).catch(err=>console.error(err));
    }, []);

    useEffect(() => { fetchCoupons() }, [fetchCoupons]);

    const handleOpenModal = (coupon = null) => {
        setEditingCoupon(coupon);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingCoupon) {
                await apiService(`/coupons/${editingCoupon.id}`, 'PUT', formData);
                notification.show('Cupom atualizado!');
            } else {
                await apiService('/coupons', 'POST', formData);
                notification.show('Cupom criado!');
            }
            fetchCoupons();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja deletar este cupom?", async () => {
            try {
                await apiService(`/coupons/${id}`, 'DELETE');
                fetchCoupons();
                notification.show('Cupom deletado.');
            } catch(error) {
                notification.show(`Erro: ${error.message}`, 'error');
            }
        });
    }

    const couponFields = [
        { name: 'code', label: 'Código do Cupom', type: 'text', required: true, placeholder: 'Ex: PROMO10' },
        { name: 'type', label: 'Tipo de Desconto', type: 'select', options: [{value: 'percentage', label: 'Porcentagem (%)'}, {value: 'fixed', label: 'Valor Fixo (R$)'}, {value: 'free_shipping', label: 'Frete Grátis'}]},
        { name: 'value', label: 'Valor do Desconto', type: 'number', step: '0.01', required: false, placeholder: 'Ex: 10 para 10% ou R$10.00' },
        { name: 'validity_days', label: 'Dias de Validade', type: 'number', required: false, placeholder: 'Deixe em branco para ser permanente' },
        { name: 'is_first_purchase', label: 'Apenas para a primeira compra?', type: 'checkbox' },
        { name: 'is_single_use_per_user', label: 'Uso único por usuário?', type: 'checkbox' },
        { name: 'is_active', label: 'Ativo (pronto para uso)', type: 'checkbox' },
    ];
    
    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCoupon ? 'Editar Cupom' : 'Adicionar Cupom'}>
                        <CrudForm item={editingCoupon} onSave={handleSave} onCancel={() => setIsModalOpen(false)} fieldsConfig={couponFields} />
                    </Modal>
                )}
            </AnimatePresence>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Cupons</h1>
                <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 flex-shrink-0"><PlusIcon className="h-5 w-5"/> <span>Novo Cupom</span></button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden md:block">
                    <table className="w-full text-left">
                         <thead className="bg-gray-100">
                             <tr>
                                <th className="p-4">Código</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">1ª Compra</th>
                                <th className="p-4">Uso Único</th>
                                <th className="p-4">Validade</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Ações</th>
                             </tr>
                        </thead>
                         <tbody>
                            {coupons.map(c => (
                                <tr key={c.id} className="border-b">
                                    <td className="p-4 font-mono text-sm font-semibold">{c.code}</td>
                                    <td className="p-4 capitalize">{c.type.replace('_', ' ')}</td>
                                    <td className="p-4">{c.type === 'free_shipping' ? 'Grátis' : (c.type === 'percentage' ? `${c.value}%` : `R$ ${Number(c.value).toFixed(2)}`)}</td>
                                    <td className="p-4">{c.is_first_purchase ? 'Sim' : 'Não'}</td>
                                    <td className="p-4">{c.is_single_use_per_user ? 'Sim' : 'Não'}</td>
                                    <td className="p-4"><CouponCountdown createdAt={c.created_at} validityDays={c.validity_days} /></td>
                                    <td className="p-4"><span className={`px-2 py-1 text-xs rounded-full ${c.is_active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                                    <td className="p-4 space-x-2"><button onClick={() => handleOpenModal(c)}><EditIcon className="h-5 w-5"/></button><button onClick={() => handleDelete(c.id)}><TrashIcon className="h-5 w-5"/></button></td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
                 <div className="md:hidden space-y-4 p-4">
                    {coupons.map(c => (
                         <div key={c.id} className="bg-white border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start">
                                <span className="font-mono font-bold">{c.code}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm border-t pt-4">
                                 <div><strong className="text-gray-500 block">Tipo</strong> <span className="capitalize">{c.type.replace('_', ' ')}</span></div>
                                 <div><strong className="text-gray-500 block">Valor</strong> {c.type === 'free_shipping' ? 'Grátis' : (c.type === 'percentage' ? `${c.value}%` : `R$ ${Number(c.value).toFixed(2)}`)}</div>
                                 <div><strong className="text-gray-500 block">1ª Compra</strong> {c.is_first_purchase ? 'Sim' : 'Não'}</div>
                                 <div><strong className="text-gray-500 block">Uso Único</strong> {c.is_single_use_per_user ? 'Sim' : 'Não'}</div>
                                 <div className="col-span-2"><strong className="text-gray-500 block">Validade Restante</strong> <CouponCountdown createdAt={c.created_at} validityDays={c.validity_days} /></div>
                            </div>
                             <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                                <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-600"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editFormData, setEditFormData] = useState({ status: '', tracking_code: '' });
    const notification = useNotification();
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        customerName: '',
        minPrice: '',
        maxPrice: '',
    });
    // --- ATUALIZAÇÃO: Lista de status para admin
    const statuses = [
        'Pendente', 'Pagamento Aprovado', 'Pagamento Recusado', 'Separando Pedido', 
        'Enviado', 'Saiu para Entrega', 'Entregue', 'Cancelado', 'Reembolsado'
    ];

    const fetchOrders = useCallback(() => {
        apiService('/orders')
            .then(data => {
                const sortedData = data.sort((a,b) => new Date(b.date) - new Date(a.date));
                setOrders(sortedData);
                setFilteredOrders(sortedData);
            })
            .catch(err => console.error("Falha ao buscar pedidos:", err));
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    const handleOpenEditModal = async (order) => {
        try {
            const fullOrderDetails = await apiService(`/orders/${order.id}`);
            setEditingOrder(fullOrderDetails);
            setEditFormData({
                status: fullOrderDetails.status,
                tracking_code: fullOrderDetails.tracking_code || ''
            });
            setIsEditModalOpen(true);
        } catch (error) {
            notification.show("Erro ao buscar detalhes do pedido.", 'error');
            console.error(error);
        }
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveOrder = async (e) => {
        e.preventDefault();
        if (!editingOrder) return;
        try {
            await apiService(`/orders/${editingOrder.id}`, 'PUT', editFormData);
            fetchOrders();
            setIsEditModalOpen(false);
            setEditingOrder(null);
            notification.show('Pedido atualizado com sucesso!');
        } catch(error) {
            notification.show(`Erro ao atualizar pedido: ${error.message}`, 'error');
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = useCallback(() => {
        let tempOrders = [...orders];

        if (filters.startDate) {
            tempOrders = tempOrders.filter(o => new Date(o.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            tempOrders = tempOrders.filter(o => new Date(o.date) <= endOfDay);
        }
        if (filters.status) {
            tempOrders = tempOrders.filter(o => o.status === filters.status);
        }
        if (filters.customerName) {
            tempOrders = tempOrders.filter(o => o.user_name.toLowerCase().includes(filters.customerName.toLowerCase()));
        }
        if (filters.minPrice) {
            tempOrders = tempOrders.filter(o => parseFloat(o.total) >= parseFloat(filters.minPrice));
        }
        if (filters.maxPrice) {
            tempOrders = tempOrders.filter(o => parseFloat(o.total) <= parseFloat(filters.maxPrice));
        }

        setFilteredOrders(tempOrders);
    }, [orders, filters]);

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', status: '', customerName: '', minPrice: '', maxPrice: '' });
        setFilteredOrders(orders);
    }

    return (
        <div>
            <AnimatePresence>
                {editingOrder && (
                    <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Detalhes do Pedido #${editingOrder.id}`}>
                         <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-1">Cliente</h4>
                                    <p>{editingOrder.user_name}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-1">Pagamento</h4>
                                    <p className="capitalize">{editingOrder.payment_method}</p>
                                </div>
                            </div>

                            <div>
                                 <h4 className="font-bold text-gray-700 mb-1">Endereço de Entrega</h4>
                                 <div className="text-sm bg-gray-100 p-3 rounded-md">
                                     {(() => {
                                         try {
                                             const addr = JSON.parse(editingOrder.shipping_address);
                                             return (
                                                 <>
                                                     <p>{addr.logradouro}, {addr.numero} {addr.complemento && `- ${addr.complemento}`}</p>
                                                     <p>{addr.bairro}, {addr.localidade} - {addr.uf}</p>
                                                     <p>{addr.cep}</p>
                                                 </>
                                             )
                                         } catch { return <p>Endereço mal formatado.</p> }
                                     })()}
                                 </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-700 mb-2">Itens do Pedido</h4>
                                <div className="space-y-2 border-t pt-2">
                                    {editingOrder.items?.map(item => (
                                        <div key={item.id} className="flex items-center text-sm">
                                            <img src={getFirstImage(item.images)} alt={item.name} className="h-12 w-12 object-contain mr-3 bg-gray-100 rounded"/>
                                            <div>
                                                <p className="font-semibold text-gray-800">{item.name}</p>
                                                <p className="text-gray-600">{item.quantity} x R$ {Number(item.price).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-700 mb-2">Resumo Financeiro</h4>
                                <div className="text-sm bg-gray-100 p-3 rounded-md space-y-1">
                                    <div className="flex justify-between"><span>Subtotal:</span> <span>R$ {(editingOrder.items?.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0) || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Frete ({editingOrder.shipping_method || 'N/A'}):</span> <span>R$ {Number(editingOrder.shipping_cost || 0).toFixed(2)}</span></div>
                                    {Number(editingOrder.discount_amount) > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Desconto ({editingOrder.coupon_code || ''}):</span> 
                                        <span>- R$ {Number(editingOrder.discount_amount).toFixed(2)}</span>
                                    </div>
                                    )}
                                    <div className="flex justify-between font-bold text-base border-t mt-2 pt-2"><span>Total:</span> <span>R$ {Number(editingOrder.total).toFixed(2)}</span></div>
                                </div>
                            </div>

                            <form onSubmit={handleSaveOrder} className="space-y-4 border-t pt-4">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Status do Pedido</label>
                                    <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500">
                                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700">Código de Rastreio</label>
                                     <input type="text" name="tracking_code" value={editFormData.tracking_code} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500" />
                                 </div>
                                 <div className="flex justify-end space-x-3 pt-4">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900">Salvar Alterações</button>
                                </div>
                            </form>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6">Gerenciar Pedidos</h1>
            
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Pesquisa Avançada</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data de Início"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data Final"/>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md bg-white">
                        <option value="">Todos os Status</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="text" name="customerName" placeholder="Nome do Cliente" value={filters.customerName} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="number" name="minPrice" placeholder="Preço Mín." value={filters.minPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="number" name="maxPrice" placeholder="Preço Máx." value={filters.maxPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                    <button onClick={applyFilters} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Aplicar Filtros</button>
                    <button onClick={clearFilters} className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500">Limpar Filtros</button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden lg:block">
                     <table className="w-full text-left">
                         <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4 font-semibold">Pedido ID</th>
                                <th className="p-4 font-semibold">Cliente</th>
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Total</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Cód. Rastreio</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                         </thead>
                         <tbody>
                            {filteredOrders.map(o => (
                                <tr key={o.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-mono">#{o.id}</td>
                                    <td className="p-4">{o.user_name}</td>
                                    <td className="p-4">{new Date(o.date).toLocaleString('pt-BR')}</td>
                                    <td className="p-4">R$ {Number(o.total).toFixed(2)}</td>
                                    <td className="p-4"><span className={`px-2 py-1 text-xs rounded-full ${o.status === 'Entregue' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{o.status}</span></td>
                                    <td className="p-4 font-mono">{o.tracking_code || 'N/A'}</td>
                                    <td className="p-4"><button onClick={() => handleOpenEditModal(o)} className="text-blue-600 hover:text-blue-800"><EditIcon className="h-5 w-5"/></button></td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                </div>
                <div className="lg:hidden space-y-4 p-4">
                    {filteredOrders.map(o => (
                        <div key={o.id} className="bg-white border rounded-lg p-4 shadow-sm">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold">Pedido #{o.id}</p>
                                    <p className="text-sm text-gray-600">{o.user_name}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${o.status === 'Entregue' ? 'bg-green-100 text-green-800' : (o.status === 'Cancelado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>{o.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm border-t pt-4">
                                <div><strong className="text-gray-500 block">Data</strong> {new Date(o.date).toLocaleDateString('pt-BR')}</div>
                                <div><strong className="text-gray-500 block">Total</strong> R$ {Number(o.total).toFixed(2)}</div>
                                <div className="col-span-2"><strong className="text-gray-500 block">Cód. Rastreio</strong> {o.tracking_code || 'N/A'}</div>
                            </div>
                            <div className="flex justify-end mt-4 pt-2 border-t">
                                <button onClick={() => handleOpenEditModal(o)} className="flex items-center space-x-2 text-sm text-blue-600 font-semibold"><EditIcon className="h-4 w-4"/> <span>Detalhes</span></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminReports = () => {
    const runWhenLibsReady = (callback, requiredLibs) => {
        const check = () => {
            const isPdfReady = requiredLibs.includes('pdf') ? (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.API.autoTable === 'function') : true;
            const isExcelReady = requiredLibs.includes('excel') ? (window.XLSX) : true;

            if (isPdfReady && isExcelReady) {
                callback();
            } else {
                console.log("Aguardando bibliotecas de relatório...");
                setTimeout(check, 100);
            }
        };
        check();
    };

    const generatePdf = (data, headers, title) => {
        runWhenLibsReady(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('pt-BR');

            doc.setFontSize(18);
            doc.text(title, pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(8);
            doc.text(timestamp, pageWidth - 14, 10, { align: 'right' });
            doc.autoTable({ 
                head: [headers], 
                body: data,
                startY: 25
            });
            doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
        }, ['pdf']);
    };

    const generateExcel = (data, filename) => {
        runWhenLibsReady(() => {
            const wb = window.XLSX.utils.book_new();
            const ws = window.XLSX.utils.json_to_sheet(data);
            window.XLSX.utils.book_append_sheet(wb, ws, "Relatório");
            window.XLSX.writeFile(wb, `${filename}.xlsx`);
        }, ['excel']);
    };

    const handleSalesExport = async (format) => {
        try {
            const orders = await apiService('/orders');
            const data = orders.map(o => ({ Pedido_ID: o.id, Cliente: o.user_name, Data: new Date(o.date).toLocaleDateString(), Total: o.total, Status: o.status }));
            if (format === 'pdf') {
                generatePdf(data.map(Object.values), ['Pedido ID', 'Cliente', 'Data', 'Total', 'Status'], 'Relatorio de Vendas');
            } else {
                generateExcel(data, 'relatorio_vendas');
            }
        } catch (error) {
            alert(`Falha ao gerar relatório de vendas: ${error.message}`);
        }
    };
    
    const handleStockExport = async (format) => {
        try {
            const products = await apiService('/products/all');
            const data = products.map(p => ({ Produto: p.name, Marca: p.brand, Estoque: p.stock, Preço: p.price }));
            if (format === 'pdf') {
                generatePdf(data.map(Object.values), ['Produto', 'Marca', 'Estoque', 'Preço'], 'Relatorio de Estoque');
            } else {
                generateExcel(data, 'relatorio_estoque');
            }
        } catch (error) {
            alert(`Falha ao gerar relatório de estoque: ${error.message}`);
        }
    };

    return(
        <div>
            <h1 className="text-3xl font-bold mb-6">Relatórios</h1>
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-md gap-4">
                    <div>
                        <h4 className="font-bold">Relatório de Vendas</h4>
                        <p className="text-sm text-gray-600">Exporte um resumo de todos os pedidos realizados.</p>
                    </div>
                    <div className="space-x-2 flex-shrink-0">
                        <button onClick={() => handleSalesExport('pdf')} className="bg-red-500 text-white px-4 py-2 rounded">PDF</button>
                        <button onClick={() => handleSalesExport('excel')} className="bg-green-600 text-white px-4 py-2 rounded">Excel</button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-md gap-4">
                    <div>
                        <h4 className="font-bold">Relatório de Estoque</h4>
                        <p className="text-sm text-gray-600">Exporte a lista de produtos com o estoque atual.</p>
                    </div>
                    <div className="space-x-2 flex-shrink-0">
                         <button onClick={() => handleStockExport('pdf')} className="bg-red-500 text-white px-4 py-2 rounded">PDF</button>
                        <button onClick={() => handleStockExport('excel')} className="bg-green-600 text-white px-4 py-2 rounded">Excel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DA APLICAÇÃO ---
function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || 'home');

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);
  
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  const renderPage = () => {
    const [path, queryString] = currentPath.split('?');
    const searchParams = new URLSearchParams(queryString);
    const initialSearch = searchParams.get('search') || '';
    const initialCategory = searchParams.get('category') || '';
    const initialBrand = searchParams.get('brand') || '';
    
    const [mainPage, pageId] = path.split('/');

    if (mainPage === 'admin') {
        if (isLoading) return null;
        if (!isAuthenticated || user.role !== 'admin') {
             return <LoginPage onNavigate={navigate} />;
        }
        
        const adminSubPage = pageId || 'dashboard';
        const adminPages = {
            'dashboard': <AdminDashboard />, 
            'products': <AdminProducts />,
            'orders': <AdminOrders />,
            'users': <AdminUsers />,
            'coupons': <AdminCoupons />,
            'reports': <AdminReports />,
        };

        return (
            <AdminLayout activePage={adminSubPage} onNavigate={navigate}>
                {adminPages[adminSubPage] || <AdminDashboard />}
            </AdminLayout>
        );
    }

    if ((mainPage === 'account' || mainPage === 'wishlist' || mainPage === 'checkout') && !isAuthenticated) {
        if(isLoading) return null;
        return <LoginPage onNavigate={navigate} />;
    }
    
    if (mainPage === 'product' && pageId) {
        return <ProductDetailPage productId={parseInt(pageId)} onNavigate={navigate} />;
    }

    if (mainPage === 'order-success' && pageId) {
        return <OrderSuccessPage orderId={pageId} onNavigate={navigate} />;
    }
    
    const pages = {
        'home': <HomePage onNavigate={navigate} />,
        'products': <ProductsPage onNavigate={navigate} initialSearch={initialSearch} initialCategory={initialCategory} initialBrand={initialBrand} />,
        'login': <LoginPage onNavigate={navigate} />,
        'register': <RegisterPage onNavigate={navigate} />,
        'cart': <CartPage onNavigate={navigate} />,
        'checkout': <CheckoutPage onNavigate={navigate} />,
        'wishlist': <WishlistPage onNavigate={navigate} />,
        'account': <MyAccountPage onNavigate={navigate} />,
        'ajuda': <AjudaPage onNavigate={navigate} />,
        'forgot-password': <ForgotPasswordPage onNavigate={navigate} />,
    };
    return pages[mainPage] || <HomePage onNavigate={navigate} />;
  };
  
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-black"><p className="text-xl text-white">Carregando...</p></div>;

  const showHeaderFooter = !currentPath.startsWith('admin');
  
  return (
    <div className="bg-black min-h-screen flex flex-col">
      {showHeaderFooter && <Header onNavigate={navigate} />}
      <main className="flex-grow">{renderPage()}</main>
      {showHeaderFooter && !currentPath.startsWith('order-success') && (
        <footer className="bg-gray-900 text-white mt-auto py-8 text-center border-t border-gray-800">
          <p className="text-gray-500">© 2025 LovecestasePerfumes</p>
        </footer>
      )}
    </div>
  );
}

export default function App() {
    useEffect(() => {
        const loadScript = (src, id, callback) => {
            if (document.getElementById(id)) {
                if(callback) callback();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.id = id;
            script.async = true;
            script.onload = () => { if (callback) callback(); };
            document.body.appendChild(script);
        };

        // Carrega as bibliotecas de relatório
        loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'chartjs-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', 'jspdf-autotable-script');
        });

        // Carrega o SDK do Mercado Pago
        loadScript('https://sdk.mercadopago.com/js/v2', 'mercadopago-sdk');

    }, []);

    return (
        <AuthProvider>
            <NotificationProvider>
                <ConfirmationProvider>
                    <ShopProvider>
                        <AppContent />
                    </ShopProvider>
                </ConfirmationProvider>
            </NotificationProvider>
        </AuthProvider>
    );
}