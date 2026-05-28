import React, { useState, useEffect, useRef, memo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { BackToTopButton } from '../ui/BackToTopButton';
import {
    AdminIcon, ArrowUturnLeftIcon, BoxIcon, CameraIcon, ChartIcon, ClipboardDocListIcon,
    CloseIcon, CurrencyDollarArrowIcon, EyeIcon, FileIcon, MenuIcon, PhotoIcon, SparklesIcon,
    TagIcon, TruckIcon, UsersIcon
} from '../icons';

export const AdminLayout = memo(({ activePage, onNavigate, children }) => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const [pendingRefundsCount, setPendingRefundsCount] = useState(0); 
    const [isMaintenance, setIsMaintenance] = useState(false); 
    const mainContentRef = useRef(null);

    // Estado para o nome dinâmico (começa com o nome padrão)
    const [adminLogoText, setAdminLogoText] = useState('LOVE CESTAS E PERFUMES');

    // Efeito para carregar e ouvir o nome dinâmico
    useEffect(() => {
        // Carrega inicialmente as configurações da API
        apiService('/settings/app-name')
            .then(data => {
                if (data && (data.short_name || data.name)) {
                    // Prioriza o short_name por ser mais curto e caber melhor no menu lateral
                    setAdminLogoText(data.short_name || data.name);
                }
            })
            .catch(() => {});

        // Ouve o evento de atualização global do nome (disparado na tela Ícones e Nomes)
        const handleNameUpdate = (event) => {
            if (event.detail && (event.detail.short_name || event.detail.name)) {
                setAdminLogoText(event.detail.short_name || event.detail.name);
            }
        };

        window.addEventListener('app-name-updated', handleNameUpdate);
        
        return () => window.removeEventListener('app-name-updated', handleNameUpdate);
    }, []);

    useEffect(() => {
        apiService('/settings/maintenance')
            .then(data => setIsMaintenance(data.status === 'on'))
            .catch(() => {});

        const handleMaintenanceUpdate = (e) => setIsMaintenance(e.detail === 'on');
        window.addEventListener('maintenance-changed', handleMaintenanceUpdate);
        
        return () => window.removeEventListener('maintenance-changed', handleMaintenanceUpdate);
    }, []);

    useEffect(() => {
        apiService('/orders')
            .then(data => {
                if (!Array.isArray(data)) {
                    setNewOrdersCount(0);
                    return;
                }
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentOrders = data.filter(o => {
                    if (!o || !o.date) return false;
                    const orderDate = new Date(o.date);
                    return !isNaN(orderDate) && orderDate > twentyFourHoursAgo;
                });
                setNewOrdersCount(recentOrders.length);
            })
            .catch(err => {
                console.error("Erro silencioso ao buscar contagem de pedidos:", err);
                setNewOrdersCount(0);
            });

        apiService('/refunds')
            .then(data => {
                if (Array.isArray(data)) {
                    const pending = data.filter(r => r.status === 'pending_approval');
                    setPendingRefundsCount(pending.length);
                }
            })
            .catch(err => {
                console.error("Erro silencioso ao buscar reembolsos:", err);
                setPendingRefundsCount(0);
            });

    }, [activePage]);

    const handleLogout = () => {
        logout();
        onNavigate('home');
    }

    const menuGroups = [
        {
            title: "Principal",
            items: [
                { key: 'dashboard', label: 'Visão Geral', icon: <ChartIcon className="h-5 w-5"/> },
                { key: 'orders', label: 'Pedidos', icon: <TruckIcon className="h-5 w-5"/>, badge: newOrdersCount },
                { key: 'refunds', label: 'Reembolsos', icon: <CurrencyDollarArrowIcon className="h-5 w-5"/>, badge: pendingRefundsCount }, 
            ]
        },
        {
            title: "Catálogo",
            items: [
                { key: 'products', label: 'Produtos', icon: <BoxIcon className="h-5 w-5"/> },
                { key: 'collections', label: 'Coleções', icon: <SparklesIcon className="h-5 w-5"/> },
                { key: 'coupons', label: 'Cupons', icon: <TagIcon className="h-5 w-5"/> },
            ]
        },
        {
            title: "Marketing & Clientes",
            items: [
                { key: 'banners', label: 'Banners', icon: <PhotoIcon className="h-5 w-5"/> },
                { key: 'users', label: 'Clientes', icon: <UsersIcon className="h-5 w-5"/> },
                { key: 'newsletter', label: 'Newsletter VIP', icon: <SparklesIcon className="h-5 w-5"/> },
            ]
        },
       {
            title: "Sistema",
            items: [
                { key: 'theme', label: 'Tema e Cores', icon: <SparklesIcon className="h-5 w-5"/> },
                { key: 'app-icons', label: 'Ícones e Nomes', icon: <CameraIcon className="h-5 w-5"/> }, 
                { key: 'shipping', label: 'Frete Local', icon: <TruckIcon className="h-5 w-5"/> }, 
                { key: 'reports', label: 'Relatórios', icon: <FileIcon className="h-5 w-5"/> },
                { key: 'logs', label: 'Logs do Sistema', icon: <ClipboardDocListIcon className="h-5 w-5"/> },
            ]
        }
    ];

    return (
        <div className="h-screen flex overflow-hidden bg-gray-50 text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-700">
            {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`bg-white w-72 fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex flex-col border-r border-gray-200 shadow-xl lg:shadow-none`}>
                
                <div className="h-20 flex items-center px-6 border-b border-gray-100 flex-shrink-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-md flex items-center justify-center">
                            <AdminIcon className="h-6 w-6 text-white"/>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-lg font-black tracking-tight text-slate-900 leading-none">ADMINISTRAÇÃO</span>
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1 truncate max-w-[150px]" title={adminLogoText}>
                                {adminLogoText}
                            </span>
                        </div>
                    </div>
                    <button className="lg:hidden ml-auto text-gray-400 hover:text-gray-600" onClick={() => setIsSidebarOpen(false)}>
                        <CloseIcon className="h-6 w-6"/>
                    </button>
                </div>

                <nav className="flex-grow p-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
                            <div className="space-y-1">
                                {group.items.map(item => {
                                    const isActive = activePage.startsWith(item.key);
                                    return (
                                        <a 
                                            href="#" 
                                            key={item.key} 
                                            onClick={(e) => { e.preventDefault(); onNavigate(`admin/${item.key}`); setIsSidebarOpen(false); }} 
                                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                                                isActive 
                                                ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200' 
                                                : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`transition-colors ${isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                    {item.icon}
                                                </span>
                                                <span>{item.label}</span>
                                            </div>
                                            {item.badge > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-200">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">Administrador</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => onNavigate('home')} className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 text-slate-600 text-xs font-semibold hover:bg-gray-50 hover:text-amber-600 transition-all shadow-sm">
                            <EyeIcon className="h-3 w-3"/> Ver Loja
                        </button>
                        <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white border border-red-100 text-red-600 text-xs font-semibold hover:bg-red-50 hover:border-red-200 transition-all shadow-sm">
                            <ArrowUturnLeftIcon className="h-3 w-3"/> Sair
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="bg-white/80 backdrop-blur-md h-16 flex items-center justify-between px-6 sm:px-8 flex-shrink-0 z-20 border-b border-gray-200 sticky top-0">
                     <div className="flex items-center gap-4">
                         <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden text-slate-500 hover:bg-gray-100 rounded-md">
                            <MenuIcon className="h-6 w-6"/>
                         </button>
                         <h1 className="text-lg sm:text-xl font-bold text-slate-800 capitalize tracking-tight block">
                            {activePage.split('/')[0].replace('-', ' ')}
                         </h1>
                     </div>
                     <div className="flex items-center gap-4">
                        {isMaintenance ? (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                                <span className="text-xs font-bold tracking-wide">EM MANUTENÇÃO</span>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-bold tracking-wide">SISTEMA ONLINE</span>
                            </div>
                        )}
                     </div>
                </header>

                <main ref={mainContentRef} className="flex-grow p-6 sm:p-8 overflow-y-auto bg-gray-50">
                    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                        {children}
                    </div>
                </main>
                <BackToTopButton scrollableRef={mainContentRef} />
            </div>
        </div>
    );
});
