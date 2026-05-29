import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { ColorPickerRow } from '../../components/admin/ColorPickerRow';
import {
    ArrowUturnLeftIcon, CartIcon, ChartIcon, CheckBadgeIcon, EyeIcon,
    PhotoIcon, SearchIcon, SparklesIcon, SpinnerIcon
} from '../../components/icons';

export const AdminThemeSettings = () => {
    const defaultThemeFallback = {
        primary: '#fbbf24', primaryHover: '#f59e0b', bg: '#000000', surface: '#111827', surfaceHover: '#1f2937', text: '#ffffff', textMuted: '#9ca3af', animationsEnabled: true, activeSeason: null
    };

    // Temas Sazonais com IDs para forçar a animação
    const seasonalThemesPreview = [
        { id: 'natal', name: 'Natal', date: 'Dezembro', colors: { primary: '#ef4444', primaryHover: '#dc2626', bg: '#000000', surface: '#052e16', surfaceHover: '#064e3b', text: '#ffffff', textMuted: '#a7f3d0' } },
        { id: 'namorados', name: 'Namorados', date: 'Junho', colors: { primary: '#f43f5e', primaryHover: '#e11d48', bg: '#000000', surface: '#2e1065', surfaceHover: '#4c1d95', text: '#ffffff', textMuted: '#e2e8f0' } }, 
        { id: 'pais', name: 'Pais', date: 'Agosto', colors: { primary: '#3b82f6', primaryHover: '#2563eb', bg: '#000000', surface: '#0f172a', surfaceHover: '#1e293b', text: '#ffffff', textMuted: '#94a3b8' } },
        { id: 'maes', name: 'Mães', date: 'Maio', colors: { primary: '#ec4899', primaryHover: '#db2777', bg: '#000000', surface: '#4a044e', surfaceHover: '#701a75', text: '#ffffff', textMuted: '#fbcfe8' } }, 
        { id: 'blackfriday', name: 'Black Friday', date: 'Novembro', colors: { primary: '#a855f7', primaryHover: '#9333ea', bg: '#000000', surface: '#18181b', surfaceHover: '#27272a', text: '#ffffff', textMuted: '#a1a1aa' } },
    ];

    const predefinedPresets = [
        { name: 'Ouro Elegante', colors: { primary: '#d4af37', primaryHover: '#b8972e', bg: '#020617', surface: '#0f172a', surfaceHover: '#1e293b', text: '#f8fafc', textMuted: '#94a3b8' } },
        { name: 'Ruby Premium', colors: { primary: '#e11d48', primaryHover: '#be123c', bg: '#000000', surface: '#1c1917', surfaceHover: '#27272a', text: '#ffffff', textMuted: '#a1a1aa' } },
        { name: 'Minimalista Claro', colors: { primary: '#0ea5e9', primaryHover: '#0284c7', bg: '#f8fafc', surface: '#ffffff', surfaceHover: '#f1f5f9', text: '#0f172a', textMuted: '#64748b' } },
        { name: 'Natureza Suave', colors: { primary: '#10b981', primaryHover: '#059669', bg: '#ecfdf5', surface: '#ffffff', surfaceHover: '#f0fdf4', text: '#064e3b', textMuted: '#34d399' } }
    ];

    const [localConfig, setLocalConfig] = useState({ colors: defaultThemeFallback, autoSeasonal: false, animationsEnabled: true, activeSeason: null });
    const [originalConfig, setOriginalConfig] = useState({ colors: defaultThemeFallback, autoSeasonal: false, animationsEnabled: true, activeSeason: null });
    
    // Estado para carregar o nome dinâmico da loja no simulador
    const [simulatorName, setSimulatorName] = useState('Love Cestas');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const notification = useNotification();
    const confirmation = useConfirmation();

    useEffect(() => {
        // Busca o nome configurado para refletir no simulador
        apiService('/settings/app-name')
            .then(data => { if(data && data.short_name) setSimulatorName(data.short_name); })
            .catch(()=>{});

        apiService('/settings/theme')
            .then(data => {
                const isAuto = data.autoSeasonal === true || data.autoSeasonal === 'true' || data.autoSeasonal === 1;
                const animEnabled = data.animationsEnabled !== false;
                const activeSeason = data.activeSeason || null;
                const loadedConfig = data.colors 
                    ? { ...data, autoSeasonal: isAuto, animationsEnabled: animEnabled, activeSeason } 
                    : { colors: data.primary ? data : defaultThemeFallback, autoSeasonal: isAuto, animationsEnabled: animEnabled, activeSeason };
                
                setLocalConfig(loadedConfig);
                setOriginalConfig(loadedConfig);
            })
            .catch(err => console.log("Usando tema padrão. Banco não respondeu com tema salvo."))
            .finally(() => setIsLoading(false));
    }, []); 

    const dispatchPreview = (newConfig, activeSeason = null) => {
        window.dispatchEvent(new CustomEvent('app-theme-updated', { detail: { ...newConfig, previewSeason: activeSeason } }));
    };

    const handleColorChange = (key, value) => {
        const newConfig = { ...localConfig, colors: { ...localConfig.colors, [key]: value }, autoSeasonal: false, activeSeason: null };
        setLocalConfig(newConfig);
        dispatchPreview(newConfig);
    };

    const handleToggleSeasonal = () => {
        const newSeasonalStatus = !localConfig.autoSeasonal;
        const newConfig = { ...localConfig, autoSeasonal: newSeasonalStatus, activeSeason: null };
        setLocalConfig(newConfig);
        dispatchPreview(newConfig);
        if (newSeasonalStatus) {
            notification.show("Automação sazonal ATIVADA na pré-visualização.");
        } else {
            notification.show("Automação sazonal DESATIVADA.");
        }
    };

    const handleToggleAnimations = () => {
        const newStatus = !localConfig.animationsEnabled;
        const newConfig = { ...localConfig, animationsEnabled: newStatus };
        setLocalConfig(newConfig);
        dispatchPreview(newConfig);
    };

    const applyPreset = (presetColors, seasonId = null) => {
        const newConfig = { ...localConfig, colors: { ...presetColors }, autoSeasonal: false, activeSeason: seasonId };
        setLocalConfig(newConfig);
        dispatchPreview(newConfig, seasonId);
        notification.show("Tema aplicado na pré-visualização. Clique em Salvar para publicar.");
    };

    const handleRestoreDefault = () => {
        const newConfig = { ...localConfig, colors: { ...defaultThemeFallback }, autoSeasonal: false, activeSeason: null };
        setLocalConfig(newConfig);
        dispatchPreview(newConfig);
        notification.show("Cores padrão restauradas na pré-visualização. Clique em 'Salvar' para confirmar.");
    };

    const handleCancel = () => {
        setLocalConfig(originalConfig);
        dispatchPreview(originalConfig, originalConfig.activeSeason);
        notification.show("Alterações descartadas.");
    };

    const handleSave = () => {
        confirmation.show(
            "Tem certeza que deseja aplicar este tema e configurações ao site de forma definitiva?",
            async () => {
                setIsSaving(true);
                try {
                    await apiService('/settings/theme', 'PUT', { themeConfig: localConfig });
                    setOriginalConfig(localConfig); 
                    notification.show("Novo tema e configurações aplicados com sucesso!");
                } catch (error) {
                    notification.show(`Erro ao salvar: ${error.message}`, "error");
                } finally {
                    setIsSaving(false);
                }
            },
            { requiresAuth: true, confirmText: "Salvar e Publicar", confirmColor: "bg-green-600 hover:bg-green-700" }
        );
    };

    const isPresetActive = (colorsObj) => {
        return localConfig.colors.primary === colorsObj.primary &&
               localConfig.colors.bg === colorsObj.bg &&
               localConfig.colors.surface === colorsObj.surface &&
               !localConfig.autoSeasonal && 
               !localConfig.activeSeason;
    };

    const isSeasonalActive = (seasonColors, seasonId) => {
        return localConfig.colors.primary === seasonColors.primary &&
               localConfig.colors.bg === seasonColors.bg &&
               localConfig.colors.surface === seasonColors.surface &&
               !localConfig.autoSeasonal &&
               localConfig.activeSeason === seasonId;
    };

    if (isLoading) return <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-indigo-600"/></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Identidade Visual e Temas</h1>
                <p className="text-slate-500 text-sm mt-1">Gerencie as cores e os efeitos da sua loja. O preview é em tempo real.</p>
            </div>

            {/* SEÇÃO 1: Automação Sazonal e Animações */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl shadow-lg p-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
                    <div className="text-white flex-1">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <SparklesIcon className="h-6 w-6 text-amber-400"/> Temas Sazonais Inteligentes
                        </h2>
                        <p className="text-indigo-200 text-sm leading-relaxed max-w-2xl">
                            Ative esta opção para que o site mude automaticamente de tema e exiba efeitos visuais (corações, neve) durante datas comemorativas.
                        </p>
                        
                        <div className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-xl mt-4 max-w-md">
                            <div>
                                <h3 className="text-white font-bold text-sm">Permitir Efeitos Animados</h3>
                                <p className="text-indigo-200 text-[10px]">Neve, corações, brilhos caindo na tela.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={localConfig.animationsEnabled !== false} onChange={handleToggleAnimations} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={localConfig.autoSeasonal} onChange={handleToggleSeasonal} className="sr-only peer" />
                            <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                        <span className="text-xs font-bold text-white mt-2 uppercase tracking-widest">
                            {localConfig.autoSeasonal ? 'Ativado' : 'Desativado'}
                        </span>
                    </div>
                </div>
                
                <div className="px-6 pb-6 pt-4">
                    <p className="text-xs text-indigo-300 mb-3 uppercase tracking-wider font-bold">Clique para testar os temas e animações do calendário:</p>
                    <div className="flex flex-wrap gap-3">
                        {seasonalThemesPreview.map(season => (
                            <button 
                                key={season.name} 
                                type="button"
                                onClick={() => applyPreset(season.colors, season.id)}
                                className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                                    isSeasonalActive(season.colors, season.id) 
                                    ? 'bg-white/20 border-amber-400 ring-1 ring-amber-400' 
                                    : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-amber-300'
                                }`}
                            >
                                <div className="flex -space-x-2">
                                    <div className="w-4 h-4 rounded-full border border-slate-800 shadow-sm" style={{ backgroundColor: season.colors.surface }}></div>
                                    <div className="w-4 h-4 rounded-full border border-slate-800 shadow-sm" style={{ backgroundColor: season.colors.primary }}></div>
                                </div>
                                <span className="text-xs text-white font-bold">{season.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* SEÇÃO 2: Controles de Cor */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <PhotoIcon className="h-5 w-5 text-indigo-500"/> Escolha um Estilo
                            </h2>
                            <button 
                                type="button"
                                onClick={handleRestoreDefault}
                                className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors flex items-center gap-1"
                            >
                                <ArrowUturnLeftIcon className="h-3 w-3"/> Restaurar Padrão
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {predefinedPresets.map((preset, idx) => (
                                <button 
                                    key={idx} 
                                    type="button"
                                    onClick={() => applyPreset(preset.colors)}
                                    className={`flex flex-col items-center justify-center p-3 border rounded-xl hover:shadow-md transition-all group ${
                                        isPresetActive(preset.colors) 
                                        ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50' 
                                        : 'border-gray-200 bg-gray-50 hover:border-indigo-400'
                                    }`}
                                >
                                    <div className="flex w-full h-10 rounded-lg overflow-hidden mb-2 border border-gray-300 shadow-sm">
                                        <div className="flex-1" style={{ backgroundColor: preset.colors.bg }}></div>
                                        <div className="flex-1" style={{ backgroundColor: preset.colors.surface }}></div>
                                        <div className="flex-1" style={{ backgroundColor: preset.colors.primary }}></div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide text-center ${isPresetActive(preset.colors) ? 'text-indigo-700' : 'text-gray-600 group-hover:text-indigo-600'}`}>
                                        {preset.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-3">
                        <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <ChartIcon className="h-5 w-5 text-indigo-500"/> Personalização Fina
                        </h2>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                            <p className="text-xs text-blue-800">
                                💡 <strong>Dica:</strong> Se você alterar uma cor manualmente e não gostar, basta <strong>clicar novamente no Estilo (preset) acima</strong> para restaurar as cores originais daquele estilo, ou clicar em "Descartar" no final da página.
                            </p>
                        </div>

                        {/* As propriedades value e onChange agora são passadas como propriedades */}
                        <ColorPickerRow label="Cor Primária" field="primary" desc="Botões principais, ícones ativos e selos de desconto." value={localConfig.colors.primary} onChange={handleColorChange} />
                        <ColorPickerRow label="Cor Primária (Hover)" field="primaryHover" desc="Cor do botão primário ao passar o mouse." value={localConfig.colors.primaryHover} onChange={handleColorChange} />
                        <ColorPickerRow label="Fundo Principal" field="bg" desc="Cor de fundo de todo o site." value={localConfig.colors.bg} onChange={handleColorChange} />
                        <ColorPickerRow label="Superfície (Cards)" field="surface" desc="Fundo de cartões de produto, menus drop-down e rodapé." value={localConfig.colors.surface} onChange={handleColorChange} />
                        <ColorPickerRow label="Texto Principal" field="text" desc="Cor dos títulos, nomes de produtos e textos normais." value={localConfig.colors.text} onChange={handleColorChange} />
                        <ColorPickerRow label="Texto Secundário" field="textMuted" desc="Textos de apoio, descrições menores e bordas suaves." value={localConfig.colors.textMuted} onChange={handleColorChange} />
                    </div>
                </div>

                {/* SEÇÃO 3: Pré-visualização do Cliente */}
                <div className="lg:col-span-5">
                    <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 flex flex-col justify-start items-center sticky top-24 min-h-[500px]">
                        <div className="w-full flex justify-between items-center mb-6">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <EyeIcon className="h-4 w-4"/> Visão do Cliente
                            </p>
                            {localConfig.autoSeasonal && (
                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">Sazonal ON</span>
                            )}
                        </div>
                        
                        {/* Card Simulador de Site */}
                        <div 
                            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transition-colors duration-500 border border-white/10 flex flex-col"
                            style={{ backgroundColor: localConfig.colors.bg }}
                        >
                            <div className="px-5 py-4 flex items-center justify-between shadow-sm transition-colors duration-500" style={{ backgroundColor: localConfig.colors.surface }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-500" style={{ backgroundColor: localConfig.colors.primary }}>
                                        <span className="text-[10px] font-bold" style={{ color: localConfig.colors.bg }}>{simulatorName.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="font-bold text-sm transition-colors duration-500" style={{ color: localConfig.colors.primary }}>{simulatorName}</span>
                                </div>
                                <div className="flex gap-3">
                                    <SearchIcon className="h-4 w-4 transition-colors duration-500" style={{ color: localConfig.colors.textMuted }} />
                                    <CartIcon className="h-4 w-4 transition-colors duration-500" style={{ color: localConfig.colors.text }} />
                                </div>
                            </div>
                            
                            <div className="h-24 w-full flex flex-col items-center justify-center transition-colors duration-500" style={{ backgroundColor: localConfig.colors.surfaceHover }}>
                                <span className="text-[10px] font-bold uppercase tracking-widest transition-colors duration-500" style={{ color: localConfig.colors.primary }}>Nova Coleção</span>
                                <h3 className="text-lg font-bold transition-colors duration-500" style={{ color: localConfig.colors.text }}>Inverno 2026</h3>
                            </div>

                            <div className="p-5 flex-grow">
                                <div className="flex gap-4 mb-4">
                                    <div className="w-20 h-24 rounded-lg flex-shrink-0 transition-colors duration-500" style={{ backgroundColor: localConfig.colors.surface }}></div>
                                    <div className="flex-1">
                                        <div className="h-3 w-16 rounded mb-2 transition-colors duration-500" style={{ backgroundColor: localConfig.colors.primary }}></div>
                                        <div className="h-4 w-3/4 rounded mb-2 transition-colors duration-500" style={{ color: localConfig.colors.text, backgroundColor: localConfig.colors.text }}></div>
                                        <div className="h-3 w-full rounded mb-1 transition-colors duration-500" style={{ color: localConfig.colors.textMuted, backgroundColor: localConfig.colors.textMuted }}></div>
                                        <div className="h-3 w-2/3 rounded transition-colors duration-500" style={{ color: localConfig.colors.textMuted, backgroundColor: localConfig.colors.textMuted }}></div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-[10px] line-through transition-colors duration-500" style={{ color: localConfig.colors.textMuted }}>R$ 199,90</p>
                                        <p className="text-xl font-bold transition-colors duration-500" style={{ color: localConfig.colors.text }}>R$ 149,90</p>
                                    </div>
                                    <div className="px-2 py-1 rounded text-[10px] font-bold transition-colors duration-500" style={{ backgroundColor: localConfig.colors.primary, color: localConfig.colors.bg }}>
                                        -25% OFF
                                    </div>
                                </div>

                                <button 
                                    type="button"
                                    className="w-full py-3 rounded-lg font-bold shadow-md transition-all duration-300 text-sm flex items-center justify-center gap-2"
                                    style={{ backgroundColor: localConfig.colors.primary, color: localConfig.colors.bg }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = localConfig.colors.primaryHover;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = localConfig.colors.primary;
                                    }}
                                >
                                    <CartIcon className="h-4 w-4"/> Comprar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-gray-50/90 backdrop-blur p-4 -mx-4 sm:mx-0 sm:bg-transparent sm:p-0 z-10">
                <button 
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-all"
                >
                    Descartar
                </button>
                <button 
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                >
                    {isSaving ? <SpinnerIcon className="h-5 w-5"/> : <CheckBadgeIcon className="h-5 w-5"/>}
                    Salvar e Publicar
                </button>
            </div>
        </div>
    );
};
