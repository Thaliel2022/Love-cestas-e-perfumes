// Função auxiliar interna para evitar erros de referência
export const parseJsonString = (jsonString, fallbackValue) => {
    if (!jsonString) return fallbackValue;
    try {
        const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        return Array.isArray(parsed) ? parsed : fallbackValue;
    } catch (e) {
        console.error("Erro ao parsear JSON:", e);
        return fallbackValue;
    }
};

// --- OTIMIZAÇÃO AUTOMÁTICA CLOUDINARY ---
// Transforma URLs do Cloudinary para entregar WebP e qualidade automática
export const optimizeCloudinaryUrl = (url, width = 'auto') => {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('res.cloudinary.com')) {
        // Insere parâmetros de otimização após '/upload/'
        return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
    return url;
};

export const getFirstImage = (imagesJsonString, placeholder = 'https://placehold.co/600x400/222/fff?text=Produto') => {
    const images = parseJsonString(imagesJsonString, []);
    const rawUrl = (Array.isArray(images) && images.length > 0) ? images[0] : placeholder;
    return optimizeCloudinaryUrl(rawUrl);
};
