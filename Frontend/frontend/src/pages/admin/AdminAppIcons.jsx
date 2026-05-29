import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiImageUploadService, apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { CheckBadgeIcon, ClipboardDocListIcon, PhotoIcon, SpinnerIcon, UploadIcon } from '../../components/icons';

export const AdminAppIcons = () => {
    // Estados para ícones e nome
    const [icons, setIcons] = useState({
        favicon: { current: '', previous: null, default: '' },
        pwa_icon: { current: '', previous: null, default: '' }
    });
    const [nameConfig, setNameConfig] = useState({ short_name: '', name: '', logo_text: '' });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const notification = useNotification();
    const confirmation = useConfirmation(); 
    
    const fileInputRefFavicon = useRef(null);
    const fileInputRefPWA = useRef(null);

    // Carrega configurações iniciais
    useEffect(() => {
        let isMounted = true;

        const loadSettings = async () => {
            try {
                const [iconData, nameData] = await Promise.all([
                    apiService('/settings/app-icons'),
                    apiService('/settings/app-name')
                ]);
                if (isMounted) {
                    setIcons(iconData);
                    setNameConfig(nameData);
                }
            } catch (err) {
                if (isMounted) {
                    notification.show("Erro ao carregar configurações.", "error");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadSettings();

        return () => { isMounted = false; };
    }, []);

    // Manipulação de upload de arquivo
    const handleFileChange = async (event, key) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            notification.show("Arquivo muito grande. O limite é 5MB.", "error");
            event.target.value = '';
            return;
        }

        setIsSaving(true);
        try {
            const uploadResult = await apiImageUploadService('/upload/image', file);
            
            setIcons(prev => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    previous: prev[key].current, 
                    current: uploadResult.imageUrl 
                }
            }));
            notification.show(`Pré-visualização carregada. Clique em salvar para aplicar.`);
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
            event.target.value = '';
        }
    };

    // Restauração de ícone
    const handleRestore = (key, type) => {
        setIcons(prev => {
            const iconObj = prev[key];
            let newCurrent = iconObj.current;
            
            if (type === 'previous' && iconObj.previous) {
                newCurrent = iconObj.previous;
            } else if (type === 'default' && iconObj.default) {
                newCurrent = iconObj.default;
            }

            return {
                ...prev,
                [key]: {
                    ...iconObj,
                    previous: iconObj.current,
                    current: newCurrent
                }
            };
        });
        notification.show(`Restaurado na pré-visualização. Clique em salvar para aplicar.`);
    };

    // Definir como padrão
    const handleSetAsDefault = (key) => {
        setIcons(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                default: prev[key].current
            }
        }));
        notification.show(`Definido como padrão! Lembre-se de clicar em "Salvar Definitivamente".`);
    };

    // Manipulação de alteração de nome do app
    const handleNameChange = (e, key) => {
        const value = e.target.value;
        setNameConfig(prev => ({ ...prev, [key]: value }));
    };

    // Salvar com confirmação de Senha/2FA e Tela de Carregamento
    const handleSave = () => {
        if (!nameConfig.short_name || !nameConfig.name) {
            notification.show("Preencha Nome e Nome Curto do Aplicativo.", "error");
            return;
        }

        confirmation.show(
            "Você está alterando a identidade visual principal do aplicativo. Por favor, confirme sua identidade.",
            async () => {
                setIsSaving(true);
                try {
                    await Promise.all([
                        apiService('/settings/app-icons', 'PUT', { icons }),
                        apiService('/settings/app-name', 'PUT', { nameConfig })
                    ]);
                    
                    if (icons.favicon?.current) {
                        localStorage.setItem('lovecestas_app_favicon', icons.favicon.current);
                        const faviconLink = document.querySelector("link[rel~='icon']");
                        if (faviconLink) {
                            faviconLink.href = `${icons.favicon.current}?t=${new Date().getTime()}`;
                        }
                    }
                    if (icons.pwa_icon?.current) {
                        localStorage.setItem('lovecestas_app_logo', icons.pwa_icon.current);
                    }

                    // Dispara evento global para o frontend atualizar instantaneamente
                    const nameEvent = new CustomEvent('app-name-updated', { detail: nameConfig });
                    window.dispatchEvent(nameEvent);

                    notification.show("Identidade visual atualizada com sucesso!");
                } catch (err) {
                    notification.show(`Erro ao salvar: ${err.message}`, "error");
                } finally {
                    setIsSaving(false);
                }
            },
            { 
                requiresAuth: true, 
                confirmText: "Confirmar e Salvar", 
                confirmColor: "bg-green-600 hover:bg-green-700" 
            }
        );
    };

    if (isLoading) return <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-indigo-600"/></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <AnimatePresence>
                {isSaving && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm"
                    >
                        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform transition-all ring-1 ring-indigo-500/30">
                            <SpinnerIcon className="h-16 w-16 text-indigo-600 mb-6 animate-spin" />
                            <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Salvando Alterações</h3>
                            <p className="text-sm font-medium text-slate-600">Atualizando a identidade visual do seu aplicativo e propagando para os usuários...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Personalização Visual do App</h1>
                <p className="text-slate-500 text-sm mt-1">Altere o nome, ícones e logotipos do seu site e aplicativo (PWA).</p>
            </div>

            {/* Edição de Nome do App */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                <div className="border-b border-gray-100 pb-5">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                        <ClipboardDocListIcon className="h-5 w-5 text-indigo-500"/> Identidade do Aplicativo
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Esses nomes aparecem na tela de instalação, barra de tarefas e cabeçalho.</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">Nome Curto (Tela Inicial)</label>
                        <input 
                            type="text" 
                            value={nameConfig.short_name} 
                            onChange={(e) => handleNameChange(e, 'short_name')} 
                            placeholder="Love Cestas" 
                            maxLength={12} 
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 transition text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">Nome Aba (Navegador)</label>
                        <input 
                            type="text" 
                            value={nameConfig.name} 
                            onChange={(e) => handleNameChange(e, 'name')} 
                            placeholder="Love Cestas e Perfumes" 
                            maxLength={40} 
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 transition text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">Texto Logo (Cabeçalho)</label>
                        <input 
                            type="text" 
                            value={nameConfig.logo_text || ''} 
                            onChange={(e) => handleNameChange(e, 'logo_text')} 
                            placeholder="LovecestasePerfumes" 
                            maxLength={30} 
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 transition text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Favicon Editor */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Favicon do Site</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Ícone exibido na aba do navegador. Recomenda-se formato quadrado (PNG ou ICO, Máx 5MB).<br/>
                    <strong className="text-amber-600">Dica:</strong> Para o ícone não ficar pequeno, recorte a imagem removendo as bordas transparentes vazias antes de enviar.
                </p>
                
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-2 flex items-center justify-center relative overflow-hidden group">
                        {icons.favicon?.current ? (
                            <img 
                                src={`${icons.favicon.current}?t=${new Date().getTime()}`} 
                                alt="Preview Favicon" 
                                className="max-w-full max-h-full object-contain drop-shadow-md" 
                            />
                        ) : (
                            <PhotoIcon className="h-10 w-10 text-gray-400" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => fileInputRefFavicon.current.click()} className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-md shadow-md">
                                Alterar
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-grow space-y-4 w-full">
                        <input type="file" ref={fileInputRefFavicon} className="hidden" accept="image/png,image/jpeg,image/gif,image/webp,image/x-icon" onChange={(e) => handleFileChange(e, 'favicon')} />
                        
                        <div className="flex flex-col gap-2">
                            <button onClick={() => fileInputRefFavicon.current.click()} disabled={isSaving} className="w-full md:w-auto bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold py-2 px-4 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-2">
                                <UploadIcon className="h-4 w-4"/> Fazer Upload Nova Imagem
                            </button>

                            <div className="flex gap-2">
                                <button onClick={() => handleRestore('favicon', 'previous')} disabled={!icons.favicon?.previous || isSaving} className="flex-1 bg-gray-50 text-gray-600 border border-gray-200 font-bold py-2 px-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 text-xs">
                                    ↩️ Desfazer Última
                                </button>
                                <button onClick={() => handleRestore('favicon', 'default')} disabled={!icons.favicon?.default || isSaving} className="flex-1 bg-gray-50 text-gray-600 border border-gray-200 font-bold py-2 px-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 text-xs">
                                    🔄 Restaurar Padrão
                                </button>
                            </div>
                            <button onClick={() => handleSetAsDefault('favicon')} disabled={isSaving} className="w-full bg-amber-50 text-amber-700 border border-amber-200 font-bold py-2 px-3 rounded-lg hover:bg-amber-100 transition disabled:opacity-50 text-xs">
                                ⭐ Definir Imagem Atual como Novo Padrão
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PWA Icon Editor */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Ícone do Aplicativo (PWA)</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Ícone exibido na tela inicial do celular quando o app é instalado (Máx 5MB). O sistema gerará automaticamente as versões em 192px e 512px.
                </p>
                
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-2 flex items-center justify-center relative overflow-hidden group">
                        {icons.pwa_icon?.current ? (
                            <img 
                                src={`${icons.pwa_icon.current}?t=${new Date().getTime()}`} 
                                alt="Preview PWA" 
                                className="w-full h-full object-contain drop-shadow-md" 
                            />
                        ) : (
                            <PhotoIcon className="h-10 w-10 text-gray-400" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => fileInputRefPWA.current.click()} className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-md shadow-md">
                                Alterar
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-grow space-y-4 w-full">
                        <input type="file" ref={fileInputRefPWA} className="hidden" accept="image/png,image/jpeg,image/gif,image/webp,image/x-icon" onChange={(e) => handleFileChange(e, 'pwa_icon')} />
                        
                        <div className="flex flex-col gap-2">
                            <button onClick={() => fileInputRefPWA.current.click()} disabled={isSaving} className="w-full md:w-auto bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold py-2 px-4 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-2">
                                <UploadIcon className="h-4 w-4"/> Fazer Upload Nova Imagem
                            </button>

                            <div className="flex gap-2">
                                <button onClick={() => handleRestore('pwa_icon', 'previous')} disabled={!icons.pwa_icon?.previous || isSaving} className="flex-1 bg-gray-50 text-gray-600 border border-gray-200 font-bold py-2 px-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 text-xs">
                                    ↩️ Desfazer Última
                                </button>
                                <button onClick={() => handleRestore('pwa_icon', 'default')} disabled={!icons.pwa_icon?.default || isSaving} className="flex-1 bg-gray-50 text-gray-600 border border-gray-200 font-bold py-2 px-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 text-xs">
                                    🔄 Restaurar Padrão
                                </button>
                            </div>
                            <button onClick={() => handleSetAsDefault('pwa_icon')} disabled={isSaving} className="w-full bg-amber-50 text-amber-700 border border-amber-200 font-bold py-2 px-3 rounded-lg hover:bg-amber-100 transition disabled:opacity-50 text-xs">
                                ⭐ Definir Imagem Atual como Novo Padrão
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTÃO MELHORADO AQUI */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3.5 rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-green-500/30 flex items-center gap-3 disabled:opacity-70 disabled:shadow-none transition-all duration-300 active:scale-95 transform hover:-translate-y-0.5"
                >
                    {isSaving ? (
                        <SpinnerIcon className="h-6 w-6 animate-spin" />
                    ) : (
                        <CheckBadgeIcon className="h-6 w-6"/>
                    )}
                    <span className="text-base uppercase tracking-wide">Salvar Definitivamente</span>
                </button>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DA APLICAÇÃO ---
