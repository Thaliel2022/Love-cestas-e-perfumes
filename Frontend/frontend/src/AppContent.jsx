import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { apiService } from './services/api';
import { useAuth } from './contexts/AuthContext';
import { InstallPWAButton } from './components/ui/InstallPWAButton';
import { Minicart } from './components/cart/Minicart';
import { Header } from './components/layout/Header';
import { SeasonalAnimations } from './components/layout/SeasonalAnimations';
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
import { OrderPaymentPage } from './pages/OrderPaymentPage';
import { MyAccountPage } from './pages/MyAccountPage';
import { AdminNewsletter } from './pages/admin/AdminNewsletter';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminShippingSettings } from './pages/admin/AdminShippingSettings';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminCoupons } from './pages/admin/AdminCoupons';
import { AdminRefunds } from './pages/admin/AdminRefunds';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminCollections } from './pages/admin/AdminCollections';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminAppIcons } from './pages/admin/AdminAppIcons';
import { AdminThemeSettings } from './pages/admin/AdminThemeSettings';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminPaymentSettings } from './pages/admin/AdminPaymentSettings';
import { MaintenancePage } from './components/admin/Maintenance';
import { AdminLayout } from './components/admin/AdminLayout';
import { urlBase64ToUint8Array } from './utils/webauthn';
import { CheckBadgeIcon, InstagramIcon, ShieldCheckIcon, SpinnerIcon, TruckIcon, WhatsappIcon } from './components/icons';

export function AppContent({ deferredPrompt }) {
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
            'payments': <AdminPaymentSettings />,
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
