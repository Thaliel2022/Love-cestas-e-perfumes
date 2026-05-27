import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { BenefitsBar } from '../components/ui/BenefitsBar';
import { ProductCarousel } from '../components/product/ProductCards';
import { CategoryCardsSection, CollectionsCarousel, NewsletterSection, PromoBannerSection } from '../components/home/HomeSections';
import { BannerCarousel } from '../components/home/BannerCarousel';
import { ArrowUturnLeftIcon, EyeIcon, ShirtIcon, SparklesIcon, SpinnerIcon } from '../components/icons';

export const HomePage = ({ onNavigate }) => {
    const [products, setProducts] = useState({
        newArrivals: [],
        bestSellers: [],
        clothing: [],
        perfumes: []
    });
    
    // NOVO ESTADO: Produtos Vistos Recentemente
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    const [banners, setBanners] = useState({
        carousel: [],
        promo: [], 
        cards: []
    });
    const [isLoadingBanners, setIsLoadingBanners] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        apiService('/products', 'GET', null, { signal: controller.signal })
            .then(data => {
                const productsArray = Array.isArray(data) ? data : (data.products || []);

                const sortedByDate = [...productsArray].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const sortedBySales = [...productsArray].sort((a, b) => (b.sales || 0) - (a.sales || 0));
                
                const clothingProducts = productsArray.filter(p => p.product_type === 'clothing');
                const perfumeProducts = productsArray.filter(p => p.product_type === 'perfume');

                setProducts({
                    newArrivals: sortedByDate,
                    bestSellers: sortedBySales,
                    clothing: clothingProducts,
                    perfumes: perfumeProducts
                });
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Falha ao buscar produtos:", err);
            });

        apiService('/banners', 'GET', null, { signal: controller.signal })
            .then(data => {
                if (Array.isArray(data)) {
                    const carousel = data.filter(b => b.display_order < 50).sort((a, b) => a.display_order - b.display_order);
                    const promo = data.filter(b => b.display_order === 50);
                    const cards = data.filter(b => b.display_order >= 60).sort((a, b) => a.display_order - b.display_order).slice(0, 2);

                    setBanners({
                        carousel: carousel,
                        promo: promo,
                        cards: cards
                    });
                }
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Falha ao buscar banners:", err);
            })
            .finally(() => setIsLoadingBanners(false));

        return () => controller.abort();
    }, []);

    // --- NOVO EFEITO: Buscar Vistos Recentemente ---
    useEffect(() => {
        const fetchRecentlyViewed = async () => {
            try {
                const stored = localStorage.getItem('lovecestas_recently_viewed');
                if (stored) {
                    const ids = JSON.parse(stored);
                    if (ids && ids.length > 0) {
                        const data = await apiService(`/products/batch?ids=${ids.join(',')}`);
                        setRecentlyViewed(data);
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar vistos recentemente", e);
            }
        };
        fetchRecentlyViewed();
    }, []);

    return (
      <div className="bg-black min-h-screen pb-24 md:pb-0 overflow-x-hidden">
        {isLoadingBanners ? (
            <div className="relative h-[55vh] sm:h-[70vh] bg-gray-900 flex items-center justify-center">
                <SpinnerIcon className="h-10 w-10 text-amber-400" />
            </div>
        ) : (
            banners.carousel.length > 0 && <BannerCarousel banners={banners.carousel} onNavigate={onNavigate} />
        )}
        
        <BenefitsBar />
        
        <div className="py-8 md:py-12 bg-black">
             <CollectionsCarousel onNavigate={onNavigate} title="Coleções" />
        </div>

        <PromoBannerSection customBanners={banners.promo} onNavigate={onNavigate} />

        {/* --- NOVA SEÇÃO: VISTOS RECENTEMENTE --- */}
        {recentlyViewed.length > 0 && (
            <section className="bg-gray-900/30 text-white py-8 md:py-12 border-t border-gray-800">
              <div className="container mx-auto px-4">
                  <div className="flex items-end justify-between mb-6 md:mb-10 border-b border-gray-800 pb-4">
                      <div>
                          <h2 className="text-2xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
                              <EyeIcon className="h-6 w-6 md:h-8 md:w-8 text-amber-400"/>
                              Vistos Recentemente
                          </h2>
                          <p className="text-gray-400 mt-1 md:mt-2 text-xs md:text-base ml-3 md:ml-5">Continue de onde você parou.</p>
                      </div>
                  </div>
                  <ProductCarousel products={recentlyViewed} onNavigate={onNavigate} />
              </div>
            </section>
        )}

        <section className="bg-black text-white py-8 md:py-12 border-t border-gray-800">
          <div className="container mx-auto px-4">
              <div className="flex items-end justify-between mb-6 md:mb-10 border-b border-gray-800 pb-4">
                  <div>
                      <h2 className="text-2xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
                          <span className="w-1.5 h-6 md:w-2 md:h-10 bg-amber-500 rounded-full block"></span>
                          Lançamentos
                      </h2>
                      <p className="text-gray-400 mt-1 md:mt-2 text-xs md:text-base ml-3 md:ml-5">Novidades que acabaram de chegar.</p>
                  </div>
                  <button onClick={() => onNavigate('products')} className="text-amber-400 hover:text-white transition-colors text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 group px-2 py-1 md:px-4 md:py-2 rounded-lg hover:bg-gray-900">
                      Ver tudo <ArrowUturnLeftIcon className="h-3 w-3 md:h-4 md:w-4 rotate-180 group-hover:translate-x-1 transition-transform"/>
                  </button>
              </div>
              <ProductCarousel products={products.newArrivals} onNavigate={onNavigate} />
          </div>
        </section>
        
        <section className="bg-gray-900/50 py-10 md:py-16 my-4 md:my-8 border-y border-gray-800 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="container mx-auto px-4 relative z-10">
             <div className="text-center mb-8 md:mb-12">
                  <span className="text-amber-500 font-bold tracking-widest text-[10px] md:text-xs uppercase mb-1 md:mb-2 block">Preferidos dos Clientes</span>
                  <h2 className="text-2xl md:text-5xl font-extrabold text-white flex items-center justify-center gap-2 md:gap-3">
                      <SparklesIcon className="h-6 w-6 md:h-8 md:w-8 text-amber-400"/> Mais Vendidos
                  </h2>
              </div>
             <ProductCarousel products={products.bestSellers} onNavigate={onNavigate} />
          </div>
        </section>

        <CategoryCardsSection customCards={banners.cards} onNavigate={onNavigate} />
        
        <section className="bg-black text-white py-8 md:py-10 border-t border-gray-800">
          <div className="container mx-auto px-4">
              <div className="flex items-end justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-3 md:gap-4">
                      <div className="bg-gray-800 p-2 md:p-3 rounded-full"><ShirtIcon className="h-5 w-5 md:h-6 md:w-6 text-amber-400"/></div>
                      <h2 className="text-xl md:text-3xl font-bold">Roupas em Destaque</h2>
                  </div>
                  <button onClick={() => onNavigate('products?category=Roupas')} className="text-amber-400 hover:text-white transition-colors text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 group px-2 py-1 md:px-4 md:py-2 rounded-lg hover:bg-gray-900">
                      Ver tudo <ArrowUturnLeftIcon className="h-3 w-3 md:h-4 md:w-4 rotate-180 group-hover:translate-x-1 transition-transform"/>
                  </button>
              </div>
              <ProductCarousel products={products.clothing} onNavigate={onNavigate} />
          </div>
        </section>

        {products.perfumes.length > 0 && (
            <section className="bg-black text-white py-8 md:py-12 border-t border-gray-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-end justify-between mb-6 md:mb-8">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="bg-gray-800 p-2 md:p-3 rounded-full"><SparklesIcon className="h-5 w-5 md:h-6 md:w-6 text-amber-400"/></div>
                            <h2 className="text-xl md:text-3xl font-bold">Perfumaria Selecionada</h2>
                        </div>
                        <button onClick={() => onNavigate('products?category=Perfumes')} className="text-amber-400 hover:text-white transition-colors text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 group px-2 py-1 md:px-4 md:py-2 rounded-lg hover:bg-gray-900">
                            Ver tudo <ArrowUturnLeftIcon className="h-3 w-3 md:h-4 md:w-4 rotate-180 group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </div>
                    <ProductCarousel products={products.perfumes} onNavigate={onNavigate} />
                </div>
            </section>
        )}

        <NewsletterSection />
      </div>
    );
};
