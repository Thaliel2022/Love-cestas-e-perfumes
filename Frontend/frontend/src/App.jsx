import React, { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { initMercadoPago, Payment as MercadoPagoPayment } from '@mercadopago/sdk-react';
import Fuse from 'fuse.js'; // NOVO: Motor de Busca Inteligente no Frontend
import { apiImageUploadService, apiService, apiUploadService } from './services/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { ConfirmationProvider, useConfirmation } from './contexts/ConfirmationContext';
import { ShopProvider, useShop } from './contexts/ShopContext';
import { Modal } from './components/ui/Modal';
import { BackToTopButton } from './components/ui/BackToTopButton';
import { InstallPWAButton } from './components/ui/InstallPWAButton';
import { ProductCard } from './components/product/ProductCards';
import { ShippingCalculator } from './components/checkout/CheckoutAddress';
import { Minicart } from './components/cart/Minicart';
import { Header } from './components/layout/Header';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { CategoriesPage } from './pages/CategoriesPage';
import { HomePage } from './pages/HomePage';
import { AboutPage, AjudaPage, PrivacyPolicyPage, TermsOfServicePage } from './pages/InstitutionalPages';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { MyAccountPage } from './pages/MyAccountPage';
import { AdminNewsletter } from './pages/admin/AdminNewsletter';
import { ProductForm } from './components/admin/ProductForm';
import { QuickStockUpdateModal } from './components/admin/QuickStockUpdateModal';
import { BannerForm } from './components/admin/BannerForm';
import { UserDetailsModal } from './components/admin/UserDetailsModal';
import { CollectionCategoryForm } from './components/admin/CollectionCategoryForm';
import { MaintenancePage, MaintenanceModeToggle } from './components/admin/Maintenance';
import { SortableBannerCard, StaticBannerCard } from './components/admin/BannerCards';
import { SortableCategoryCard } from './components/admin/SortableCategoryCard';
import { ColorPickerRow } from './components/admin/ColorPickerRow';
import { getFirstImage, parseJsonString } from './utils/cloudinary';
import { maskCEP, maskCPF, maskPhone, validateCPF, validatePhone } from './utils/validation';
import { urlBase64ToUint8Array } from './utils/webauthn';
import {
    AdminIcon, ArrowUturnLeftIcon, BarsGripIcon, BoletoIcon, BoxIcon, CameraIcon,
    CartIcon, ChartIcon, CheckBadgeIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon,
    ChevronUpIcon, ClipboardDocListIcon, ClockIcon, CloseIcon, CreditCardIcon,
    CurrencyDollarArrowIcon, CurrencyDollarIcon, DownloadIcon, EditIcon, EloIcon,
    ExclamationCircleIcon, ExclamationIcon, EyeIcon, EyeOffIcon, FileIcon,
    FingerprintIcon, HomeIcon, InstagramIcon, MapPinIcon, MastercardIcon,
    MenuIcon, PackageIcon, PaperAirplaneIcon, PhotoIcon, PixIcon,
    PlusIcon, RulerIcon, SaleIcon, SearchIcon, ShareIcon, ShieldCheckIcon, ShirtIcon,
    SparklesIcon, SpinnerIcon, StarIcon, TagIcon, TrashIcon, TruckIcon, UploadIcon,
    UserIcon, UsersIcon, VisaIcon, WhatsappIcon, XCircleIcon, XMarkIcon
} from './components/icons';
// --- Constante da API ---

initMercadoPago(process.env.REACT_APP_MP_PUBLIC_KEY || 'APP_USR-fe8bcd59-da54-4fb5-a3d0-8b8f749097be', { locale: 'pt-BR' });





// --- PÁGINAS DO CLIENTE ---

// --- PAINEL DO ADMINISTRADOR ---
const AdminLayout = memo(({ activePage, onNavigate, children }) => {
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
const AdminShippingSettings = () => {
    const [activeTab, setActiveTab] = useState('pickup'); 
    
    const [config, setConfig] = useState({ base_price: 20, rules: [] });
    const [productsData, setProductsData] = useState({ brands: [], categories: [] });
    const [newRule, setNewRule] = useState({ type: 'category', value: '', action: 'free_shipping', amount: 0 });

    const [pickupConfig, setPickupConfig] = useState({ 
        address: { rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }, 
        hours: '', 
        instructions: '', 
        mapsLink: '' 
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInput, setAuthInput] = useState('');
    const [isAuthVerify, setIsAuthVerify] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [configData, pickupData, products, collections] = await Promise.all([
                    apiService('/settings/shipping-local'),
                    apiService('/settings/pickup'),
                    apiService('/products/all'),
                    apiService('/collections/admin')
                ]);

                setConfig({
                    base_price: parseFloat(configData.base_price) || 20,
                    rules: Array.isArray(configData.rules) ? configData.rules : []
                });

                if (pickupData) {
                    setPickupConfig({
                        address: typeof pickupData.address === 'object' && pickupData.address !== null 
                            ? { ...pickupData.address, estado: pickupData.address.estado || pickupData.address.uf || '' }
                            : { rua: pickupData.address || '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
                        hours: pickupData.hours || '',
                        instructions: pickupData.instructions || '',
                        mapsLink: pickupData.mapsLink || ''
                    });
                }

                const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
                const uniqueCats = [...new Set([...products.map(p => p.category), ...collections.map(c => c.filter)].filter(Boolean))].sort();

                setProductsData({ brands: uniqueBrands, categories: uniqueCats });
            } catch (err) {
                notification.show("Erro ao carregar configurações.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddRule = () => {
        if (!newRule.value) { notification.show("Selecione um valor para a regra.", "error"); return; }
        setConfig(prev => ({ ...prev, rules: [...prev.rules, { ...newRule, id: Date.now(), amount: parseFloat(newRule.amount) || 0 }] }));
        setNewRule({ type: 'category', value: '', action: 'free_shipping', amount: 0 });
    };

    const handleRemoveRule = (id) => {
        setConfig(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== id) }));
    };

    const handlePickupChange = (e) => {
        const { name, value } = e.target;
        setPickupConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setPickupConfig(prev => ({ 
            ...prev, 
            address: { ...prev.address, [name]: value } 
        }));
    };

    const handleSave = () => {
        setIsAuthModalOpen(true);
    };

    const confirmSaveWithAuth = async (e) => {
        e.preventDefault();
        setIsAuthVerify(true);
        setIsSaving(true);
        
        try {
            if (activeTab === 'motoboy') {
                const payload = {
                    base_price: parseFloat(config.base_price),
                    rules: config.rules.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })),
                    password: authInput, 
                    token: authInput.length === 6 && !isNaN(authInput) ? authInput : null 
                };
                await apiService('/settings/shipping-local', 'PUT', payload);
                notification.show("Configurações de frete salvas com sucesso!");
            } else {
                const payload = {
                    config: pickupConfig,
                    password: authInput, 
                    token: authInput.length === 6 && !isNaN(authInput) ? authInput : null 
                };
                await apiService('/settings/pickup', 'PUT', payload);
                notification.show("Configurações de retirada salvas com sucesso!");
            }
            
            setIsAuthModalOpen(false);
            setAuthInput('');
        } catch (err) {
            notification.show(err.message || "Erro ao salvar. Verifique sua senha/token.", "error");
        } finally {
            setIsSaving(false);
            setIsAuthVerify(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><SpinnerIcon className="h-8 w-8 text-indigo-600"/></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <AnimatePresence>
                {isAuthModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsAuthModalOpen(false)} title="Confirmação de Segurança">
                        <form onSubmit={confirmSaveWithAuth} className="space-y-4">
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                <p className="text-sm text-yellow-700">
                                    Esta é uma alteração crítica. Por favor, confirme sua <strong>Senha</strong> ou código <strong>2FA</strong> para continuar.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Senha ou Código 2FA</label>
                                <input 
                                    type="password" 
                                    value={authInput} 
                                    onChange={(e) => setAuthInput(e.target.value)} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Digite sua senha ou token..."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAuthModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700">Cancelar</button>
                                <button type="submit" disabled={isAuthVerify} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
                                    {isAuthVerify && <SpinnerIcon className="h-4 w-4"/>}
                                    Confirmar e Salvar
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <div>
                <h1 className="text-3xl font-bold text-slate-800">Métodos de Entrega e Retirada</h1>
                <p className="text-slate-500">Configure as opções locais oferecidas aos clientes.</p>
            </div>

            <div className="flex border-b border-gray-200 bg-white rounded-t-lg shadow-sm">
                <button 
                    onClick={() => setActiveTab('pickup')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 flex justify-center items-center gap-2 ${activeTab === 'pickup' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    <BoxIcon className="h-5 w-5"/> Retirada na Loja
                </button>
                <button 
                    onClick={() => setActiveTab('motoboy')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 flex justify-center items-center gap-2 ${activeTab === 'motoboy' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    <TruckIcon className="h-5 w-5"/> Frete Local (Motoboy)
                </button>
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'pickup' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <MapPinIcon className="h-5 w-5 text-indigo-600"/> Endereço Principal
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Este é o local onde o cliente buscará o pedido.</p>
                            
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="md:col-span-8">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Rua</label>
                                        <input type="text" name="rua" value={pickupConfig.address?.rua || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Rua / Avenida" />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Número</label>
                                        <input type="text" name="numero" value={pickupConfig.address?.numero || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="123" />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Bairro</label>
                                        <input type="text" name="bairro" value={pickupConfig.address?.bairro || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Bairro" />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cidade</label>
                                        <input type="text" name="cidade" value={pickupConfig.address?.cidade || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Sua Cidade" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Estado</label>
                                        <input type="text" name="estado" value={pickupConfig.address?.estado || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Paraíba" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">CEP</label>
                                        <input type="text" name="cep" value={pickupConfig.address?.cep || ''} onChange={handleAddressChange} className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="00000-000" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Link do Google Maps (Opcional, mas recomendado)</label>
                                    <input 
                                        type="url" 
                                        name="mapsLink"
                                        value={pickupConfig.mapsLink}
                                        onChange={handlePickupChange}
                                        placeholder="https://maps.app.goo.gl/..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <ClockIcon className="h-5 w-5 text-indigo-600"/> Detalhes do Funcionamento
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Informações importantes exibidas no Checkout e Rastreador.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Horário de Atendimento</label>
                                    <textarea 
                                        name="hours"
                                        value={pickupConfig.hours}
                                        onChange={handlePickupChange}
                                        rows="2"
                                        placeholder="Segunda a Sábado, das 9h às 18h."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Instruções / O que levar</label>
                                    <textarea 
                                        name="instructions"
                                        value={pickupConfig.instructions}
                                        onChange={handlePickupChange}
                                        rows="2"
                                        placeholder="Apresentar documento com foto e número do pedido."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'motoboy' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TruckIcon className="h-5 w-5 text-indigo-600"/> Preço Base
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 max-w-xs">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Padrão (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={config.base_price} 
                                        onChange={(e) => setConfig({...config, base_price: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex-1 text-sm text-gray-500 pt-6">
                                    Este valor será cobrado se nenhuma regra específica for aplicada.
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TagIcon className="h-5 w-5 text-indigo-600"/> Regras Específicas
                            </h3>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Se</label>
                                    <select value={newRule.type} onChange={(e) => setNewRule({...newRule, type: e.target.value, value: ''})} className="w-full p-2 text-sm border rounded-md">
                                        <option value="category">Categoria</option>
                                        <option value="brand">Marca</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">For Igual A</label>
                                    <select value={newRule.value} onChange={(e) => setNewRule({...newRule, value: e.target.value})} className="w-full p-2 text-sm border rounded-md">
                                        <option value="">Selecione...</option>
                                        {newRule.type === 'category' 
                                            ? productsData.categories.map(c => <option key={c} value={c}>{c}</option>)
                                            : productsData.brands.map(b => <option key={b} value={b}>{b}</option>)
                                        }
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Aplicar</label>
                                    <select value={newRule.action} onChange={(e) => setNewRule({...newRule, action: e.target.value})} className="w-full p-2 text-sm border rounded-md">
                                        <option value="free_shipping">Frete Grátis</option>
                                        <option value="surcharge">Acréscimo (+R$)</option>
                                        <option value="discount">Desconto (-R$)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Valor</label>
                                    <input type="number" disabled={newRule.action === 'free_shipping'} value={newRule.amount} onChange={(e) => setNewRule({...newRule, amount: e.target.value})} className={`w-full p-2 text-sm border rounded-md ${newRule.action === 'free_shipping' ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}`} placeholder="0.00" />
                                </div>
                                <div className="md:col-span-2">
                                    <button onClick={handleAddRule} className="w-full bg-indigo-600 text-white p-2 rounded-md font-bold text-sm hover:bg-indigo-700 transition-colors">+ Adicionar</button>
                                </div>
                            </div>

                            {config.rules.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-sm">Nenhuma regra configurada.</p>
                            ) : (
                                <div className="space-y-2">
                                    {config.rules.map((rule, index) => (
                                        <div key={rule.id || index} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 capitalize">{rule.type === 'category' ? 'Categoria' : 'Marca'}</span>
                                                <span className="text-gray-400">é</span>
                                                <span className="font-bold text-indigo-700">{rule.value}</span>
                                                <span className="text-gray-400">→</span>
                                                {rule.action === 'free_shipping' && <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Frete Grátis</span>}
                                                {rule.action === 'surcharge' && <span className="text-red-600 font-bold">Acréscimo de R$ {Number(rule.amount).toFixed(2)}</span>}
                                                {rule.action === 'discount' && <span className="text-blue-600 font-bold">Desconto de R$ {Number(rule.amount).toFixed(2)}</span>}
                                            </div>
                                            <button onClick={() => handleRemoveRule(rule.id)} className="text-red-400 hover:text-red-600 p-1"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>

            <div className="flex justify-end pt-4">
                <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-70 active:scale-95 transition-all">
                    {isSaving ? <SpinnerIcon className="h-5 w-5"/> : <CheckIcon className="h-5 w-5"/>}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};

const AdminDashboard = ({ onNavigate }) => {
    const { user } = useAuth();
    const notification = useNotification();
    const [stats, setStats] = useState({ totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 });
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    const [activeFilter, setActiveFilter] = useState('month');
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // Estados para gráficos
    const [dailySalesData, setDailySalesData] = useState([]);
    const [bestSellersData, setBestSellersData] = useState([]);

    // Funções de exportação
    const runWhenLibsReady = (callback, requiredLibs) => {
        const check = () => {
            const isPdfReady = requiredLibs.includes('pdf') ? (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.API.autoTable === 'function') : true;
            const isExcelReady = requiredLibs.includes('excel') ? (window.XLSX) : true;
            if (isPdfReady && isExcelReady) callback();
            else setTimeout(check, 100);
        }; check();
    };

    const generatePdf = (data, headers, title) => {
        runWhenLibsReady(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('pt-BR');
            doc.setFontSize(18); doc.text(title, pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(8); doc.text(timestamp, pageWidth - 14, 10, { align: 'right' });
            doc.autoTable({ head: [headers], body: data, startY: 25 });
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
            if (format === 'pdf') generatePdf(data.map(Object.values), ['Pedido ID', 'Cliente', 'Data', 'Total', 'Status'], 'Relatorio_Vendas');
            else generateExcel(data, 'relatorio_vendas');
        } catch (error) { notification.show(`Erro exportação: ${error.message}`, 'error'); }
    };

    const handleStockExport = async (format) => {
        try {
            const products = await apiService('/products/all');
            const data = products.map(p => ({ Produto: p.name, Marca: p.brand, Estoque: p.stock, Preço: p.price }));
            if (format === 'pdf') generatePdf(data.map(Object.values), ['Produto', 'Marca', 'Estoque', 'Preço'], 'Relatorio_Estoque');
            else generateExcel(data, 'relatorio_estoque');
        } catch (error) { notification.show(`Erro exportação: ${error.message}`, 'error'); }
    };

    const fetchDashboardData = useCallback((filter = 'month') => {
        setIsLoadingData(true);
        Promise.all([
            apiService(`/reports/dashboard?filter=${filter}`).catch(() => ({ stats: {}, dailySales: [], bestSellers: [] })),
            apiService('/products/low-stock').catch(() => [])
        ]).then(([reportData, lowStockItems]) => {
            const statsData = reportData?.stats || { totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 };
            setStats(statsData);
            setDailySalesData(reportData?.dailySales || []);
            setBestSellersData(reportData?.bestSellers || []);
            setLowStockProducts(lowStockItems || []);
        }).finally(() => setIsLoadingData(false));
    }, []);

    useEffect(() => { fetchDashboardData(activeFilter); }, [activeFilter, fetchDashboardData]);

    useEffect(() => {
        if (!isLoadingData && window.Chart) {
            const renderChart = (id, type, data, options) => {
                const ctx = document.getElementById(id)?.getContext('2d');
                if (ctx) {
                    if (window[`my${id}Chart`]) window[`my${id}Chart`].destroy();
                    window[`my${id}Chart`] = new window.Chart(ctx, { type, data, options });
                }
            };

            const commonOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, family: 'sans-serif' }, color: '#64748b' } },
                    y: { grid: { borderDash: [2, 4], color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#64748b' }, beginAtZero: true }
                }
            };

            const safeLabels = dailySalesData.map(d => {
                if (!d.sale_date) return "";
                const dateObj = new Date(d.sale_date);
                if (isNaN(dateObj.getTime())) {
                     const parts = d.sale_date.split('-');
                     if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('pt-BR');
                     return "";
                }
                return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            });

            renderChart('dailySalesChart', 'line', {
                labels: safeLabels,
                datasets: [{
                    label: 'Faturamento',
                    data: dailySalesData.map(d => d.daily_total),
                    borderColor: '#4f46e5', // Indigo 600
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
                        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
                        return gradient;
                    },
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            }, commonOptions);

            renderChart('bestSellersChart', 'bar', {
                labels: bestSellersData.map(p => p.name.substring(0, 15) + '...'),
                datasets: [{
                    label: 'Vendas',
                    data: bestSellersData.map(p => p.sales || 0),
                    backgroundColor: '#0ea5e9', // Sky 500
                    borderRadius: 4,
                    barThickness: 20
                }]
            }, { ...commonOptions, indexAxis: 'y' });
        }
    }, [isLoadingData, dailySalesData, bestSellersData]);

    const handleQuickStockSave = () => {
        setIsStockModalOpen(false);
        setSelectedStockItem(null);
        fetchDashboardData(activeFilter);
    };

    const calculateGrowth = () => {
        if (!stats.prevPeriodRevenue) return { text: '--', isPositive: true };
        const current = Number(stats.totalRevenue);
        const prev = Number(stats.prevPeriodRevenue);
        if (prev === 0) return { text: current > 0 ? '+100%' : '0%', isPositive: true };
        const growth = ((current - prev) / prev) * 100;
        return { text: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`, isPositive: growth >= 0 };
    };
    const growth = calculateGrowth();

    const StatCard = ({ title, value, icon: Icon, growth, subtext, iconBg, iconColor }) => (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-all duration-300"
        >
            <div>
                <p className="text-sm font-semibold text-gray-500 mb-1 tracking-wide uppercase text-[10px]">{title}</p>
                <h4 className="text-2xl font-extrabold text-slate-800">{value}</h4>
                {(growth || subtext) && (
                    <div className="flex items-center gap-2 mt-2">
                        {growth && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${growth.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {growth.text}
                            </span>
                        )}
                        {subtext && <span className="text-xs text-gray-400">{subtext}</span>}
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-lg ${iconBg}`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
        </motion.div>
    );

    const LowStockWidget = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const filtered = lowStockProducts.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
                        Reposição Necessária
                    </h3>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">{lowStockProducts.length}</span>
                </div>
                <div className="p-3 bg-white border-b border-gray-50">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Buscar produto..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                        <SearchIcon className="absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto max-h-[320px] p-2 space-y-1 custom-scrollbar">
                    {filtered.length > 0 ? filtered.map(item => (
                        <div 
                            key={item.id + item.name} 
                            onClick={() => { setSelectedStockItem(item); setIsStockModalOpen(true); }}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group border border-transparent hover:border-gray-100 cursor-pointer"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 border border-gray-200 p-0.5">
                                    <img src={getFirstImage(item.images)} alt={item.name} className="w-full h-full object-contain rounded-sm" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">{item.brand}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 flex flex-col items-end">
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{item.stock} un.</span>
                                <span 
                                    className="text-[10px] text-indigo-600 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Repor
                                </span>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <CheckCircleIcon className="h-8 w-8 text-green-100 mb-2"/>
                            <p className="text-xs">Estoque saudável!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-10">
            <AnimatePresence>
                {isStockModalOpen && (
                    <QuickStockUpdateModal item={selectedStockItem} onClose={() => setIsStockModalOpen(false)} onSave={handleQuickStockSave} />
                )}
            </AnimatePresence>

            {/* Header com Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                    <p className="text-slate-500 text-sm mt-1">Bem-vindo de volta, {user?.name.split(' ')[0]}. Aqui está o que está acontecendo hoje.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    {['today', 'week', 'month', 'year'].map(f => {
                        const labels = { today: 'Hoje', week: '7 Dias', month: 'Este Mês', year: 'Este Ano' };
                        return (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-50'}`}
                            >
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-10 w-10 text-indigo-500 animate-spin"/></div>
            ) : (
                <>
                    {/* Cards de KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Faturamento Total" 
                            value={`R$ ${Number(stats.totalRevenue).toFixed(2)}`} 
                            growth={growth}
                            subtext="vs. período anterior"
                            icon={CurrencyDollarIcon}
                            iconBg="bg-green-100"
                            iconColor="text-green-600"
                        />
                        <StatCard 
                            title="Vendas Realizadas" 
                            value={stats.totalSales} 
                            icon={BoxIcon}
                            iconBg="bg-blue-100"
                            iconColor="text-blue-600"
                        />
                        <StatCard 
                            title="Novos Clientes" 
                            value={stats.newCustomers} 
                            icon={UsersIcon}
                            iconBg="bg-purple-100"
                            iconColor="text-purple-600"
                        />
                        <StatCard 
                            title="Pedidos Pendentes" 
                            value={stats.pendingOrders} 
                            icon={ClockIcon}
                            iconBg="bg-amber-100"
                            iconColor="text-amber-600"
                        />
                    </div>

                    {/* Seção de Exportação */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">Exportar Relatórios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button 
                                onClick={() => handleSalesExport('excel')} 
                                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Vendas (Excel)</span>
                            </button>
                            <button 
                                onClick={() => handleStockExport('excel')} 
                                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Estoque (Excel)</span>
                            </button>
                            <button 
                                onClick={() => handleSalesExport('pdf')} 
                                className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Vendas (PDF)</span>
                            </button>
                        </div>
                    </div>

                    {/* Área Principal: Gráfico e Estoque */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Principal */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Performance de Vendas</h3>
                                    <p className="text-xs text-gray-400">Receita bruta ao longo do tempo</p>
                                </div>
                            </div>
                            <div className="h-80 w-full relative">
                                <canvas id="dailySalesChart"></canvas>
                            </div>
                        </div>

                        {/* Widget Lateral */}
                        <div className="space-y-6">
                            <div className="h-full">
                                <LowStockWidget />
                            </div>
                        </div>
                    </div>

                    {/* Área Inferior: Ações e Secundários */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Secundário */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-slate-800 text-lg mb-4">Top 5 Mais Vendidos</h3>
                            <div className="h-64 relative">
                                <canvas id="bestSellersChart"></canvas>
                            </div>
                        </div>
                        
                        {/* Manutenção e Ações Rápidas */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                                <h3 className="font-bold text-slate-800 mb-2">Status da Loja</h3>
                                <MaintenanceModeToggle />
                            </div>

                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl shadow-lg text-white">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-amber-400"/> Ações Rápidas
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onNavigate('admin/products')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <PlusIcon className="h-5 w-5 mb-2 text-green-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Novo Produto</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/banners')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <PhotoIcon className="h-5 w-5 mb-2 text-blue-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Banners</span>
                                    </button>
                                    <button onClick={() => handleStockExport('excel')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <FileIcon className="h-5 w-5 mb-2 text-amber-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Rel. Estoque</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/coupons')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <TagIcon className="h-5 w-5 mb-2 text-pink-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Cupom</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};






const AdminProducts = ({ onNavigate }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormKey, setProductFormKey] = useState(0);
  const confirmation = useConfirmation();
  const notification = useNotification();
  
  // Estados para Importação Inteligente
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importMessage, setImportMessage] = useState('');
  
  // Tela de carregamento da importação por IA (percentual 0–100 = fila inteira concluída)
  const [aiLoading, setAiLoading] = useState({
      isOpen: false,
      step: 0,
      percent: 0,
      fileIndex: 0,
      fileTotal: 0,
      currentFileName: '',
      status: 'processing',
  });

  const IMPORT_MAX_FILES = 15;
  const IMPORT_QUEUE_DELAY_MS = 12000;
  const IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;

  // Estados para Promoção em Massa
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isBulkPromoModalOpen, setIsBulkPromoModalOpen] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState(10);
  const [isBulkLimitedTime, setIsBulkLimitedTime] = useState(false);
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [isClearingPromos, setIsClearingPromos] = useState(false); 
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Estado para tela de carregamento de ações em massa normais
  const [bulkProgress, setBulkProgress] = useState({ isRunning: false, text: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueBrands, setUniqueBrands] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [productType, setProductType] = useState('perfume');
  
  const LOW_STOCK_THRESHOLD = 5;

  // Frases que a IA vai mostrar enquanto trabalha
  const aiSteps = [
      "Iniciando os motores da Inteligência Artificial...",
      "Lendo o documento com Visão Computacional...",
      "Desabreviando nomes e organizando categorias...",
      "IA ocupada? Reconectando automaticamente, sem precisar clicar de novo...",
      "Pesquisando imagens reais dos produtos na internet...",
      "Fazendo upload das fotos e salvando no banco..."
  ];

  const AdminCountdown = ({ endDate }) => {
      const [timeLeft, setTimeLeft] = useState('');
      
      useEffect(() => {
          const calculate = () => {
              if (!endDate) {
                  setTimeLeft('');
                  return;
              }
              const diff = new Date(endDate).getTime() - new Date().getTime();
              
              if (diff <= 0) {
                  setTimeLeft('Expirado');
                  return;
              }
              
              const d = Math.floor(diff / (1000 * 60 * 60 * 24));
              const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
              const m = Math.floor((diff / 1000 / 60) % 60);
              
              if (d > 0) {
                  setTimeLeft(`${d}d ${h}h`);
              } else {
                  setTimeLeft(`${h}h ${m}m`);
              }
          };
          calculate();
          const timer = setInterval(calculate, 60000); 
          return () => clearInterval(timer);
      }, [endDate]);

      if (!timeLeft) return null;
      if (timeLeft === 'Expirado') return <span className="text-gray-500 text-[10px] font-bold">Expirado</span>;
      return <span className="text-red-600 font-bold text-[10px] animate-pulse">{timeLeft}</span>;
  };

  const fetchProducts = useCallback(() => {
    apiService(`/products/all`)
        .then(data => {
            setProducts(data);
            const brands = [...new Set(data.map(p => p.brand).filter(b => b))];
            
            const categorySet = new Set();
            data.forEach(p => {
                if (p.category) categorySet.add(JSON.stringify({ name: p.category, type: 'product' }));
                if (p.variations) {
                    try {
                        const variations = JSON.parse(p.variations);
                        variations.forEach(v => {
                            if (v.color) categorySet.add(JSON.stringify({ name: v.color, type: 'color' }));
                            if (v.size) categorySet.add(JSON.stringify({ name: v.size, type: 'size' }));
                        });
                    } catch (e) { console.error("Erro ao parsear variações", p.variations, e); }
                }
            });

            setUniqueBrands(brands);
            setUniqueCategories(Array.from(categorySet).map(item => JSON.parse(item)));
        })
        .catch(err => console.error("Falha ao buscar produtos:", err));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = products.filter(p =>
        !lowercasedSearch ||
        p.name.toLowerCase().includes(lowercasedSearch) ||
        p.brand.toLowerCase().includes(lowercasedSearch) ||
        p.category.toLowerCase().includes(lowercasedSearch)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleOpenModal = (product = null) => {
    setProductFormKey((k) => k + 1);
    setEditingProduct(product);
    setProductType(product ? product.product_type : 'perfume');
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
        fetchProducts();
        setIsModalOpen(false);
      } catch (error) {
          notification.show(`Erro ao salvar produto: ${error.message}`, 'error');
      }
  };

  const handleDelete = (id) => {
      confirmation.show(
          "Tem certeza que deseja deletar este produto?", 
          async () => {
              try {
                await apiService(`/products/${id}`, 'DELETE');
                fetchProducts();
                notification.show('Produto deletado com sucesso.');
                setSearchTerm('');
              } catch(error) {
                notification.show(`Erro ao deletar produto: ${error.message}`, 'error');
              }
          },
          { requiresAuth: true, confirmText: 'Deletar', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  // --- Importação Inteligente (IA, XML e SerpAPI) ---
  const handleFileSelect = (e) => {
      const picked = Array.from(e.target.files || []);
      if (!picked.length) return;

      const valid = [];
      const errors = [];

      picked.forEach((file) => {
          if (file.size > IMPORT_MAX_FILE_BYTES) {
              errors.push(`"${file.name}" excede 15MB`);
              return;
          }
          valid.push(file);
      });

      setSelectedFiles((prev) => {
          const merged = [...prev];
          valid.forEach((file) => {
              if (merged.length >= IMPORT_MAX_FILES) return;
              const isDuplicate = merged.some(
                  (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
              );
              if (!isDuplicate) merged.push(file);
          });
          return merged.slice(0, IMPORT_MAX_FILES);
      });

      if (errors.length) {
          setImportMessage(errors.join(' · '));
      } else {
          setImportMessage('');
      }
      e.target.value = '';
  };

  const removeSelectedFile = (index) => {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getAiStepForPercent = (percent) =>
      Math.min(aiSteps.length - 1, Math.floor((percent / 100) * aiSteps.length));

  const isImportRetryableError = (err) => {
      const msg = String(err?.message || '').toLowerCase();
      return (
          msg.includes('sobrecarregada') ||
          msg.includes('sobrecarregado') ||
          msg.includes('tentou automaticamente') ||
          msg.includes('aguarde') ||
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('pausa')
      );
  };

  const handleImportSubmit = async (e) => {
      e.preventDefault();
      if (!selectedFiles.length) {
          setImportMessage('Selecione ao menos um arquivo (PDF, XML ou imagem).');
          return;
      }

      const files = [...selectedFiles];
      const totalFiles = files.length;

      setIsImportModalOpen(false);
      setAiLoading({
          isOpen: true,
          step: 0,
          percent: 0,
          fileIndex: 1,
          fileTotal: totalFiles,
          currentFileName: files[0].name,
          status: 'processing',
      });

      let progressInterval = null;
      const clearImportProgressTimer = () => {
          if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
          }
      };

      const getSegmentBounds = (fileIndexOneBased) => {
          const start = ((fileIndexOneBased - 1) / totalFiles) * 100;
          const end = (fileIndexOneBased / totalFiles) * 100;
          const max = fileIndexOneBased === totalFiles ? end - 1 : end - 0.5;
          return { start, end, max: Math.max(start, max) };
      };

      const startImportProgressTimer = (segmentMaxPercent) => {
          clearImportProgressTimer();
          progressInterval = setInterval(() => {
              setAiLoading((prev) => {
                  if (!prev.isOpen || prev.percent >= segmentMaxPercent) return prev;
                  let increment = 1.2;
                  if (prev.percent >= 60) increment = 0.7;
                  if (prev.percent >= 75) increment = 0.35;
                  const nextPercent = Math.min(segmentMaxPercent, prev.percent + increment);
                  return {
                      ...prev,
                      percent: nextPercent,
                      step: getAiStepForPercent(nextPercent),
                  };
              });
          }, 350);
      };

      const animateImportProgressTo = (targetPercent, durationMs, fromPercent) =>
          new Promise((resolve) => {
              const start = Date.now();
              const startPercent = fromPercent;
              const timer = setInterval(() => {
                  const elapsed = Date.now() - start;
                  const t = Math.min(1, elapsed / durationMs);
                  const nextPercent = startPercent + (targetPercent - startPercent) * t;
                  setAiLoading((prev) => ({
                      ...prev,
                      percent: nextPercent,
                      step: getAiStepForPercent(nextPercent),
                  }));
                  if (t >= 1) {
                      clearInterval(timer);
                      resolve();
                  }
              }, 120);
          });

      const finishFileProgress = (fileIndexOneBased) =>
          new Promise((resolve) => {
              clearImportProgressTimer();
              const { end } = getSegmentBounds(fileIndexOneBased);
              setAiLoading((prev) => ({
                  ...prev,
                  percent: end,
                  step: aiSteps.length - 1,
                  status: 'processing',
              }));
              setTimeout(resolve, 500);
          });

      const finishAllImportProgress = () =>
          new Promise((resolve) => {
              clearImportProgressTimer();
              setAiLoading((prev) => ({
                  ...prev,
                  percent: 100,
                  step: aiSteps.length - 1,
                  status: 'done',
              }));
              setTimeout(resolve, 900);
          });

      const importSingleInvoice = async (file, fileIndexOneBased) => {
          const { start, max } = getSegmentBounds(fileIndexOneBased);

          clearImportProgressTimer();
          setAiLoading((prev) => ({
              ...prev,
              fileIndex: fileIndexOneBased,
              currentFileName: file.name,
              percent: start,
              status: 'processing',
              step: 0,
          }));
          startImportProgressTimer(max);

          try {
              return await apiUploadService('/products/import-invoice', file);
          } catch (firstError) {
              if (!isImportRetryableError(firstError)) {
                  throw firstError;
              }
              clearImportProgressTimer();
              notification.show(
                  `IA ocupada em "${file.name}". Nova tentativa automática em 20 segundos…`,
                  'success'
              );
              let waitStartPercent = start;
              setAiLoading((prev) => {
                  waitStartPercent = Math.max(prev.percent, start + (max - start) * 0.45);
                  return { ...prev, step: 3, percent: waitStartPercent, status: 'processing' };
              });
              const waitTarget = start + (max - start) * 0.75;
              await animateImportProgressTo(waitTarget, 20000, waitStartPercent);
              startImportProgressTimer(max);
              return await apiUploadService('/products/import-invoice', file);
          }
      };

      const successes = [];
      const failures = [];

      try {
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const fileNum = i + 1;

              try {
                  const response = await importSingleInvoice(file, fileNum);
                  successes.push({ name: file.name, message: response.message });
                  await finishFileProgress(fileNum);
              } catch (fileError) {
                  failures.push({
                      name: file.name,
                      message: fileError.message || 'Erro desconhecido',
                  });
                  clearImportProgressTimer();
                  const { end } = getSegmentBounds(fileNum);
                  setAiLoading((prev) => ({
                      ...prev,
                      percent: end,
                      status: 'processing',
                  }));
              }

              if (i < files.length - 1) {
                  const nextNum = fileNum + 1;
                  const waitFrom = getSegmentBounds(fileNum).end;
                  const waitTo = getSegmentBounds(nextNum).start + 0.5;

                  setAiLoading((prev) => ({
                      ...prev,
                      status: 'waiting',
                      step: 3,
                      fileIndex: nextNum,
                      currentFileName: files[i + 1].name,
                  }));

                  await animateImportProgressTo(waitTo, IMPORT_QUEUE_DELAY_MS, waitFrom);
              }
          }

          await finishAllImportProgress();
          fetchProducts();

          if (successes.length && !failures.length) {
              const summary =
                  totalFiles === 1
                      ? successes[0].message
                      : `${successes.length} nota(s) importada(s) com sucesso.`;
              notification.show(summary, 'success');
          } else if (successes.length && failures.length) {
              notification.show(
                  `${successes.length} de ${totalFiles} nota(s) importada(s). Falharam: ${failures.map((f) => f.name).join(', ')}`,
                  'error'
              );
          } else {
              notification.show(
                  failures[0]?.message || 'Nenhuma nota foi importada. Tente novamente.',
                  'error'
              );
          }

          if (successes.length) {
              setSelectedFiles([]);
          }
      } catch (error) {
          notification.show(error.message || 'Erro ao importar as notas. Tente novamente.', 'error');
      } finally {
          clearImportProgressTimer();
          setAiLoading({
              isOpen: false,
              step: 0,
              percent: 0,
              fileIndex: 0,
              fileTotal: 0,
              currentFileName: '',
              status: 'processing',
          });
      }
  };

  // --- Exclusão em Massa ---
  const handleBulkDelete = () => {
      if (selectedProducts.length === 0) return;
      
      confirmation.show(
          `Tem certeza que deseja EXCLUIR permanentemente os ${selectedProducts.length} produto(s) selecionado(s)?`,
          async () => {
              setBulkProgress({ isRunning: true, text: `Excluindo ${selectedProducts.length} produto(s)...` });
              try {
                  await apiService('/products', 'DELETE', { ids: selectedProducts });
                  notification.show(`${selectedProducts.length} produto(s) excluído(s) com sucesso.`);
                  setSearchTerm('');
                  setSelectedProducts([]);
                  fetchProducts();
              } catch (error) {
                  notification.show(`Erro ao excluir produtos: ${error.message}`, 'error');
              } finally {
                  setBulkProgress({ isRunning: false, text: '' });
              }
          },
          { requiresAuth: true, confirmText: 'Excluir Selecionados', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  // --- Ativação/Inativação em Massa ---
  const handleBulkStatusUpdate = async (newStatus) => {
      if (selectedProducts.length === 0) return;
      const actionText = newStatus ? 'ATIVAR' : 'INATIVAR';

      confirmation.show(
          `Tem certeza que deseja ${actionText} os ${selectedProducts.length} produto(s) selecionado(s)?`,
          async () => {
              setIsUpdatingStatus(true);
              setBulkProgress({ isRunning: true, text: `${newStatus ? 'Ativando' : 'Inativando'} ${selectedProducts.length} produto(s)...` });
              try {
                  for (const id of selectedProducts) {
                      const product = products.find(p => p.id === id);
                      if (!product) continue;

                      const payload = { ...product, is_active: newStatus ? 1 : 0 };
                      delete payload.avg_rating;
                      delete payload.review_count;
                      delete payload.created_at;

                      const textFields = ['description', 'notes', 'how_to_use', 'ideal_for', 'volume', 'size_guide', 'care_instructions', 'video_url'];
                      textFields.forEach(field => {
                          if (payload[field] === null || payload[field] === undefined) {
                              payload[field] = '';
                          }
                      });

                      if (payload.sale_end_date && payload.sale_end_date !== '') {
                          payload.sale_end_date = new Date(payload.sale_end_date).toISOString();
                      } else {
                          payload.sale_end_date = null;
                      }

                      if (!payload.sale_price) payload.sale_price = null;
                      
                      if (payload.product_type === 'clothing') {
                          if (!payload.variations || payload.variations === 'null') {
                              payload.variations = '[]';
                          } else if (typeof payload.variations === 'object') {
                              payload.variations = JSON.stringify(payload.variations);
                          }
                      } else {
                          payload.variations = '[]';
                      }
                      
                      if (typeof payload.images === 'object') {
                          payload.images = JSON.stringify(payload.images);
                      } else if (!payload.images || payload.images === 'null') {
                          payload.images = '[]';
                      }

                      await apiService(`/products/${id}`, 'PUT', payload);
                  }

                  notification.show(`${selectedProducts.length} produto(s) atualizado(s) com sucesso!`);
                  setSelectedProducts([]);
                  fetchProducts();
              } catch (error) {
                  notification.show(`Erro ao atualizar status: ${error.message}`, 'error');
              } finally {
                  setIsUpdatingStatus(false);
                  setBulkProgress({ isRunning: false, text: '' });
              }
          },
          { requiresAuth: true, confirmText: `Sim, ${actionText}`, confirmColor: newStatus ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700' }
      );
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
          const allProductIds = filteredProducts.map(p => p.id);
          setSelectedProducts(allProductIds);
      } else {
          setSelectedProducts([]);
      }
  };

  const handleBulkPromotion = async (e) => {
      e.preventDefault();
      if (isBulkLimitedTime && !bulkEndDate) {
          notification.show("Por favor, selecione a data de término da promoção.", "error");
          return;
      }
      
      setIsApplyingBulk(true);
      setBulkProgress({ isRunning: true, text: `Aplicando desconto em ${selectedProducts.length} produto(s)...` });
      try {
          const formattedEndDate = isBulkLimitedTime ? new Date(bulkEndDate).toISOString() : null;

          const result = await apiService('/products/bulk-promo', 'PUT', {
              productIds: selectedProducts,
              discountPercentage: bulkDiscount,
              isLimitedTime: isBulkLimitedTime,
              saleEndDate: formattedEndDate
          });
          
          notification.show(result.message);
          fetchProducts();
          setIsBulkPromoModalOpen(false);
          setSelectedProducts([]); 
          setBulkDiscount(10);
          setBulkEndDate('');
          setIsBulkLimitedTime(false);
      } catch (error) {
          notification.show(`Erro ao aplicar promoção: ${error.message}`, 'error');
      } finally {
          setIsApplyingBulk(false);
          setBulkProgress({ isRunning: false, text: '' });
      }
  };

  const handleClearSelectedPromotions = () => {
      if (selectedProducts.length === 0) return;

      confirmation.show(
          `Tem certeza que deseja ENCERRAR a promoção de ${selectedProducts.length} produtos selecionados?`,
          async () => {
              setIsClearingPromos(true);
              setBulkProgress({ isRunning: true, text: `Encerrando promoções de ${selectedProducts.length} produto(s)...` });
              try {
                  const result = await apiService('/products/bulk-clear-promo', 'PUT', { productIds: selectedProducts });
                  notification.show(result.message);
                  setSearchTerm(''); 
                  setSelectedProducts([]); 
                  fetchProducts();
              } catch (error) {
                  notification.show(`Erro ao encerrar promoções: ${error.message}`, 'error');
              } finally {
                  setIsClearingPromos(false);
                  setBulkProgress({ isRunning: false, text: '' });
              }
          },
          { requiresAuth: true, confirmText: 'Encerrar Promoções', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  const hasInactiveSelected = selectedProducts.some(id => products.find(p => p.id === id)?.is_active === 0);
  const hasActiveSelected = selectedProducts.some(id => products.find(p => p.id === id)?.is_active === 1);

  return (
    <div>
        {/* TELA CHEIA: CARREGAMENTO FUTURISTA DA IA */}
        <AnimatePresence>
            {aiLoading.isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-md"
                >
                    <div className="relative flex items-center justify-center mb-10">
                        {/* Efeitos de brilho e pulso por trás do ícone */}
                        <div className="absolute w-32 h-32 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                        <div className="absolute w-24 h-24 bg-amber-400 rounded-full animate-pulse opacity-30"></div>
                        <div className="bg-gray-800 p-4 rounded-full relative z-10 border border-gray-700 shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                            <SparklesIcon className="h-14 w-14 text-[#D4AF37] animate-bounce" />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-white mb-2 tracking-wider">
                        Gemini AI <span className="text-[#D4AF37]">Operando</span>
                    </h2>

                    {aiLoading.fileTotal > 1 && (
                        <p className="text-indigo-300 font-bold text-lg mb-3">
                            Nota {aiLoading.fileIndex} de {aiLoading.fileTotal}
                        </p>
                    )}

                    {aiLoading.currentFileName && (
                        <p className="text-gray-400 text-sm mb-4 max-w-md truncate px-4" title={aiLoading.currentFileName}>
                            {aiLoading.currentFileName}
                        </p>
                    )}
                    
                    <p className="text-5xl font-black text-white tabular-nums mb-1">
                        {Math.round(aiLoading.percent)}<span className="text-2xl text-gray-400 font-bold">%</span>
                    </p>

                    <div className="h-10 flex items-center justify-center">
                        <motion.p
                            key={
                                aiLoading.percent >= 100
                                    ? 'done'
                                    : aiLoading.status === 'waiting'
                                      ? 'waiting'
                                      : aiLoading.step
                            }
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-[#D4AF37] font-medium text-xl text-center px-6"
                        >
                            {aiLoading.percent >= 100
                                ? aiLoading.fileTotal > 1
                                    ? `Todas as ${aiLoading.fileTotal} notas foram processadas!`
                                    : 'Importação concluída com sucesso!'
                                : aiLoading.status === 'waiting'
                                  ? `Aguardando ${IMPORT_QUEUE_DELAY_MS / 1000}s antes da próxima nota (API gratuita)…`
                                  : aiSteps[aiLoading.step]}
                        </motion.p>
                    </div>

                    <div className="w-80 h-3 bg-gray-800 rounded-full mt-8 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 via-[#D4AF37] to-indigo-400 rounded-full"
                            initial={false}
                            animate={{ width: `${Math.min(100, Math.max(0, aiLoading.percent))}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-gray-500 text-sm mt-6 text-center max-w-md px-4">
                        {aiLoading.percent >= 100
                            ? 'Processo finalizado. A tela será fechada em instantes.'
                            : aiLoading.fileTotal > 1
                              ? `Fila automática: cada nota é processada em sequência (até ~2 min por nota + ${IMPORT_QUEUE_DELAY_MS / 1000}s de pausa).`
                              : 'Aguarde nesta tela. O percentual sobe conforme a IA processa a nota (pode levar até 2 minutos).'}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* OVERLAY DE CARREGAMENTO PADRÃO (Ações em Massa) */}
        <AnimatePresence>
            {bulkProgress.isRunning && !aiLoading.isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm"
                >
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform transition-all">
                        <SpinnerIcon className="h-14 w-14 text-indigo-600 mb-5 animate-spin" />
                        <h3 className="text-xl font-extrabold text-slate-800 mb-2">Processando</h3>
                        <p className="text-sm font-medium text-slate-600">{bulkProgress.text}</p>
                        <p className="text-xs text-slate-400 mt-4">Por favor, não feche esta janela.</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* MODAL DE IMPORTAÇÃO INTELIGENTE (PONTO DE ENTRADA) */}
        <AnimatePresence>
            {isImportModalOpen && (
                <Modal isOpen={true} onClose={() => setIsImportModalOpen(false)} title="Importação Inteligente (IA & XML)">
                    <form onSubmit={handleImportSubmit} className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                            <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-2">
                                <SparklesIcon className="h-5 w-5"/> Como funciona?
                            </h4>
                            <p className="text-sm text-indigo-700 leading-relaxed">
                                Envie um ou <strong>vários arquivos</strong> (XML, PDF ou imagem). As notas entram em <strong>fila</strong>: a IA processa uma, finaliza, pausa {IMPORT_QUEUE_DELAY_MS / 1000}s e segue para a próxima — ideal para o plano gratuito do Google.
                            </p>
                        </div>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative overflow-hidden group">
                            <input 
                                type="file" 
                                id="invoice-upload"
                                accept=".xml,.pdf,image/png,image/jpeg,image/webp"
                                multiple
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center pointer-events-none">
                                <UploadIcon className={`h-12 w-12 mb-3 transition-colors ${selectedFiles.length ? 'text-green-500' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                                <span className="text-sm font-bold text-indigo-600 underline decoration-indigo-300">
                                    {selectedFiles.length
                                        ? 'Adicionar mais arquivos à fila'
                                        : 'Clique ou arraste um ou vários arquivos'}
                                </span>
                                <span className="text-xs text-gray-500 mt-2 font-medium">
                                    PDF, XML, JPG ou PNG · Máx. 15MB cada · Até {IMPORT_MAX_FILES} notas
                                </span>
                            </div>
                        </div>

                        {importMessage && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{importMessage}</p>
                        )}

                        <AnimatePresence>
                            {selectedFiles.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 max-h-48 overflow-y-auto"
                                >
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                                        <span>Fila ({selectedFiles.length} nota{selectedFiles.length > 1 ? 's' : ''})</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFiles([])}
                                            className="text-red-600 hover:text-red-800 normal-case"
                                        >
                                            Limpar tudo
                                        </button>
                                    </div>
                                    {selectedFiles.map((file, index) => (
                                        <motion.div
                                            key={`${file.name}-${file.size}-${file.lastModified}`}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 8 }}
                                            className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-semibold flex items-center justify-between shadow-sm gap-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs text-green-600 font-black w-5 flex-shrink-0">{index + 1}.</span>
                                                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-600" />
                                                <span className="truncate" title={file.name}>{file.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); removeSelectedFile(index); }}
                                                className="text-green-600 hover:text-red-600 flex-shrink-0"
                                                aria-label={`Remover ${file.name}`}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                            <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 bg-gray-200 rounded-lg font-bold text-gray-700 hover:bg-gray-300 transition-colors">Cancelar</button>
                            <button type="submit" disabled={!selectedFiles.length} className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-lg font-bold hover:bg-yellow-500 disabled:bg-gray-300 disabled:text-gray-500 flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 min-w-[200px]">
                                <SparklesIcon className="h-5 w-5" />
                                {selectedFiles.length > 1
                                    ? `Importar ${selectedFiles.length} notas`
                                    : 'Iniciar importação'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isBulkPromoModalOpen && (
                <Modal isOpen={isBulkPromoModalOpen} onClose={() => setIsBulkPromoModalOpen(false)} title={`Aplicar Promoção em ${selectedProducts.length} Produtos`}>
                    <form onSubmit={handleBulkPromotion} className="space-y-6">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Atenção:</strong> Isso atualizará o preço promocional de todos os produtos selecionados baseado no desconto escolhido sobre o preço original atual.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Porcentagem de Desconto (%)</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="99" 
                                value={bulkDiscount} 
                                onChange={(e) => setBulkDiscount(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-md text-lg font-bold text-gray-800"
                            />
                        </div>

                        <div className="flex items-center space-x-3 p-3 border rounded-md">
                            <input 
                                type="checkbox" 
                                id="bulkTimeLimit" 
                                checked={isBulkLimitedTime} 
                                onChange={(e) => setIsBulkLimitedTime(e.target.checked)} 
                                className="h-5 w-5 text-amber-600 rounded"
                            />
                            <label htmlFor="bulkTimeLimit" className="text-gray-800 font-medium cursor-pointer">Definir Tempo Limitado?</label>
                        </div>

                        {isBulkLimitedTime && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                <label className="block text-sm font-bold text-red-600 mb-1">Data/Hora de Término</label>
                                <input 
                                    type="datetime-local" 
                                    value={bulkEndDate} 
                                    onChange={(e) => setBulkEndDate(e.target.value)} 
                                    className="w-full p-2 border border-red-300 rounded-md focus:ring-red-500"
                                    required={isBulkLimitedTime}
                                />
                                <p className="text-xs text-gray-500 mt-1">Os produtos voltarão ao preço original automaticamente após esta data.</p>
                            </motion.div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setIsBulkPromoModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50" disabled={isApplyingBulk}>Cancelar</button>
                            <button type="submit" disabled={isApplyingBulk} className="px-6 py-2 bg-amber-500 text-black font-bold rounded-md hover:bg-amber-400 flex items-center gap-2 disabled:opacity-50">
                                {isApplyingBulk ? <SpinnerIcon className="h-5 w-5"/> : <SaleIcon className="h-5 w-5"/>}
                                Aplicar Desconto
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isModalOpen && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    title={editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                    size="3xl"
                >
                    <ProductForm
                        key={productFormKey}
                        item={editingProduct} 
                        onSave={handleSave} 
                        onCancel={() => setIsModalOpen(false)} 
                        productType={productType}
                        setProductType={setProductType}
                        brands={uniqueBrands}
                        categories={uniqueCategories}
                    />
                </Modal>
            )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
            <div className="flex flex-wrap gap-2">
                <button onClick={() => { setSelectedFiles([]); setImportMessage(''); setIsImportModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center space-x-2 shadow-sm transition-colors">
                    <SparklesIcon className="h-5 w-5"/> <span>Importar com IA</span>
                </button>
                <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 shadow-sm transition-colors">
                    <PlusIcon className="h-5 w-5"/> <span>Novo Produto</span>
                </button>
            </div>
        </div>

        {/* --- BARRA DE AÇÕES EM MASSA FLUTUANTE --- */}
        <AnimatePresence>
            {selectedProducts.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mb-6 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 shadow-md"
                >
                    <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                        <span className="bg-indigo-200 text-indigo-900 px-2.5 py-0.5 rounded-full">{selectedProducts.length}</span>
                        itens selecionados
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {hasInactiveSelected && (
                            <button onClick={() => handleBulkStatusUpdate(true)} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                                <CheckIcon className="h-3 w-3"/> Ativar
                            </button>
                        )}
                        {hasActiveSelected && (
                            <button onClick={() => handleBulkStatusUpdate(false)} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded hover:bg-gray-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                                <XMarkIcon className="h-3 w-3"/> Inativar
                            </button>
                        )}
                        <button onClick={() => setIsBulkPromoModalOpen(true)} disabled={isApplyingBulk} className="px-3 py-1.5 bg-amber-500 text-black text-xs font-bold rounded hover:bg-amber-400 flex items-center gap-1 shadow-sm disabled:opacity-50">
                            <SaleIcon className="h-3 w-3"/> Promoção
                        </button>
                        <button onClick={handleClearSelectedPromotions} disabled={isClearingPromos} className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                            <XMarkIcon className="h-3 w-3"/> Encerrar Promo
                        </button>
                        <button onClick={handleBulkDelete} disabled={bulkProgress.isRunning} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                            <TrashIcon className="h-3 w-3"/> Excluir
                        </button>
                        <button onClick={() => setSelectedProducts([])} disabled={bulkProgress.isRunning} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100 shadow-sm ml-1 disabled:opacity-50">
                            Cancelar
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        <div className="mb-6">
            <input 
                type="text" 
                name="search_products_no_autofill" 
                autoComplete="new-password" 
                spellCheck="false"
                data-lpignore="true"
                data-form-type="other"
                placeholder="Pesquisar por nome, marca ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* --- VERSÃO DESKTOP --- */}
            <div className="hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 w-4">
                                <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length} />
                            </th>
                            <th className="p-4">Produto</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Preço</th>
                            <th className="p-4">Promoção</th>
                            <th className="p-4">Vendas</th>
                            <th className="p-4">Estoque</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => {
                            const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                            
                            return (
                                <tr key={p.id} className={`border-b ${selectedProducts.includes(p.id) ? 'bg-indigo-50' : ''} ${p.stock < LOW_STOCK_THRESHOLD ? 'bg-red-50' : ''}`}>
                                    <td className="p-4"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500" /></td>
                                    <td className="p-4 flex items-center">
                                        <div className="w-10 h-10 mr-4 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                                            <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="max-h-full max-w-full object-contain" alt={p.name}/>
                                        </div>
                                        <div>
                                            <p className="font-semibold">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.brand}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 capitalize">
                                        {p.product_type === 'clothing' ? 'Roupa' : (p.product_type === 'perfume' ? 'Perfume' : p.product_type)}
                                    </td>
                                    <td className="p-4">
                                        {p.is_on_sale && p.sale_price > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-red-600 font-bold">R$ {Number(p.sale_price).toFixed(2)}</span>
                                                <span className="text-gray-500 text-xs line-through">R$ {Number(p.price).toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span>R$ {Number(p.price).toFixed(2)}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {p.is_on_sale ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Ativa</span>
                                                {isTimeLimited ? (
                                                    <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                                        <ClockIcon className="h-3 w-3 text-red-500"/>
                                                        <AdminCountdown endDate={p.sale_end_date} />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Sem data fim</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 font-semibold text-gray-700">
                                        {p.sales || 0}
                                    </td>
                                    <td className={`p-4 font-bold ${p.stock < LOW_STOCK_THRESHOLD ? 'text-red-600' : ''}`}>
                                        {p.stock < LOW_STOCK_THRESHOLD && <ExclamationIcon className="h-4 w-4 inline-block mr-1 text-yellow-500"/>}
                                        {p.stock}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                                    </td>
                                    <td className="p-4 space-x-2"><button onClick={() => handleOpenModal(p)}><EditIcon className="h-5 w-5"/></button><button onClick={() => handleDelete(p.id)}><TrashIcon className="h-5 w-5"/></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* --- VERSÃO MOBILE DO ADMIN --- */}
            <div className="md:hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                     <label className="flex items-center gap-3 font-bold text-gray-700">
                        <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        Selecionar Todos
                     </label>
                     <span className="text-xs text-gray-500">{filteredProducts.length} itens</span>
                </div>

                <div className="space-y-4 p-4">
                    {filteredProducts.map(p => {
                        const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                        return (
                            <div key={p.id} className={`bg-white border rounded-lg p-4 shadow-sm transition-colors ${selectedProducts.includes(p.id) ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} className="mr-4 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                        <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="h-14 w-14 object-contain mr-3 bg-gray-100 rounded"/>
                                        <div>
                                            <p className="font-bold text-gray-900 line-clamp-1">{p.name}</p>
                                            <p className="text-sm text-gray-500">{p.brand}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                         <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">
                                             {p.product_type === 'clothing' ? 'Roupa' : (p.product_type === 'perfume' ? 'Perfume' : p.product_type)}
                                         </span>
                                         <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase whitespace-nowrap ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                             {p.is_active ? 'Ativo' : 'Inativo'}
                                         </span>
                                         {!!p.is_on_sale && (
                                             <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">Promo</span>
                                         )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-4 text-sm border-t pt-4">
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Preço</strong> 
                                        {!!p.is_on_sale && p.sale_price > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-red-600 font-bold text-lg">R$ {Number(p.sale_price).toFixed(2)}</span>
                                                <span className="text-gray-400 text-xs line-through">R$ {Number(p.price).toFixed(2)}</span>
                                                {isTimeLimited && (
                                                    <div className="flex items-center gap-1 mt-1 bg-red-50 px-1.5 py-0.5 rounded w-fit">
                                                        <ClockIcon className="h-3 w-3 text-red-500"/>
                                                        <AdminCountdown endDate={p.sale_end_date} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="font-bold text-gray-800">R$ {Number(p.price).toFixed(2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Vendas</strong> 
                                        <div className="font-bold text-gray-800">
                                            {p.sales || 0} un.
                                        </div>
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Estoque</strong> 
                                        <div className={`font-bold ${p.stock < LOW_STOCK_THRESHOLD ? 'text-red-600 flex items-center gap-1' : 'text-gray-800'}`}>
                                            {p.stock < LOW_STOCK_THRESHOLD && <ExclamationIcon className="h-4 w-4"/>}
                                            {p.stock} un.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                                    <button onClick={() => handleOpenModal(p)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium text-xs"><EditIcon className="h-4 w-4"/> Editar</button>
                                    <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium text-xs"><TrashIcon className="h-4 w-4"/> Excluir</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  )
};
const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const notification = useNotification();

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        apiService('/users')
            .then(setUsers)
            .catch(err => notification.show(`Erro ao buscar usuários: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleOpenDetails = (user) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };

    return (
        <div>
             <AnimatePresence>
                {isDetailModalOpen && (
                    <UserDetailsModal 
                        user={selectedUser} 
                        onClose={() => setIsDetailModalOpen(false)}
                        onUserUpdate={fetchUsers} // Passa a função para recarregar a lista
                    />
                )}
            </AnimatePresence>
            <h1 className="text-3xl font-bold mb-6">Gerenciar Usuários</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Nome</th>
                                    <th className="p-4 font-semibold">Email</th>
                                    <th className="p-4 font-semibold">Função</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                        <td className="p-4 font-medium">{u.name}</td>
                                        <td className="p-4 text-gray-600">{u.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                                <EyeIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {users.map(u => (
                            <div key={u.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{u.name}</p>
                                        <p className="text-sm text-gray-600">{u.email}</p>
                                    </div>
                                    <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                        <EyeIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                                <div className="flex items-center justify-start gap-4 mt-4 pt-4 border-t">
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Função</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {u.role}
                                        </span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Status</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [productsData, setProductsData] = useState({ brands: [], categories: [] });
    const [searchTerm, setSearchTerm] = useState(''); 
    const [selectedCoupons, setSelectedCoupons] = useState([]); 
    const notification = useNotification();
    const confirmation = useConfirmation();

    // Helper robusto para JSON
    const tryParse = (data) => {
        if (Array.isArray(data)) return data;
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    useEffect(() => {
        fetchCoupons();
        
        Promise.all([
            apiService('/products/all'),
            apiService('/collections/admin')
        ]).then(([products, collections]) => {
            const productBrands = products.map(p => p.brand).filter(b => b && b.trim() !== "");
            const productCats = products.map(p => p.category).filter(c => c && c.trim() !== "");
            const collectionCats = collections.map(c => c.filter || c.name).filter(c => c && c.trim() !== "");

            const uniqueBrands = [...new Set(productBrands)].sort();
            const uniqueCategories = [...new Set([...productCats, ...collectionCats])].sort();

            setProductsData({ brands: uniqueBrands, categories: uniqueCategories });
        }).catch(() => {});
    }, []);

    const fetchCoupons = () => {
        apiService('/coupons').then(setCoupons).catch(console.error);
    };

    const filteredCoupons = coupons.filter(coupon => {
        const term = searchTerm.toLowerCase();
        const codeMatch = coupon.code.toLowerCase().includes(term);
        return codeMatch;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedCoupons(filteredCoupons.map(c => c.id));
        else setSelectedCoupons([]);
    };

    const handleSelectCoupon = (id) => {
        setSelectedCoupons(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
    };

    const handleBulkAction = (action) => {
         if (selectedCoupons.length === 0) return;
         const actionText = action === 'delete' ? 'excluir' : (action === 'deactivate' ? 'desativar' : 'ativar');
         confirmation.show(`Confirmar ${actionText} ${selectedCoupons.length} cupom(ns)?`, async () => {
            try {
                const promises = selectedCoupons.map(id => {
                    if (action === 'delete') return apiService(`/coupons/${id}`, 'DELETE');
                    const original = coupons.find(c => c.id === id);
                    if (!original) return Promise.resolve();
                    return apiService(`/coupons/${id}`, 'PUT', { ...original, is_active: action === 'activate' ? 1 : 0 });
                });
                await Promise.all(promises);
                notification.show(`Ação concluída!`);
                setSelectedCoupons([]);
                fetchCoupons();
            } catch (e) { notification.show(e.message, 'error'); }
         });
    };
    
    const handleSave = async (formData) => {
        try {
            const hasRestrictions = (formData.allowed_categories && formData.allowed_categories.length > 0) || 
                                    (formData.allowed_brands && formData.allowed_brands.length > 0);
            
            const payload = {
                ...formData,
                is_global: hasRestrictions ? 0 : (formData.is_global ? 1 : 0),
                allowed_categories: hasRestrictions ? formData.allowed_categories : [],
                allowed_brands: hasRestrictions ? formData.allowed_brands : []
            };

            if (formData.id) {
                await apiService(`/coupons/${formData.id}`, 'PUT', payload);
                notification.show('Atualizado!');
            } else {
                await apiService('/coupons', 'POST', payload);
                notification.show('Criado!');
            }
            fetchCoupons();
            setIsModalOpen(false);
        } catch (error) { notification.show(error.message, 'error'); }
    };

    const handleDelete = (id) => {
        confirmation.show("Excluir este cupom?", async () => {
            try {
                await apiService(`/coupons/${id}`, 'DELETE');
                fetchCoupons();
                notification.show('Excluído.');
            } catch(e) { notification.show(e.message, 'error'); }
        });
    };

    const CouponCountdown = ({ createdAt, validityDays }) => {
        const [timeLeft, setTimeLeft] = useState('');
        useEffect(() => {
            if (!validityDays || Number(validityDays) === 0) { setTimeLeft('Permanente'); return; }
            const calc = () => {
                const exp = new Date(new Date(createdAt).getTime() + Number(validityDays) * 86400000);
                const diff = exp - new Date();
                if (diff <= 0) { setTimeLeft('Expirado'); return; }
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
            };
            calc();
            const i = setInterval(calc, 1000);
            return () => clearInterval(i);
        }, [createdAt, validityDays]);
        
        let color = 'text-gray-500';
        if(timeLeft === 'Expirado') color = 'text-red-500 font-bold';
        else if(timeLeft === 'Permanente') color = 'text-green-600 font-bold';
        else color = 'text-amber-600 font-mono';
        return <span className={`text-xs ${color}`}>{timeLeft}</span>;
    };

    const CouponForm = ({ item, onSave, onCancel }) => {
        const [form, setForm] = useState(item || {
            code: '', type: 'percentage', value: '', is_active: 1, is_global: 1,
            allowed_categories: [], allowed_brands: [], validity_days: '',
            is_first_purchase: 0, is_single_use_per_user: 0
        });

        const toggleSelection = (field, value) => {
            setForm(prev => {
                const list = prev[field] || [];
                if (list.includes(value)) {
                    return { ...prev, [field]: list.filter(v => v !== value) };
                } else {
                    return { ...prev, [field]: [...list, value], is_global: 0 };
                }
            });
        };

        return (
            <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold">Código</label>
                        <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full p-2 border rounded uppercase" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold">Tipo</label>
                        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2 border rounded">
                            <option value="percentage">%</option>
                            <option value="fixed">R$</option>
                            <option value="free_shipping">Frete Grátis</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     {form.type !== 'free_shipping' && (
                        <div>
                            <label className="block text-sm font-bold">Valor</label>
                            <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full p-2 border rounded" required />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold">Validade (Dias)</label>
                        <input type="number" value={form.validity_days} onChange={e => setForm({...form, validity_days: e.target.value})} placeholder="Vazio = Eterno" className="w-full p-2 border rounded" />
                    </div>
                </div>

                <div className="border-t pt-4">
                     <label className="flex items-center space-x-2 cursor-pointer mb-2 bg-gray-100 p-2 rounded">
                        <input 
                            type="checkbox" 
                            checked={!!form.is_global} 
                            onChange={e => {
                                const checked = e.target.checked;
                                setForm({...form, is_global: checked ? 1 : 0, allowed_categories: checked ? [] : form.allowed_categories, allowed_brands: checked ? [] : form.allowed_brands});
                            }} 
                        />
                        <span className="font-bold">Cupom Global</span>
                    </label>

                    {(!form.is_global || form.allowed_categories.length > 0 || form.allowed_brands.length > 0) && (
                        <div className="bg-white p-3 border rounded">
                             <p className="text-xs text-red-600 font-bold mb-2">*Restrições (Selecione para ativar):</p>
                             <div className="mb-2">
                                <span className="block text-xs font-bold uppercase">Categorias</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {productsData.categories.map(cat => (
                                        <button type="button" key={cat} onClick={() => toggleSelection('allowed_categories', cat)} className={`px-2 py-0.5 text-[10px] rounded border ${form.allowed_categories?.includes(cat) ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>{cat}</button>
                                    ))}
                                </div>
                             </div>
                             <div>
                                <span className="block text-xs font-bold uppercase">Marcas</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {productsData.brands.map(brand => (
                                        <button type="button" key={brand} onClick={() => toggleSelection('allowed_brands', brand)} className={`px-2 py-0.5 text-[10px] rounded border ${form.allowed_brands?.includes(brand) ? 'bg-purple-600 text-white' : 'bg-gray-50'}`}>{brand}</button>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
                
                 <div className="border-t pt-2 space-y-2 bg-yellow-50 p-2 rounded">
                     <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_first_purchase} onChange={e => setForm({...form, is_first_purchase: e.target.checked ? 1 : 0})}/> <span className="text-xs">Apenas 1ª Compra</span></label>
                     <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_single_use_per_user} onChange={e => setForm({...form, is_single_use_per_user: e.target.checked ? 1 : 0})}/> <span className="text-xs">Uso Único por Cliente</span></label>
                </div>
                <div className="pt-2"><label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked ? 1 : 0})}/> <span className="font-bold">Ativo</span></label></div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">Salvar</button>
                </div>
            </form>
        );
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingCoupon ? 'Editar' : 'Novo'}><CouponForm item={editingCoupon} onSave={handleSave} onCancel={() => setIsModalOpen(false)} /></Modal>}
            </AnimatePresence>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Gerenciar Cupons</h1>
                <button onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }} className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2"><PlusIcon className="h-5 w-5"/> Novo</button>
            </div>
            
            {/* Barra de Pesquisa */}
            <div className="mb-6 relative">
                <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 border rounded shadow-sm" />
                <div className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400"><SearchIcon className="h-5 w-5" /></div>
            </div>

            {/* Barra de Ações em Massa (Visível apenas se houver seleção) */}
            <AnimatePresence>
                {selectedCoupons.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-6 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 shadow-md"
                    >
                        <div className="text-sm font-bold text-blue-800">
                            {selectedCoupons.length} selecionado(s)
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleBulkAction('activate')} className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">Ativar</button>
                            <button onClick={() => handleBulkAction('deactivate')} className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded hover:bg-yellow-600">Desativar</button>
                            <button onClick={() => handleBulkAction('delete')} className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 flex items-center gap-1"><TrashIcon className="h-3 w-3"/> Excluir</button>
                            <button onClick={() => setSelectedCoupons([])} className="px-2 py-1 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100">Cancelar</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Seleção Múltipla Mobile (Apenas Checkbox) */}
            <div className="md:hidden flex items-center mb-4 px-1">
                <input 
                    type="checkbox" 
                    id="mobile-select-all"
                    onChange={handleSelectAll} 
                    checked={filteredCoupons.length > 0 && selectedCoupons.length === filteredCoupons.length}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5 mr-2"
                />
                <label htmlFor="mobile-select-all" className="text-sm font-bold text-gray-700">Selecionar Todos</label>
            </div>

            <div className="hidden md:block bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 w-10"><input type="checkbox" onChange={handleSelectAll} checked={filteredCoupons.length > 0 && selectedCoupons.length === filteredCoupons.length}/></th>
                            <th className="p-3">Código</th><th className="p-3">Regra</th><th className="p-3">Desc.</th><th className="p-3">Restrições</th><th className="p-3">Valid.</th><th className="p-3">Status</th><th className="p-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCoupons.map(c => (
                            <tr key={c.id} className="border-b hover:bg-gray-50">
                                <td className="p-3"><input type="checkbox" checked={selectedCoupons.includes(c.id)} onChange={() => handleSelectCoupon(c.id)}/></td>
                                <td className="p-3 font-mono font-bold text-blue-600">{c.code}</td>
                                <td className="p-3 text-xs">{c.is_global ? <span className="text-green-600 font-bold">Global</span> : <span className="text-amber-600 font-bold">Restrito</span>}</td>
                                <td className="p-3 text-sm">{c.type === 'free_shipping' ? 'Grátis' : (c.type === 'percentage' ? `${c.value}%` : `R$${c.value}`)}</td>
                                <td className="p-3 text-xs text-gray-500">
                                    {!c.is_global && (
                                        <div className="flex flex-col gap-1">
                                            {tryParse(c.allowed_brands).length > 0 && <span className="text-purple-700">M: {tryParse(c.allowed_brands).join(', ')}</span>}
                                            {tryParse(c.allowed_categories).length > 0 && <span className="text-blue-700">C: {tryParse(c.allowed_categories).join(', ')}</span>}
                                        </div>
                                    )}
                                    {!!c.is_first_purchase && <div className="text-amber-700 font-semibold">• 1ª Compra</div>}
                                    {!!c.is_single_use_per_user && <div className="text-blue-700 font-semibold">• Uso Único</div>}
                                </td>
                                <td className="p-3"><CouponCountdown createdAt={c.created_at} validityDays={c.validity_days}/></td>
                                <td className="p-3"><span className={`px-2 py-0.5 text-xs rounded ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => { setEditingCoupon({ ...c, allowed_categories: tryParse(c.allowed_categories), allowed_brands: tryParse(c.allowed_brands) }); setIsModalOpen(true); }}><EditIcon className="h-4 w-4 text-gray-500"/></button>
                                    <button onClick={() => handleDelete(c.id)}><TrashIcon className="h-4 w-4 text-red-500"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="md:hidden space-y-3">
                 {filteredCoupons.map(c => (
                    <div key={c.id} className={`bg-white border rounded p-3 relative ${selectedCoupons.includes(c.id) ? 'border-blue-400 ring-1 ring-blue-400' : ''}`}>
                         <div className="flex justify-between">
                            <div><h3 className="font-bold text-blue-700">{c.code}</h3><p className="text-xs">{c.type === 'free_shipping' ? 'Frete Grátis' : `${c.value}${c.type==='percentage'?'%':'R$'}`}</p></div>
                            <input type="checkbox" checked={selectedCoupons.includes(c.id)} onChange={() => handleSelectCoupon(c.id)}/>
                         </div>
                         
                         <div className="flex justify-between mt-2 text-xs text-gray-500 items-center">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{c.is_global ? 'Global' : 'Restrito'}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {c.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <CouponCountdown createdAt={c.created_at} validityDays={c.validity_days}/>
                         </div>

                         <div className="text-xs mt-2">
                            {!c.is_global && (
                                <div className="flex flex-col gap-1 text-gray-600 bg-gray-50 p-1 rounded">
                                    {tryParse(c.allowed_brands).length > 0 && <span>M: {tryParse(c.allowed_brands).join(', ')}</span>}
                                    {tryParse(c.allowed_categories).length > 0 && <span>C: {tryParse(c.allowed_categories).join(', ')}</span>}
                                </div>
                            )}
                            {!!c.is_first_purchase && <span className="block text-amber-700 font-semibold">• 1ª Compra</span>}
                            {!!c.is_single_use_per_user && <span className="block text-blue-700 font-semibold">• Uso Único</span>}
                         </div>
                         <div className="flex justify-end gap-3 mt-2 border-t pt-2">
                            <button onClick={() => { setEditingCoupon({ ...c, allowed_categories: tryParse(c.allowed_categories), allowed_brands: tryParse(c.allowed_brands) }); setIsModalOpen(true); }} className="text-blue-600 text-xs font-bold flex gap-1"><EditIcon className="h-3 w-3"/> Edit</button>
                            <button onClick={() => handleDelete(c.id)} className="text-red-600 text-xs font-bold flex gap-1"><TrashIcon className="h-3 w-3"/> Del</button>
                         </div>
                    </div>
                 ))}
            </div>
        </div>
    );
};

const AdminRefunds = ({ onNavigate }) => {
    const [refunds, setRefunds] = useState([]);
    const [filteredRefunds, setFilteredRefunds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [isDenyModalOpen, setIsDenyModalOpen] = useState(false);
    const [denyReason, setDenyReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Novo estado para o Lightbox no painel Admin
    const [lightboxImage, setLightboxImage] = useState(null);
    
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchRefunds = useCallback(() => {
        setIsLoading(true);
        apiService('/refunds')
            .then(data => {
                setRefunds(data);
                setFilteredRefunds(data);
            })
            .catch(err => notification.show(`Erro ao buscar reembolsos: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    const handleApprove = (refund) => {
        confirmation.show(
            `Tem certeza que deseja aprovar e processar o reembolso de R$ ${Number(refund.amount).toFixed(2)} para o pedido #${refund.order_id}? Esta ação é irreversível.`,
            async () => {
                try {
                    const result = await apiService(`/refunds/${refund.id}/approve`, 'POST');
                    notification.show(result.message);
                    fetchRefunds();
                } catch (error) {
                    notification.show(`Erro ao aprovar: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true, confirmText: 'Aprovar e Processar', confirmColor: 'bg-green-600 hover:bg-green-700' }
        );
    };

    const handleDeny = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const result = await apiService(`/refunds/${selectedRefund.id}/deny`, 'POST', { reason: denyReason });
            notification.show(result.message);
            setIsDenyModalOpen(false);
            setDenyReason('');
            fetchRefunds();
        } catch (error) {
            notification.show(`Erro ao negar: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusChip = (status) => {
        const statuses = {
            'pending_approval': { text: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
            'approved': { text: 'Aprovado', class: 'bg-blue-100 text-blue-800' },
            'denied': { text: 'Negado', class: 'bg-red-100 text-red-800' },
            'processed': { text: 'Processado', class: 'bg-green-100 text-green-800' },
            'failed': { text: 'Falhou', class: 'bg-gray-200 text-gray-800' }
        };
        const s = statuses[status] || { text: 'Desconhecido', class: 'bg-gray-200 text-gray-800' };
        return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${s.class}`}>{s.text}</span>;
    };
    
    const getPaymentMethodName = (method, details) => {
        if (method === 'mercadopago') {
            try {
                const parsedDetails = JSON.parse(details);
                if (parsedDetails.method === 'credit_card') return 'Cartão de Crédito';
                if (parsedDetails.method === 'pix') return 'Pix';
                if (parsedDetails.method === 'boleto') return 'Boleto';
            } catch (e) { /* cai para o fallback */ }
        }
        return method?.replace('_', ' ') || 'N/A';
    };

    const Lightbox = ({ mainImage, onClose }) => ( 
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={onClose}> 
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white text-5xl leading-none z-[1000] p-2 hover:text-red-500 transition-colors">×</button> 
            <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <img src={mainImage} alt="Imagem ampliada" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            </div> 
        </div> 
    );

    // FUNÇÃO SEGURA PARA LER IMAGENS E ITENS
    const safeParseJSON = (data, fallback = []) => {
        if (!data) return fallback;
        try {
            let parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Para duplo stringify
            return Array.isArray(parsed) ? parsed : fallback;
        } catch (e) {
            return fallback;
        }
    };

    return (
        <div>
            {lightboxImage && (
                 <Lightbox mainImage={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}

            <AnimatePresence>
                {isDenyModalOpen && selectedRefund && (
                     <Modal isOpen={true} onClose={() => setIsDenyModalOpen(false)} title={`Negar Reembolso #${selectedRefund.id}`}>
                        <form onSubmit={handleDeny}>
                            <label className="block text-sm font-medium text-gray-700">Por favor, informe o motivo da negação (será registrado internamente e visível para o cliente):</label>
                            <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                                <button type="button" onClick={() => setIsDenyModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md font-semibold text-gray-700 hover:bg-gray-300 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-gray-800 text-white rounded-md font-bold hover:bg-gray-900 transition-colors flex items-center gap-2 disabled:bg-gray-400">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Confirmar Negação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6 text-slate-800 tracking-tight">Gerenciar Devoluções e Reembolsos</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-indigo-600" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Pedido</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Cliente e Contato</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Valor / Data</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs w-1/3">Itens e Motivo</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs">Status</th>
                                    <th className="p-4 font-bold text-gray-600 uppercase tracking-wide text-xs text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRefunds.length > 0 ? (
                                    filteredRefunds.map(r => {
                                        const images = safeParseJSON(r.images);
                                        const items = safeParseJSON(r.order_items);

                                        return (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors align-top">
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div className="font-mono font-bold text-indigo-600 text-base">#{r.order_id}</div>
                                                    {r.request_count > 1 && (
                                                        <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded border border-orange-200 font-bold uppercase animate-pulse">
                                                            Reaberto ({r.request_count}ª vez)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Atualizado em:<br/>{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                                            </td>
                                            
                                            <td className="p-4">
                                                <p className="font-bold text-gray-900">{r.customer_name}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">CPF: {maskCPF(r.customer_cpf || '---')}</p>
                                                
                                                {/* Contato para Coleta */}
                                                {r.contact_phone ? (
                                                    <div className="mt-2 bg-blue-50 border border-blue-100 p-2 rounded-md inline-block">
                                                        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1">WhatsApp Coleta:</p>
                                                        <a href={`https://wa.me/55${r.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-green-700 font-bold hover:underline text-xs">
                                                            <WhatsappIcon className="h-4 w-4"/> {maskPhone(r.contact_phone)}
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 mt-2 italic">Telefone p/ coleta não informado.</p>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <p className="font-bold text-green-600 text-lg">R$ {Number(r.amount).toFixed(2)}</p>
                                                <p className="text-xs text-gray-500 mt-1 capitalize">{getPaymentMethodName(r.payment_method, r.payment_details)}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">Pago em: {new Date(r.order_date).toLocaleDateString('pt-BR')}</p>
                                            </td>
                                            
                                            <td className="p-4">
                                                {/* Lista de Produtos */}
                                                <div className="mb-3 bg-gray-100 p-2 rounded border border-gray-200">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Itens do Pedido:</p>
                                                    <ul className="text-xs text-gray-700 space-y-1">
                                                        {items.map((item, idx) => (
                                                            <li key={idx} className="flex gap-1 truncate">
                                                                <span className="font-bold">{item.quantity}x</span> {item.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                                                    <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1">Motivo / Relato:</p>
                                                    <p className="text-sm text-gray-800 font-medium break-words leading-snug">{r.reason}</p>
                                                </div>

                                                {/* Galeria de Fotos */}
                                                {images.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fotos Anexadas ({images.length}):</p>
                                                        <div className="flex gap-2 overflow-x-auto py-1">
                                                            {images.map((img, idx) => (
                                                                <div key={idx} onClick={() => setLightboxImage(img)} className="w-12 h-12 flex-shrink-0 cursor-zoom-in rounded border border-gray-300 shadow-sm overflow-hidden hover:scale-110 transition-transform bg-white">
                                                                    <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            
                                            <td className="p-4 align-middle">
                                                {getStatusChip(r.status)}
                                            </td>
                                            
                                            <td className="p-4 align-middle text-center">
                                                {r.status === 'pending_approval' ? (
                                                    <div className="flex flex-col gap-2 items-center">
                                                        <button onClick={() => handleApprove(r)} className="w-full py-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-bold rounded-lg transition-colors border border-green-200 text-xs shadow-sm flex items-center justify-center gap-1">
                                                            <CheckIcon className="h-4 w-4"/> Aprovar
                                                        </button>
                                                        <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="w-full py-2 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-bold rounded-lg transition-colors border border-red-200 text-xs shadow-sm flex items-center justify-center gap-1">
                                                            <XMarkIcon className="h-4 w-4"/> Negar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Finalizado</span>
                                                )}
                                            </td>
                                        </tr>
                                    )})
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <CurrencyDollarArrowIcon className="h-12 w-12 text-gray-300 mb-3" />
                                                <h3 className="text-lg font-bold text-gray-700">Nenhum reembolso encontrado</h3>
                                                <p className="text-sm text-gray-500 mt-1">Ainda não há solicitações de reembolso no sistema.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                     {/* Mobile Card View */}
                     <div className="md:hidden p-4 bg-gray-50 space-y-4">
                        {filteredRefunds.length > 0 ? (
                            filteredRefunds.map(r => {
                                const images = safeParseJSON(r.images);
                                const items = safeParseJSON(r.order_items);
                                return (
                                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-sm">
                                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                                        <div className="flex flex-col gap-1 items-start">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-indigo-700 text-lg">Pedido #{r.order_id}</p>
                                            </div>
                                            {r.request_count > 1 && (
                                                <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded border border-orange-200 font-bold uppercase animate-pulse mb-1">
                                                    Reaberto ({r.request_count}ª vez)
                                                </span>
                                            )}
                                            <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
                                        </div>
                                        {getStatusChip(r.status)}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                                        <div>
                                            <strong className="text-gray-500 block text-[10px] uppercase tracking-wide">Cliente</strong> 
                                            <span className="font-medium text-gray-900">{r.customer_name}</span>
                                            <span className="block text-xs font-mono text-gray-500">{maskCPF(r.customer_cpf || '')}</span>
                                        </div>
                                        <div>
                                            <strong className="text-gray-500 block text-[10px] uppercase tracking-wide">Valor do Reembolso</strong> 
                                            <span className="font-bold text-green-600 text-lg">R$ {Number(r.amount).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Whatsapp da Coleta Mobile */}
                                    {r.contact_phone && (
                                        <div className="mb-3 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                                            <strong className="text-blue-800 block text-[10px] uppercase tracking-wide mb-1">Agendar Coleta (WhatsApp)</strong>
                                            <a href={`https://wa.me/55${r.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-green-700 font-bold hover:underline text-sm">
                                                <WhatsappIcon className="h-5 w-5"/> {maskPhone(r.contact_phone)}
                                            </a>
                                        </div>
                                    )}

                                    {/* Itens do Pedido Mobile */}
                                    <div className="mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <strong className="text-gray-500 block text-[10px] uppercase tracking-wide mb-1.5">Itens Comprados</strong>
                                        <ul className="text-xs text-gray-700 space-y-1">
                                            {items.map((item, idx) => (
                                                <li key={idx} className="flex gap-1">
                                                    <span className="font-bold">{item.quantity}x</span> <span className="truncate">{item.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="border-t border-gray-100 pt-3">
                                        <strong className="text-gray-500 block text-[10px] uppercase tracking-wide mb-1">Motivo do Cliente</strong>
                                        <p className="text-gray-900 break-words bg-yellow-50 p-3 rounded-lg border border-yellow-100 font-medium leading-snug">{r.reason}</p>
                                        
                                        {images.length > 0 && (
                                            <div className="mt-3">
                                                <strong className="text-gray-500 block text-[10px] uppercase tracking-wide mb-2">Fotos Anexadas</strong>
                                                <div className="flex gap-2 overflow-x-auto py-1">
                                                    {images.map((img, idx) => (
                                                        <div key={idx} onClick={() => setLightboxImage(img)} className="w-16 h-16 flex-shrink-0 cursor-zoom-in rounded-lg border border-gray-300 shadow-sm overflow-hidden active:scale-95 transition-transform bg-white">
                                                            <img src={img} alt="Anexo do cliente" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {r.status === 'pending_approval' && (
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                            <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl transition-colors shadow-sm">Negar</button>
                                            <button onClick={() => handleApprove(r)} className="flex-1 py-3 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold rounded-xl transition-colors shadow-sm">Aprovar</button>
                                        </div>
                                    )}
                                </div>
                            )})
                        ) : (
                            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <CurrencyDollarArrowIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-gray-700">Nenhum reembolso</h3>
                                <p className="text-sm text-gray-500 mt-1">Ainda não há solicitações.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminOrders = ({ appName }) => {
    const { pickupConfig } = useShop(); 
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editFormData, setEditFormData] = useState({ status: '', tracking_code: '' });
    const notification = useNotification();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const [showNewOrderNotification, setShowNewOrderNotification] = useState(true);
    const [itemsExpanded, setItemsExpanded] = useState(true);

    const ordersPerPage = 10;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        minPrice: '',
        maxPrice: '',
    });

    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundReason, setRefundReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const allStatuses = [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 
        'Pronto para Retirada', 'Enviado', 'Saiu para Entrega', 
        'Entregue', 'Pagamento Recusado', 'Cancelado'
    ];

    const getShippingDisplay = (method) => {
        const lower = method ? method.toLowerCase() : '';
        if (lower.includes('retirar') || lower.includes('loja')) {
            return { icon: <BoxIcon className="h-4 w-4"/>, label: 'Retirada', fullText: 'Retirada na Loja', classes: 'bg-purple-100 text-purple-700 border border-purple-200' };
        }
        if (lower.includes('motoboy') || lower.includes('delivery') || lower.includes('local')) {
            return { icon: <TruckIcon className="h-4 w-4"/>, label: 'Motoboy', fullText: 'Entrega Local (Moto)', classes: 'bg-blue-100 text-blue-700 border border-blue-200' };
        }
        return { icon: <TruckIcon className="h-4 w-4"/>, label: 'Correios', fullText: method || 'Envio Padrão', classes: 'bg-amber-100 text-amber-700 border border-amber-200' };
    };

    const TimelineDisplay = ({ order }) => {
        const isLocalDelivery = order.shipping_method && (order.shipping_method.toLowerCase().includes('motoboy') || order.shipping_method.toLowerCase().includes('entrega local'));
        const isPickup = order.shipping_method === 'Retirar na loja';
        
        let timelineOrder = [];
        let displayLabels = {};

        if (isLocalDelivery) {
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Saiu para Entrega': 'Em Rota', 'Entregue': 'Entregue' };
        } else if (isPickup) {
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Pronto para Retirada': 'Pronto', 'Entregue': 'Retirado' };
        } else { 
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Enviado': 'Enviado', 'Saiu para Entrega': 'Saiu p/ Entrega', 'Entregue': 'Entregue' };
        }

        if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(order.status)) {
            return (
                <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center gap-3 mb-6">
                     <XCircleIcon className="h-6 w-6 text-red-600" />
                     <div className="text-center">
                         <p className="font-bold text-red-800 text-lg uppercase tracking-wide">{order.status}</p>
                         <p className="text-xs text-red-600">O fluxo deste pedido foi interrompido.</p>
                     </div>
                </div>
            );
        }

        const currentStatusIndex = timelineOrder.indexOf(order.status);
        const progressWidth = currentStatusIndex >= 0 ? (currentStatusIndex / (timelineOrder.length - 1)) * 100 : 0;

        return (
            <div className="w-full py-6 mb-4">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-500 -z-10 rounded-full transition-all duration-500" style={{ width: `${progressWidth}%` }}></div>
                    {timelineOrder.map((statusKey, index) => {
                        const isCompleted = index <= currentStatusIndex;
                        const isCurrent = statusKey === order.status;
                        return (
                            <div key={statusKey} className="flex flex-col items-center group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 ${isCompleted ? 'bg-green-500 border-green-500 scale-110' : 'bg-white border-gray-300'}`}>
                                    {isCompleted && <CheckIcon className="h-4 w-4 text-white stroke-2" />}
                                </div>
                                <p className={`absolute -bottom-8 text-[10px] font-bold text-center w-20 transition-colors ${isCurrent ? 'text-green-700' : (isCompleted ? 'text-gray-600' : 'text-gray-400')}`}>
                                    {displayLabels[statusKey]}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const generateWhatsAppStatusMessage = (status, order, trackingCode) => {
        const customerName = order.user_name;
        const orderId = order.id;
        const firstName = customerName ? customerName.split(' ')[0] : 'Cliente';
        const isPickup = order.shipping_method === 'Retirar na loja';
        const isLocalDelivery = order.shipping_method && (order.shipping_method.toLowerCase().includes('motoboy') || order.shipping_method.toLowerCase().includes('entrega local'));
        
        const orderLink = `${window.location.origin}/#account/orders/${orderId}`;
        const paymentLink = `${window.location.origin}/#order-success/${orderId}`;

        const EMOJI = {
            PACKAGE: String.fromCodePoint(0x1F4E6), TRUCK: String.fromCodePoint(0x1F69A), DOC: String.fromCodePoint(0x1F4C4),
            LINK: String.fromCodePoint(0x1F517), MOTO: String.fromCodePoint(0x1F6F5), CHECK: String.fromCodePoint(0x2705),
            BAGS: String.fromCodePoint(0x1F6CD, 0xFE0F), PIN: String.fromCodePoint(0x1F4CD), CLOCK: String.fromCodePoint(0x23F0),
            MONEY: String.fromCodePoint(0x1F4B8), CROSS: String.fromCodePoint(0x274C), WARN: String.fromCodePoint(0x26A0, 0xFE0F),
            NEW: String.fromCodePoint(0x1F195), PHONE: String.fromCodePoint(0x1F4F1), HOUSE: String.fromCodePoint(0x1F3E0),
            PAY: String.fromCodePoint(0x1F4B3)
        };

        let text = `Olá, *${firstName}*.\n\n`;

        if (status === 'Pendente') {
             text += `🔔 *Lembrete de Pagamento: Pedido #${orderId}*\n\n`;
             text += `Recebemos seu pedido, mas ainda não identificamos a confirmação do pagamento.\n\n`;
             text += `${EMOJI.PAY} *Para realizar o pagamento, acesse:* \n${paymentLink}\n\n`;
             text += `⚠️ *Caso já tenha efetuado o pagamento:* \nPor favor, desconsidere esta mensagem.\n\n`;
             text += `${EMOJI.DOC} *Acompanhe o status aqui:* \n${orderLink}\n\n`;
             text += `Atenciosamente,\n*Equipe ${appName || 'da Loja'}*\n${EMOJI.PHONE} (83) 98737-9573`;
             return text;
        }

        text += `O status do seu pedido *#${orderId}* foi atualizado:\n\n`;

        switch (status) {
            case 'Separando Pedido': text += `${EMOJI.PACKAGE} *Novo Status: Preparado o pedido para envio*\nEstamos separando seus itens com cuidado.`; break;
            case 'Enviado': text += `${EMOJI.TRUCK} *Novo Status: Pedido Enviado*\n${trackingCode ? `\n${EMOJI.DOC} *Rastreio:* ${trackingCode}\n${EMOJI.LINK} *Acompanhe:* https://linketrack.com/track?codigo=${trackingCode}` : ''}`; break;
            case 'Saiu para Entrega':
                if (isLocalDelivery) text += `${EMOJI.MOTO} *Novo Status: Saiu para entrega (Motoboy)*\nO motorista já está a caminho.${trackingCode?.startsWith('http') ? `\n\n${EMOJI.LINK} *Acompanhe em tempo real:*\n${trackingCode}` : ''}`;
                else text += `${EMOJI.MOTO} *Novo Status: Saiu para Entrega*\nSeu pedido está em rota de entrega.`;
                break;
            case 'Entregue': text += `${EMOJI.CHECK} *Novo Status: Pedido entregue*\nConfirmamos a entrega. Esperamos que goste dos produtos!`; break;
            case 'Pronto para Retirada': text += `${EMOJI.BAGS} *Novo Status: Pronto para Retirada*\nJá disponível em nossa loja.`; break;
            case 'Pagamento Aprovado': text += `${EMOJI.MONEY} *Novo Status: Pagamento Aprovado*\nPagamento confirmado. Iniciaremos a separação.`; break;
            case 'Cancelado': text += `${EMOJI.CROSS} *Novo Status: Cancelado*\nO pedido foi cancelado. Se tiver dúvidas, estamos à disposição.`; break;
            case 'Pagamento Recusado': text += `${EMOJI.WARN} *Novo Status: Pagamento Recusado*\nO pagamento não foi autorizado. Tente novamente ou entre em contato.`; break;
            case 'Reembolsado': text += `${EMOJI.MONEY} *Novo Status: Reembolsado*\nO reembolso do seu pedido foi processado.`; break;
            default: text += `${EMOJI.NEW} *Novo Status:* ${status}`;
        }

        if (!['Cancelado', 'Reembolsado', 'Pagamento Recusado'].includes(status)) {
             text += `\n\n--------------------------------\n`;
             if (isPickup) {
                const pAddr = pickupConfig?.address;
                let pAddrStr = 'Endereço não configurado';
                if (typeof pAddr === 'object' && pAddr !== null) {
                    pAddrStr = `Rua: ${pAddr.rua}\nNº: ${pAddr.numero}\nBairro: ${pAddr.bairro}\nCidade: ${pAddr.cidade}\nEstado: ${pAddr.estado || pAddr.uf}\nCEP: ${pAddr.cep}`;
                } else if (typeof pAddr === 'string') {
                    pAddrStr = pAddr;
                }
                const pHours = pickupConfig?.hours || 'Seg a Sáb, 09h-11h30 e 15h-17h30';
                const pInst = pickupConfig?.instructions || 'Documento com foto e número do pedido.';
                const pMaps = pickupConfig?.mapsLink || '';

                text += `${EMOJI.PIN} *Local de Retirada:*\n${pAddrStr}\n`;
                if (pMaps) text += `\n${EMOJI.LINK} *Mapa:* ${pMaps}\n`;
                text += `\n${EMOJI.CLOCK} *Horário:* ${pHours}\n`;
                text += `\n${EMOJI.DOC} *Necessário:* ${pInst}`;
            } else {
                try {
                    const addr = JSON.parse(order.shipping_address);
                    if (addr) {
                        text += `${EMOJI.HOUSE} *Endereço de Entrega:*\n${addr.logradouro}, ${addr.numero}\n${addr.bairro ? `${addr.bairro} - ` : ''}${addr.localidade}/${addr.uf}`;
                    }
                } catch (e) { text += `${EMOJI.TRUCK} Envio para o endereço cadastrado.`; }
            }
        }

        text += `\n\n${EMOJI.LINK} *Detalhes no site:*\n${orderLink}\n\nAtenciosamente,\n*Equipe ${appName || 'da Loja'}*\n${EMOJI.PHONE} (83) 98737-9573`;
        return text;
    };

    const handleManualWhatsAppNotification = () => {
        if (!editingOrder || !editingOrder.user_phone) { notification.show("Telefone do cliente não disponível.", "error"); return; }
        const statusToSend = editFormData.status || editingOrder.status;
        const trackingToSend = editFormData.tracking_code || editingOrder.tracking_code;
        const message = generateWhatsAppStatusMessage(statusToSend, editingOrder, trackingToSend);
        const cleanPhone = editingOrder.user_phone.replace(/\D/g, '');
        if (cleanPhone.length >= 10) window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(message)}`, '_blank');
        else notification.show("Número de telefone do cliente inválido.", "error");
    };
    
    const fetchOrders = useCallback(() => {
        apiService('/orders')
            .then(data => {
                const sortedData = data.sort((a,b) => new Date(b.date) - new Date(a.date));
                setOrders(sortedData);
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recent = sortedData.filter(o => o?.date && !isNaN(new Date(o.date)) && new Date(o.date) > twentyFourHoursAgo);
                setNewOrdersCount(recent.length);
            }).catch(console.error);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    
    useEffect(() => {
        let temp = [...orders];
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            temp = temp.filter(o => String(o.id).includes(lowerTerm) || (o.user_name?.toLowerCase().includes(lowerTerm)) || (o.user_cpf?.includes(lowerTerm)));
        }
        if (filters.status) temp = temp.filter(o => o.status === filters.status);
        if (filters.minPrice) temp = temp.filter(o => Number(o.total) >= Number(filters.minPrice));
        if (filters.maxPrice) temp = temp.filter(o => Number(o.total) <= Number(filters.maxPrice));
        if (filters.startDate) {
            const start = new Date(filters.startDate); start.setHours(0,0,0,0);
            temp = temp.filter(o => new Date(o.date) >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate); end.setHours(23,59,59,999);
            temp = temp.filter(o => new Date(o.date) <= end);
        }
        setFilteredOrders(temp);
        setCurrentPage(1);
    }, [orders, filters, searchTerm]);

    const handleOpenEditModal = async (order) => {
        try {
            const fullDetails = await apiService(`/orders/${order.id}`);
            setEditingOrder(fullDetails);
            setEditFormData({ status: fullDetails.status, tracking_code: fullDetails.tracking_code || '' });
            setItemsExpanded(true); 
            setIsEditModalOpen(true);
        } catch (e) { notification.show("Erro ao abrir pedido.", "error"); }
    };

    const handleSaveOrder = async (e) => {
        e.preventDefault();
        if (!editingOrder) return;
        try {
            await apiService(`/orders/${editingOrder.id}`, 'PUT', editFormData);
            notification.show('Pedido atualizado!');
            fetchOrders();
            setIsEditModalOpen(false);
        } catch(e) { notification.show(e.message, 'error'); }
    };

    const DetailCard = ({ title, icon: Icon, children, className = "" }) => (
        <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm ${className}`}>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                {Icon && <Icon className="h-4 w-4 text-indigo-500"/>}
                {title}
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
                {children}
            </div>
        </div>
    );

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const getStatusLabel = (status, order) => {
        const isLocal = editingOrder?.shipping_method?.toLowerCase().includes('motoboy');
        if (isLocal) {
            if (status === 'Saiu para Entrega') return 'Saiu para entrega (Motoboy)';
            if (status === 'Separando Pedido') return 'Preparado p/ envio';
        }
        return status;
    };

    const handleOpenRefundModal = () => {
        if (!editingOrder) return;
        setRefundAmount(editingOrder.total); setRefundReason('');
        setIsEditModalOpen(false); setIsRefundModalOpen(true);
    };

    const handleRequestRefund = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            if (parseFloat(refundAmount) > parseFloat(editingOrder.total)) throw new Error("O valor do reembolso não pode ser maior que o total do pedido.");
            const result = await apiService('/refunds', 'POST', { order_id: editingOrder.id, amount: refundAmount, reason: refundReason });
            notification.show(result.message);
            setIsRefundModalOpen(false);
            fetchOrders();
        } catch (error) { notification.show(`Erro ao solicitar reembolso: ${error.message}`, 'error'); } 
        finally { setIsProcessing(false); }
    };

    const handleEditFormChange = (e) => setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const applyFilters = useCallback(() => { /* Lógica de filtro reativa já trata */ }, []);
    const clearFilters = () => { setFilters({ startDate: '', endDate: '', status: '', minPrice: '', maxPrice: '' }); setSearchTerm(''); setCurrentPage(1); }

    const getStatusChipClass = (status) => {
        const lowerStatus = status ? status.toLowerCase() : '';
        if (lowerStatus.includes('entregue')) return 'bg-green-100 text-green-800';
        if (lowerStatus.includes('cancelado') || lowerStatus.includes('recusado') || lowerStatus.includes('reembolsado')) return 'bg-red-100 text-red-800';
        if (lowerStatus.includes('pendente')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-blue-100 text-blue-800';
    };

    const renderUpdateOrderForm = () => {
        const isLocalDelivery = editingOrder.shipping_method && (editingOrder.shipping_method.toLowerCase().includes('motoboy') || editingOrder.shipping_method.toLowerCase().includes('entrega local'));
        const isPickup = editingOrder.shipping_method === 'Retirar na loja';
        const canRequestRefund = editingOrder.payment_status === 'approved' && !editingOrder.refund_id && !['Cancelado', 'Reembolsado'].includes(editingOrder.status);

        let availableStatuses = [];
        if (isLocalDelivery) availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue', 'Cancelado', 'Pagamento Recusado'];
        else if (isPickup) availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue', 'Cancelado', 'Pagamento Recusado'];
        else availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue', 'Cancelado', 'Pagamento Recusado'];

        if (!availableStatuses.includes(editingOrder.status)) availableStatuses.push(editingOrder.status);

        return (
            <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 mt-6 lg:mt-0">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
                    <EditIcon className="h-5 w-5 text-indigo-600"/> Atualizar Status e Entrega
                </h4>
                <form onSubmit={handleSaveOrder} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Pedido</label>
                            <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                {availableStatuses.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                            </select>
                        </div>
                        {!isPickup && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    {isLocalDelivery ? "Link de Acompanhamento (Uber/Moto)" : "Código de Rastreio"}
                                </label>
                                <input type="text" name="tracking_code" value={editFormData.tracking_code} onChange={handleEditFormChange} placeholder={isLocalDelivery ? "Cole o link da viagem aqui" : "Ex: AA123456789BR"} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                {isLocalDelivery && <p className="text-xs text-gray-500 mt-1">Link para o cliente acompanhar o motoboy.</p>}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col-reverse md:flex-row justify-between items-center pt-4 border-t border-gray-100 gap-4">
                        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-start">
                            {canRequestRefund ? (
                                <button type="button" onClick={handleOpenRefundModal} className="px-4 py-2.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-bold text-sm flex items-center gap-2 transition-colors flex-grow md:flex-grow-0 justify-center">
                                    <CurrencyDollarIcon className="h-5 w-5"/> Reembolso
                                </button>
                            ) : editingOrder.refund_id ? (
                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 self-center">Reembolso Solicitado</span>
                            ) : null}

                            {editingOrder.user_phone && (
                                <button type="button" onClick={handleManualWhatsAppNotification} className="px-4 py-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-bold text-sm flex items-center gap-2 transition-colors flex-grow md:flex-grow-0 justify-center">
                                    <WhatsappIcon className="h-5 w-5"/> Notificar
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 md:flex-none px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 md:flex-none px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md text-sm transition-colors flex items-center justify-center gap-2">
                                <CheckIcon className="h-5 w-5"/> Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div>
            <AnimatePresence>
                {isRefundModalOpen && editingOrder && (
                    <Modal isOpen={true} onClose={() => setIsRefundModalOpen(false)} title={`Solicitar Reembolso para Pedido #${editingOrder.id}`}>
                        <form onSubmit={handleRequestRefund} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor a Reembolsar</label>
                                <input type="number" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} max={editingOrder.total} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                                <p className="text-xs text-gray-500 mt-1">Valor total do pedido: R$ {Number(editingOrder.total).toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Motivo do Reembolso</label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center gap-2 disabled:bg-amber-300">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {editingOrder && (() => {
                    const isLocalDelivery = editingOrder.shipping_method && (editingOrder.shipping_method.toLowerCase().includes('motoboy') || editingOrder.shipping_method.toLowerCase().includes('entrega local'));
                    const isPickup = editingOrder.shipping_method === 'Retirar na loja';
                    const pAddress = pickupConfig?.address;
                    const isPAddressObj = typeof pAddress === 'object' && pAddress !== null;

                    return (
                        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Pedido #${editingOrder.id}`} size="3xl">
                            <div className="bg-gray-50/50 -m-6 p-4 sm:p-6 pb-24">
                                
                                {/* 1. Timeline */}
                                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Realizado em</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date(editingOrder.date).toLocaleString('pt-BR')}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border self-start sm:self-auto ${
                                            editingOrder.status === 'Entregue' ? 'bg-green-50 text-green-700 border-green-200' :
                                            editingOrder.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {editingOrder.status}
                                        </span>
                                    </div>
                                    <TimelineDisplay order={editingOrder} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* COLUNA DA ESQUERDA: Itens */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            {/* Header do Accordion */}
                                            <div 
                                                className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                                onClick={() => setItemsExpanded(!itemsExpanded)}
                                            >
                                                <h4 className="font-bold text-gray-700 flex items-center gap-2"><BoxIcon className="h-4 w-4"/> Itens do Pedido</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-500">{editingOrder.items?.length || 0} itens</span>
                                                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${itemsExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {/* Conteúdo do Accordion */}
                                            <AnimatePresence initial={false}>
                                                {itemsExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {/* Lista de Itens com Scroll e Badges */}
                                                        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                            {editingOrder.items?.map((item, idx) => {
                                                                let variation = item.variation;
                                                                if (typeof variation === 'string') {
                                                                    try { variation = JSON.parse(variation); } catch(e) {}
                                                                }
                                                                
                                                                const isClothing = !!variation;
                                                                const itemTypeLabel = isClothing ? 'ROUPA' : 'PERFUME';
                                                                const itemTypeClass = isClothing ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200';
                                                                
                                                                return (
                                                                <div key={idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                                                                    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex-shrink-0 p-1">
                                                                        <img src={getFirstImage(item.images)} alt="" className="w-full h-full object-contain"/>
                                                                    </div>
                                                                    <div className="flex-grow">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${itemTypeClass}`}>
                                                                                {itemTypeLabel}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                                                        {variation && (
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                                    Cor: {variation.color}
                                                                                </span>
                                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                                    Tam: {variation.size}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right w-full sm:w-auto">
                                                                        <p className="text-xs text-gray-500">{item.quantity} x R$ {Number(item.price).toFixed(2)}</p>
                                                                        <p className="text-sm font-bold text-gray-900">R$ {(item.quantity * item.price).toFixed(2)}</p>
                                                                    </div>
                                                                </div>
                                                            )})}
                                                        </div>
                                                        <div className="bg-gray-50 p-4 border-t border-gray-200 space-y-2">
                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                <span>Subtotal</span>
                                                                <span>R$ {(Number(editingOrder.total) - Number(editingOrder.shipping_cost) + Number(editingOrder.discount_amount)).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                <span>Frete ({editingOrder.shipping_method})</span>
                                                                <span>R$ {Number(editingOrder.shipping_cost).toFixed(2)}</span>
                                                            </div>
                                                            {Number(editingOrder.discount_amount) > 0 && (
                                                                <div className="flex justify-between text-xs text-green-600 font-medium">
                                                                    <span>Desconto ({editingOrder.coupon_code})</span>
                                                                    <span>- R$ {Number(editingOrder.discount_amount).toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                                <span>Total Geral</span>
                                                                <span>R$ {Number(editingOrder.total).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        
                                        {/* ATUALIZAR PEDIDO (Visível apenas em Desktop) */}
                                        <div className="hidden lg:block">
                                            {renderUpdateOrderForm()}
                                        </div>
                                    </div>

                                    {/* COLUNA DA DIREITA: Informações */}
                                    <div className="space-y-6">
                                        <DetailCard title="Cliente" icon={UserIcon}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                                    {editingOrder.user_name.charAt(0)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-gray-900 leading-tight truncate">{editingOrder.user_name}</p>
                                                    <p className="text-xs text-gray-500">ID: {editingOrder.user_id}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 text-right font-semibold text-gray-500">CPF:</div>
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{maskCPF(editingOrder.user_cpf || '---')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 text-right"><WhatsappIcon className="h-4 w-4 text-green-500 mx-auto"/></div>
                                                    <a href={`https://wa.me/55${editingOrder.user_phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-green-600">
                                                        {maskPhone(editingOrder.user_phone || '')}
                                                    </a>
                                                </div>
                                                {editingOrder.user_phone && (
                                                    <a 
                                                        href={`https://api.whatsapp.com/send?phone=55${editingOrder.user_phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-md hover:bg-green-600 font-bold transition-colors shadow-sm"
                                                        title="Abrir conversa no WhatsApp"
                                                    >
                                                        <WhatsappIcon className="h-4 w-4 text-white"/> Conversar no WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </DetailCard>

                                        <DetailCard title="Entrega" icon={MapPinIcon}>
                                            <div className="mb-3 pb-2 border-b border-gray-100">
                                                <span className="text-xs text-gray-500 block">Método Escolhido</span>
                                                <p className="font-bold text-indigo-700 text-sm">{editingOrder.shipping_method || 'Não informado'}</p>
                                            </div>

                                            {isPickup ? (
                                                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 space-y-1.5">
                                                    <p className="font-bold text-amber-900 mb-1">Retirada na Loja</p>
                                                    {isPAddressObj ? (
                                                        <div className="space-y-0.5 text-amber-900 bg-amber-100/50 p-2 rounded">
                                                            <div className="flex"><span className="font-semibold w-12">Rua:</span> <span>{pAddress.rua}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Nº:</span> <span>{pAddress.numero}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Bairro:</span> <span>{pAddress.bairro}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Cidade:</span> <span>{pAddress.cidade}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">Estado:</span> <span>{pAddress.estado || pAddress.uf}</span></div>
                                                            <div className="flex"><span className="font-semibold w-12">CEP:</span> <span>{pAddress.cep}</span></div>
                                                        </div>
                                                    ) : (
                                                        <p>{pAddress || 'Endereço não configurado'}</p>
                                                    )}
                                                    
                                                    {pickupConfig?.mapsLink && (
                                                        <a href={pickupConfig.mapsLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold mt-2 inline-block">Ver no Mapa &rarr;</a>
                                                    )}

                                                    {editingOrder.pickup_details && (() => {
                                                        try {
                                                            const p = JSON.parse(editingOrder.pickup_details);
                                                            return <div className="mt-3 pt-2 border-t border-amber-200"><p className="font-semibold text-amber-900">Retirado por:</p><p>{p.personName} (CPF: {p.personCpf})</p></div>
                                                        } catch { return null; }
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="text-xs space-y-2">
                                                    {(() => {
                                                        try {
                                                            const addr = JSON.parse(editingOrder.shipping_address);
                                                            return (
                                                                <>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Rua:</span>
                                                                        <span className="text-gray-800 font-medium">{addr.logradouro}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Nº:</span>
                                                                        <span className="text-gray-800">{addr.numero} {addr.complemento ? `(${addr.complemento})` : ''}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Bairro:</span>
                                                                        <span className="text-gray-800">{addr.bairro}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Cidade:</span>
                                                                        <span className="text-gray-800">{addr.localidade}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Estado:</span>
                                                                        <span className="text-gray-800">{addr.uf}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">CEP:</span>
                                                                        <span className="font-mono text-gray-800 bg-gray-100 px-1 rounded">{addr.cep}</span>
                                                                    </div>
                                                                </>
                                                            );
                                                        } catch { return <p>Endereço inválido</p>; }
                                                    })()}
                                                </div>
                                            )}
                                        </DetailCard>

                                        <DetailCard title="Pagamento" icon={CreditCardIcon}>
                                            <div className="flex flex-col gap-2">
                                                {(() => {
                                                    let details = {};
                                                    try { 
                                                        const parsed = JSON.parse(editingOrder.payment_details); 
                                                        if (parsed && typeof parsed === 'object') details = parsed; 
                                                    } catch {}
                                                    
                                                    return (
                                                        <>
                                                            <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                                {details.method === 'pix' ? 'Pix' : details.method === 'boleto' ? 'Boleto' : details.method === 'credit_card' ? 'Cartão' : 'Outro'}
                                                            </span>
                                                            {details.method === 'credit_card' && (
                                                                <div className="text-xs text-gray-600">
                                                                    <p className="capitalize">{details.card_brand} •••• {details.card_last_four}</p>
                                                                    <p>{details.installments}x de R$ {(Number(editingOrder.total)/details.installments).toFixed(2)}</p>
                                                                </div>
                                                            )}
                                                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                                                <span className="text-xs text-gray-500">Status</span>
                                                                <span className={`text-xs font-bold ${editingOrder.payment_status === 'approved' ? 'text-green-600' : 'text-amber-600'}`}>
                                                                    {editingOrder.payment_status === 'approved' ? 'Aprovado' : 'Pendente'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </DetailCard>
                                    </div>
                                </div>
                                
                                {/* ATUALIZAR PEDIDO (Visível apenas em Mobile - FINAL DO FORMULÁRIO) */}
                                <div className="lg:hidden mt-6">
                                    {renderUpdateOrderForm()}
                                </div>

                            </div>
                        </Modal>
                    );
                })()}
            </AnimatePresence>
            
            <AnimatePresence>
                {newOrdersCount > 0 && showNewOrderNotification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="relative bg-blue-600 text-white p-4 rounded-lg shadow-lg mb-6 flex justify-between items-center"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-6 w-6"/>
                            <span className="font-semibold">
                                Você tem {newOrdersCount} novo(s) pedido(s) nas últimas 24 horas!
                            </span>
                        </div>
                        <button onClick={() => setShowNewOrderNotification(false)} className="p-1 rounded-full hover:bg-blue-500">
                            <XMarkIcon className="h-5 w-5"/>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6">Gerenciar Pedidos</h1>
            {/* ... Filtros ... */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6 space-y-4">
                <h2 className="text-xl font-semibold">Pesquisa Avançada</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" name="orderIdSearch" placeholder="Pesquisar por ID, Nome ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-md col-span-1 md:col-span-2 lg:col-span-4"/>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data de Início"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data Final"/>
                    <input type="number" name="minPrice" placeholder="Preço Mín." value={filters.minPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="number" name="maxPrice" placeholder="Preço Máx." value={filters.maxPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md bg-white">
                        <option value="">Todos os Status</option>
                        {[...new Set(allStatuses)].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                    <button onClick={applyFilters} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Aplicar Filtros</button>
                    <button onClick={clearFilters} className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500">Limpar Filtros</button>
                </div>
            </div>
            
            {/* Tabela de Listagem de Pedidos (COM ESTADO VAZIO) */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden lg:block overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">ID</th>
                                <th className="p-4 font-semibold text-gray-600">Cliente</th>
                                <th className="p-4 font-semibold text-gray-600">Contato</th>
                                <th className="p-4 font-semibold text-gray-600">Envio</th>
                                <th className="p-4 font-semibold text-gray-600">Total</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600">Ações</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {currentOrders.length > 0 ? (
                                currentOrders.map(o => {
                                    const shipInfo = getShippingDisplay(o.shipping_method);
                                    return (
                                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">#{o.id}</span>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(o.date).toLocaleDateString('pt-BR')}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-900">{o.user_name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <UserIcon className="h-3 w-3"/> {maskCPF(o.user_cpf || '')}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            {o.user_phone ? (
                                                <a href={`https://wa.me/55${o.user_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-600 font-bold hover:underline text-sm bg-green-50 px-2 py-1 rounded w-fit">
                                                    <WhatsappIcon className="h-4 w-4"/> {maskPhone(o.user_phone)}
                                                </a>
                                            ) : <span className="text-gray-400 text-xs">Sem contato</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md w-fit ${shipInfo.classes}`}>
                                                {shipInfo.icon}
                                                <span className="text-xs font-bold">{shipInfo.label}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">R$ {Number(o.total).toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => handleOpenEditModal(o)} className="text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50" title="Ver Detalhes">
                                                <EyeIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <PackageIcon className="h-12 w-12 text-gray-300 mb-3" />
                                            <h3 className="text-lg font-bold text-gray-700">Nenhum pedido encontrado</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {searchTerm || filters.status || filters.startDate || filters.endDate || filters.minPrice || filters.maxPrice 
                                                    ? 'Nenhum pedido corresponde aos filtros aplicados.' 
                                                    : 'Sua loja ainda não possui pedidos.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                         </tbody>
                     </table>
                </div>
                
                {/* Mobile List View (Cards Melhorados) */}
                <div className="lg:hidden space-y-4 p-4 bg-gray-50">
                    {currentOrders.length > 0 ? (
                        currentOrders.map(o => {
                            const shipInfo = getShippingDisplay(o.shipping_method);
                            return (
                            <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                {/* Faixa lateral de status */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${o.status === 'Entregue' ? 'bg-green-500' : (o.status === 'Cancelado' ? 'bg-red-500' : 'bg-indigo-500')}`}></div>
                                
                                <div className="pl-3">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-indigo-700 text-lg">#{o.id}</span>
                                                <span className="text-xs text-gray-400">{new Date(o.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <p className="font-bold text-gray-800 text-sm">{o.user_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">R$ {Number(o.total).toFixed(2)}</p>
                                            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                        </div>
                                    </div>

                                    {/* Dados do Cliente (Mobile) */}
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <UserIcon className="h-3.5 w-3.5 text-gray-400"/>
                                            <span className="font-mono">{maskCPF(o.user_cpf || '---')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <WhatsappIcon className="h-3.5 w-3.5 text-green-500"/>
                                            <span className="font-bold text-green-700">{maskPhone(o.user_phone || '---')}</span>
                                        </div>
                                    </div>

                                    {/* Dados de Envio (Mobile) */}
                                    <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${shipInfo.classes}`}>
                                        {shipInfo.icon}
                                        <span className="text-xs font-bold">{shipInfo.fullText}</span>
                                    </div>

                                    <button onClick={() => handleOpenEditModal(o)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md active:scale-95">
                                        <EyeIcon className="h-4 w-4"/> Ver Detalhes do Pedido
                                    </button>
                                </div>
                            </div>
                        )})
                    ) : (
                        <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <PackageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-700">Nenhum pedido encontrado</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {searchTerm || filters.status || filters.startDate || filters.endDate || filters.minPrice || filters.maxPrice 
                                    ? 'Tente limpar os filtros para ver mais resultados.' 
                                    : 'Ainda não há pedidos.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 font-bold text-gray-700">Anterior</button>
                    <span className="text-sm font-medium text-gray-600">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 font-bold text-gray-700">Próxima</button>
                </div>
            )}
        </div>
    );
};
const AdminReports = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState([]); // Para controlar quais linhas da tabela estão expandidas
    const notification = useNotification();
    
    // Define as datas padrão
    const getFirstDayOfMonth = () => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
    };
    const getToday = () => {
        return new Date().toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getToday());

    const toggleRow = (orderId) => {
        setExpandedRows(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    // Função para buscar os dados da API
    const handleGenerateReport = useCallback(() => {
        setIsLoading(true);
        setReportData(null); 
        setExpandedRows([]); // Reseta expansão
        
        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
        if (window.myTopProductsChart) window.myTopProductsChart.destroy();

        apiService(`/reports/detailed?startDate=${startDate}&endDate=${endDate}`)
            .then(data => {
                setReportData(data);
            })
            .catch(err => {
                notification.show(`Erro ao gerar relatório: ${err.message}`, 'error');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [startDate, endDate, notification]);

    useEffect(() => {
        handleGenerateReport();
    }, [handleGenerateReport]); 

    useEffect(() => {
        if (reportData && !isLoading) {
            const renderCharts = () => {
                if (window.Chart) {
                    const salesCtx = document.getElementById('salesOverTimeChart')?.getContext('2d');
                    if (salesCtx && reportData.salesOverTime) {
                        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
                        
                        const safeLabels = reportData.salesOverTime.map(d => {
                            if (!d.sale_date) return "Data Inválida";
                            const dateObj = new Date(d.sale_date); 
                            if (isNaN(dateObj.getTime())) return "Data Inválida";
                            return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                        });

                        window.mySalesOverTimeChart = new window.Chart(salesCtx, {
                            type: 'line',
                            data: {
                                labels: safeLabels, 
                                datasets: [{
                                    label: 'Faturamento (R$)',
                                    data: reportData.salesOverTime.map(d => d.daily_total),
                                    borderColor: 'rgba(212, 175, 55, 1)',
                                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                                    fill: true, tension: 0.3
                                }]
                            },
                            options: { responsive: true, maintainAspectRatio: false }
                        });
                    }
                    
                    const productsCtx = document.getElementById('topProductsChart')?.getContext('2d');
                    if (productsCtx && reportData.topProducts) {
                        if (window.myTopProductsChart) window.myTopProductsChart.destroy();
                        window.myTopProductsChart = new window.Chart(productsCtx, {
                            type: 'bar',
                            data: {
                                labels: reportData.topProducts.map(p => p.name),
                                datasets: [{
                                    label: 'Unidades Vendidas',
                                    data: reportData.topProducts.map(p => p.total_quantity),
                                    backgroundColor: 'rgba(212, 175, 55, 0.8)',
                                    borderWidth: 1
                                }]
                            },
                            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
                        });
                    }
                } else {
                    setTimeout(renderCharts, 100);
                }
            };
            renderCharts();
        }
    }, [reportData, isLoading]);

    const StatCard = ({ title, value }) => (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{title}</h4>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );

    const runWhenLibsReady = (callback, requiredLibs) => {
        const check = () => {
            const isPdfReady = requiredLibs.includes('pdf') ? (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.API.autoTable === 'function') : true;
            const isExcelReady = requiredLibs.includes('excel') ? (window.XLSX) : true;
            if (isPdfReady && isExcelReady) callback();
            else setTimeout(check, 100);
        }; check();
    };

    const handleExportPDF = () => {
        if (!reportData) {
            notification.show("Não há dados para exportar.", "error");
            return;
        }

        runWhenLibsReady(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('pt-BR');
            const kpis = reportData.kpis;
            const formattedStartDate = new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR');
            const formattedEndDate = new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR');

            // Título
            doc.setFontSize(18);
            doc.text("Relatório Detalhado de Vendas", pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, pageWidth / 2, 22, { align: 'center' });
            doc.setFontSize(8);
            doc.text(`Gerado em: ${timestamp}`, pageWidth - 14, 10, { align: 'right' });

            // KPIs
            doc.setFontSize(12);
            doc.text("Resumo do Período", 14, 35);
            doc.autoTable({
                startY: 40,
                head: [['Indicador', 'Valor']],
                body: [
                    ['Faturamento Total', `R$ ${Number(kpis.totalRevenue).toFixed(2)}`],
                    ['Total de Vendas', kpis.totalSales],
                    ['Ticket Médio', `R$ ${Number(kpis.avgOrderValue).toFixed(2)}`],
                    ['Novos Clientes', kpis.newCustomers],
                ],
                theme: 'striped'
            });
            let lastY = doc.lastAutoTable.finalY + 10;

            // Detalhamento de Vendas
            if (reportData.detailedSales && reportData.detailedSales.length > 0) {
                doc.setFontSize(12);
                doc.text("Detalhamento de Vendas e Itens", 14, lastY);
                
                const tableBody = [];
                reportData.detailedSales.forEach(order => {
                    tableBody.push([
                        `#${order.id}`, 
                        order.customer_name, 
                        new Date(order.date).toLocaleDateString(), 
                        `R$ ${Number(order.total).toFixed(2)}`,
                        order.status
                    ]);
                    
                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                    items.forEach(item => {
                        tableBody.push([
                            '', 
                            `-> ${item.quantity}x ${item.name}`, 
                            '', 
                            `R$ ${Number(item.price).toFixed(2)} un.`, 
                            ''
                        ]);
                    });
                });

                doc.autoTable({
                    startY: lastY + 5,
                    head: [['ID', 'Cliente / Produto', 'Data', 'Valor', 'Status']],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 20 },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 25 },
                        3: { halign: 'right', cellWidth: 30 },
                        4: { cellWidth: 30 }
                    },
                    didParseCell: function(data) {
                        if (data.section === 'body' && data.row.raw[0] === '') {
                            data.cell.styles.textColor = [100, 100, 100];
                            data.cell.styles.fontStyle = 'italic';
                            data.cell.styles.fillColor = [250, 250, 250];
                        }
                        if (data.section === 'body' && data.row.raw[0] !== '') {
                            data.cell.styles.fillColor = [240, 240, 240];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                });
                lastY = doc.lastAutoTable.finalY + 10;
            }

            doc.addPage();
            lastY = 20;
            doc.setFontSize(12);
            doc.text("Top Produtos", 14, lastY);
            doc.autoTable({
                startY: lastY + 5,
                head: [['Produto', 'Unidades Vendidas', 'Faturamento (R$)']],
                body: reportData.topProducts.map(p => [
                    p.name,
                    p.total_quantity,
                    `R$ ${Number(p.total_revenue).toFixed(2)}`
                ]),
                theme: 'striped'
            });

            doc.save(`relatorio_detalhado_${startDate}_a_${endDate}.pdf`);
        }, ['pdf']);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Relatórios Detalhados</h1>
            
            {/* Seletor de Data */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Data de Início</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-300 rounded-md w-full md:w-auto"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data Final</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-300 rounded-md w-full md:w-auto"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-6">
                        <button
                            onClick={handleGenerateReport}
                            disabled={isLoading}
                            className="flex-1 md:flex-none bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 disabled:bg-gray-400"
                        >
                            {isLoading ? <SpinnerIcon /> : 'Gerar Relatório'}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={isLoading || !reportData}
                            className="flex-1 md:flex-none bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            <DownloadIcon className="h-5 w-5"/>
                            <span className="hidden md:inline">Exportar PDF</span>
                            <span className="md:hidden">PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-10 w-10 text-amber-500" /></div>
            )}

            {reportData && !isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                >
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Faturamento Total" value={`R$ ${Number(reportData.kpis.totalRevenue).toFixed(2)}`} />
                        <StatCard title="Total de Vendas" value={reportData.kpis.totalSales} />
                        <StatCard title="Ticket Médio" value={`R$ ${Number(reportData.kpis.avgOrderValue).toFixed(2)}`} />
                        <StatCard title="Novos Clientes" value={reportData.kpis.newCustomers} />
                    </div>

                    {/* NOVA SEÇÃO: DETALHAMENTO DE VENDAS */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Detalhamento de Vendas ({reportData.detailedSales ? reportData.detailedSales.length : 0})</h3>
                        </div>
                        {reportData.detailedSales && reportData.detailedSales.length > 0 ? (
                            <>
                                {/* VISÃO DESKTOP (TABELA) */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                                            <tr>
                                                <th className="p-4 w-10"></th>
                                                <th className="p-4">Pedido</th>
                                                <th className="p-4">Cliente</th>
                                                <th className="p-4">Data</th>
                                                <th className="p-4">Total</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {reportData.detailedSales.map(order => {
                                                const isExpanded = expandedRows.includes(order.id);
                                                const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

                                                return (
                                                    <React.Fragment key={order.id}>
                                                        <tr className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`} onClick={() => toggleRow(order.id)}>
                                                            <td className="p-4 text-center">
                                                                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                            </td>
                                                            <td className="p-4 font-bold text-indigo-600">#{order.id}</td>
                                                            <td className="p-4">{order.customer_name}</td>
                                                            <td className="p-4 text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                                                            <td className="p-4 font-bold text-green-600">R$ {Number(order.total).toFixed(2)}</td>
                                                            <td className="p-4">
                                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan="6" className="p-4 pl-12 border-t border-gray-200 shadow-inner">
                                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Itens do Pedido:</h4>
                                                                    <div className="space-y-2">
                                                                        {items.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between text-sm text-gray-700 border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                                                                                <span>{item.quantity}x {item.name}</span>
                                                                                <span className="font-mono">R$ {Number(item.price).toFixed(2)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* VISÃO MOBILE (CARDS) */}
                                <div className="md:hidden space-y-4 p-4">
                                    {reportData.detailedSales.map(order => {
                                        const isExpanded = expandedRows.includes(order.id);
                                        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

                                        return (
                                            <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                                <div 
                                                    className={`p-4 flex justify-between items-start cursor-pointer ${isExpanded ? 'bg-blue-50 border-b border-blue-100' : ''}`}
                                                    onClick={() => toggleRow(order.id)}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-indigo-600">#{order.id}</span>
                                                            <span className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="font-medium text-gray-800">{order.customer_name}</p>
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-600 mb-2">R$ {Number(order.total).toFixed(2)}</p>
                                                        <ChevronDownIcon className={`h-5 w-5 text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                    </div>
                                                </div>
                                                
                                                {/* Detalhes Mobile Expandidos */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div 
                                                            initial={{ height: 0 }} 
                                                            animate={{ height: 'auto' }} 
                                                            exit={{ height: 0 }} 
                                                            className="overflow-hidden bg-gray-50"
                                                        >
                                                            <div className="p-4 border-t border-gray-100">
                                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                                                                    <BoxIcon className="h-3 w-3"/> Itens do Pedido
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {items.map((item, idx) => (
                                                                        <div key={idx} className="flex justify-between text-sm text-gray-700 border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                                                            <div className="flex-1 pr-2">
                                                                                <span className="font-bold text-gray-900">{item.quantity}x</span> {item.name}
                                                                            </div>
                                                                            <span className="font-mono text-gray-600 whitespace-nowrap">R$ {Number(item.price).toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-500">Nenhuma venda encontrada neste período.</div>
                        )}
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
                            <h3 className="font-bold mb-4 text-lg">Vendas ao Longo do Tempo</h3>
                            <div className="relative h-64">
                                <canvas id="salesOverTimeChart"></canvas>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
                            <h3 className="font-bold mb-4 text-lg">Produtos Mais Vendidos (por Unidade)</h3>
                            <div className="relative h-64">
                                <canvas id="topProductsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const AdminLogsPage = () => {
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




const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('promo'); 
    const [editingBanner, setEditingBanner] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();
    
    // Configuração dos sensores com distância de ativação para permitir scroll no mobile
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const fetchBanners = useCallback(() => {
        setIsLoading(true);
        apiService('/banners/admin')
            .then(data => {
                if (Array.isArray(data)) {
                    setBanners(data);
                } else {
                    setBanners([]);
                }
            })
            .catch(err => notification.show(`Erro ao buscar banners: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => { fetchBanners() }, [fetchBanners]);

    // --- POPULAR BANCO DE DADOS (ACIONA O BACKEND) ---
    const handleInitializeDefaults = async () => {
        confirmation.show("Deseja popular o banco com as campanhas sazonais padrão? (Não duplicará existentes)", async () => {
            setIsGenerating(true);
            try {
                const response = await apiService('/banners/seed-defaults', 'POST');
                notification.show(response.message);
                fetchBanners();
            } catch (error) {
                notification.show(`Erro ao popular: ${error.message}`, 'error');
            } finally {
                setIsGenerating(false);
            }
        });
    };

    // Separação dos banners vindos do Banco
    const carouselBanners = banners.filter(b => b.display_order < 50).sort((a, b) => a.display_order - b.display_order);
    
    // Lista de Destaques (Ordem 50)
    const promoBanners = banners.filter(b => b.display_order === 50).sort((a, b) => {
        if (!a.start_date) return -1;
        if (!b.start_date) return 1;
        return new Date(a.start_date) - new Date(b.start_date);
    });

    const card1 = banners.find(b => b.display_order === 60);
    const card2 = banners.find(b => b.display_order === 61);

    const handleOpenModal = (banner, section) => {
        let initialData = banner ? { ...banner } : {};
        
        if (!banner) {
            if (section === 'carousel') {
                const maxOrder = carouselBanners.length > 0 ? Math.max(...carouselBanners.map(b => b.display_order)) : -1;
                initialData = { 
                    name: '', link_url: '', image_url: '', image_url_mobile: '', is_active: 1, 
                    cta_enabled: 1, cta_text: 'Ver Mais', display_order: maxOrder + 1 
                };
            } else if (section === 'promo') {
                initialData = { name: '', link_url: '', image_url: '', is_active: 1, cta_enabled: 1, display_order: 50 };
            } else if (section === 'cards') {
                // Tenta preencher o slot vazio (60 ou 61)
                const nextSlot = !card1 ? 60 : 61;
                initialData = { name: '', link_url: '', image_url: '', is_active: 1, cta_enabled: 1, display_order: nextSlot };
            }
        }
        setEditingBanner(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            const payload = { ...formData, display_order: parseInt(formData.display_order) };
            if (!payload.start_date) payload.start_date = null;
            if (!payload.end_date) payload.end_date = null;

            if (formData.id) {
                await apiService(`/banners/${formData.id}`, 'PUT', payload);
                notification.show('Atualizado!');
            } else {
                await apiService('/banners/admin', 'POST', payload);
                notification.show('Criado!');
            }
            fetchBanners();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        if (!id) return;
        confirmation.show(
            "Excluir este banner permanentemente?", 
            async () => {
                try {
                    await apiService(`/banners/${id}`, 'DELETE');
                    notification.show('Excluído.');
                    fetchBanners();
                } catch (error) {
                    notification.show(`Erro: ${error.message}`, 'error');
                }
            },
            { 
                confirmText: "Excluir", 
                confirmColor: "bg-red-600 hover:bg-red-700",
                requiresAuth: true // Segurança adicionada
            }
        );
    };
    
    // Drag & Drop do Carrossel (Topo)
    const handleDragEndCarousel = async (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = carouselBanners.findIndex((b) => b.id === active.id);
            const newIndex = carouselBanners.findIndex((b) => b.id === over.id);
            
            // Reordena o array
            const newOrder = arrayMove(carouselBanners, oldIndex, newIndex);
            
            // Atualiza o display_order localmente para evitar o flicker do React
            const updatedNewOrder = newOrder.map((banner, index) => ({
                ...banner,
                display_order: index
            }));
            
            // Atualiza UI localmente
            const others = banners.filter(b => b.display_order >= 50);
            setBanners([...updatedNewOrder, ...others]);

            const orderedIds = updatedNewOrder.map(b => b.id);
            try {
                await apiService('/banners/order', 'PUT', { orderedIds });
                notification.show('Ordem salva!');
            } catch (error) {
                notification.show('Erro ao salvar ordem.', 'error');
                fetchBanners();
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editor de Banner">
                         <BannerForm item={editingBanner} section={activeTab} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestão Visual</h1>
                    <p className="text-gray-500">Controle total via Banco de Dados.</p>
                </div>
                
                {/* Botão de Inicialização (Seed) - Visível se não houver destaques */}
                {promoBanners.length === 0 && (
                    <button 
                        onClick={handleInitializeDefaults} 
                        disabled={isGenerating}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-bold shadow-md animate-pulse"
                    >
                        {isGenerating ? <SpinnerIcon/> : <SparklesIcon className="h-5 w-5"/>}
                        Inicializar Banco com Padrões
                    </button>
                )}
            </div>

            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm">
                {['promo', 'cards', 'carousel'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)} 
                        className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 capitalize ${activeTab === tab ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        {tab === 'promo' ? 'Destaques Agendados' : (tab === 'cards' ? 'Cards Inferiores' : 'Carrossel Topo')}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <>
                    {/* --- ABA DESTAQUES (CAMPANHAS) --- */}
                    {activeTab === 'promo' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div>
                                    <h3 className="font-bold text-blue-900">Campanhas de Destaque</h3>
                                    <p className="text-xs text-blue-700">Listagem direta do banco. Apenas 1 banner (o com data válida mais próxima) aparecerá na Home.</p>
                                </div>
                                <button onClick={() => handleOpenModal(null, 'promo')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-bold shadow-sm">
                                    <PlusIcon className="h-4 w-4"/> Criar Campanha
                                </button>
                            </div>

                            {promoBanners.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {promoBanners.map(banner => {
                                        const now = new Date();
                                        const start = banner.start_date ? new Date(banner.start_date) : null;
                                        const end = banner.end_date ? new Date(banner.end_date) : null;
                                        
                                        const isActiveNow = !!banner.is_active && (!start || now >= start) && (!end || now <= end);
                                        const isDefault = !start && !end;
                                        
                                        return (
                                            <div key={banner.id} className={`flex flex-col md:flex-row bg-white border rounded-lg overflow-hidden shadow-sm ${isActiveNow ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200 opacity-80'}`}>
                                                <div className="w-full md:w-48 h-32 bg-gray-100 relative">
                                                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover"/>
                                                    {isActiveNow && <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded font-bold shadow">NO AR</span>}
                                                    {isDefault && <span className="absolute bottom-2 left-2 bg-gray-600 text-white text-[10px] px-2 py-1 rounded font-bold shadow">PADRÃO</span>}
                                                </div>
                                                <div className="p-4 flex-grow flex flex-col justify-center">
                                                    <h4 className="font-bold text-gray-800 text-lg">{banner.title}</h4>
                                                    <p className="text-sm text-gray-500">{banner.subtitle}</p>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                                        {start ? (
                                                            <>
                                                                <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100"><ClockIcon className="h-3 w-3 inline mr-1"/> De: {start.toLocaleDateString()}</span>
                                                                <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100">Até: {end ? end.toLocaleDateString() : 'Indefinido'}</span>
                                                            </>
                                                        ) : (
                                                            <span className="bg-gray-100 px-2 py-1 rounded border">Sem agendamento (Exibido se nenhum outro estiver ativo)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-4 flex md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l bg-gray-50">
                                                    <button onClick={() => handleOpenModal(banner, 'promo')} className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 font-bold text-xs flex items-center justify-center gap-1">
                                                        <EditIcon className="h-4 w-4"/> Editar
                                                    </button>
                                                    <button onClick={() => handleDelete(banner.id)} className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 font-bold text-xs flex items-center justify-center gap-1">
                                                        <TrashIcon className="h-4 w-4"/> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                                    <p className="text-gray-400 mb-4">Nenhuma campanha no banco. Clique em "Inicializar Banco" acima.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- ABA CARDS --- */}
                    {activeTab === 'cards' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <p className="text-sm text-purple-800">Cards fixos inferiores (Posições 60 e 61).</p>
                                {(!card1 || !card2) && <button onClick={() => handleOpenModal(null, 'cards')} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">Adicionar Card</button>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[card1, card2].map((card, idx) => (
                                    card ? (
                                        <StaticBannerCard 
                                            key={card.id} 
                                            banner={card} 
                                            onEdit={() => handleOpenModal(card, 'cards')} 
                                            onDelete={() => handleDelete(card.id)} 
                                            customLabel={idx === 0 ? "ESQUERDA" : "DIREITA"}
                                            customColor="bg-purple-600 text-white"
                                        />
                                    ) : (
                                        <div key={idx} className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                            <p className="text-sm font-bold">Slot {idx === 0 ? 'Esquerdo' : 'Direito'} Vazio</p>
                                            <button onClick={() => handleOpenModal(null, 'cards')} className="text-amber-600 hover:underline text-sm font-bold flex items-center gap-1 mt-2">
                                                <PlusIcon className="h-4 w-4"/> Adicionar Manualmente
                                            </button>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- ABA CARROSSEL --- */}
                    {activeTab === 'carousel' && (
                         <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600">Banners do topo. Arraste para ordenar.</p>
                                <button onClick={() => handleOpenModal(null, 'carousel')} className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">Novo Banner</button>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCarousel}>
                                <SortableContext items={carouselBanners} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {carouselBanners.map((banner) => (
                                            <SortableBannerCard 
                                                key={banner.id} 
                                                banner={banner} 
                                                onEdit={(b) => handleOpenModal(b, 'carousel')} 
                                                onDelete={() => handleDelete(banner.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                            {carouselBanners.length === 0 && <p className="text-center text-gray-400 py-10">Carrossel vazio.</p>}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};




const AdminCollections = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const notification = useNotification();
    const confirmation = useConfirmation();
    const sensors = useSensors(useSensor(PointerSensor));

    const fetchCategories = useCallback(() => {
        setIsLoading(true);
        apiService('/collections/admin')
            .then(data => {
                if (!Array.isArray(data)) {
                    notification.show("Erro: A resposta da API é inválida.", 'error');
                    setCategories([]);
                } else {
                    setCategories(data);
                }
            })
            .catch(err => {
                notification.show(`Erro ao buscar categorias: ${err.message}`, 'error');
                setCategories([]);
            })
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category = null) => {
        const initialData = category ? 
            {...category} : 
            { name: '', filter: '', image: '', is_active: 1, product_type_association: 'none', menu_section: 'Roupas'};
        setEditingCategory(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingCategory && editingCategory.id) {
                await apiService(`/collections/${editingCategory.id}`, 'PUT', formData);
                notification.show('Categoria atualizada com sucesso!');
            } else {
                await apiService('/collections/admin', 'POST', formData);
                notification.show('Categoria criada com sucesso!');
            }
            fetchCategories();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro ao salvar: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.", async () => {
            try {
                await apiService(`/collections/${id}`, 'DELETE');
                notification.show('Categoria deletada com sucesso.');
                fetchCategories();
            } catch (error) {
                notification.show(`Erro ao deletar: ${error.message}`, 'error');
            }
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);
            const newOrder = arrayMove(categories, oldIndex, newIndex);
            
            setCategories(newOrder); // Atualização otimista da UI

            setIsSavingOrder(true);
            const orderedIds = newOrder.map(c => c.id);
            try {
                await apiService('/collections/order', 'PUT', { orderedIds });
                notification.show('Ordem salva com sucesso!');
            } catch (error) {
                notification.show(`Erro ao salvar a ordem: ${error.message}`, 'error');
                fetchCategories(); // Reverte para a ordem do servidor em caso de erro
            } finally {
                setIsSavingOrder(false);
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory && editingCategory.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}>
                        <CollectionCategoryForm item={editingCategory} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Coleções</h1>
                <div className="flex items-center gap-4">
                    {isSavingOrder && <div className="flex items-center gap-2 text-sm text-gray-500"><SpinnerIcon/> Salvando ordem...</div>}
                    <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 flex-shrink-0">
                        <PlusIcon className="h-5 w-5"/> <span>Nova Categoria</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {categories.map(cat => (
                                <SortableCategoryCard key={cat.id} cat={cat} onEdit={handleOpenModal} onDelete={handleDelete} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

const AdminAppIcons = () => {
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


const AdminThemeSettings = () => {
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
// Componente de Animações Sazonais (Alta Performance via CSS Animation e Memoização)
const SeasonalAnimations = memo(({ isEnabled, forcedSeason, isAppReady }) => {
    const [season, setSeason] = useState(null);
    const [isActive, setIsActive] = useState(false); 
    const [isMounted, setIsMounted] = useState(false); 

    useEffect(() => {
        // Se a animação estiver desativada pelo Admin ou se o app ainda estiver na tela de carregamento, não faz nada.
        if (!isEnabled || !isAppReady) {
            return;
        }

        // Se veio forçado pelo config (Admin salvou o tema sazonal)
        if (forcedSeason) {
            setSeason(forcedSeason);
        } else {
            const now = new Date();
            const m = now.getMonth() + 1;
            const d = now.getDate();

            if (m === 12 && d <= 25) setSeason('natal');
            else if (m === 6 && d <= 12) setSeason('namorados');
            else if (m === 5 && d <= 15) setSeason('maes');
            else if (m === 8 && d <= 15) setSeason('pais');
            else if (m === 11 && d >= 15) setSeason('blackfriday');
            else {
                setSeason(null);
                return;
            }
        }

        // Inicia a animação apenas quando o app estiver pronto
        setIsActive(true);
        setIsMounted(true);
        
        const fadeTimer = setTimeout(() => {
            setIsActive(false); // Inicia o fade out suave aos 5 segundos
        }, 5000);
        
        const unmountTimer = setTimeout(() => {
            setIsMounted(false); // Remove totalmente da memória aos 6 segundos
        }, 6000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(unmountTimer);
        };
    }, [isEnabled, forcedSeason, isAppReady]); // A dependência isAppReady garante que só inicie após o load

    const particles = useMemo(() => {
        if (!season) return [];
        
        let count = 0;
        if (season === 'natal') count = 40;
        else if (season === 'namorados' || season === 'maes') count = 25;
        else if (season === 'pais') count = 15;
        else if (season === 'blackfriday') count = 40;

        return [...Array(count)].map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: season === 'blackfriday' ? Math.random() * 100 : -10,
            animDuration: season === 'blackfriday' ? 1 + Math.random() * 2 : 4 + Math.random() * 4,
            delay: season === 'blackfriday' ? Math.random() * 2 : Math.random() * -5,
            size: season === 'blackfriday' ? 0.1 + Math.random() * 0.3 : 0.8 + Math.random() * 1.5,
        }));
    }, [season]);

    if (!isEnabled || !isAppReady || !isMounted || !season || particles.length === 0) return null;

    return (
        <div className={`fixed inset-0 pointer-events-none z-[100] overflow-hidden transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {particles.map((p) => {
                if (season === 'blackfriday') {
                    return (
                        <div
                            key={p.id}
                            className="absolute bg-amber-400 rounded-full"
                            style={{
                                left: `${p.left}vw`,
                                top: `${p.top}vh`,
                                width: `${p.size}rem`,
                                height: `${p.size}rem`,
                                boxShadow: '0 0 12px 4px rgba(251, 191, 36, 0.8)',
                                animation: `sparkle ${p.animDuration}s ease-in-out ${p.delay}s infinite`,
                            }}
                        />
                    );
                }

                let content;
                if (season === 'natal') {
                    content = <div className="rounded-full bg-white" style={{ width: `${p.size * 0.3}rem`, height: `${p.size * 0.3}rem`, boxShadow: '0 0 10px rgba(255,255,255,1)' }} />;
                } else if (season === 'namorados') {
                    content = '❤️';
                } else if (season === 'maes') {
                    content = '🌸';
                } else if (season === 'pais') {
                    content = '👔';
                }

                return (
                    <div
                        key={p.id}
                        className="absolute"
                        style={{
                            left: `${p.left}vw`,
                            top: `${p.top}vh`,
                            fontSize: season !== 'natal' ? `${p.size}rem` : undefined,
                            animation: `fall ${p.animDuration}s linear ${p.delay}s infinite`,
                            opacity: season === 'pais' ? 0.4 : 0.7,
                            filter: season !== 'natal' ? 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))' : 'none'
                        }}
                    >
                        {content}
                    </div>
                );
            })}
        </div>
    );
});

const OrderPaymentPage = ({ orderId, onNavigate }) => {
    const { user } = useAuth();
    const { clearOrderState } = useShop();
    const notification = useNotification();
    
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    
    const [showBrick, setShowBrick] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        apiService(`/orders/my-orders?id=${orderId}&t=${new Date().getTime()}`)
            .then(data => {
                if (data && data.length > 0) {
                    const foundOrder = data[0];
                    if (foundOrder.status !== 'Pendente') {
                        notification.show("Este pedido não está mais pendente de pagamento.", "error");
                        onNavigate(`account/orders/${orderId}`);
                    } else {
                        setOrder(foundOrder);
                    }
                } else {
                    notification.show("Pedido não encontrado.", "error");
                    onNavigate('account/orders');
                }
            })
            .catch(err => {
                console.error(err);
                notification.show("Erro ao carregar pedido.", "error");
            })
            .finally(() => setIsLoading(false));
    }, [orderId, onNavigate, notification]);

    const handlePaymentSubmit = async (mpResponse) => {
        return new Promise(async (resolve, reject) => {
            setIsProcessingPayment(true);
            try {
                const actualPaymentData = JSON.parse(JSON.stringify(mpResponse.formData || mpResponse));

                if (actualPaymentData.payer && order?.shipping_address && order.shipping_method !== 'Retirar na loja') {
                    try {
                        const addr = JSON.parse(order.shipping_address);
                        actualPaymentData.payer.address = {
                            zip_code: addr.cep.replace(/\D/g, ''),
                            street_name: addr.logradouro,
                            street_number: String(addr.numero),
                            neighborhood: addr.bairro,
                            city: addr.localidade,
                            federal_unit: addr.uf
                        };
                    } catch(e) {}
                }

                const paymentPayload = {
                    orderId: order.id,
                    paymentData: actualPaymentData 
                };

                await apiService('/process-payment', 'POST', paymentPayload);

                clearOrderState();
                onNavigate(`order-success/${order.id}`);
                resolve();

            } catch (error) {
                notification.show(`Erro ao processar pagamento: ${error.message}`, 'error');
                reject();
            } finally {
                setIsProcessingPayment(false);
            }
        });
    };

    const mpInitialization = useMemo(() => {
        const payer = {
            email: user?.email || '',
            entityType: 'individual'
        };

        if (user?.name) {
            const nameParts = user.name.trim().split(' ');
            payer.firstName = nameParts[0];
            payer.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Cliente';
        }
        
        if (user?.cpf) {
            payer.identification = {
                type: 'CPF',
                number: user.cpf.replace(/\D/g, '')
            };
        }
        
        if (order?.shipping_address && order.shipping_method !== 'Retirar na loja') {
            try {
                const addr = JSON.parse(order.shipping_address);
                if (addr && addr.cep && addr.logradouro) {
                    const rawNumero = String(addr.numero || '');
                    const safeNumero = rawNumero.replace(/\D/g, '') || '1';
                    
                    payer.address = {
                        zipCode: addr.cep.replace(/\D/g, ''),
                        streetName: addr.logradouro || 'Rua',
                        streetNumber: safeNumero,
                        neighborhood: addr.bairro || 'Bairro',
                        city: addr.localidade || 'Cidade',
                        federalUnit: addr.uf || 'PB'
                    };
                }
            } catch (e) {}
        }

        return {
            amount: Number(order?.total || 0),
            payer: payer
        };
    }, [order?.total, order?.shipping_address, order?.shipping_method, user]);

    const mpCustomization = useMemo(() => {
        return {
            paymentMethods: {
                ticket: "all",
                bankTransfer: "all",
                creditCard: "all",
                debitCard: "all",
            },
            visual: {
                texts: {
                    formSubmit: 'Confirmar Pagamento',
                },
                style: {
                    theme: 'dark',
                    customVariables: {
                        baseColor: '#fbbf24', 
                        baseColorFirstVariant: '#f59e0b', 
                        baseColorSecondVariant: '#d97706',
                        errorColor: '#ef4444', 
                    }
                }
            }
        };
    }, []);

    useEffect(() => {
        if (!order) return;
        setShowBrick(false);
        const timer = setTimeout(() => {
            setShowBrick(true);
        }, 500);
        return () => clearTimeout(timer);
    }, [order]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <SpinnerIcon className="h-12 w-12 text-amber-500 animate-spin" />
                <p className="text-amber-400 font-bold tracking-widest uppercase text-sm animate-pulse">Preparando Pagamento Seguro</p>
            </div>
        );
    }

    if (!order) return null;

    const subtotal = (Number(order.total) || 0) - (Number(order.shipping_cost) || 0) + (Number(order.discount_amount) || 0);

    return (
        <div className="bg-black text-white min-h-screen pt-8 pb-24 md:py-12 relative overflow-hidden">
            {/* Efeitos de fundo premium */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

            <AnimatePresence>
                {isProcessingPayment && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
                            <SpinnerIcon className="h-16 w-16 text-amber-400 mb-6 animate-spin" />
                            <h3 className="text-2xl font-extrabold text-white mb-2">Processando</h3>
                            <p className="text-sm font-medium text-gray-300">Validando com sua operadora. Por favor, aguarde...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4 max-w-5xl relative z-10">
                <button onClick={() => onNavigate(`account/orders/${order.id}`)} className="text-sm text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 mb-8 w-fit bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-800">
                    <ArrowUturnLeftIcon className="h-4 w-4"/> Voltar para Detalhes do Pedido
                </button>

                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-3">Finalizar Pagamento</h1>
                    <p className="text-amber-400 font-medium">Pedido #{order.id}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    
                    {/* Lado Direito no Desktop / Cima no Mobile: Resumo Fixo Premium */}
                    <div className="lg:col-span-5 lg:sticky lg:top-24 order-1 lg:order-2">
                        <div className="relative rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-900/90" />
                                <div className="absolute inset-0 backdrop-blur-xl" />
                            </div>
                            <div className="relative p-6 sm:p-8 isolate">
                            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
                                <PackageIcon className="h-6 w-6 text-amber-500" />
                                Resumo da Compra
                            </h2>
                            
                            <div className="space-y-4 mb-6 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                                {(order.items || []).map(item => (
                                    <div key={item.id} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-gray-800/50">
                                        <div className="w-14 h-14 bg-white rounded-lg p-1 flex-shrink-0">
                                            <img src={getFirstImage(item.images)} alt={item.name} className="w-full h-full object-contain [image-rendering:-webkit-optimize-contrast]" decoding="sync" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{item.quantity}x {item.name}</p>
                                            {item.variation && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {JSON.parse(item.variation_details || '{}').color} / {JSON.parse(item.variation_details || '{}').size}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-amber-400">R$ {Number(item.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-800">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Subtotal</span>
                                    <span className="text-gray-300">R$ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Frete ({order.shipping_method})</span>
                                    <span className="text-gray-300">R$ {Number(order.shipping_cost).toFixed(2)}</span>
                                </div>
                                {Number(order.discount_amount) > 0 && (
                                    <div className="flex justify-between text-sm text-green-400">
                                        <span>Desconto</span>
                                        <span>- R$ {Number(order.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-800">
                                    <span className="text-lg font-medium text-white">Total a Pagar</span>
                                    <span className="text-3xl font-black text-amber-500 tracking-tight">R$ {Number(order.total).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="mt-8 bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 flex items-start gap-3">
                                <ShieldCheckIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-200 leading-relaxed">
                                    Transação criptografada ponta a ponta. Seus dados financeiros não são armazenados em nossos servidores.
                                </p>
                            </div>
                            </div>
                        </div>
                    </div>

                    {/* Lado Esquerdo no Desktop / Baixo no Mobile: Formulário do Mercado Pago */}
                    <div className="lg:col-span-7 order-2 lg:order-1">
                        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-2 sm:p-4 shadow-2xl mp-custom-styles">
                            <style>{`
                                @media (min-width: 1024px) {
                                    .mp-custom-styles .mp-formAction,
                                    .mp-custom-styles [class*="formAction"] {
                                        display: flex !important;
                                        justify-content: center !important;
                                        width: 100% !important;
                                    }

                                    .mp-custom-styles button[type="submit"],
                                    .mp-custom-styles [data-testid="submit-button"],
                                    .mp-custom-styles .mp-button {
                                        width: 100% !important;
                                        max-width: 350px !important;
                                        margin-left: auto !important;
                                        margin-right: auto !important;
                                        border-radius: 8px !important;
                                    }
                                }
                            `}</style>
                            <div className="mb-4 p-3.5 bg-blue-900/30 border border-blue-800/50 rounded-xl flex items-start gap-3">
                                <ExclamationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-200 leading-relaxed">
                                    <strong className="text-blue-300 block mb-1">Dica sobre o pagamento via Pix:</strong> 
                                    O código Copia e Cola e o QR Code serão gerados <strong>aqui mesmo na tela</strong> no próximo passo, logo após você confirmar. O e-mail solicitado abaixo serve apenas para enviarmos o seu comprovante de pagamento.
                                </div>
                            </div>
                            
                            {showBrick ? (
                                <MercadoPagoPayment
                                    key={`mp-brick-order-${order.id}-${order.total}`}
                                    initialization={mpInitialization}
                                    customization={mpCustomization}
                                    onSubmit={handlePaymentSubmit}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 px-4 gap-3 bg-gray-800 rounded-xl border border-gray-700">
                                    <SpinnerIcon className="h-8 w-8 text-amber-500 animate-spin" />
                                    <p className="text-xs font-bold text-gray-400 text-center">Preparando ambiente seguro de pagamento...</p>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

function AppContent({ deferredPrompt }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || 'home');
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  
  const [isStandalone, setIsStandalone] = useState(false);

  const defaultThemeFallback = {
      primary: '#fbbf24', primaryHover: '#f59e0b', bg: '#000000', surface: '#111827', surfaceHover: '#1f2937', text: '#ffffff', textMuted: '#9ca3af', animationsEnabled: true, activeSeason: null
  };

  const seasonalThemes = {
      natal: { primary: '#ef4444', primaryHover: '#dc2626', bg: '#000000', surface: '#052e16', surfaceHover: '#064e3b', text: '#ffffff', textMuted: '#a7f3d0' },
      namorados: { primary: '#f43f5e', primaryHover: '#e11d48', bg: '#000000', surface: '#2e1065', surfaceHover: '#4c1d95', text: '#ffffff', textMuted: '#e2e8f0' }, 
      maes: { primary: '#ec4899', primaryHover: '#db2777', bg: '#000000', surface: '#4a044e', surfaceHover: '#701a75', text: '#ffffff', textMuted: '#fbcfe8' }, 
      pais: { primary: '#3b82f6', primaryHover: '#2563eb', bg: '#000000', surface: '#0f172a', surfaceHover: '#1e293b', text: '#ffffff', textMuted: '#94a3b8' },
      blackfriday: { primary: '#a855f7', primaryHover: '#9333ea', bg: '#000000', surface: '#18181b', surfaceHover: '#27272a', text: '#ffffff', textMuted: '#a1a1aa' }
  };

  const getSeasonalTheme = useCallback(() => {
      const now = new Date();
      const m = now.getMonth() + 1; 
      const d = now.getDate();

      if (m === 12 && d <= 25) return seasonalThemes.natal;
      if (m === 6 && d <= 12) return seasonalThemes.namorados;
      if (m === 5 && d <= 15) return seasonalThemes.maes;
      if (m === 8 && d <= 15) return seasonalThemes.pais;
      if (m === 11 && d >= 15) return seasonalThemes.blackfriday;

      return null;
  }, []);

  const [appThemeConfig, setAppThemeConfig] = useState(() => {
      try {
          const cached = localStorage.getItem('lovecestas_theme_config');
          if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.animationsEnabled === undefined) parsed.animationsEnabled = true;
              if (parsed.autoSeasonal === undefined) parsed.autoSeasonal = false;
              return parsed;
          }
      } catch(e) {}
      return { colors: defaultThemeFallback, autoSeasonal: false, animationsEnabled: true, activeSeason: null };
  });
  
  const [previewSeason, setPreviewSeason] = useState(null);

  const [appLogo, setAppLogo] = useState(() => {
      return localStorage.getItem('lovecestas_app_logo') || 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png';
  });
  
  const [appNameConfig, setAppNameConfig] = useState(() => {
      try {
          const cached = localStorage.getItem('lovecestas_app_name');
          if (cached) return JSON.parse(cached);
      } catch(e) {}
      return { short_name: 'Love Cestas', name: 'Love Cestas e Perfumes', logo_text: 'LovecestasePerfumes' };
  });

  const activeThemeColors = useMemo(() => {
      if (appThemeConfig.autoSeasonal) {
          const seasonColors = getSeasonalTheme();
          if (seasonColors) return seasonColors;
      }
      return appThemeConfig.colors || defaultThemeFallback;
  }, [appThemeConfig, getSeasonalTheme]);

  React.useLayoutEffect(() => {
      const t = activeThemeColors;
      const isAdmin = currentPath.startsWith('admin');
      
      const styleId = 'dynamic-theme-override';
      let styleElement = document.getElementById(styleId);

      if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
      }

      if (isAdmin) {
          styleElement.innerHTML = '';
          return;
      }

      styleElement.innerHTML = `
          :root {
              --theme-primary: ${t.primary};
              --theme-primary-hover: ${t.primaryHover};
              --theme-bg: ${t.bg};
              --theme-surface: ${t.surface};
              --theme-surface-hover: ${t.surfaceHover};
              --theme-text: ${t.text};
              --theme-text-muted: ${t.textMuted};
          }

          .bg-amber-400, .bg-amber-500 { background-color: var(--theme-primary) !important; color: var(--theme-bg) !important; }
          .hover\\:bg-amber-300:hover, .hover\\:bg-amber-400:hover { background-color: var(--theme-primary-hover) !important; color: var(--theme-bg) !important; }
          .text-amber-400, .text-amber-500 { color: var(--theme-primary) !important; }
          .hover\\:text-amber-300:hover, .hover\\:text-amber-400:hover { color: var(--theme-primary-hover) !important; }
          .border-amber-400, .border-amber-500 { border-color: var(--theme-primary) !important; }
          .ring-amber-400 { --tw-ring-color: var(--theme-primary) !important; }

          .bg-black { background-color: var(--theme-bg) !important; }
          .bg-gray-900 { background-color: var(--theme-surface) !important; }
          .bg-gray-800 { background-color: var(--theme-surface-hover) !important; }
          
          .bg-black\\/80 { background-color: color-mix(in srgb, var(--theme-bg) 80%, transparent) !important; }
          .bg-black\\/70 { background-color: color-mix(in srgb, var(--theme-bg) 70%, transparent) !important; }
          .bg-black\\/60 { background-color: color-mix(in srgb, var(--theme-bg) 60%, transparent) !important; }
          .bg-black\\/40 { background-color: color-mix(in srgb, var(--theme-bg) 40%, transparent) !important; }
          .bg-black\\/30 { background-color: color-mix(in srgb, var(--theme-bg) 30%, transparent) !important; }
          
          .bg-gray-900\\/95 { background-color: color-mix(in srgb, var(--theme-surface) 95%, transparent) !important; }
          .bg-gray-900\\/80 { background-color: color-mix(in srgb, var(--theme-surface) 80%, transparent) !important; }
          .bg-gray-900\\/50 { background-color: color-mix(in srgb, var(--theme-surface) 50%, transparent) !important; }
          
          .bg-gray-800\\/50 { background-color: color-mix(in srgb, var(--theme-surface-hover) 50%, transparent) !important; }

          .border-gray-800, .border-gray-700 { border-color: var(--theme-surface-hover) !important; }
          
          .text-white { color: var(--theme-text) !important; }
          .text-gray-200 { color: color-mix(in srgb, var(--theme-text) 90%, var(--theme-bg)) !important; }
          .text-gray-300 { color: color-mix(in srgb, var(--theme-text) 80%, var(--theme-bg)) !important; }
          .text-gray-400 { color: var(--theme-text-muted) !important; }
          .text-gray-500 { color: color-mix(in srgb, var(--theme-text-muted) 80%, var(--theme-bg)) !important; }
      `;

      return () => {
          if (styleElement) styleElement.innerHTML = '';
      };
  }, [activeThemeColors, currentPath]);

  useEffect(() => {
      if (appNameConfig && appNameConfig.name) {
          document.title = appNameConfig.name;
      } else {
          document.title = "Love Cestas e Perfumes";
      }
  }, [appNameConfig]);

  useEffect(() => {
      const handleNameUpdate = (event) => {
          if (event.detail) {
              setAppNameConfig(event.detail);
              localStorage.setItem('lovecestas_app_name', JSON.stringify(event.detail));
          }
      };

      const handleThemeUpdate = (event) => {
          if (event.detail) {
              setAppThemeConfig(event.detail);
              setPreviewSeason(event.detail.previewSeason || event.detail.activeSeason || null); 
              localStorage.setItem('lovecestas_theme_config', JSON.stringify(event.detail));
          }
      };

      window.addEventListener('app-name-updated', handleNameUpdate);
      window.addEventListener('app-theme-updated', handleThemeUpdate);
      
      return () => {
          window.removeEventListener('app-name-updated', handleNameUpdate);
          window.removeEventListener('app-theme-updated', handleThemeUpdate);
      };
  }, []);

  useEffect(() => {
      apiService(`/settings/theme?v=${new Date().getTime()}`)
          .then(data => { 
              if (data) {
                  const isAuto = data.autoSeasonal === true || data.autoSeasonal === 'true' || data.autoSeasonal === 1;
                  const animEnabled = data.animationsEnabled !== false;
                  const loadedConfig = data.colors ? { ...data, autoSeasonal: isAuto, animationsEnabled: animEnabled, activeSeason: data.activeSeason } : { colors: data.primary ? data : defaultThemeFallback, autoSeasonal: isAuto, animationsEnabled: animEnabled, activeSeason: null };
                  setAppThemeConfig(loadedConfig); 
                  localStorage.setItem('lovecestas_theme_config', JSON.stringify(loadedConfig));
              }
          })
          .catch(err => {
              console.log("Usando tema local estático fallback.");
          });

      apiService(`/settings/app-icons?v=${new Date().getTime()}`)
          .then(data => {
              if (data && data.favicon && data.favicon.current) {
                  const faviconLink = document.querySelector("link[rel~='icon']");
                  if (faviconLink) faviconLink.href = data.favicon.current;
                  localStorage.setItem('lovecestas_app_favicon', data.favicon.current);
              }
              if (data && data.pwa_icon && data.pwa_icon.current) {
                  setAppLogo(data.pwa_icon.current);
                  localStorage.setItem('lovecestas_app_logo', data.pwa_icon.current);
              }
          })
          .catch(err => console.log("Ícones mantidos como original."));

      apiService(`/settings/app-name?v=${new Date().getTime()}`)
          .then(data => {
              if (data && data.name) {
                  setAppNameConfig(data);
                  localStorage.setItem('lovecestas_app_name', JSON.stringify(data));
              }
          })
          .catch(err => console.log("Nome mantido como original."));
  }, []);

  useEffect(() => {
    const checkStatus = () => {
        apiService('/settings/maintenance-status')
            .then(data => {
                const isNowInMaintenance = data.maintenanceMode === 'on';
                setIsInMaintenance(prevStatus => {
                    if (prevStatus !== isNowInMaintenance) {
                        return isNowInMaintenance;
                    }
                    return prevStatus;
                });
            })
            .catch(err => {
                console.error("Falha ao verificar manutenção.", err);
                setIsInMaintenance(false);
            })
            .finally(() => {
                if (isStatusLoading) {
                    setIsStatusLoading(false);
                }
            });
    };

    checkStatus(); 
    const intervalId = setInterval(checkStatus, 30000); 
    return () => clearInterval(intervalId); 
  }, [isStatusLoading]); 

  useEffect(() => {
    const registerPush = async () => {
        if (!isAuthenticated || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const publicVapidKey = "BGDEC_rvB5lgb2pzKg8bZMwAfOwohu0sf_777oDMYHV1dTQzV1Q4UgU2eFXj_2IVoFlKvN3YkrETqNJVSje0t4g";
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });
            await apiService('/notifications/subscribe', 'POST', subscription);
        } catch (error) {
            console.error('Erro ao registrar push:', error);
        }
    };
    registerPush();
  }, [isAuthenticated]); 
  
  useEffect(() => {
      const checkStandalone = () => {
          setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
      };
      checkStandalone();
      
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      const handleChange = (e) => setIsStandalone(e.matches);
      
      if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
      }
  }, []);

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);
  
  useEffect(() => {
    const handleReturn = () => {
        const hash = window.location.hash;
        
        const hashParts = hash.split('?');
        if (hashParts.length > 1) {
            const params = new URLSearchParams(hashParts[1]);
            const externalReference = params.get('external_reference');
            
            if (externalReference && !hash.includes('order-success')) {
                navigate(`order-success/${externalReference}?${hashParts[1]}`);
                return;
            }
        }

        const pendingOrderId = localStorage.getItem('pendingOrderId');
        if (pendingOrderId && !hash.includes('order-success')) {
            navigate(`order-success/${pendingOrderId}`);
        }
    };

    handleReturn();
    window.addEventListener('focus', handleReturn);
    window.addEventListener('visibilitychange', handleReturn);
    
    return () => {
        window.removeEventListener('focus', handleReturn);
        window.removeEventListener('visibilitychange', handleReturn);
    };
  }, [navigate]); 
  
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
  
  const safeName = appNameConfig?.name || 'Love Cestas e Perfumes';
  const safeShortName = appNameConfig?.short_name || 'Love Cestas';
  const safeLogoText = appNameConfig?.logo_text || (safeName ? String(safeName).replace(/\s/g, '') : 'LoveCestas');

  const isAppReady = !isLoading && !isStatusLoading;

  if (!isAppReady) {
      return (
        <div className="h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: activeThemeColors.bg }}>
            <motion.div 
                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }} 
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-28 h-28 relative"
            >
                <div className="absolute inset-0 blur-2xl opacity-20 rounded-full animate-pulse" style={{ backgroundColor: activeThemeColors.primary }}></div>
                <img src={appLogo} alt={safeName} className="w-full h-full object-contain relative z-10" />
            </motion.div>
            <div className="flex flex-col items-center gap-3" style={{ color: activeThemeColors.primary }}>
                <SpinnerIcon className="h-8 w-8 animate-spin" />
                <p className="opacity-80 font-bold tracking-[0.2em] text-xs uppercase animate-pulse">Preparando a loja...</p>
            </div>
        </div>
      );
  }

  const isAdminLoggedIn = isAuthenticated && user.role === 'admin';
  const isAdminDomain = window.location.hostname.includes('vercel.app');

  if (isInMaintenance && !isAdminLoggedIn && !isAdminDomain) {
      return <MaintenancePage />;
  }

 const renderPage = () => {
    const [path, queryString] = currentPath.split('?');
    const searchParams = new URLSearchParams(queryString);
    const initialSearch = searchParams.get('search') || '';
    const initialCategory = searchParams.get('category') || '';
    const initialBrand = searchParams.get('brand') || '';
    const initialIsPromo = searchParams.get('promo') === 'true';
    
    const pathParts = path.split('/');
    const mainPage = pathParts[0];
    const pageId = pathParts[1];

    if (mainPage === 'admin') {
        if (!isAuthenticated || user.role !== 'admin') {
             return <LoginPage onNavigate={navigate} />;
        }
        
        const adminSubPage = pageId || 'dashboard';
        const adminPages = {
            'dashboard': <AdminDashboard onNavigate={navigate} />, 
            'banners': <AdminBanners />,
            'products': <AdminProducts onNavigate={navigate} />,
            'orders': <AdminOrders appName={safeName} />,
            'refunds': <AdminRefunds onNavigate={navigate} />,
            'collections': <AdminCollections />,
            'users': <AdminUsers />,
            'coupons': <AdminCoupons />,
            'reports': <AdminReports />,
            'logs': <AdminLogsPage />,
            'newsletter': <AdminNewsletter appName={safeName} />, 
            'shipping': <AdminShippingSettings />, 
            'app-icons': <AdminAppIcons />,
            'theme': <AdminThemeSettings />,
        };

        return (
            <AdminLayout activePage={adminSubPage} onNavigate={navigate}>
                {adminPages[adminSubPage] || <AdminDashboard onNavigate={navigate} />}
            </AdminLayout>
        );
    }

    if ((mainPage === 'account' || mainPage === 'wishlist' || mainPage === 'checkout' || mainPage === 'order-payment') && !isAuthenticated) {
        return <LoginPage onNavigate={navigate} redirectPath={currentPath} />;
    }
    
    if (mainPage === 'product' && pageId) {
        return <ProductDetailPage productId={parseInt(pageId)} onNavigate={navigate} />;
    }

    if (mainPage === 'order-success' && pageId) {
        return <OrderSuccessPage orderId={pageId} onNavigate={navigate} appName={safeName} />;
    }

    // --- NOVA ROTA DE PAGAMENTO ---
    if (mainPage === 'order-payment' && pageId) {
        return <OrderPaymentPage orderId={pageId} onNavigate={navigate} />;
    }
    
    if (mainPage === 'account') {
        return <MyAccountPage onNavigate={navigate} path={pathParts.slice(1).join('/')} />;
    }

   const pages = {
        'home': <HomePage onNavigate={navigate} />,
        'products': <ProductsPage onNavigate={navigate} initialSearch={initialSearch} initialCategory={initialCategory} initialBrand={initialBrand} initialIsPromo={initialIsPromo} />,
        'categories': <CategoriesPage onNavigate={navigate} />, 
        'login': <LoginPage onNavigate={navigate} />,
        'register': <RegisterPage onNavigate={navigate} />,
        'cart': <CartPage onNavigate={navigate} />,
        'checkout': <CheckoutPage onNavigate={navigate} />,
        'wishlist': <WishlistPage onNavigate={navigate} />,
        'ajuda': <AjudaPage onNavigate={navigate} />,
        'about': <AboutPage appName={safeName} />,
        'privacy': <PrivacyPolicyPage appName={safeName} appLogoText={safeLogoText} />,
        'terms': <TermsOfServicePage appName={safeName} appLogoText={safeLogoText} />,
        'forgot-password': <ForgotPasswordPage onNavigate={navigate} />,
    };
    return pages[mainPage] || <HomePage onNavigate={navigate} />;
  };

  const showHeaderFooter = !currentPath.startsWith('admin');
  const effectiveForcedSeason = previewSeason || appThemeConfig.activeSeason;
  const shouldRunAnimations = appThemeConfig.animationsEnabled !== false && 
                              (appThemeConfig.autoSeasonal || effectiveForcedSeason);
  const showFooter = showHeaderFooter && !currentPath.startsWith('order-success') && !isStandalone;

  return (
    // CORREÇÃO: min-h-screen DE VOLTA, garantindo que o layout empurre o rodapé para o fim da tela!
    <div className="bg-black min-h-screen flex flex-col transition-colors duration-500 relative">
      
      {!currentPath.startsWith('admin') && (
          <SeasonalAnimations 
            isEnabled={shouldRunAnimations} 
            forcedSeason={effectiveForcedSeason} 
            isAppReady={isAppReady}
          />
      )}
      
      {showHeaderFooter && (
          <>
              <Header 
                  onNavigate={navigate} 
                  appName={safeName} 
                  appShortName={safeShortName} 
                  appLogoText={safeLogoText} 
              />
              <Minicart onNavigate={navigate} />
          </>
      )}

      <main className="flex-grow">{renderPage()}</main>
      
      {showFooter && (
        <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800 transition-colors duration-500 z-10 relative">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-amber-400">{safeName}</h3>
                        <p className="text-sm text-gray-400">
                            Elegância que veste e perfuma. Descubra fragrâncias e peças que definem seu estilo e marcam momentos.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Institucional</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#about" onClick={(e) => { e.preventDefault(); navigate('about'); }} className="hover:text-amber-400 transition-colors">Sobre Nós</a></li>
                            <li><a href="#privacy" onClick={(e) => { e.preventDefault(); navigate('privacy'); }} className="hover:text-amber-400 transition-colors">Política de Privacidade</a></li>
                            <li><a href="#terms" onClick={(e) => { e.preventDefault(); navigate('terms'); }} className="hover:text-amber-400 transition-colors">Termos de Serviço</a></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Atendimento</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#ajuda" onClick={(e) => { e.preventDefault(); navigate('ajuda'); }} className="hover:text-amber-400 transition-colors">Central de Ajuda</a></li>
                            <li>
                                <div className="flex justify-center md:justify-start items-center gap-4 mt-2">
                                    <a href="https://wa.me/5583987379573" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors"><WhatsappIcon className="h-6 w-6"/></a>
                                    <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors"><InstagramIcon className="h-6 w-6"/></a>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Segurança e Qualidade</h3>
                        <div className="flex flex-col gap-3 items-center md:items-start text-sm text-gray-400">
                             <div className="flex items-center gap-2">
                                <ShieldCheckIcon className="h-5 w-5 text-green-500"/>
                                <span>Compra 100% Segura</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <CheckBadgeIcon className="h-5 w-5 text-blue-500"/>
                                <span>Produtos Originais</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <TruckIcon className="h-5 w-5 text-amber-500"/>
                                <span>Entrega Garantida</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-black py-4 border-t border-gray-800 transition-colors duration-500 pb-20 md:pb-4">
                <div className="container mx-auto px-4 flex items-center justify-center">
                    <p className="text-center text-sm text-gray-500">© {new Date().getFullYear()} {safeName}. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
      )}
      
      {deferredPrompt && !currentPath.startsWith('admin') && <InstallPWAButton deferredPrompt={deferredPrompt} />}
    </div>
  );
}
export default function App() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });
        
        if ('serviceWorker' in navigator) {
            const registerSW = () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('SW registrado com sucesso:', registration))
                    .catch(error => console.log('Falha no SW:', error));
            };

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                registerSW();
            } else {
                window.addEventListener('load', registerSW);
            }
        }

        // Scripts externos (Chart, Excel, PDF, e WEBAUTHN)
        const loadScript = (src, id, callback) => {
            if (document.getElementById(id)) { if (callback) callback(); return; }
            const script = document.createElement('script');
            script.src = src; script.id = id; script.async = true;
            script.onload = () => { if (callback) callback(); };
            document.body.appendChild(script);
        };
        
        loadScript('https://unpkg.com/@simplewebauthn/browser/dist/bundle/index.umd.min.js', 'webauthn-browser-script');
        loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'chartjs-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', 'jspdf-autotable-script');
        });
        
        // O Script do Mercado Pago foi removido daqui, pois o @mercadopago/sdk-react 
        // já lida com a injeção do script automaticamente, evitando duplicação.
    }, []);

    return (
        <AuthProvider>
            <NotificationProvider>
                <ConfirmationProvider>
                    <ShopProvider>
                        <AppContent deferredPrompt={deferredPrompt} />
                    </ShopProvider>
                </ConfirmationProvider>
            </NotificationProvider>
        </AuthProvider>
    );
}