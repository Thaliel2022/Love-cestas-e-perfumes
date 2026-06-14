import { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { ExclamationCircleIcon, RulerIcon } from '../icons';
import { getFirstImage } from '../../utils/cloudinary';

// --- ILUSTRAÇÃO COM FOTO 3D ---
export const MeasurementIllustration = ({ highlightedPart }) => {
    const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const part = normalize(highlightedPart);

    // Mapeamento de imagens para cada parte do corpo
    const images = {
        default: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1768960483/nqnr0xsv9efkbdf6cnox.jpg",
        busto: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1769136284/pa8anzq4wjiiqhrzabwv.png",
        cintura: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1769136317/n2eqa8eapljs2hiwcncq.png",
        quadril: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1769136334/igo6ctd9lyu9kppyvavg.png"
    };

    // Seleciona a imagem ativa baseada na parte destacada ou usa a padrão
    const activeImage = images[part] || images.default;
    
    // Só exibe os desenhos SVG de overlay se estivermos usando a imagem padrão.
    // Para as novas imagens de busto/cintura/quadril, a própria imagem já serve de guia.
    const showOverlay = activeImage === images.default;

    return (
        <div className="relative w-full max-w-[200px] mx-auto transition-all duration-300 select-none rounded-lg overflow-hidden shadow-md bg-white aspect-[2/3]">
            {/* FOTO DO BONECO (Dinâmica) */}
            <img 
                key={activeImage} // Key força re-render suave ao trocar imagem
                src={activeImage} 
                alt={`Guia de Medidas - ${highlightedPart || 'Geral'}`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            />

            {/* CAMADA DE DESTAQUE (SVG Overlay) */}
            <svg 
                viewBox="0 0 500 750" 
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
            >
                <defs>
                    <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                        <path d="M0,0 L0,4 L4,2 z" fill="#ef4444" />
                    </marker>
                </defs>

                {/* Só desenha as linhas de Busto/Cintura/Quadril se estiver na imagem padrão */}
                {showOverlay && (
                    <>
                        {/* BUSTO (Altura ajustada) */}
                        <g className={`transition-opacity duration-300 ease-in-out ${part === 'busto' ? 'opacity-100' : 'opacity-0'}`}>
                            <ellipse cx="250" cy="210" rx="100" ry="25" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="4" className="animate-pulse" />
                            <line x1="100" y1="210" x2="400" y2="210" stroke="#ef4444" strokeWidth="2" strokeDasharray="8,4" />
                            <text x="250" y="200" textAnchor="middle" fill="#ef4444" fontSize="24" fontWeight="bold" style={{textShadow: '0 1px 3px rgba(255,255,255,0.9)'}}>BUSTO</text>
                        </g>

                        {/* CINTURA (Parte mais fina) */}
                        <g className={`transition-opacity duration-300 ease-in-out ${part === 'cintura' ? 'opacity-100' : 'opacity-0'}`}>
                            <ellipse cx="250" cy="315" rx="85" ry="20" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="4" className="animate-pulse" />
                            <line x1="120" y1="315" x2="380" y2="315" stroke="#ef4444" strokeWidth="2" strokeDasharray="8,4" />
                            <text x="250" y="305" textAnchor="middle" fill="#ef4444" fontSize="24" fontWeight="bold" style={{textShadow: '0 1px 3px rgba(255,255,255,0.9)'}}>CINTURA</text>
                        </g>

                        {/* QUADRIL (Parte mais larga) */}
                        <g className={`transition-opacity duration-300 ease-in-out ${part === 'quadril' ? 'opacity-100' : 'opacity-0'}`}>
                            <ellipse cx="250" cy="410" rx="110" ry="28" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="4" className="animate-pulse" />
                            <line x1="100" y1="410" x2="400" y2="410" stroke="#ef4444" strokeWidth="2" strokeDasharray="8,4" />
                            <text x="250" y="400" textAnchor="middle" fill="#ef4444" fontSize="24" fontWeight="bold" style={{textShadow: '0 1px 3px rgba(255,255,255,0.9)'}}>QUADRIL</text>
                        </g>
                    </>
                )}

                {/* COMPRIMENTO (Lateral Vertical) - Mantém visível sempre que solicitado */}
                <g className={`transition-opacity duration-300 ease-in-out ${part && part.includes('comp') ? 'opacity-100' : 'opacity-0'}`}>
                    {/* Linha vertical com marcadores */}
                    <line x1="60" y1="150" x2="60" y2="600" stroke="#ef4444" strokeWidth="5" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                    {/* Tracinhos horizontais nas pontas */}
                    <line x1="40" y1="150" x2="80" y2="150" stroke="#ef4444" strokeWidth="3" />
                    <line x1="40" y1="600" x2="80" y2="600" stroke="#ef4444" strokeWidth="3" />
                    {/* Texto vertical */}
                    <text x="85" y="375" fill="#ef4444" fontSize="22" fontWeight="bold" style={{writingMode: "vertical-rl", textOrientation: "upright", textShadow: '0 1px 3px rgba(255,255,255,0.9)'}}>COMPRIMENTO</text>
                </g>
            </svg>
            
            {/* LEGENDA FLUTUANTE */}
            <div className={`absolute bottom-3 left-0 right-0 text-center transition-all duration-300 ${part ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <span className="bg-black/90 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border border-gray-600 uppercase tracking-widest">
                    {highlightedPart}
                </span>
            </div>
        </div>
    );
};

export const SizeGuideAdminInput = ({ value, onChange }) => {
    const safeValue = useMemo(() => {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (parsed && Array.isArray(parsed.rows)) return parsed;
        } catch(e) {}
        return {
            columns: ["Tam.", "Busto", "Cintura", "Quadril", "Comp."],
            rows: [
                { size: "P", values: ["", "", "", ""] },
                { size: "M", values: ["", "", "", ""] },
                { size: "G", values: ["", "", "", ""] },
                { size: "GG", values: ["", "", "", ""] },
            ]
        };
    }, [value]);

    const [data, setData] = useState(safeValue);

    useEffect(() => {
        setData(safeValue);
    }, [safeValue]);

    const handleValueChange = (rowIndex, colIndex, val) => {
        const newRows = [...data.rows];
        newRows[rowIndex].values[colIndex] = val;
        const nextData = { ...data, rows: newRows };
        setData(nextData);
        onChange(JSON.stringify(nextData));
    };

    return (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm w-full max-w-full overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-700">Preencher Medidas (cm)</p>
            </div>
            
            <div className="md:hidden p-3 space-y-3 bg-gray-50/30">
                {data.rows.map((row, rIndex) => (
                    <div key={rIndex} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                            <span className="flex items-center justify-center w-8 h-8 font-black text-gray-800 bg-gray-100 rounded-full border border-gray-200 text-sm">
                                {row.size}
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {row.values.map((val, cIndex) => (
                                <div key={cIndex} className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase text-center truncate w-full">
                                        {data.columns[cIndex + 1]}
                                    </label>
                                    <input 
                                        type="tel" 
                                        value={val} 
                                        onChange={(e) => handleValueChange(rIndex, cIndex, e.target.value)}
                                        className="w-full h-9 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-center text-sm font-bold bg-white"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold uppercase">
                        <tr>
                            {data.columns.map((col, i) => (
                                <th key={i} className="px-3 py-2 border-b text-center">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.rows.map((row, rIndex) => (
                            <tr key={rIndex} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-black text-gray-800 bg-gray-50/50 text-center border-r border-gray-100 w-16">
                                    {row.size}
                                </td>
                                {row.values.map((val, cIndex) => (
                                    <td key={cIndex} className="px-2 py-1">
                                        <input 
                                            type="text" 
                                            value={val} 
                                            onChange={(e) => handleValueChange(rIndex, cIndex, e.target.value)}
                                            className="w-full h-8 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 text-center text-xs font-medium"
                                            placeholder="-"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const SizeGuideDisplay = ({ dataString }) => {
    const [highlightedPart, setHighlightedPart] = useState(null);

    const data = useMemo(() => {
        try {
            return JSON.parse(dataString);
        } catch (e) {
            return null;
        }
    }, [dataString]);

    if (!data || !data.rows) return null;

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden w-full">
            {/* Gap reduzido de md:gap-12 para md:gap-6 para dar mais espaço à tabela */}
            <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="flex-1 w-full min-w-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <RulerIcon className="h-5 w-5 text-amber-400" />
                            <h4 className="text-amber-400 font-bold uppercase tracking-wider text-sm">Guia de Tamanhos (cm)</h4>
                        </div>
                        <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-1 rounded hidden md:inline-block border border-gray-700">
                            Passe o mouse na tabela
                        </span>
                    </div>
                    
                    <div className="md:hidden space-y-3">
                        <p className="text-[10px] text-center text-gray-400 mb-2">Toque nas medidas para ver no manequim</p>
                        {data.rows.map((row, i) => (
                            <div key={i} className="bg-gray-800/50 rounded p-3 flex items-center justify-between border border-gray-700">
                                <span className="font-black text-white bg-gray-700 w-8 h-8 flex items-center justify-center rounded-full text-sm border border-gray-600">{row.size}</span>
                                <div className="flex gap-4 text-xs text-gray-300">
                                    {row.values.map((val, j) => (
                                        <div key={j} className="text-center" onClick={() => setHighlightedPart(data.columns[j+1])}>
                                            <span className={`block text-[9px] uppercase font-bold mb-0.5 ${highlightedPart === data.columns[j+1] ? 'text-amber-400' : 'text-gray-500'}`}>{data.columns[j+1]}</span>
                                            <span className={`font-bold ${highlightedPart === data.columns[j+1] ? 'text-amber-400' : 'text-white'}`}>{val || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* overflow-x-auto e min-w-max garantem que a tabela não será cortada */}
                    <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-700 shadow-inner bg-gray-800/50">
                        <table className="w-full text-sm text-gray-300 min-w-max">
                            <thead>
                                <tr className="bg-gray-800 border-b border-gray-700">
                                    {data.columns.map((col, i) => (
                                        <th key={i} className={`px-4 py-3 font-bold text-amber-500 ${i === 0 ? 'text-left pl-6' : 'text-center cursor-help hover:bg-gray-700 transition-colors'}`} onMouseEnter={() => i > 0 && setHighlightedPart(col)} onMouseLeave={() => setHighlightedPart(null)}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {data.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 pl-6 font-bold text-white bg-gray-800/30 border-r border-gray-700/50">{row.size}</td>
                                        {row.values.map((val, j) => (
                                            <td key={j} className={`px-4 py-3 text-center font-medium transition-colors ${highlightedPart === data.columns[j+1] ? 'bg-amber-400/20 text-amber-300' : ''}`} onMouseEnter={() => setHighlightedPart(data.columns[j+1])} onMouseLeave={() => setHighlightedPart(null)}>{val || '-'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="w-full md:w-auto flex flex-col items-center justify-center bg-white p-4 rounded-xl border-4 border-gray-800 shadow-xl relative min-w-[200px]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-gray-700 shadow-md whitespace-nowrap">Como Medir</div>
                    <MeasurementIllustration highlightedPart={highlightedPart} />
                </div>
            </div>
        </div>
    );
};

export const InstallmentModal = memo(({ isOpen, onClose, installments, interestFreeInstallments = 4 }) => {
    if (!isOpen || !installments || installments.length === 0) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Opções de Parcelamento" dark>
            <div className="space-y-2">
                {installments.map(p => (
                    <div key={p.installments} className="flex justify-between items-center gap-3 p-3 border border-gray-700/80 rounded-xl bg-black/30 transition-colors hover:bg-gray-800/50">
                        <div className="min-w-0">
                            <p className="font-bold text-base text-white leading-snug">
                                {p.installments <= interestFreeInstallments
                                    ? `${p.installments}x de R$ ${p.installment_amount.toFixed(2).replace('.', ',')} sem juros`
                                    : p.recommended_message.replace('.', ',').replace('sem acréscimo', 'com juros').replace('sem juros', 'com juros')}
                            </p>
                            <p className="text-sm text-gray-400 mt-0.5">Total: R$ {p.total_amount.toFixed(2).replace('.', ',')}</p>
                        </div>
                        {p.installments <= interestFreeInstallments ? (
                            <span className="text-xs font-semibold text-green-400 bg-green-900/30 border border-green-700/50 px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">Sem juros</span>
                        ) : (
                             <span className="text-xs font-semibold text-amber-400 bg-amber-900/20 border border-amber-700/40 px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">Com juros</span>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-6 text-center">Você poderá escolher o número de parcelas na hora de fechar a compra.</p>
        </Modal>
    );
});

export const VariationSelector = ({ product, variations, selectedColor, setSelectedColor, selectedSize, setSelectedSize, error }) => {
    
    const uniqueColors = useMemo(() => {
        const colorsMap = new Map();
        if (!variations || !product) return [];

        variations.forEach(v => {
            if (v.color) {
                if (!colorsMap.has(v.color)) {
                    const primaryImage = (v.images && v.images.length > 0) 
                        ? v.images[0] 
                        : getFirstImage(product.images);
                    colorsMap.set(v.color, { image: primaryImage, hasStock: false });
                }
                
                if (v.stock > 0) {
                    const info = colorsMap.get(v.color);
                    info.hasStock = true;
                }
            }
        });
        return Array.from(colorsMap, ([name, info]) => ({ name, image: info.image, hasStock: info.hasStock }));
    }, [variations, product]);

    const allSizesForColor = useMemo(() => {
        if (!selectedColor) return [];
        const sizeMap = new Map();
        variations
            .filter(v => v.color === selectedColor)
            .forEach(v => {
                const currentStock = sizeMap.get(v.size)?.stock || 0;
                sizeMap.set(v.size, { size: v.size, stock: currentStock + v.stock });
            });
        return Array.from(sizeMap.values());
    }, [variations, selectedColor]);

    const handleColorChange = (color, hasStock) => {
        if (!hasStock) return; 

        setSelectedColor(color);
        const sizesForNewColor = variations
            .filter(v => v.color === color && v.stock > 0)
            .map(v => v.size);
        
        if (sizesForNewColor.length === 1) {
            setSelectedSize(sizesForNewColor[0]);
        } else {
            setSelectedSize(''); 
        }
    };

    const showError = error && !selectedSize;
    
    return (
        <div className="space-y-6">
            {/* Seção de Cores */}
            <div>
                 <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    Cor: <span className="text-white font-normal capitalize">{selectedColor || 'Selecione'}</span>
                 </h3>
                <div className="flex flex-wrap gap-4">
                    {uniqueColors.map(colorInfo => {
                         const isOutOfStock = !colorInfo.hasStock;
                         return (
                             <div key={colorInfo.name}
                                onClick={() => handleColorChange(colorInfo.name, colorInfo.hasStock)}
                                className={`group relative w-16 h-16 rounded-full transition-all duration-300 p-0.5 
                                    ${selectedColor === colorInfo.name 
                                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900 scale-110 cursor-default' 
                                        : isOutOfStock 
                                            ? 'opacity-40 cursor-not-allowed grayscale filter' 
                                            : 'cursor-pointer hover:ring-2 hover:ring-gray-600 hover:ring-offset-1 hover:ring-offset-gray-900 opacity-90 hover:opacity-100 hover:scale-105'}`}
                                title={colorInfo.name + (isOutOfStock ? " (Esgotado)" : "")}
                            >
                                 <img src={colorInfo.image} alt={colorInfo.name} className="w-full h-full object-cover rounded-full bg-gray-800 shadow-sm"/>
                                 
                                 {isOutOfStock && (
                                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                         <div className="w-full h-0.5 bg-red-500/80 rotate-45 absolute"></div>
                                         <div className="w-full h-0.5 bg-red-500/80 -rotate-45 absolute"></div>
                                     </div>
                                 )}
                             </div>
                         );
                    })}
                </div>
            </div>

            {/* Seção de Tamanhos - LIMPA DE ESTILOS INLINE (Usa apenas as classes puras do Tailwind) */}
            <AnimatePresence>
                {selectedColor && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`transition-colors duration-300 ${showError ? 'p-3 -m-3 bg-red-900/10 border border-red-500/30 rounded-lg' : ''}`}
                     >
                        <h3 className={`text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2 ${showError ? 'text-red-400' : 'text-gray-400'}`}>
                            Tamanho: 
                            <span className={showError ? 'text-red-400 font-bold animate-pulse' : 'text-white font-normal'}>
                                {selectedSize || (showError ? 'SELECIONE UM TAMANHO' : 'Selecione')}
                            </span>
                            {showError && <ExclamationCircleIcon className="h-4 w-4 text-red-500 inline ml-1" />}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2.5">
                            {allSizesForColor.length > 0 ? (
                                allSizesForColor.map(({ size, stock }) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        disabled={stock === 0}
                                        className={`min-w-[3.5rem] h-11 px-3 border rounded-md font-bold text-sm transition-all duration-200 flex items-center justify-center relative overflow-hidden
                                            ${selectedSize === size 
                                                ? 'bg-amber-400 text-black border-amber-400 shadow-lg scale-105' 
                                                : 'bg-transparent border-gray-600 text-gray-300 hover:border-gray-400 hover:bg-gray-800'
                                            }
                                            ${stock === 0 ? 'opacity-40 cursor-not-allowed bg-gray-900 border-gray-800 text-gray-600 decoration-slice line-through' : ''}
                                            ${showError && !selectedSize ? 'border-red-500 text-red-100 bg-red-900/20' : ''}`
                                        }
                                    >
                                        {size}
                                        {stock > 0 && stock <= 2 && selectedSize !== size && (
                                            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                        )}
                                    </button>
                                ))
                            ) : (
                                 <p className="text-gray-500 text-sm italic py-2">Indisponível nesta cor.</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
