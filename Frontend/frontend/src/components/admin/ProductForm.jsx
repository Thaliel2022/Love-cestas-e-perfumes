import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { apiImageUploadService, apiService } from '../../services/api';
import { FormSection } from '../ui/FormSection';
import { SizeGuideAdminInput } from '../product/ProductSupport';
import { parseJsonString } from '../../utils/cloudinary';
import { VariationInputRow } from './VariationInputRow';
import { BoxIcon, CameraIcon, CheckIcon, CurrencyDollarIcon, FileIcon, PhotoIcon, ShirtIcon, SparklesIcon, TrashIcon, UploadIcon } from '../icons';
export const ProductForm = ({ item, onSave, onCancel, productType, setProductType, brands = [], categories = [] }) => {
    const [formData, setFormData] = useState({});
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadingStatus, setUploadingStatus] = useState({});
    
    // Novos estados para controlar o modo de promoção
    const [promoMode, setPromoMode] = useState('fixed'); 
    const [promoPercent, setPromoPercent] = useState('');
    
    // Estado para controlar quais cores estão na promoção (apenas para roupas)
    const [promoSelectedColors, setPromoSelectedColors] = useState([]);

    const mainGalleryInputRef = useRef(null);
    const mainCameraInputRef = useRef(null);
    const [allCollectionCategories, setAllCollectionCategories] = useState([]);

    useEffect(() => {
        apiService('/collections/admin')
            .then(data => setAllCollectionCategories(data.filter(c => c.is_active)))
            .catch(err => console.error("Falha ao buscar categorias de coleção", err));
    }, []);
    
    const perfumeBrands = ["O Boticário", "Avon", "Natura", "Eudora"];

    const perfumeFields = [
        { name: 'stock', label: 'Estoque Total', type: 'number', required: true, placeholder: '0' },
        { name: 'volume', label: 'Volume (ex: 100ml)', type: 'text', placeholder: '100ml' },
        { name: 'notes', label: 'Notas Olfativas', type: 'textarea', placeholder: 'Topo: ...\nCorpo: ...\nFundo: ...' },
        { name: 'how_to_use', label: 'Como Usar', type: 'textarea', placeholder: 'Instruções de aplicação...' },
        { name: 'ideal_for', label: 'Ideal Para', type: 'textarea', placeholder: 'Ocasiões, tipo de pele...' },
    ];
    
    // --- ATUALIZAÇÃO: Removido size_guide de textarea simples ---
    const clothingFields = [
        { name: 'variations', label: 'Grade de Variações', type: 'variations' },
        { name: 'care_instructions', label: 'Cuidados com a Peça', type: 'textarea', placeholder: 'Lavar à mão\nNão usar alvejante...' },
    ];

   const commonFields = [
        { name: 'name', label: 'Nome do Produto', type: 'text', required: true, placeholder: 'Ex: Perfume Floral ou Vestido Longo' },
        { name: 'brand', label: 'Marca', type: 'text', required: true, placeholder: 'Selecione ou digite...' },
        { name: 'category', label: 'Categoria', type: 'text', required: true, placeholder: 'Selecione...' },
        { name: 'price', label: 'Preço Original (R$)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
        { name: 'video_url', label: 'Vídeo do YouTube (URL)', type: 'url', placeholder: 'https://www.youtube.com/watch?v=...' },
        { name: 'images_upload', label: 'Upload de Imagens Principais', type: 'file' },
        { name: 'images', label: 'URLs das Imagens Principais', type: 'text_array' },
        { name: 'description', label: 'Descrição Detalhada', type: 'textarea', placeholder: 'Descreva os detalhes e benefícios do produto...' },
        { name: 'weight', label: 'Peso (kg)', type: 'number', step: '0.01', required: true, placeholder: '0.5' },
        { name: 'width', label: 'Largura (cm)', type: 'number', required: true, placeholder: '10' },
        { name: 'height', label: 'Altura (cm)', type: 'number', required: true, placeholder: '10' },
        { name: 'length', label: 'Comprimento (cm)', type: 'number', required: true, placeholder: '10' },
        { name: 'is_active', label: 'Produto Ativo', type: 'checkbox' },
    ];

    useEffect(() => {
        const initialData = {};
        const allFields = [...commonFields, ...perfumeFields, ...clothingFields];

        allFields.forEach(field => {
            const value = item?.[field.name];
            if (value !== undefined && value !== null) {
                initialData[field.name] = value;
            } else {
                if (field.type === 'checkbox') {
                    initialData[field.name] = (field.name === 'is_active'); 
                } else if (field.type === 'number') {
                    initialData[field.name] = 0; 
                } else if (field.name === 'images' || field.name === 'variations') {
                    initialData[field.name] = [];
                } else {
                    initialData[field.name] = '';
                }
            }
        });
        
        if (item) {
            setProductType(item.product_type || 'perfume');
            // Garante que images seja um array válido
            initialData.images = parseJsonString(item.images, []);
            initialData.variations = parseJsonString(item.variations, []);
            
            // --- ATUALIZAÇÃO: Carregar size_guide existente ---
            initialData.size_guide = item.size_guide || '';

            initialData.is_on_sale = !!item.is_on_sale;
            initialData.sale_price = item.sale_price || '';
            
            if (item.sale_end_date) {
                const date = new Date(item.sale_end_date);
                const localISOTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                initialData.sale_end_date = localISOTime;
            } else {
                initialData.sale_end_date = '';
            }

            if (item.is_on_sale && item.price > 0 && item.sale_price > 0) {
                 const percent = Math.round(((item.price - item.sale_price) / item.price) * 100);
                 setPromoPercent(percent);
            }
            
            if (item.product_type === 'clothing') {
                const vars = parseJsonString(item.variations, []);
                if (item.is_on_sale) {
                    const activePromoColors = vars
                        .filter(v => v.color && v.is_promo !== false)
                        .map(v => v.color);
                    setPromoSelectedColors([...new Set(activePromoColors)]);
                } else {
                    const allColors = vars.filter(v => v.color).map(v => v.color);
                    setPromoSelectedColors([...new Set(allColors)]);
                }
            }

        } else {
            setProductType('perfume');
            initialData.images = []; // Garante array vazio para novo produto
            initialData.is_on_sale = false;
            initialData.sale_price = '';
            initialData.sale_end_date = '';
            initialData.size_guide = ''; // Inicializa vazio
        }

        setFormData(initialData);
    }, [item?.id]);

    const availableProductCategories = useMemo(() => {
        return allCollectionCategories.filter(c => c.product_type_association === productType);
    }, [allCollectionCategories, productType]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? (checked ? 1 : 0) : value;

        setFormData(prev => {
            const updated = { ...prev, [name]: newValue };
            if (name === 'price' && promoMode === 'percentage' && promoPercent) {
                const original = parseFloat(newValue);
                if (!isNaN(original)) {
                    const discount = original * (parseFloat(promoPercent) / 100);
                    updated.sale_price = (original - discount).toFixed(2);
                }
            }
            return updated;
        });
    };

    const handleSizeGuideChange = useCallback((newVal) => {
        setFormData((prev) => {
            if (prev.size_guide === newVal) return prev;
            return { ...prev, size_guide: newVal };
        });
    }, []);

    // Handler atualizado para limpar dados e corrigir o bug visual
    const handlePromoToggle = (e) => {
        const isChecked = e.target.checked;
        
        setFormData(prev => ({
            ...prev,
            is_on_sale: isChecked ? 1 : 0,
            // Limpa os campos de promoção se desmarcar para evitar sujeira
            sale_price: isChecked ? prev.sale_price : '',
            sale_end_date: isChecked ? prev.sale_end_date : ''
        }));
        
        if (isChecked && productType === 'clothing') {
            const currentColors = [...new Set((formData.variations || []).filter(v => v.color).map(v => v.color))];
            setPromoSelectedColors(currentColors);
        } else if (!isChecked) {
            setPromoSelectedColors([]);
        }
    };

    const togglePromoColor = (color) => {
        setPromoSelectedColors(prev => {
            if (prev.includes(color)) {
                return prev.filter(c => c !== color);
            } else {
                return [...prev, color];
            }
        });
    };

    const handleVolumeBlur = (e) => {
        let { value } = e.target;
        if (value && value.trim() !== '' && !isNaN(parseFloat(value)) && !/ml/i.test(value)) {
            const formattedValue = `${parseFloat(value)}ml`;
            setFormData(prev => ({ ...prev, volume: formattedValue }));
        }
    };
    
    // --- LÓGICA DE UPLOAD DE IMAGEM ---
    const handleImageArrayChange = (index, value) => {
        const newImages = [...(formData.images || [])];
        newImages[index] = value;
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const addImageField = () => {
        setFormData(prev => ({...prev, images: [...(prev.images || []), '']}));
    };

    const removeImageField = (index) => {
        const newImages = (formData.images || []).filter((_, i) => i !== index);
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadStatus(`Enviando ${files.length} imagem(ns)...`);
        try {
            const uploadPromises = files.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            
            setFormData(prev => {
                // Garante que prev.images seja um array antes de espalhar
                const currentImages = Array.isArray(prev.images) ? prev.images : [];
                return {
                    ...prev, 
                    images: [...currentImages, ...newImageUrls]
                };
            });
            
            setUploadStatus('Upload concluído com sucesso!');
            e.target.value = ''; 
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error) {
            console.error("Erro no upload:", error);
            setUploadStatus(`Erro no upload: ${error.message}`);
        }
    };
    
    const handleVariationChange = (index, field, value) => {
        const newVariations = [...formData.variations];
        newVariations[index][field] = value;
        setFormData(prev => ({ ...prev, variations: newVariations }));

        if (field === 'color' && value && formData.is_on_sale) {
            setPromoSelectedColors(prev => {
                if (!prev.includes(value)) return [...prev, value];
                return prev;
            });
        }
    };
    
    const handleVariationImageUpload = async (index, e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingStatus(prev => ({ ...prev, [index]: 'Enviando...' }));
        try {
            const uploadPromises = files.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            
            const newVariations = [...formData.variations];
            const currentImages = Array.isArray(newVariations[index].images) ? newVariations[index].images : [];
            newVariations[index].images = [...currentImages, ...newImageUrls];
            setFormData(prev => ({ ...prev, variations: newVariations }));
            
            setUploadingStatus(prev => ({ ...prev, [index]: `${files.length} imagem(ns) enviada(s)!` }));
            e.target.value = '';
            setTimeout(() => setUploadingStatus(prev => ({ ...prev, [index]: '' })), 3000);
        } catch (error) {
            setUploadingStatus(prev => ({ ...prev, [index]: `Erro: ${error.message}` }));
        }
    };

    const addVariation = () => {
        setFormData(prev => ({
            ...prev,
            variations: [...(prev.variations || []), { color: '', size: '', stock: 0, images: [] }]
        }));
    };

    const removeVariation = (index) => {
        const newVariations = formData.variations.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, variations: newVariations }));
    };

    const handlePromoModeChange = (mode) => {
        setPromoMode(mode);
        if (mode === 'percentage') {
            if (formData.price && formData.sale_price) {
                const original = parseFloat(formData.price);
                const sale = parseFloat(formData.sale_price);
                if (original > 0) {
                    const percent = ((original - sale) / original) * 100;
                    setPromoPercent(Math.round(percent));
                }
            }
        } else { setPromoPercent(''); }
    };

    const handlePercentChange = (e) => {
        const percent = e.target.value;
        setPromoPercent(percent);
        if (formData.price && percent !== '') {
            const original = parseFloat(formData.price);
            if (!isNaN(original)) {
                const discount = original * (parseFloat(percent) / 100);
                const newSalePrice = (original - discount).toFixed(2);
                setFormData(prev => ({ ...prev, sale_price: newSalePrice }));
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };
        dataToSubmit.product_type = productType;

        if (dataToSubmit.sale_end_date) {
            const localDate = new Date(dataToSubmit.sale_end_date);
            dataToSubmit.sale_end_date = localDate.toISOString();
        }

        if (productType === 'perfume') {
            clothingFields.forEach(field => delete dataToSubmit[field.name]);
            dataToSubmit.variations = '[]';
            dataToSubmit.stock = parseInt(dataToSubmit.stock, 10) || 0;
        } else if (productType === 'clothing') {
            perfumeFields.forEach(field => delete dataToSubmit[field.name]);

            const colorImageMap = new Map();
            (dataToSubmit.variations || []).forEach(v => {
                if (v.color && !colorImageMap.has(v.color)) {
                    colorImageMap.set(v.color, v.images || []);
                }
            });

            const syncedVariations = (dataToSubmit.variations || []).map(v => ({
                ...v,
                images: v.color ? colorImageMap.get(v.color) : [],
                is_promo: dataToSubmit.is_on_sale && promoSelectedColors.includes(v.color)
            }));

            dataToSubmit.variations = syncedVariations;
            const totalStock = (dataToSubmit.variations || []).reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
            dataToSubmit.stock = totalStock;
        }

        dataToSubmit.images = JSON.stringify(dataToSubmit.images?.filter(img => img && img.trim() !== '') || []);
        if (dataToSubmit.variations) {
            dataToSubmit.variations = JSON.stringify(dataToSubmit.variations);
        }
        
        delete dataToSubmit.images_upload; 
        onSave(dataToSubmit);
    };
    
    // Lista Padrão de Cores
    const PREDEFINED_COLORS = [
        "Amarelo", "Azul", "Azul Bebê", "Azul Marinho", "Azul Royal", "Bege", "Bordô", 
        "Branco", "Caqui", "Caramelo", "Cinza", "Cinza Chumbo", "Coral", "Creme", 
        "Dourado", "Estampado", "Fúcsia", "Goiaba", "Jeans", "Jeans Claro", "Jeans Escuro", 
        "Laranja", "Lilás", "Marrom", "Marsala", "Mostarda", "Multicolorido", "Nude", 
        "Off-White", "Ouro", "Prata", "Prateado", "Preto", "Rosa", "Rosa Bebê", "Rosa Choque", 
        "Rosê", "Roxo", "Salmão", "Terracota", "Turquesa", "Verde", "Verde Água", "Verde Bandeira", 
        "Verde Limão", "Verde Militar", "Vermelho", "Vinho", "Violeta"
    ];

    const allColors = useMemo(() => {
        const dbColors = categories.filter(c => c.type === 'color').map(c => c.name);
        return [...new Set([...PREDEFINED_COLORS, ...dbColors])].sort();
    }, [categories]);
    
    const currentVariationColors = useMemo(() => {
        return [...new Set((formData.variations || []).filter(v => v.color).map(v => v.color))].sort();
    }, [formData.variations]);

    const availableSizes = useMemo(() => [...new Set(categories.filter(c => c.type === 'size').map(c => c.name))], [categories]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50/50 p-1">
            {/* --- SELETOR DE TIPO --- */}
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex relative">
                <button type="button" onClick={() => setProductType('perfume')} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 z-10 ${productType === 'perfume' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <SparklesIcon className="h-5 w-5" /> Perfume
                </button>
                <button type="button" onClick={() => setProductType('clothing')} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 z-10 ${productType === 'clothing' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <ShirtIcon className="h-5 w-5" /> Roupa
                </button>
            </div>

            {/* --- INFORMAÇÕES BÁSICAS --- */}
            <FormSection title="Informações Básicas" icon={FileIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium" placeholder="Ex: Perfume Floral ou Vestido Longo" required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
                        <select name="category" value={formData.category || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" required>
                            <option value="">Selecione...</option>
                            {availableProductCategories.map(cat => <option key={cat.id} value={cat.filter}>{cat.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Marca <span className="text-red-500">*</span></label>
                        {productType === 'perfume' ? (
                             <select name="brand" value={formData.brand || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" required>
                                <option value="">Selecione...</option>
                                {perfumeBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        ) : (
                            <>
                                <input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} list="brand-datalist" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" required placeholder="Digite ou selecione..." />
                                <datalist id="brand-datalist">{brands.map(opt => <option key={opt} value={opt} />)}</datalist>
                            </>
                        )}
                    </div>
                    
                    <div className="md:col-span-2 flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input id="is_active" name="is_active" type="checkbox" checked={!!formData.is_active} onChange={handleChange} className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded cursor-pointer" />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="is_active" className="font-bold text-gray-700 cursor-pointer">Produto Ativo</label>
                                <p className="text-gray-500 text-xs">Se desmarcado, o produto ficará oculto na loja.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </FormSection>

             {/* --- PREÇO E ESTOQUE --- */}
             <FormSection title="Preço e Promoção" icon={CurrencyDollarIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Preço Original (R$) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                            <input type="number" name="price" value={formData.price || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-gray-900" placeholder="0.00" step="0.01" required />
                        </div>
                    </div>

                    {/* Lógica de Estoque para Perfumes (Roupas usam variações) */}
                    {productType === 'perfume' && (
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">Estoque Total <span className="text-red-500">*</span></label>
                             <input type="number" name="stock" value={formData.stock || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold" placeholder="0" min="0" required />
                        </div>
                    )}
                </div>

                {/* Card de Promoção */}
                <div className={`mt-4 border-2 rounded-xl p-5 transition-all ${!!formData.is_on_sale ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-gray-50 border-dashed border-gray-300'}`}>
                    <div className="flex items-center mb-4">
                         <input type="checkbox" id="is_on_sale" name="is_on_sale" checked={!!formData.is_on_sale} onChange={handlePromoToggle} className="h-5 w-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer" />
                         <label htmlFor="is_on_sale" className="ml-3 font-bold text-gray-800 cursor-pointer select-none">Habilitar Promoção</label>
                    </div>

                    {!!formData.is_on_sale && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                            <div className="flex gap-4 p-2 bg-white rounded-lg border border-amber-100">
                                <label className="flex items-center cursor-pointer px-2">
                                    <input type="radio" name="promoMode" value="fixed" checked={promoMode === 'fixed'} onChange={() => handlePromoModeChange('fixed')} className="text-amber-600 focus:ring-amber-500"/>
                                    <span className="ml-2 text-sm font-medium">Preço Fixo</span>
                                </label>
                                <label className="flex items-center cursor-pointer px-2">
                                    <input type="radio" name="promoMode" value="percentage" checked={promoMode === 'percentage'} onChange={() => handlePromoModeChange('percentage')} className="text-amber-600 focus:ring-amber-500"/>
                                    <span className="ml-2 text-sm font-medium">Porcentagem (%)</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desconto (%)</label>
                                    <div className="relative">
                                        <input type="number" value={promoPercent} onChange={handlePercentChange} disabled={promoMode !== 'percentage'} className={`block w-full pr-8 pl-3 py-2 border rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 ${promoMode !== 'percentage' ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`} min="0" max="100"/>
                                        <span className="absolute right-3 top-2 text-xs text-gray-400">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Final</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-xs text-gray-500">R$</span>
                                        <input type="number" name="sale_price" value={formData.sale_price || ''} onChange={handleChange} disabled={promoMode !== 'fixed'} className={`block w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 ${promoMode !== 'fixed' ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`} step="0.01" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim da Promoção (Opcional)</label>
                                    <input type="datetime-local" name="sale_end_date" value={formData.sale_end_date || ''} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 bg-white" />
                                </div>
                            </div>
                            
                            {/* Seleção de Cores para Promoção (Roupas) */}
                            {productType === 'clothing' && currentVariationColors.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-yellow-200">
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Aplicar Desconto nas Cores:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {currentVariationColors.map(color => (
                                            <label key={color} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border cursor-pointer select-none transition-colors ${promoSelectedColors.includes(color) ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-300 text-gray-500 opacity-60'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={promoSelectedColors.includes(color)}
                                                    onChange={() => togglePromoColor(color)}
                                                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                />
                                                <span className="text-sm font-bold">{color}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Novas cores adicionadas entrarão automaticamente na promoção.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
             </FormSection>

            {/* --- DETALHES ESPECÍFICOS --- */}
            {productType === 'perfume' && (
                <FormSection title="Detalhes do Perfume" icon={SparklesIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Volume</label>
                            <input type="text" name="volume" value={formData.volume || ''} onChange={handleChange} onBlur={handleVolumeBlur} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Ex: 100ml" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Notas Olfativas</label>
                            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-24" placeholder="Topo: ...&#10;Corpo: ...&#10;Fundo: ..."></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Como Usar</label>
                            <textarea name="how_to_use" value={formData.how_to_use || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-20"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Ideal Para</label>
                            <textarea name="ideal_for" value={formData.ideal_for || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-20"></textarea>
                        </div>
                    </div>
                </FormSection>
            )}

            {productType === 'clothing' && (
                 <FormSection title="Variações e Tamanhos" icon={ShirtIcon}>
                    {/* Lista de Variações */}
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-700">Grade de Cores e Tamanhos</label>
                            <button type="button" onClick={addVariation} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-bold border border-indigo-200 transition-colors">
                                + Adicionar Variação
                            </button>
                        </div>
                        
                        {(formData.variations || []).length > 0 ? (
                            (formData.variations || []).map((v, i) => {
                                const seenColors = new Set();
                                // Helper simples para identificar primeira ocorrência visualmente
                                const isFirst = (formData.variations || []).findIndex(va => va.color === v.color) === i;
                                return (
                                    <VariationInputRow 
                                        key={i} 
                                        variation={v} 
                                        index={i} 
                                        onVariationChange={handleVariationChange}
                                        onRemoveVariation={removeVariation}
                                        availableColors={allColors}
                                        availableSizes={availableSizes}
                                        onImageUpload={(e) => handleVariationImageUpload(i, e)}
                                        uploadStatus={uploadingStatus[i]}
                                        isFirstOfColor={isFirst}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                <p className="text-gray-500 text-sm mb-2">Nenhuma variação adicionada.</p>
                                <button type="button" onClick={addVariation} className="text-indigo-600 font-bold text-sm hover:underline">Clique para adicionar cor/tamanho</button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5 pt-4 border-t border-gray-100">
                        {/* --- ATUALIZAÇÃO DE LAYOUT: Cuidados acima, Tabela abaixo --- */}
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">Cuidados com a Peça</label>
                            <textarea name="care_instructions" value={formData.care_instructions || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-32"></textarea>
                        </div>

                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">Guia de Medidas (Tabela)</label>
                             <SizeGuideAdminInput 
                                value={formData.size_guide} 
                                onChange={handleSizeGuideChange} 
                             />
                        </div>
                    </div>
                 </FormSection>
            )}

            {/* --- MÍDIA --- */}
            <FormSection title="Imagens Principais e Vídeo" icon={PhotoIcon}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Upload Rápido</label>
                         <div className="flex gap-2 mb-2">
                             <input type="file" multiple accept="image/*" ref={mainGalleryInputRef} onChange={handleImageChange} className="hidden" />
                             <button type="button" onClick={() => mainGalleryInputRef.current.click()} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1 border border-gray-300 transition-colors">
                                <UploadIcon className="h-6 w-6 text-gray-500" />
                                <span className="text-xs font-bold">Galeria</span>
                             </button>
                             <input type="file" accept="image/*" capture="environment" ref={mainCameraInputRef} onChange={handleImageChange} className="hidden" />
                             <button type="button" onClick={() => mainCameraInputRef.current.click()} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1 border border-gray-300 transition-colors">
                                <CameraIcon className="h-6 w-6 text-gray-500" />
                                <span className="text-xs font-bold">Câmera</span>
                             </button>
                         </div>
                         {uploadStatus && <p className={`text-xs font-bold text-center ${uploadStatus.startsWith('Erro') ? 'text-red-500' : 'text-green-600'} animate-pulse`}>{uploadStatus}</p>}
                    </div>

                    <div className="lg:col-span-2 space-y-3">
                        <label className="block text-sm font-bold text-gray-700">URLs das Imagens (Ou gerenciamento)</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {(formData.images || []).map((img, index) => (
                                <div key={index} className="flex items-center gap-2 group">
                                    <div className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex-shrink-0 overflow-hidden">
                                        <img src={img || 'https://placehold.co/40x40/eee/ccc?text=?'} alt="Thumb" className="w-full h-full object-cover" />
                                    </div>
                                    <input type="text" value={img} onChange={(e) => handleImageArrayChange(index, e.target.value)} className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 text-gray-600" placeholder="https://..." />
                                    <button type="button" onClick={() => removeImageField(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addImageField} className="text-xs font-bold text-indigo-600 hover:underline">+ Adicionar campo de URL</button>
                    </div>

                    <div className="lg:col-span-3">
                         <label className="block text-sm font-bold text-gray-700 mb-1">Link do Vídeo (YouTube)</label>
                         <input type="url" name="video_url" value={formData.video_url || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="https://www.youtube.com/watch?v=..." />
                    </div>
                </div>
            </FormSection>

            {/* --- DETALHES GERAIS E DIMENSÕES --- */}
            <FormSection title="Descrição e Entrega" icon={BoxIcon}>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Completa</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-32" placeholder="Descreva os detalhes, benefícios e diferenciais do produto..."></textarea>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="md:col-span-4 mb-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dimensões para Frete</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                            <input type="number" name="weight" value={formData.weight || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Largura (cm)</label>
                            <input type="number" name="width" value={formData.width || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Altura (cm)</label>
                            <input type="number" name="height" value={formData.height || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Comp. (cm)</label>
                            <input type="number" name="length" value={formData.length || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" required />
                        </div>
                    </div>
                 </div>
            </FormSection>

            {/* --- AÇÕES FIXAS --- */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-1 flex justify-end gap-3 rounded-b-lg shadow-lg z-20">
                <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-all transform active:scale-95 flex items-center gap-2">
                    <CheckIcon className="h-5 w-5"/>
                    Salvar Produto
                </button>
            </div>
        </form>
    );
};
