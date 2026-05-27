import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../contexts/ShopContext';
import {
    AdminIcon, ArrowUturnLeftIcon, PackageIcon, SaleIcon, SparklesIcon,
    SpinnerIcon, UserIcon
} from '../components/icons';

export const CategoriesPage = ({ onNavigate }) => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const { user, isAuthenticated, logout } = useAuth(); 
    const { orderNotificationCount } = useShop(); 

    const groupedCategories = useMemo(() => {
        const groups = {};
        const sectionOrder = ['Roupas', 'Perfumaria', 'Calçados', 'Moda Íntima', 'Conjuntos', 'Acessórios'];

        categories.forEach(cat => {
            const section = cat.menu_section || 'Outros';
            if (!groups[section]) {
                groups[section] = {
                    title: section,
                    items: [],
                    image: cat.image 
                };
            }
            groups[section].items.push(cat);
        });

        return Object.values(groups).sort((a, b) => {
            const indexA = sectionOrder.indexOf(a.title);
            const indexB = sectionOrder.indexOf(b.title);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [categories]);

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        
        apiService('/collections', 'GET', null, { signal: controller.signal })
            .then(data => {
                if (Array.isArray(data)) {
                    setCategories(data.sort((a, b) => a.display_order - b.display_order));
                }
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Erro ao buscar categorias:", err);
            })
            .finally(() => setIsLoading(false));

        return () => controller.abort();
    }, []);

    // Sub-tela (Nível 2)
    const SubCategoryView = ({ group, onBack }) => (
        <motion.div 
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="fixed inset-0 bg-gray-900 z-[100] overflow-y-auto pb-24"
        >
            {/* Cabeçalho restaurado para o design original (Foto 1) com z-index alto */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 z-20 px-4 py-4 flex items-center shadow-md">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors mr-3">
                    {/* Ícone de Seta Simples idêntico ao da primeira foto */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h2 className="text-lg font-bold text-white tracking-wide">{group.title}</h2>
            </div>

            <div className="p-4">
                <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider px-1 border-l-2 border-amber-500 pl-2">
                    Explorar {group.title}
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                    {group.items.map(item => (
                        <div 
                            key={item.id}
                            onClick={() => onNavigate(`products?category=${item.filter}`)}
                            className="bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-700 cursor-pointer active:scale-95 transition-transform flex flex-col group"
                        >
                            <div className="aspect-square bg-white relative p-2 overflow-hidden">
                                <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy"
                                />
                            </div>
                            <div className="p-3 bg-gray-800 flex-grow flex items-center justify-center text-center border-t border-gray-700">
                                <span className="text-sm font-medium text-gray-200 leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors">
                                    {item.name}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={() => onNavigate(`products?search=${group.title}`)}
                    className="w-full mt-8 py-3.5 bg-gray-800 border border-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-gray-700 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                >
                    Ver todos em {group.title} 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
        </motion.div>
    );

    if (isLoading) {
        return (
            <div className="bg-black min-h-[80vh] flex flex-col items-center justify-center pt-20 pb-32 px-4 gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <SpinnerIcon className="h-12 w-12 text-amber-400 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-wide">Organizando os Departamentos</h2>
                    <p className="text-sm text-gray-500">Preparando nossas coleções exclusivas para você...</p>
                </div>
            </div>
        );
    }

    const QuickShortcuts = () => (
        <div className="bg-gray-900 p-4 rounded-xl mb-6 shadow-lg border border-gray-800 grid grid-cols-2 gap-4">
            {isAuthenticated ? (
                <>
                    <button onClick={() => onNavigate('account/orders')} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex flex-col items-center justify-center text-center hover:bg-gray-700 active:scale-95 transition-all relative">
                        <div className="relative">
                            <PackageIcon className="h-6 w-6 text-amber-400 mb-2"/>
                            {orderNotificationCount > 0 && (
                                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black animate-pulse">
                                    {orderNotificationCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-bold text-white">Meus Pedidos</span>
                    </button>

                    <button onClick={() => onNavigate('account')} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex flex-col items-center justify-center text-center hover:bg-gray-700 active:scale-95 transition-all">
                        <UserIcon className="h-6 w-6 text-amber-400 mb-2"/>
                        <span className="text-sm font-bold text-white">Minha Conta</span>
                    </button>
                    
                    {user?.role === 'admin' && (
                        <button onClick={() => onNavigate('admin/dashboard')} className="col-span-2 bg-gray-800 border border-gray-700 p-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-700 active:scale-95 transition-all shadow-md">
                            <AdminIcon className="h-5 w-5 text-amber-400"/>
                            <span className="text-sm font-bold text-white uppercase tracking-wide">Acessar Painel Admin</span>
                        </button>
                    )}
                </>
            ) : (
                <div className="col-span-2 bg-gray-800 border border-gray-700 p-4 rounded-lg flex flex-col items-center text-center">
                    <p className="text-sm text-gray-400 mb-3">Faça login para ver seus pedidos e conta.</p>
                    <button onClick={() => onNavigate('login')} className="w-full bg-amber-500 text-black font-bold py-2 rounded hover:bg-amber-400 transition-colors">
                        Fazer Login / Criar Conta
                    </button>
                </div>
            )}
             <button onClick={() => onNavigate('ajuda')} className="col-span-2 bg-gray-800 border border-gray-700 p-3 rounded-lg flex items-center justify-between px-4 hover:bg-gray-700 active:scale-95 transition-all">
                <span className="text-sm font-bold text-white flex items-center gap-2"><SparklesIcon className="h-4 w-4 text-amber-400"/> Central de Ajuda e Atendimento</span>
                <ArrowUturnLeftIcon className="h-4 w-4 text-gray-500 rotate-180"/>
            </button>
            
            {isAuthenticated && (
                <button onClick={() => { logout(); onNavigate('home'); }} className="col-span-2 bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-900/30 active:scale-95 transition-all text-red-500 font-bold text-sm">
                    Sair da Conta
                </button>
            )}
        </div>
    );

    return (
        <div className="bg-black min-h-screen pt-2 pb-24 text-white">
            <AnimatePresence>
                {selectedGroup && (
                    <SubCategoryView 
                        group={selectedGroup} 
                        onBack={() => setSelectedGroup(null)} 
                    />
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4">
                <h1 className="text-xl font-bold text-white mb-3 px-1 mt-4">Acesso Rápido</h1>
                <QuickShortcuts />

                <h1 className="text-xl font-bold text-white mb-4 px-1 mt-2 border-l-4 border-amber-500 pl-3">Departamentos</h1>
                
                <div className="grid grid-cols-2 gap-3"> 
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0 }}
                        onClick={() => onNavigate('products?promo=true')}
                        className="col-span-2 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden cursor-pointer active:scale-95 transition-transform flex flex-row items-center justify-between p-4 relative group mb-2"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30 group-hover:bg-red-600/40 transition-colors">
                                <SaleIcon className="h-6 w-6 text-red-500 group-hover:text-red-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white font-bold text-lg uppercase tracking-wide">Promoções</h3>
                                <p className="text-red-400 text-xs font-medium">Ver todos os produtos em oferta</p>
                            </div>
                        </div>
                        <ArrowUturnLeftIcon className="h-5 w-5 text-red-500 rotate-180 relative z-10"/>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    </motion.div>

                    {groupedCategories.map((group, idx) => (
                        <motion.div
                            key={group.title}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => setSelectedGroup(group)}
                            className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden cursor-pointer active:scale-95 transition-transform group"
                        >
                            <div className="aspect-[5/4] bg-white relative p-4 flex items-center justify-center overflow-hidden">
                                <img 
                                    src={group.items[0]?.image || 'https://placehold.co/400x300/eee/ccc?text=Sem+Imagem'} 
                                    alt={group.title} 
                                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                            </div>
                            <div className="p-3 border-t border-gray-800 bg-gray-900">
                                <h3 className="text-white font-bold text-sm leading-tight mb-0.5 group-hover:text-amber-400 transition-colors">
                                    {group.title}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                    {group.items.length} opções
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
