export const CLOTHING_COLOR_HEX = {
    'Amarelo': '#F4D03F',
    'Azul': '#2563EB',
    'Azul Bebê': '#93C5FD',
    'Azul Marinho': '#1E3A5F',
    'Azul Royal': '#4169E1',
    'Bege': '#D4C4A8',
    'Bordô': '#800020',
    'Branco': '#FFFFFF',
    'Caqui': '#C3B091',
    'Caramelo': '#C68E17',
    'Cinza': '#9CA3AF',
    'Cinza Chumbo': '#4B5563',
    'Coral': '#FF7F50',
    'Creme': '#FFFDD0',
    'Dourado': '#D4AF37',
    'Fúcsia': '#FF00FF',
    'Goiaba': '#ED5565',
    'Jeans': '#1560BD',
    'Jeans Claro': '#5D8AA8',
    'Jeans Escuro': '#0F3057',
    'Laranja': '#F97316',
    'Lilás': '#C8A2C8',
    'Marrom': '#78350F',
    'Marsala': '#955251',
    'Mostarda': '#FFDB58',
    'Nude': '#E3BC9A',
    'Off-White': '#FAF9F6',
    'Ouro': '#D4AF37',
    'Prata': '#C0C0C0',
    'Prateado': '#C0C0C0',
    'Preto': '#000000',
    'Rosa': '#F472B6',
    'Rosa Bebê': '#FBCFE8',
    'Rosa Choque': '#FF1493',
    'Rosê': '#B76E79',
    'Roxo': '#7C3AED',
    'Salmão': '#FA8072',
    'Terracota': '#E2725B',
    'Turquesa': '#40E0D0',
    'Verde': '#22C55E',
    'Verde Água': '#7FFFD4',
    'Verde Bandeira': '#009739',
    'Verde Limão': '#84CC16',
    'Verde Militar': '#4B5320',
    'Vermelho': '#EF4444',
    'Vinho': '#722F37',
    'Violeta': '#8B5CF6',
};

export const getClothingColorSwatchStyle = (colorName) => {
    if (!colorName) return { backgroundColor: '#FFFFFF' };
    if (colorName === 'Multicolorido') {
        return { background: 'conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)' };
    }
    if (colorName === 'Estampado') {
        return {
            background: 'repeating-linear-gradient(-45deg, #f9fafb, #f9fafb 3px, #d1d5db 3px, #d1d5db 6px)',
        };
    }
    const hex = CLOTHING_COLOR_HEX[colorName];
    if (hex) return { backgroundColor: hex };
    return { backgroundColor: '#E5E7EB' };
};
