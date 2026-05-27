import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { maskCPF, maskPhone, validateCPF, validatePhone } from '../utils/validation';
import {
    CheckBadgeIcon,
    ExclamationCircleIcon,
    EyeIcon,
    EyeOffIcon,
    FingerprintIcon,
    SpinnerIcon,
    WhatsappIcon
} from '../components/icons';

export const LoginPage = ({ onNavigate, redirectPath }) => { 
    const { login, setUser } = useAuth();
    const notification = useNotification();

    // Estados do formulário
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Estado para "Lembrar meu e-mail"
    const [rememberEmail, setRememberEmail] = useState(false);

    // Estados para o fluxo 2FA
    const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [tempAuthToken, setTempAuthToken] = useState('');

    // Estado para controle de exibição do botão de Biometria
    const [hasBiometrics, setHasBiometrics] = useState(false);

    // Inicializa a logo buscando da memória local (localStorage) primeiro
    const [appLogo, setAppLogo] = useState(() => {
        return localStorage.getItem('lovecestas_app_logo') || 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png';
    });

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    
    // Carrega o e-mail salvo e a Logo
    useEffect(() => {
        const savedEmail = localStorage.getItem('lovecestas_saved_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberEmail(true);
        }

        // Puxa a logo do sistema para exibir no login
        apiService('/settings/app-icons')
            .then(data => {
                if (data && data.pwa_icon && data.pwa_icon.current) {
                    setAppLogo(data.pwa_icon.current);
                    localStorage.setItem('lovecestas_app_logo', data.pwa_icon.current);
                }
            })
            .catch(() => {}); // Ignora silenciosamente se der erro
    }, []);

    // Efeito que verifica se o e-mail digitado possui biometria cadastrada
    useEffect(() => {
        const checkBiometrics = async () => {
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                try {
                    const response = await apiService('/webauthn/check', 'POST', { email });
                    setHasBiometrics(response.hasBiometrics);
                } catch (err) {
                    setHasBiometrics(false);
                }
            } else {
                setHasBiometrics(false);
            }
        };

        const timeoutId = setTimeout(() => {
            checkBiometrics();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [email]);

    const handleSaveEmailChoice = () => {
        if (rememberEmail && email) {
            localStorage.setItem('lovecestas_saved_email', email);
        } else {
            localStorage.removeItem('lovecestas_saved_email');
        }
    };

    const handleSuccessRedirect = () => {
        if (redirectPath) {
            onNavigate(redirectPath);
        } else {
            onNavigate('home');
        }
    };

   const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await login(email, password);

            // Grava a decisão de lembrar o e-mail
            handleSaveEmailChoice();

            if (response.twoFactorEnabled) {
                setTempAuthToken(response.token);
                setIsTwoFactorStep(true);
            } else {
                notification.show('Login bem-sucedido!');
                handleSuccessRedirect();
            }
        } catch (err) {
            setError(err.message || "Ocorreu um erro desconhecido.");
            notification.show(err.message || "Ocorreu um erro desconhecido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTwoFactorSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await apiService('/login/2fa/verify', 'POST', { token: twoFactorCode, tempAuthToken });
            const { user, accessToken, refreshToken } = response;

            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            if (accessToken) localStorage.setItem('accessToken', accessToken);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

            notification.show('Login bem-sucedido!');
            handleSuccessRedirect();

        } catch (err) {
            setError(err.message || "Código 2FA inválido ou expirado.");
            notification.show(err.message || "Código 2FA inválido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const startAuth = window.SimpleWebAuthnBrowser ? window.SimpleWebAuthnBrowser.startAuthentication : null;
            
            if (!startAuth) {
                notification.show("A biblioteca de biometria não está carregada.", "error");
                return;
            }

            setIsLoading(true);
            setError('');

            const optionsResp = await apiService('/webauthn/generate-authentication-options');
            
            let authResponse;
            try {
                authResponse = await startAuth(optionsResp.options);
            } catch (err) {
                console.log("Biometria cancelada ou falhou localmente:", err);
                setIsLoading(false);
                return; 
            }

            const verificationResp = await apiService('/webauthn/verify-authentication', 'POST', {
                body: authResponse,
                sessionId: optionsResp.sessionId
            });

            // Grava a decisão de lembrar o e-mail
            handleSaveEmailChoice();

            if (verificationResp.twoFactorEnabled) {
                setTempAuthToken(verificationResp.token);
                setIsTwoFactorStep(true);
            } else {
                const { user, accessToken, refreshToken } = verificationResp;
                setUser(user);
                localStorage.setItem('user', JSON.stringify(user));
                if (accessToken) localStorage.setItem('accessToken', accessToken);
                if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
                
                notification.show('Login biométrico bem-sucedido!');
                handleSuccessRedirect();
            }

        } catch (err) {
            console.error("Erro no login biométrico:", err);
            setError(err.message || "Falha na autenticação biométrica.");
            notification.show("Falha na autenticação biométrica.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-black p-4 sm:p-6"> 
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800" 
            >
                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
                
                {redirectPath && !isTwoFactorStep && (
                    <div className="mb-6 p-3 bg-amber-900/40 border border-amber-600 rounded-md flex items-center gap-3">
                        <ExclamationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-200">
                            Faça login para acessar os detalhes do pedido ou a página solicitada.
                        </p>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!isTwoFactorStep ? (
                        <motion.div key="login-form" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                            <div className="text-center mb-6">
                                <div className="mx-auto mb-3 inline-block w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"> 
                                  <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Bem-vindo de Volta</h2>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-4"> 
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Email</label>
                                    <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                                </div>
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Senha</label>
                                    <div className="relative">
                                        {/* CORREÇÃO: placeholder alterado para "Digite sua senha" */}
                                        <input type={isPasswordVisible ? 'text' : 'password'} placeholder="Digite sua senha" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base" />
                                       <button type="button" onClick={() => setIsPasswordVisible(v => !v)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center mb-2">
                                    <input 
                                        type="checkbox" 
                                        id="remember-email"
                                        checked={rememberEmail} 
                                        onChange={(e) => setRememberEmail(e.target.checked)} 
                                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900 cursor-pointer"
                                    />
                                    <label htmlFor="remember-email" className="ml-2 block text-sm text-gray-400 cursor-pointer hover:text-white transition-colors select-none">
                                        Lembrar meu e-mail
                                    </label>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg mt-2">
                                     {isLoading ? <SpinnerIcon /> : 'Entrar com Senha'}
                                </button>
                            </form>

                            <AnimatePresence>
                                {hasBiometrics && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }} 
                                        animate={{ opacity: 1, height: 'auto' }} 
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-gray-800 overflow-hidden"
                                    >
                                        <button 
                                            type="button" 
                                            onClick={handleBiometricLogin} 
                                            disabled={isLoading}
                                            className="w-full py-2.5 sm:py-3 px-4 bg-gray-800 border border-gray-700 text-white font-bold rounded-md hover:bg-gray-700 transition flex justify-center items-center gap-2 disabled:opacity-60 text-base sm:text-lg"
                                        >
                                            <FingerprintIcon className="h-5 w-5 text-amber-400" /> 
                                            Entrar com Biometria / Face ID
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                             <div className="text-center mt-5 text-xs sm:text-sm">
                                <p className="text-gray-400">Não tem uma conta?{' '}<a href="#register" onClick={(e) => {e.preventDefault(); onNavigate('register')}} className="font-semibold text-amber-400 hover:underline">Registre-se</a></p>
                                <a href="#forgot-password" onClick={(e) => {e.preventDefault(); onNavigate('forgot-password')}} className="text-gray-500 hover:underline mt-2 inline-block">Esqueceu sua senha?</a>
                            </div>
                        </motion.div>
                    ) : ( 
                        <motion.div key="2fa-form" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                            <div className="text-center mb-6">
                                <div className="mx-auto mb-4 inline-block rounded-full bg-gray-800 p-4 border border-gray-700"><CheckBadgeIcon className="h-8 w-8 text-amber-400" /></div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Verificação de Dois Fatores</h2>
                                <p className="text-gray-400 mt-2 text-sm sm:text-base">Insira o código do seu aplicativo autenticador.</p>
                            </div>
                            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Código de 6 dígitos</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="\d{6}"
                                        maxLength="6"
                                        placeholder="123456"
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value)}
                                        required
                                        className="w-full text-center tracking-[0.5em] sm:tracking-[1em] px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-xl sm:text-2xl font-mono" />
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                                     {isLoading ? <SpinnerIcon /> : 'Verificar'}
                                </button>
                            </form>
                             <div className="text-center mt-6 text-xs sm:text-sm">
                                <button onClick={() => { setIsTwoFactorStep(false); setError(''); }} className="text-gray-500 hover:underline">Voltar</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export const RegisterPage = ({ onNavigate }) => {
    const { register } = useAuth();
    const notification = useNotification();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); 
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState(''); 
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Helper para calcular força da senha atualizado
    const getPasswordStrength = (pass) => {
        if (!pass) return { label: '', color: '' };
        const hasLettersAndNumbers = /^(?=.*[A-Za-z])(?=.*\d)/.test(pass);
        
        if (pass.length < 8 || !hasLettersAndNumbers) return { label: 'Fraca (Mín. 8 + Letras e Números)', color: 'text-red-500' };
        if (pass.length >= 8 && pass.length < 12 && hasLettersAndNumbers) return { label: 'Média', color: 'text-yellow-500' };
        return { label: 'Forte', color: 'text-green-500' };
    };

    const passStrength = getPasswordStrength(password);
    const passwordsMatch = password === confirmPassword;
    const showMismatch = confirmPassword.length > 0 && !passwordsMatch;

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        
        if (password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
             setError("A senha deve ter pelo menos 8 caracteres e conter letras e números.");
             return;
        }
        
        if (!passwordsMatch) {
             setError("As senhas não coincidem. Por favor, verifique.");
             return;
        }

        if (!validateCPF(cpf)) {
            setError("O CPF informado é inválido.");
            return;
        }
        if (!validatePhone(phone)) {
            setError("O número de celular informado é inválido.");
            return;
        }

        setIsLoading(true);
        try {
            await register(name, email, password, cpf, phone); 
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

    const handlePhoneChange = (e) => {
        setPhone(maskPhone(e.target.value));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 sm:p-6">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800"
            >
                <motion.div variants={itemVariants} className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Crie Sua Conta</h2>
                    <p className="text-gray-400 mt-2 text-sm sm:text-base">É rápido e fácil.</p>
                </motion.div>

                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm font-bold border border-red-800">{error}</p>}
                
                <motion.form variants={itemVariants} onSubmit={handleRegister} className="space-y-4">
                    <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    <input type="text" placeholder="CPF" value={cpf} onChange={handleCpfChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Celular / WhatsApp" 
                            value={phone} 
                            onChange={handlePhoneChange} 
                            required 
                            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all pl-10 text-sm sm:text-base" 
                        />
                        <WhatsappIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>

                    <div className="relative">
                        <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            placeholder="Senha (mín. 8 + letras e números)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all pr-10 text-sm sm:text-base"
                        />
                        <button
                            type="button"
                            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400"
                        >
                            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                        </button>
                    </div>

                    <div>
                        <div className="relative">
                            <input
                                type={isConfirmPasswordVisible ? 'text' : 'password'}
                                placeholder="Repita a Senha"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border rounded-md focus:outline-none focus:ring-1 transition-all pr-10 text-sm sm:text-base ${showMismatch ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-amber-400'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400"
                            >
                                {isConfirmPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                        
                        <div className="flex justify-between items-center mt-1.5 px-1 min-h-[20px]">
                            <div className="flex-1">
                                {showMismatch && (
                                    <p className="text-red-500 text-xs font-bold flex items-center gap-1 animate-pulse">
                                        <ExclamationCircleIcon className="h-3 w-3 inline"/> As senhas não coincidem.
                                    </p>
                                )}
                            </div>

                            {password && (
                                <div className="text-right text-xs font-medium ml-2">
                                    <span className="text-gray-400 mr-1">Força:</span>
                                    <span className={`${passStrength.color} font-bold`}>{passStrength.label}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                        {isLoading ? <SpinnerIcon /> : 'Registrar'}
                    </button>
                </motion.form>
                
                 <motion.div variants={itemVariants} className="text-center mt-5 text-xs sm:text-sm">
                     <p className="text-gray-400">
                        Já tem uma conta?{' '}
                        <a href="#login" onClick={(e) => {e.preventDefault(); onNavigate('login')}} className="font-semibold text-amber-400 hover:underline">Faça o login</a>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};

export const ForgotPasswordPage = ({ onNavigate }) => {
    const notification = useNotification();
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

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
        if (newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
            setError("A nova senha deve ter pelo menos 8 caracteres e conter letras e números.");
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
        <div className="min-h-screen flex items-center justify-center bg-black p-4 sm:p-6"> 
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800"
            >
                <motion.div variants={itemVariants} className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Recuperar Senha</h2>
                </motion.div>

                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            onSubmit={handleValidation} className="space-y-4"> 
                            <p className="text-xs sm:text-sm text-gray-400 text-center">Para começar, por favor, insira seu e-mail e CPF cadastrados.</p>
                            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                            <input type="text" placeholder="CPF" value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                            <button type="submit" className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition text-base sm:text-lg">Verificar</button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            onSubmit={handlePasswordReset} className="space-y-4"> 
                            <p className="text-xs sm:text-sm text-gray-400 text-center">Usuário validado! Agora, crie sua nova senha.</p>
                            <div className="relative">
                                <input
                                    type={isNewPasswordVisible ? 'text' : 'password'}
                                    placeholder="Nova Senha (mín. 8 + letras e núm)"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base"
                                />
                                <button type="button" onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                    {isNewPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                                    placeholder="Confirmar Nova Senha"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base"
                                />
                                <button type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                    {isConfirmPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                </button>
                            </div>
                            <button type="submit" className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition text-base sm:text-lg">Redefinir Senha</button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="text-center mt-5 text-xs sm:text-sm">
                    <a href="#login" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} className="text-gray-400 hover:underline">Voltar para o Login</a>
                </motion.div>
            </motion.div>
        </div>
    );
};
