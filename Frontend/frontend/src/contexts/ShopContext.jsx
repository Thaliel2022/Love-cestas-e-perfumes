import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

const ShopContext = createContext(null);

export const useShop = () => useContext(ShopContext);

export const ShopProvider = ({ children }) => {
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [shippingLocation, setShippingLocation] = useState({ cep: '', city: '', state: '', alias: '' });
    const [autoCalculatedShipping, setAutoCalculatedShipping] = useState(null);
    const [shippingOptions, setShippingOptions] = useState([]);
    const [isLoadingShipping, setIsLoadingShipping] = useState(false);
    const [shippingError, setShippingError] = useState('');
    const [previewShippingItem, setPreviewShippingItem] = useState(null);
    const [selectedShippingName, setSelectedShippingName] = useState(null);
    const [isGeolocating, setIsGeolocating] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponMessage, setCouponMessage] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const [isMinicartOpen, setIsMinicartOpen] = useState(false);

    const [localShippingConfig, setLocalShippingConfig] = useState({ base_price: 20, rules: [] });
    const [pickupConfig, setPickupConfig] = useState(null);

    const [orderNotificationCount, setOrderNotificationCount] = useState(0);

    const normalize = (str) => str ? String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const safeParse = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try { return JSON.parse(val) || []; } catch { return []; }
    };

    // CORREÇÃO: Escuta o evento de logout para limpar todos os estados sensíveis
    useEffect(() => {
        const handleLogoutEvent = () => {
            setCart([]);
            setWishlist([]);
            setAddresses([]);
            setShippingLocation({ cep: '', city: '', state: '', alias: '' });
            setAutoCalculatedShipping(null);
            setShippingOptions([]);
            setCouponCode('');
            setAppliedCoupon(null);
            setCouponMessage('');
            setOrderNotificationCount(0);
        };
        window.addEventListener('user-logged-out', handleLogoutEvent);
        return () => window.removeEventListener('user-logged-out', handleLogoutEvent);
    }, []);

    const checkNotifications = useCallback(async () => {
        if (!isAuthenticated) { setOrderNotificationCount(0); return; }
        try {
            const data = await apiService('/notifications/orders/count', 'GET', null, { suppressAuthError: true });
            if (data && typeof data.count === 'number') setOrderNotificationCount(data.count);
        } catch (error) {}
    }, [isAuthenticated]);

    const markOrderAsSeen = useCallback(async (orderId) => {
        if (!isAuthenticated) return;
        try { await apiService(`/orders/${orderId}/mark-seen`, 'PUT'); checkNotifications(); } 
        catch (error) { console.error("Erro ao marcar pedido como visto:", error); }
    }, [isAuthenticated, checkNotifications]);

    useEffect(() => {
        checkNotifications();
        const interval = setInterval(checkNotifications, 5000);
        return () => clearInterval(interval);
    }, [checkNotifications]);

    const calculateDeliveryDate = useCallback((daysToAdd) => {
        const date = new Date();
        let added = 0;
        const holidays = ["01/01", "21/04", "01/05", "24/06", "07/09", "12/10", "02/11", "15/11", "25/12"];
        while (added < daysToAdd) {
            date.setDate(date.getDate() + 1);
            const dayOfWeek = date.getDay();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const dateString = `${day}/${month}`;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; 
            const isHoliday = holidays.includes(dateString);
            if (!isWeekend && !isHoliday) added++;
        }
        return date;
    }, []);
    
    const fetchPickupConfig = useCallback(() => {
        apiService('/settings/pickup')
            .then(data => {
                setPickupConfig(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
            })
            .catch(err => console.error("Falha ao buscar config de retirada:", err));
    }, []);

    const fetchShippingConfig = useCallback(() => {
        apiService('/settings/shipping-local')
            .then(data => {
                setLocalShippingConfig(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
            })
            .catch(err => console.error("Falha ao buscar config de frete local:", err));
    }, []);

    useEffect(() => {
        fetchShippingConfig(); 
        fetchPickupConfig();
        const intervalId = setInterval(() => {
            fetchShippingConfig();
            fetchPickupConfig();
        }, 30000); 
        return () => clearInterval(intervalId);
    }, [fetchShippingConfig, fetchPickupConfig]);

    const calculateLocalDeliveryPrice = useCallback((items) => {
        const defaultBasePrice = parseFloat(localShippingConfig.base_price) || 20;
        if (!items || items.length === 0) return defaultBasePrice;
        let highestBasePriceFound = 0;
        let totalSurcharges = 0;
        let totalDiscounts = 0;
        for (const item of items) {
            const itemCategory = normalize(item.category || "");
            const itemBrand = normalize(item.brand || "");
            let itemEffectiveBasePrice = defaultBasePrice; 
            if (localShippingConfig.rules && localShippingConfig.rules.length > 0) {
                for (const rule of localShippingConfig.rules) {
                    const ruleValue = normalize(rule.value);
                    const ruleAmount = parseFloat(rule.amount) || 0;
                    if (!ruleValue) continue;
                    let match = false;
                    if (rule.type === 'category' && (itemCategory === ruleValue || itemCategory.includes(ruleValue))) match = true;
                    if (rule.type === 'brand' && (itemBrand === ruleValue || itemBrand.includes(ruleValue))) match = true;
                    if (match) {
                        switch (rule.action) {
                            case 'free_shipping': itemEffectiveBasePrice = 0; break;
                            case 'surcharge': totalSurcharges += ruleAmount; break;
                            case 'discount': totalDiscounts += ruleAmount; break;
                            default: break;
                        }
                    }
                }
            }
            if (itemEffectiveBasePrice > highestBasePriceFound) highestBasePriceFound = itemEffectiveBasePrice;
        }
        let finalPrice = highestBasePriceFound + totalSurcharges - totalDiscounts;
        return Math.max(0, finalPrice); 
    }, [localShippingConfig]);

    const fetchPersistentCart = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const dbCart = await apiService('/cart');
            const localCartStr = localStorage.getItem('lovecestas_cart');
            let localCart = [];
            try { localCart = JSON.parse(localCartStr) || []; } catch(e){}
            const mergedCart = (dbCart || []).map(dbItem => {
                if (dbItem.variation && dbItem.variation.color && dbItem.variation.size) {
                    return { ...dbItem, cartItemId: String(`${dbItem.id}-${dbItem.variation.color}-${dbItem.variation.size}`) };
                }
                if (dbItem.product_type === 'clothing') {
                    const localItem = localCart.find(li => String(li.id) === String(dbItem.id) && li.variation);
                    if (localItem && localItem.variation) {
                        return { ...dbItem, variation: localItem.variation, cartItemId: String(`${dbItem.id}-${localItem.variation.color}-${localItem.variation.size}`) };
                    }
                }
                return { ...dbItem, cartItemId: String(dbItem.cartItemId || dbItem.id) };
            });
            setCart(mergedCart);
            localStorage.setItem('lovecestas_cart', JSON.stringify(mergedCart));
        } catch (err) { console.error("Falha ao buscar carrinho:", err); }
    }, [isAuthenticated]);

    const syncGuestCartToDB = useCallback(async () => {
        const localCartStr = localStorage.getItem('lovecestas_cart');
        if (!localCartStr) return;
        try {
            const localItems = JSON.parse(localCartStr);
            if (Array.isArray(localItems) && localItems.length > 0) {
                const promises = localItems
                    .filter(item => item && item.id)
                    .map(item => {
                        const payload = { productId: item.id, quantity: item.qty, variationId: item.variation?.id, variation: item.variation, variation_details: item.variation ? JSON.stringify(item.variation) : null };
                        return apiService('/cart', 'POST', payload).catch(err => console.warn("Item duplicado/erro sync:", err));
                    });
                await Promise.all(promises);
            }
        } catch (e) { console.error("Erro sync carrinho:", e); }
    }, []);

    const fetchAddresses = useCallback(async () => {
        if (!isAuthenticated) return [];
        try {
            const userAddresses = await apiService('/addresses');
            setAddresses(userAddresses || []);
            return userAddresses || [];
        } catch (error) { setAddresses([]); return []; }
    }, [isAuthenticated]);

    const updateDefaultShippingLocation = useCallback((addrs) => {
        const defaultAddr = addrs.find(addr => addr.is_default) || addrs[0];
        if (defaultAddr) {
            setShippingLocation({ cep: defaultAddr.cep, city: defaultAddr.localidade, state: defaultAddr.uf, alias: defaultAddr.alias });
            return true;
        }
        return false;
    }, []);

    const determineShippingLocation = useCallback(async () => {
        let locationDetermined = false;
        if (isAuthenticated) {
            const userAddresses = await fetchAddresses();
            if (userAddresses && userAddresses.length > 0) {
                locationDetermined = updateDefaultShippingLocation(userAddresses);
            }
        }
        if (!locationDetermined) {
            try {
                const cachedLocStr = localStorage.getItem('lovecestas_cached_location');
                if (cachedLocStr) {
                    const cachedLoc = JSON.parse(cachedLocStr);
                    if (cachedLoc && cachedLoc.cep && cachedLoc.cep.replace(/\D/g, '').length === 8) {
                        if (!isAuthenticated && cachedLoc.alias && cachedLoc.alias !== 'Localização Atual' && !cachedLoc.alias.startsWith('CEP')) {
                            cachedLoc.alias = `CEP ${cachedLoc.cep}`;
                        }
                        setShippingLocation(cachedLoc);
                        locationDetermined = true;
                    }
                }
            } catch (e) {}
        }
        if (!locationDetermined) {
            setIsGeolocating(true);
            const saveAndSetLocation = (cep, city, state) => {
                let finalCep = cep ? String(cep).replace(/\D/g, '') : '';
                if (finalCep.length !== 8) {
                    const cityLower = (city || '').toLowerCase();
                    if (cityLower.includes('joão pessoa') || cityLower.includes('joao pessoa')) finalCep = '58030000';
                    else if (cityLower.includes('cabedelo')) finalCep = '58100000';
                }
                if (finalCep.length === 8) {
                    setShippingLocation({ cep: finalCep, city: city || '', state: state || '', alias: 'Localização Atual' });
                    return true;
                }
                return false;
            };
            const fetchGeoIP = async () => {
                try {
                    const ipRes = await fetch('https://ipapi.co/json/');
                    if (!ipRes.ok) throw new Error('API Rate Limited'); 
                    const ipData = await ipRes.json();
                    if (ipData && ipData.postal) saveAndSetLocation(ipData.postal, ipData.city, ipData.region_code);
                } catch (e) {} finally { setIsGeolocating(false); }
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            const lat = position.coords.latitude; const lon = position.coords.longitude;
                            const bdcResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
                            const bdcData = await bdcResponse.json();
                            let cepFound = bdcData.postcode || ''; let cityFound = bdcData.city || bdcData.locality || ''; let stateFound = bdcData.principalSubdivision || '';
                            if (!cepFound || String(cepFound).replace(/\D/g, '').length !== 8) {
                                const osmResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&email=loja@lovecestaseperfumes.com.br`);
                                const osmData = await osmResponse.json();
                                if (osmData && osmData.address) {
                                    cepFound = osmData.address.postcode || cepFound; cityFound = osmData.address.city || osmData.address.town || cityFound; stateFound = osmData.address.state || stateFound;
                                }
                            }
                            const success = saveAndSetLocation(cepFound, cityFound, stateFound);
                            if (!success) fetchGeoIP(); else setIsGeolocating(false);
                        } catch (error) { fetchGeoIP(); } 
                    }, 
                    (error) => { fetchGeoIP(); }, 
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                );
            } else {
                fetchGeoIP(); 
            }
        }
    }, [isAuthenticated, fetchAddresses, updateDefaultShippingLocation]);

    useEffect(() => {
        if (shippingLocation && shippingLocation.cep && shippingLocation.cep.replace(/\D/g, '').length === 8) {
            const locationToCache = { ...shippingLocation };
            if (!isAuthenticated && locationToCache.alias && locationToCache.alias !== 'Localização Atual' && !locationToCache.alias.startsWith('CEP')) {
                locationToCache.alias = `CEP ${locationToCache.cep}`;
            }
            localStorage.setItem('lovecestas_cached_location', JSON.stringify(locationToCache));
        }
    }, [shippingLocation, isAuthenticated]);

    useEffect(() => {
        if (!isAuthLoading) {
            if (cart.length > 0) localStorage.setItem('lovecestas_cart', JSON.stringify(cart));
            else if (cart.length === 0 && !isAuthenticated) localStorage.setItem('lovecestas_cart', JSON.stringify([]));
        }
    }, [cart, isAuthLoading, isAuthenticated]);

    useEffect(() => {
        if (isAuthLoading) return;
        const initializeShop = async () => {
            if (isAuthenticated) {
                await syncGuestCartToDB();
                await fetchPersistentCart();
                determineShippingLocation();
                apiService('/wishlist').then(setWishlist).catch(console.error);
                checkNotifications(); 
            } else {
                const localCart = localStorage.getItem('lovecestas_cart');
                if (localCart) { try { const parsed = JSON.parse(localCart); if (Array.isArray(parsed)) setCart(parsed); } catch (e) { setCart([]); } }
                determineShippingLocation(); 
                setOrderNotificationCount(0);
            }
        };
        initializeShop();
    }, [isAuthenticated, isAuthLoading, fetchPersistentCart, determineShippingLocation, syncGuestCartToDB, checkNotifications]);
    
    useEffect(() => {
        if (cart.length > 0 && isAuthenticated) {
            const missingData = cart.some(item => !item.hasOwnProperty('category') || !item.hasOwnProperty('brand'));
            if (missingData) fetchPersistentCart();
        }
    }, [cart.length, isAuthenticated, fetchPersistentCart]);

    useEffect(() => {
        const itemsToCalculate = previewShippingItem && previewShippingItem.length > 0 ? previewShippingItem : cart;
        const debounceTimer = setTimeout(() => {
            if (itemsToCalculate && itemsToCalculate.length > 0 && shippingLocation.cep.replace(/\D/g, '').length === 8) {
                setIsLoadingShipping(true);
                setShippingError('');
                
                const calculateShipping = async () => {
                    try {
                        const cleanCep = shippingLocation.cep.replace(/\D/g, '');
                        const cepPrefix = parseInt(cleanCep.substring(0, 5));
                        const isJoaoPessoa = cepPrefix >= 58000 && cepPrefix <= 58099;

                        const pickupOption = { name: "Retirar na loja", price: 0, delivery_time: 'Disponível para retirada', isPickup: true };
                        let finalOptions = [];

                        if (isJoaoPessoa) {
                            const localPrice = calculateLocalDeliveryPrice(itemsToCalculate);
                            const date = calculateDeliveryDate(1);
                            const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                            const deliveryString = `Receba até ${formattedDate}`;

                            const localDeliveryOption = { name: "Entrega local (Motoboy / Uber)", price: localPrice, delivery_time: deliveryString, isLocal: true };
                            finalOptions = [localDeliveryOption, pickupOption];
                        } else {
                            const productsPayload = itemsToCalculate.map(item => ({ id: String(item.id), price: item.is_on_sale && item.sale_price ? item.sale_price : item.price, quantity: item.qty || 1 }));
                            const apiOptions = await apiService('/shipping/calculate', 'POST', { cep_destino: shippingLocation.cep, products: productsPayload });
                            const pacOptionRaw = apiOptions.find(opt => opt.name.toLowerCase().includes('pac'));
                            if (pacOptionRaw) finalOptions.push({ ...pacOptionRaw, name: 'PAC' });
                            finalOptions.push(pickupOption);
                        }

                        setShippingOptions(finalOptions);
                        const desiredOption = finalOptions.find(opt => opt.name === selectedShippingName);
                        setAutoCalculatedShipping(desiredOption || finalOptions[0] || null);

                    } catch (error) {
                        setShippingError(error.message || 'Não foi possível calcular o frete.');
                        const pickupOption = { name: "Retirar na loja", price: 0, delivery_time: 'Disponível para retirada', isPickup: true };
                        setShippingOptions([pickupOption]);
                        setAutoCalculatedShipping(pickupOption);
                    } finally { setIsLoadingShipping(false); }
                };
                calculateShipping();
            } else {
                setShippingOptions([]); setAutoCalculatedShipping(null);
            }
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [cart, shippingLocation, previewShippingItem, selectedShippingName, calculateLocalDeliveryPrice, calculateDeliveryDate]);

    const addToCart = useCallback(async (productToAdd, qty = 1, variation = null) => {
        setPreviewShippingItem(null);
        
        const cartItemId = String(productToAdd.product_type === 'clothing' && variation ? `${productToAdd.id}-${variation.color}-${variation.size}` : productToAdd.id);
        
        const existing = cart.find(item => String(item.cartItemId) === cartItemId);
        const availableStock = variation ? variation.stock : productToAdd.stock;
        const currentQtyInCart = existing ? existing.qty : 0;
        
        if (currentQtyInCart + qty > availableStock) throw new Error(`Estoque insuficiente. Apenas ${availableStock} unid.`);
        
        setCart(currentCart => {
            if (existing) return currentCart.map(item => String(item.cartItemId) === cartItemId ? { ...item, qty: item.qty + qty } : item);
            return [...currentCart, { ...productToAdd, qty, variation, cartItemId }];
        });
        
        if (isAuthenticated) {
            apiService('/cart', 'POST', { productId: productToAdd.id, quantity: existing ? existing.qty + qty : qty, variationId: variation?.id, variation: variation, variation_details: variation ? JSON.stringify(variation) : null }).catch(console.error);
        }
    }, [cart, isAuthenticated]);

    const removeFromCart = useCallback(async (cartItemId) => {
        const targetId = String(cartItemId);
        const itemToRemove = cart.find(item => String(item.cartItemId) === targetId);
        if (!itemToRemove) return;
        setCart(current => current.filter(item => String(item.cartItemId) !== targetId));
        if (isAuthenticated) await apiService(`/cart/${itemToRemove.id}`, 'DELETE', { variation: itemToRemove.variation });
    }, [cart, isAuthenticated]);

    const updateQuantity = useCallback(async (cartItemId, newQuantity) => {
        const targetId = String(cartItemId);
        if (newQuantity < 1) { removeFromCart(targetId); return; }
        const itemToUpdate = cart.find(item => String(item.cartItemId) === targetId);
        if (!itemToUpdate) return;
        const availableStock = itemToUpdate.variation ? itemToUpdate.variation.stock : itemToUpdate.stock;
        if (newQuantity > availableStock) throw new Error(`Estoque insuficiente.`);
        setCart(current => current.map(item => String(item.cartItemId) === targetId ? {...item, qty: newQuantity } : item));
        if (isAuthenticated) apiService('/cart', 'POST', { productId: itemToUpdate.id, quantity: newQuantity, variationId: itemToUpdate.variation?.id, variation: itemToUpdate.variation });
    }, [cart, isAuthenticated, removeFromCart]);

    const clearCart = useCallback(async () => { setCart([]); localStorage.removeItem('lovecestas_cart'); if (isAuthenticated) await apiService('/cart', 'DELETE'); }, [isAuthenticated]);
    const addToWishlist = useCallback(async (productToAdd) => { if (!isAuthenticated) return; if (wishlist.some(p => p.id === productToAdd.id)) return; try { const addedProduct = await apiService('/wishlist', 'POST', { productId: productToAdd.id }); setWishlist(current => [...current, addedProduct]); return { success: true, message: `${productToAdd.name} adicionado à lista!` }; } catch (error) { return { success: false, message: `Erro: ${error.message}` }; } }, [isAuthenticated, wishlist]);
    const removeFromWishlist = useCallback(async (productId) => { if (!isAuthenticated) return; try { await apiService(`/wishlist/${productId}`, 'DELETE'); setWishlist(current => current.filter(p => p.id !== productId)); } catch (error) { console.error(error); } }, [isAuthenticated]);
    const removeCoupon = useCallback(() => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage(''); }, []);
    
    const applyCoupon = useCallback(async (code) => {
        setCouponCode(code); setCouponMessage(""); 
        try {
            const response = await apiService('/coupons/validate', 'POST', { code });
            const coupon = response.coupon;
            if (coupon.type !== 'free_shipping') {
                const rawAllowedCats = safeParse(coupon.allowed_categories);
                const rawAllowedBrands = safeParse(coupon.allowed_brands);
                const safeAllowedCats = rawAllowedCats.map(normalize).filter(s => s.length > 0);
                const safeAllowedBrands = rawAllowedBrands.map(normalize).filter(s => s.length > 0);
                const hasRestrictions = safeAllowedCats.length > 0 || safeAllowedBrands.length > 0;
                const isGlobal = !hasRestrictions;
                let eligibleCount = 0;
                if (isGlobal) eligibleCount = cart.length;
                else {
                    cart.forEach(item => {
                        const itemCat = normalize(item.category || "");
                        const itemBrand = normalize(item.brand || "");
                        const catMatch = safeAllowedCats.some(allowed => itemCat === allowed || itemCat.includes(allowed));
                        const brandMatch = safeAllowedBrands.some(allowed => itemBrand === allowed || itemBrand.includes(allowed));
                        if (catMatch || brandMatch) eligibleCount++;
                    });
                }
                if (eligibleCount === 0) { setAppliedCoupon(null); setCouponMessage("Nenhum produto elegível."); return; }
            }
            setAppliedCoupon(coupon);
        } catch (error) { setAppliedCoupon(null); setCouponMessage(error.message || "Erro no cupom."); }
    }, [cart]);

    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        if (appliedCoupon.type === 'free_shipping') return autoCalculatedShipping ? autoCalculatedShipping.price : 0;
        let eligibleTotal = 0;
        const rawAllowedCats = safeParse(appliedCoupon.allowed_categories);
        const rawAllowedBrands = safeParse(appliedCoupon.allowed_brands);
        const safeAllowedCats = rawAllowedCats.map(normalize).filter(s => s.length > 0);
        const safeAllowedBrands = rawAllowedBrands.map(normalize).filter(s => s.length > 0);
        const hasRestrictions = safeAllowedCats.length > 0 || safeAllowedBrands.length > 0;
        const isGlobal = !hasRestrictions;

        cart.forEach(item => {
            let isEligible = false;
            if (isGlobal) isEligible = true;
            else {
                const itemCat = normalize(item.category || "");
                const itemBrand = normalize(item.brand || "");
                const catMatch = safeAllowedCats.some(allowed => itemCat === allowed || itemCat.includes(allowed));
                const brandMatch = safeAllowedBrands.some(allowed => itemBrand === allowed || itemBrand.includes(allowed));
                if (catMatch || brandMatch) isEligible = true;
            }
            if (isEligible) {
                const price = (item.is_on_sale && item.sale_price) ? parseFloat(item.sale_price) : parseFloat(item.price);
                eligibleTotal += price * item.qty;
            }
        });
        if (eligibleTotal === 0) return 0;
        let finalDiscount = 0;
        if (appliedCoupon.type === 'percentage') finalDiscount = eligibleTotal * (parseFloat(appliedCoupon.value) / 100);
        else if (appliedCoupon.type === 'fixed') finalDiscount = Math.min(parseFloat(appliedCoupon.value), eligibleTotal);
        return Math.min(finalDiscount, eligibleTotal);
    }, [appliedCoupon, cart, autoCalculatedShipping]);

    const clearOrderState = useCallback(() => { clearCart(); removeCoupon(); determineShippingLocation(); }, [clearCart, removeCoupon, determineShippingLocation]);

    return (
        <ShopContext.Provider value={{
            cart, setCart, clearOrderState, wishlist, addToCart, addToWishlist, removeFromWishlist, updateQuantity, removeFromCart, 
            userName: user?.name, addresses, fetchAddresses, shippingLocation, setShippingLocation, 
            autoCalculatedShipping, setAutoCalculatedShipping, shippingOptions, isLoadingShipping, shippingError, 
            updateDefaultShippingLocation, determineShippingLocation, setPreviewShippingItem, setSelectedShippingName, isGeolocating, 
            couponCode, setCouponCode, couponMessage, applyCoupon, appliedCoupon, removeCoupon, discount,
            calculateLocalDeliveryPrice, calculateDeliveryDate,
            orderNotificationCount, markOrderAsSeen, checkNotifications,
            pickupConfig,
            isMinicartOpen, setIsMinicartOpen
        }}>
            {children}
        </ShopContext.Provider>
    );
};
