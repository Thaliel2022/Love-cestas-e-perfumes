import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { ProductCard } from '../components/product/ProductCards';

// ===== ATUALIZAÇÃO PROMOÇÕES =====
export const ProductsPage = ({ onNavigate, initialSearch = '', initialCategory = '', initialBrand = '', initialIsPromo = false }) => {
    const [products, setProducts] = useState([]);
    const [filters, setFilters] = useState({ search: initialSearch, brand: initialBrand, category: initialCategory });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [uniqueCategories, setUniqueCategories] = useState([]);
    const [uniqueBrands, setUniqueBrands] = useState([]);
    const productsPerPage = 12;

    // Busca as marcas e categorias disponíveis apenas uma vez ao montar a página
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            apiService('/products/metadata', 'GET', null, { signal: controller.signal }),
            apiService('/collections', 'GET', null, { signal: controller.signal })
        ]).then(([metaData, collectionsData]) => {
            setUniqueBrands(metaData.brands || []);
            const activeCategories = collectionsData.map(cat => cat.filter);
            setUniqueCategories([...new Set(activeCategories)].sort());
        }).catch(err => {
            if (err.name !== 'AbortError') console.error("Erro ao carregar filtros:", err);
        });

        return () => controller.abort();
    }, []);

    // Sincroniza props iniciais vindas da URL com o estado local
    useEffect(() => {
        setFilters({ search: initialSearch, brand: initialBrand, category: initialCategory });
        setCurrentPage(1);
    }, [initialSearch, initialCategory, initialBrand]);

    // Efeito principal: Busca os produtos paginados sempre que um filtro ou página mudar
    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        
        // Constrói a query string
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: productsPerPage,
            promo: initialIsPromo
        });
        
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.brand) queryParams.append('brand', filters.brand);
        if (filters.category) queryParams.append('category', filters.category);

        apiService(`/products?${queryParams.toString()}`, 'GET', null, { signal: controller.signal })
            .then(data => {
                setProducts(data.products || []);
                setTotalPages(data.totalPages || 1);
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Falha ao buscar produtos paginados:", err);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => controller.abort();
    }, [filters, currentPage, initialIsPromo]);
    
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Sempre volta para a página 1 ao filtrar
    };
    
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

    const pageTitle = initialIsPromo ? 'Produtos em Promoção' : 'Nossa Coleção';

    return (
        <div className="bg-black text-white min-h-screen pt-12 pb-28 md:pb-12">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{pageTitle}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1 bg-gray-900 p-6 rounded-lg shadow-md h-fit lg:sticky lg:top-28">
                        <h3 className="text-xl font-bold mb-4 text-amber-400">Filtros</h3>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Buscar por nome..." 
                                value={filters.search} 
                                onChange={e => handleFilterChange('search', e.target.value)} 
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white" 
                            />
                            <select 
                                value={filters.brand} 
                                onChange={e => handleFilterChange('brand', e.target.value)} 
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                            >
                                <option value="">Todas as Marcas</option>
                                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select 
                                value={filters.category} 
                                onChange={e => handleFilterChange('category', e.target.value)} 
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                            >
                                <option value="">Todas as Categorias</option>
                                <option value="Roupas">Roupas (Geral)</option>
                                <option value="Perfumes">Perfumes (Geral)</option>
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
                            ) : products.length > 0 ? (
                                products.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)
                            ) : (
                                <div className="col-span-full text-center py-10">
                                    <p className="text-gray-400 text-lg mb-2">Poxa, não encontramos o que você procurava. 😕</p>
                                    <p className="text-gray-500 text-sm">Tente usar outras palavras ou navegar pelas nossas categorias na lateral.</p>
                                </div>
                            )}
                        </motion.div>
                        
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-8 items-center space-x-2 sm:space-x-4">
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1 || isLoading} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition">Anterior</button>
                                <span className="text-sm sm:text-base text-gray-400 font-bold">Página {currentPage} de {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || isLoading} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition">Próxima</button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
