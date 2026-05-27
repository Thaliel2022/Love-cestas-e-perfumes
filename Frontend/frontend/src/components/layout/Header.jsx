import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import { Modal } from '../ui/Modal';
import { getFirstImage } from '../../utils/cloudinary';
import { maskCEP } from '../../utils/validation';
import {
    BarsGripIcon, CartIcon, ChevronDownIcon, ClockIcon, CloseIcon, HeartIcon,
    HomeIcon, MapPinIcon, MenuIcon, PackageIcon, SaleIcon, SearchIcon, SpinnerIcon,
    UserIcon, XMarkIcon
} from '../icons';

export const Header = memo(({ onNavigate, appName = "Love Cestas e Perfumes", appShortName = "Love Cestas", appLogoText = "LovecestasePerfumes" }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { cart, wishlist, addresses, shippingLocation, setShippingLocation, fetchAddresses, orderNotificationCount, setIsMinicartOpen } = useShop(); 
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [mobileAccordion, setMobileAccordion] = useState(null);
    const [dynamicMenuItems, setDynamicMenuItems] = useState([]);
    const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || 'home');

    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);

    const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
    const lastScrollY = useRef(0);
    const isScrollingDown = useRef(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('lovecestas_recent_searches');
            if (saved) setRecentSearches(JSON.parse(saved));
        } catch (e) {}
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
             setCurrentPath(window.location.hash.slice(1) || 'home');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
     }, []);

    useEffect(() => {
        const isIOS = () => {
            return [
                'iPad Simulator',
                'iPhone Simulator',
                'iPod Simulator',
                'iPad',
                'iPhone',
                'iPod'
            ].includes(navigator.platform)
            || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
        }

        const controlNavbar = () => {
            if (!isIOS()) {
                 setIsBottomNavVisible(true);
                 isScrollingDown.current = false;
                 lastScrollY.current = window.scrollY;
                 return;
            }

            const currentScrollY = window.scrollY;
            const threshold = 5;

            if (window.innerWidth < 768) {
                if (currentScrollY > lastScrollY.current + threshold && !isScrollingDown.current) {
                    setIsBottomNavVisible(false);
                    isScrollingDown.current = true;
                } else if (currentScrollY < lastScrollY.current - threshold && isScrollingDown.current) {
                    setIsBottomNavVisible(true);
                    isScrollingDown.current = false;
                }
            } else {
                setIsBottomNavVisible(true);
                isScrollingDown.current = false;
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', controlNavbar);
        return () => {
            window.removeEventListener('scroll', controlNavbar);
        };
    }, []);

    const fetchAndBuildMenu = useCallback(() => {
        apiService('/collections')
            .then(data => {
                const groupedMenu = data.reduce((acc, category) => {
                    const section = category.menu_section;
                    if (!acc[section]) {
                        acc[section] = [];
                    }
                    acc[section].push({ name: category.name, filter: category.filter });
                    return acc;
                }, {});

                const menuOrder = ['Perfumaria', 'Roupas', 'Conjuntos', 'Moda Íntima', 'Calçados', 'Acessórios'];
                const finalMenuStructure = menuOrder
                    .filter(sectionName => groupedMenu[sectionName])
                    .map(sectionName => ({
                        name: sectionName,
                        sub: groupedMenu[sectionName]
                    }));
                setDynamicMenuItems(finalMenuStructure);
            })
            .catch(err => {
                console.error("Falha ao construir o menu dinâmico:", err);
                setDynamicMenuItems([]);
            });
    }, []);

    useEffect(() => {
        fetchAndBuildMenu();
    }, [fetchAndBuildMenu]);

    useEffect(() => {
        if (isMobileMenuOpen && dynamicMenuItems.length === 0) {
            fetchAndBuildMenu();
        }
    }, [isMobileMenuOpen, dynamicMenuItems, fetchAndBuildMenu]);

    const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const prevTotalCartItems = useRef(totalCartItems);
    const cartAnimationControls = useAnimation();

    useEffect(() => {
        if (totalCartItems > prevTotalCartItems.current) {
            cartAnimationControls.start({
                scale: [1, 1.25, 0.9, 1.1, 1],
                transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }
            });
        }
        prevTotalCartItems.current = totalCartItems;
    }, [totalCartItems, cartAnimationControls]);

    useEffect(() => {
        if (searchTerm.trim().length < 2) {
            setSearchSuggestions([]);
            setIsSearching(false);
            return;
        }
        
        setIsSearching(true);
        const debounceTimer = setTimeout(() => {
            apiService(`/products/search-suggestions?q=${encodeURIComponent(searchTerm)}`)
                .then(data => setSearchSuggestions(data))
                .catch(err => console.error(err))
                .finally(() => setIsSearching(false));
        }, 400); 
        
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const saveRecentSearch = (term) => {
        const cleanTerm = term.trim();
        if (!cleanTerm) return;
        const updatedRecents = [cleanTerm, ...recentSearches.filter(t => t !== cleanTerm)].slice(0, 5);
        setRecentSearches(updatedRecents);
        localStorage.setItem('lovecestas_recent_searches', JSON.stringify(updatedRecents));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            saveRecentSearch(searchTerm);
            onNavigate(`products?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
            setSearchSuggestions([]);
            setIsMobileMenuOpen(false);
            setTimeout(() => setIsSearchFocused(false), 100);
        }
    };

    const handleSuggestionClick = (productId) => {
        if (searchTerm.trim()) saveRecentSearch(searchTerm);
        onNavigate(`product/${productId}`);
        setSearchTerm('');
        setSearchSuggestions([]);
        setIsSearchFocused(false);
        setIsMobileMenuOpen(false);
    };

    const handleRecentSearchClick = (term) => {
        saveRecentSearch(term);
        onNavigate(`products?search=${encodeURIComponent(term)}`);
        setSearchTerm('');
        setIsSearchFocused(false);
        setIsMobileMenuOpen(false);
    };

    const removeRecentSearch = (e, termToRemove) => {
        e.stopPropagation();
        const updatedRecents = recentSearches.filter(t => t !== termToRemove);
        setRecentSearches(updatedRecents);
        localStorage.setItem('lovecestas_recent_searches', JSON.stringify(updatedRecents));
    };

    const highlightText = (text, highlight) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === highlight.toLowerCase() 
                ? <strong key={i} className="text-amber-500">{part}</strong> 
                : part
        );
    };

    const SearchDropdown = () => (
        <AnimatePresence>
            {isSearchFocused && (
                <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: -5, scale: 0.98 }} 
                    transition={{ duration: 0.2 }}
                    className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
                >
                    {searchTerm.length < 2 ? (
                        <div className="p-2">
                            {recentSearches.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <span>Buscas Recentes</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {recentSearches.map((term, index) => (
                                            <li key={index} 
                                                onClick={() => handleRecentSearchClick(term)}
                                                className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
                                            >
                                                <div className="flex items-center gap-3 text-gray-600 group-hover:text-amber-600">
                                                    <ClockIcon className="h-4 w-4 opacity-50" />
                                                    <span className="font-medium text-sm">{term}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => removeRecentSearch(e, term)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                                    <SearchIcon className="h-6 w-6 opacity-20" />
                                    <span>Digite algo para buscar em nosso catálogo.</span>
                                </div>
                            )}
                        </div>
                    ) : isSearching ? (
                        <div className="p-8 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <SpinnerIcon className="h-6 w-6 text-amber-500 animate-spin" />
                            <span className="text-sm font-medium">Buscando produtos...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col max-h-[60vh] md:max-h-96">
                            <div className="overflow-y-auto custom-scrollbar p-1">
                                {searchSuggestions.length > 0 ? (
                                    searchSuggestions.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => handleSuggestionClick(p.id)} 
                                            className="flex items-center p-3 hover:bg-amber-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0 rounded-lg"
                                        > 
                                            <div className="w-14 h-14 flex-shrink-0 bg-gray-50 border border-gray-100 rounded-md p-1 mr-3 flex items-center justify-center overflow-hidden">
                                                <img src={getFirstImage(p.images)} alt={p.name} className="max-w-full max-h-full object-contain" /> 
                                            </div>
                                            <div className="flex-grow min-w-0"> 
                                                <p className="font-bold text-gray-800 text-sm truncate">
                                                    {highlightText(p.name, searchTerm)}
                                                </p> 
                                                {p.is_on_sale && p.sale_price > 0 ? ( 
                                                    <div className="flex items-baseline gap-2 mt-0.5">
                                                        <p className="text-red-600 font-bold text-sm">R$ {Number(p.sale_price).toFixed(2)}</p>
                                                        <p className="text-gray-400 text-xs line-through">R$ {Number(p.price).toFixed(2)}</p>
                                                    </div>
                                                ) : ( 
                                                    <p className="text-gray-600 font-bold text-sm mt-0.5">R$ {Number(p.price).toFixed(2)}</p> 
                                                )} 
                                            </div> 
                                        </div>
                                    ))
                                ) : ( 
                                    <div className="p-8 text-center flex flex-col items-center gap-2">
                                        <div className="bg-gray-100 p-3 rounded-full mb-2">
                                            <SearchIcon className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-700">Nenhum resultado encontrado</p>
                                        <p className="text-xs text-gray-500">Não encontramos produtos para "{searchTerm}".</p>
                                    </div> 
                                )}
                            </div>
                            
                            {searchTerm.trim() && searchSuggestions.length > 0 && ( 
                                <div className="p-2 bg-gray-50 border-t border-gray-100">
                                    <button 
                                        type="button"
                                        onClick={handleSearchSubmit}
                                        className="w-full py-2.5 bg-white border border-gray-200 hover:border-amber-400 hover:text-amber-600 text-gray-700 font-bold rounded-lg shadow-sm transition-all text-sm flex items-center justify-center gap-2"
                                    > 
                                        <SearchIcon className="h-4 w-4"/> Ver todos os resultados
                                    </button> 
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );

    const dropdownVariants = {
        open: { opacity: 1, y: 0, display: 'block', transition: { duration: 0.2 } },
        closed: { opacity: 0, y: -20, transition: { duration: 0.2 }, transitionEnd: { display: 'none' } }
    };

    const mobileMenuVariants = {
        open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
        closed: { x: "-100%", transition: { type: 'spring', stiffness: 300, damping: 30 } },
    };

    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [manualCep, setManualCep] = useState('');
    const [cepError, setCepError] = useState('');

    useEffect(() => {
        if (isAddressModalOpen && isAuthenticated) {
            fetchAddresses();
        }
    }, [isAddressModalOpen, isAuthenticated, fetchAddresses]);

    const handleSelectAddress = (addr) => {
        setShippingLocation({ cep: addr.cep, city: addr.localidade, state: addr.uf, alias: addr.alias });
        setIsAddressModalOpen(false);
    };

    const handleManualCepSubmit = async (e) => {
        e.preventDefault();
        setCepError('');
        const cleanCep = manualCep.replace(/\D/g, '');
        if (cleanCep.length !== 8) { setCepError("CEP inválido."); return; }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) { setCepError("CEP não encontrado."); } else {
                setShippingLocation({ cep: manualCep, city: data.localidade, state: data.uf, alias: `CEP ${manualCep}` });
                setIsAddressModalOpen(false);
                setManualCep('');
            }
        } catch { setCepError("Não foi possível buscar o CEP."); }
    };

    const handleCepInputChange = (e) => {
        setManualCep(maskCEP(e.target.value));
        if (cepError) setCepError('');
    };

    let addressDisplay = 'Selecione um endereço';
    if (shippingLocation && shippingLocation.cep) {
        const cleanCep = shippingLocation.cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            const formattedCep = cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
            const displayCityState = [shippingLocation.city, shippingLocation.state].filter(Boolean).join(' - ');
            let prefix = 'Enviar para';

            if (shippingLocation.alias && !shippingLocation.alias.startsWith('CEP ') && shippingLocation.alias !== 'Localização Atual') {
                prefix = `Enviar para ${shippingLocation.alias} -`;
            } else if (isAuthenticated && user?.name) {
                prefix = `Enviar para ${user.name.split(' ')[0]} -`;
            }

            if (displayCityState) {
                addressDisplay = `${prefix} ${displayCityState} ${formattedCep}`;
            } else {
                 addressDisplay = `${prefix} ${formattedCep}`;
            }
        }
    }

    const BottomNavBar = () => {
        const wishlistCount = wishlist.length;

        const navVariants = {
            visible: { y: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } },
            hidden: { y: "100%", transition: { type: "tween", duration: 0.3, ease: "easeIn" } }
        };

        return (
            <motion.div
                className="fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-gray-800 flex justify-around items-center z-50 md:hidden pb-safe"
                initial={false}
                animate={isBottomNavVisible ? "visible" : "hidden"}
                variants={navVariants}
            >
                <button onClick={() => onNavigate('home')} className={`flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'home' || currentPath === '' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <HomeIcon className="h-6 w-6 mb-1"/>
                    <span className="text-[10px]">Início</span>
                </button>
                
                <button onClick={() => onNavigate('wishlist')} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'wishlist' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <HeartIcon className="h-6 w-6 mb-1"/>
                    <span className="text-[10px]">Lista</span>
                    {wishlistCount > 0 && <span className="absolute top-0 right-[25%] bg-amber-400 text-black text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{wishlistCount}</span>}
                </button>

                {/* CORREÇÃO: No Mobile, clica no carrinho leva para a PÁGINA do Carrinho Completo */}
                <button onClick={() => { setIsMinicartOpen(false); onNavigate('cart'); }} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'cart' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <motion.div animate={cartAnimationControls}>
                        <CartIcon className="h-6 w-6 mb-1"/>
                    </motion.div>
                    <span className="text-[10px]">Carrinho</span>
                    {totalCartItems > 0 && <span className="absolute top-0 right-[25%] bg-amber-400 text-black text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{totalCartItems}</span>}
                </button>
                
                <button onClick={() => isAuthenticated ? onNavigate('account') : onNavigate('login')} className={`flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath.startsWith('account') || currentPath === 'login' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <UserIcon className="h-6 w-6 mb-1"/>
                    <span className="text-[10px]">Conta</span>
                </button>

                <button onClick={() => onNavigate('categories')} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'categories' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <div className="relative">
                        <BarsGripIcon className="h-6 w-6 mb-1"/>
                        {isAuthenticated && orderNotificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-600 rounded-full border-2 border-black animate-pulse"></span>
                        )}
                    </div>
                    <span className="text-[10px]">Menu</span>
                </button>
            </motion.div>
        );
    };

    return (
        <>
        <AnimatePresence>
            {isAddressModalOpen && (
                <Modal isOpen={true} onClose={() => setIsAddressModalOpen(false)} title="Selecionar Endereço de Entrega" size="md">
                    <div className="space-y-4">
                        {isAuthenticated && addresses && addresses.length > 0 && addresses.map(addr => (
                             <div key={addr.id} onClick={() => handleSelectAddress(addr)} className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50">
                                 <p className="font-bold text-gray-800">{addr.alias} {addr.is_default ? <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full ml-2">Padrão</span> : ''}</p>
                                 <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero} - {addr.bairro}</p>
                                 <p className="text-sm text-gray-500">{addr.localidade} - {addr.uf}</p>
                             </div>
                        ))}
                         {isAuthenticated && addresses.length === 0 && (
                            <p className="text-sm text-center text-gray-500 py-4">Nenhum endereço cadastrado...</p>
                         )}
                         {!isAuthenticated && (
                            <p className="text-sm text-center text-gray-500 py-4">Faça login para usar seus endereços...</p>
                         )}
                        <div className="pt-4 border-t">
                            <form onSubmit={handleManualCepSubmit} className="space-y-2">
                                 <label className="block text-sm font-medium text-gray-700">Calcular frete para um CEP</label>
                                 <div className="flex gap-2">
                                    <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="00000-000" className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
                                    <button type="submit" className="bg-gray-800 text-white font-bold px-4 rounded-md hover:bg-black">OK</button>
                                 </div>
                                 {cepError && <p className="text-red-500 text-xs mt-1">{cepError}</p>}
                            </form>
                        </div>
                    </div>
                </Modal>
            )}
        </AnimatePresence>

        <header className="bg-black/80 backdrop-blur-md text-white shadow-lg sticky top-0 z-40">
            <div className="hidden md:block px-4 sm:px-6">
                <div className="flex justify-between items-center py-3">
                    <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="flex items-center gap-2 text-xl font-bold tracking-wide text-amber-400 group">
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-amber-500 group-hover:scale-110 transition-transform">
                                <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 12.75v9h6a2.25 2.25 0 002.25-2.25v-6.75h-8.25z" />
                            </svg>
                        </div>
                        <span>{appLogoText}</span>
                    </a>
                    
                    <div className="hidden lg:block flex-1 max-w-2xl mx-8 relative">
                         <form onSubmit={handleSearchSubmit} className="relative z-20">
                            <div className={`relative flex items-center w-full bg-gray-800/80 hover:bg-gray-800 border ${isSearchFocused ? 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]' : 'border-gray-700'} rounded-full transition-all duration-300`}>
                                <SearchIcon className={`h-5 w-5 ml-4 flex-shrink-0 ${isSearchFocused ? 'text-amber-400' : 'text-gray-400'}`} />
                                <input
                                    type="text" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                                    placeholder={`O que você procura em ${appShortName}?`}
                                    className="w-full bg-transparent text-white px-3 py-2.5 focus:outline-none text-sm placeholder-gray-500"
                                />
                                {searchTerm && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setSearchTerm(''); document.querySelector('input[placeholder*="procura"]').focus(); }}
                                        className="p-2 mr-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                )}
                                {isSearching && <SpinnerIcon className="h-4 w-4 mr-4 text-amber-500 animate-spin absolute right-0" />}
                            </div>
                            <SearchDropdown />
                        </form>
                        {isSearchFocused && <div className="fixed inset-0 z-10" onClick={() => setIsSearchFocused(false)}></div>}
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4 relative z-30">
                        {isAuthenticated && ( 
                            <button onClick={() => onNavigate('account/orders')} className="hidden sm:flex items-center gap-1 hover:text-amber-400 transition px-2 py-1 relative"> 
                                <PackageIcon className="h-6 w-6"/> 
                                {orderNotificationCount > 0 && (
                                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-black transform translate-x-1/2 -translate-y-1/2 animate-bounce">
                                        {orderNotificationCount}
                                    </span>
                                )}
                                <div className="flex flex-col items-start text-xs leading-tight"> <span>Devoluções</span> <span className="font-bold">& Pedidos</span> </div> 
                            </button> 
                        )}
                        <button onClick={() => onNavigate('wishlist')} className="relative flex items-center gap-1 hover:text-amber-400 transition px-2 py-1"> <HeartIcon className="h-6 w-6"/> <span className="hidden sm:inline text-sm font-medium">Lista</span> {wishlist.length > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-black text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{wishlist.length}</span>} </button>
                        
                        {/* Desktop: Abre a gaveta lateral normalmente */}
                        <motion.button animate={cartAnimationControls} onClick={() => setIsMinicartOpen(true)} className="relative flex items-center gap-1 hover:text-amber-400 transition px-2 py-1"> <CartIcon className="h-6 w-6"/> <span className="hidden sm:inline text-sm font-medium">Carrinho</span> {totalCartItems > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-black text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{totalCartItems}</span>} </motion.button>
                        <div className="hidden sm:block">
                            {isAuthenticated ? (
                                <div className="relative group">
                                   <button className="flex items-start gap-1 hover:text-amber-400 transition px-2 py-1 leading-none"> <UserIcon className="h-6 w-6 mt-0.5"/> <div className="flex flex-col items-start text-xs"> <span>Olá, {user.name.split(' ')[0]}</span> <span className="font-bold text-sm">Conta</span> </div> </button>
                                   <div className="absolute top-full right-0 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-20 invisible group-hover:visible border border-gray-800"> <span className="block px-4 py-2 text-sm text-gray-400">Olá, {user.name}</span> <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Minha Conta</a> {user.role === 'admin' && <a href="#admin" onClick={(e) => { e.preventDefault(); onNavigate('admin/dashboard');}} className="block px-4 py-2 text-sm text-amber-400 hover:bg-gray-800">Painel Admin</a>} <a href="#logout" onClick={(e) => {e.preventDefault(); logout(); onNavigate('home');}} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Sair</a> </div>
                                </div>
                            ) : ( <button onClick={() => onNavigate('login')} className="flex items-center gap-1 bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold"> <UserIcon className="h-5 w-5"/> <span className="text-sm">Login</span> </button> )}
                        </div>
                    </div>
                </div>
            </div>

             <div className="block md:hidden px-4 pt-3 relative">
                <div className="flex justify-center items-center mb-3">
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="absolute left-4 top-3 p-2 text-gray-300 hover:text-amber-400 transition-colors"
                        aria-label="Abrir menu"
                    >
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="flex items-center gap-2 text-xl font-bold tracking-wide text-amber-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-amber-500">
                            <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 12.75v9h6a2.25 2.25 0 002.25-2.25v-6.75h-8.25z" />
                        </svg>
                        {appLogoText}
                    </a>
                </div>
                
                <form onSubmit={handleSearchSubmit} className="relative mb-2 z-20">
                    <div className={`relative flex items-center w-full bg-gray-800 border ${isSearchFocused ? 'border-amber-500' : 'border-gray-700'} rounded-lg transition-all duration-300`}>
                        <SearchIcon className={`absolute left-3 h-5 w-5 ${isSearchFocused ? 'text-amber-400' : 'text-gray-400'}`} />
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            onFocus={() => setIsSearchFocused(true)} 
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)} 
                            placeholder={`Pesquisar em ${appShortName}`} 
                            className="w-full bg-transparent text-white pl-10 pr-10 py-2.5 focus:outline-none text-sm placeholder-gray-500" 
                        />
                        {searchTerm ? (
                            <button 
                                type="button" 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 p-1.5 text-gray-400 hover:text-white transition-colors"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        ) : isSearching ? (
                            <SpinnerIcon className="absolute right-3 h-4 w-4 text-amber-500 animate-spin" />
                        ) : null}
                    </div>
                    <SearchDropdown />
                </form>

                {isSearchFocused && <div className="fixed inset-0 z-10" onClick={() => setIsSearchFocused(false)}></div>}

                <button onClick={() => setIsAddressModalOpen(true)} className="w-full flex items-center text-xs text-gray-300 bg-gray-800/50 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700/50 transition-colors text-left"> <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-amber-400"/> <span className="truncate flex-grow">{addressDisplay}</span> <ChevronDownIcon className="h-4 w-4 ml-auto flex-shrink-0"/> </button>
            </div>

            <nav className="hidden md:flex justify-center px-4 sm:px-6 h-12 items-center border-t border-gray-800 relative z-10" onMouseLeave={() => setActiveMenu(null)}>
                <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Início</a>
                <div className="h-full flex items-center" onMouseEnter={() => setActiveMenu('Coleções')}> <button className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Coleções</button> </div>
                <a href="#products?promo=true" onClick={(e) => { e.preventDefault(); onNavigate('products?promo=true'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"> <SaleIcon className="h-4 w-4" /> Promoções </a>
                <a href="#ajuda" onClick={(e) => { e.preventDefault(); onNavigate('ajuda'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Ajuda</a>
                <AnimatePresence>
                    {activeMenu === 'Coleções' && (
                        <motion.div initial="closed" animate="open" exit="closed" variants={dropdownVariants} className="absolute top-full left-0 w-full bg-gray-900/95 backdrop-blur-sm shadow-2xl border-t border-gray-700">
                            <div className="container mx-auto p-8 grid grid-cols-6 gap-8">
                                {dynamicMenuItems.map(cat => ( cat && cat.sub && ( <div key={cat.name}> <h3 className="font-bold text-amber-400 mb-3 text-base">{cat.name}</h3> <ul className="space-y-2"> {cat.sub.map(subCat => ( <li key={subCat.name}><a href="#" onClick={(e) => { e.preventDefault(); onNavigate(`products?category=${subCat.filter}`); setActiveMenu(null); }} className="block text-sm text-white hover:text-amber-300 transition-colors">{subCat.name}</a></li> ))} </ul> </div> ) ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                        <motion.div variants={mobileMenuVariants} initial="closed" animate="open" exit="closed" className="fixed top-0 left-0 h-screen w-4/5 max-w-sm bg-gray-900 z-[60] flex flex-col">
                            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-800"> <h2 className="font-bold text-amber-400">Menu</h2> <button onClick={() => setIsMobileMenuOpen(false)}><CloseIcon className="h-6 w-6 text-white" /></button> </div>
                            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                                {dynamicMenuItems.map((cat, index) => ( cat && cat.sub && ( <div key={cat.name} className="border-b border-gray-800"> <button onClick={() => setMobileAccordion(mobileAccordion === index ? null : index)} className="w-full flex justify-between items-center py-3 text-left font-bold text-white"> <span>{cat.name}</span> <ChevronDownIcon className={`h-5 w-5 transition-transform ${mobileAccordion === index ? 'rotate-180' : ''}`} /> </button> <AnimatePresence> {mobileAccordion === index && ( <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-4 pb-2 space-y-2 overflow-hidden"> {cat.sub.map(subCat => ( <li key={subCat.name}><a href="#" onClick={(e) => { e.preventDefault(); onNavigate(`products?category=${subCat.filter}`); setIsMobileMenuOpen(false); }} className="block text-sm text-gray-300 hover:text-amber-300">{subCat.name}</a></li> ))} </motion.ul> )} </AnimatePresence> </div> ) ))}
                                <div className="border-b border-gray-800"> <a href="#products?promo=true" onClick={(e) => { e.preventDefault(); onNavigate('products?promo=true'); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 py-3 font-bold text-red-400 hover:text-red-300"> <SaleIcon className="h-5 w-5"/> Promoções </a> </div>
                                <div className="border-b border-gray-800"> <a href="#products" onClick={(e) => { e.preventDefault(); onNavigate('products'); setIsMobileMenuOpen(false); }} className="block py-3 font-bold text-white hover:text-amber-400">Ver Tudo</a> </div>
                                <div className="border-b border-gray-800"> <a href="#ajuda" onClick={(e) => { e.preventDefault(); onNavigate('ajuda'); setIsMobileMenuOpen(false); }} className="block py-3 font-bold text-white hover:text-amber-400">Ajuda</a> </div>
                                <div className="pt-4 space-y-3">
                                    {isAuthenticated ? ( 
                                        <> 
                                            <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); setIsMobileMenuOpen(false); }} className="block text-white hover:text-amber-400">Minha Conta</a> 
                                            <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); setIsMobileMenuOpen(false); }} className="flex items-center justify-between text-white hover:text-amber-400">
                                                <span>Devoluções e Pedidos</span>
                                                {orderNotificationCount > 0 && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 animate-pulse">{orderNotificationCount}</span>}
                                            </a> 
                                            {user.role === 'admin' && <a href="#admin" onClick={(e) => { e.preventDefault(); onNavigate('admin/dashboard'); setIsMobileMenuOpen(false);}} className="block text-amber-400 hover:text-amber-300">Painel Admin</a>} 
                                            <button onClick={() => { logout(); onNavigate('home'); setIsMobileMenuOpen(false); }} className="w-full text-left text-white hover:text-amber-400">Sair</button> 
                                        </> 
                                    ) : ( <button onClick={() => { onNavigate('login'); setIsMobileMenuOpen(false); }} className="w-full text-left bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold">Login</button> )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>

        <BottomNavBar />
        </>
    );
});
