import { API_URL } from './apiConfig';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

export async function apiService(endpoint, method = 'GET', body = null, options = {}) {
    // Pega o token do localStorage para enviar no header (corrige bloqueios de cookies no mobile)
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
        credentials: 'include', // Essencial para enviar cookies caso o navegador permita
        signal: options.signal,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const finalUrl = `${API_URL}${endpoint}`;
        const response = await fetch(finalUrl, config);
        const contentType = response.headers.get("content-type");
        
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // Se o token expirou, tenta renová-lo
            if (response.status === 401 && data.message && data.message.includes('Token expirado')) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(() => apiService(endpoint, method, body, options));
                }

                isRefreshing = true;
                return new Promise((resolve, reject) => {
                    const currentRefreshToken = localStorage.getItem('refreshToken');
                    // Envia o refreshToken no body como fallback para navegadores restritos
                    apiService('/refresh-token', 'POST', { refreshToken: currentRefreshToken })
                        .then((refreshData) => {
                            // Salva os novos tokens
                            if (refreshData && refreshData.accessToken) {
                                localStorage.setItem('accessToken', refreshData.accessToken);
                                if (refreshData.refreshToken) {
                                    localStorage.setItem('refreshToken', refreshData.refreshToken);
                                }
                            }
                            processQueue(null);
                            resolve(apiService(endpoint, method, body, options));
                        })
                        .catch(err => {
                            processQueue(err);
                            // Apenas dispara evento se não estiver suprimido
                            if (!options.suppressAuthError) {
                                window.dispatchEvent(new Event('auth-error'));
                            }
                            reject(err);
                        })
                        .finally(() => {
                            isRefreshing = false;
                        });
                });
            }
             
             if (response.status === 401 || response.status === 403) {
                 if (!options.suppressAuthError) {
                    window.dispatchEvent(new Event('auth-error'));
                 }
             }

            const errorMessage = (typeof data === 'object' && data.message) ? data.message : (data || `Erro ${response.status}`);
            throw new Error(errorMessage);
        }

        return data;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`API fetch aborted: ${endpoint}`);
        } else {
            console.error(`Erro na API (${endpoint}):`, error);
        }
        if (error instanceof TypeError) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.');
        }
        throw error;
    }
}


export async function apiUploadService(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);

    // ATUALIZAÇÃO: Injeção do token no header para garantir autenticação em requisições Multipart
    const token = localStorage.getItem('accessToken');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: 'POST',
        credentials: 'include', // Essencial para cookies
        headers, // Headers adicionados aqui
        body: formData,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new Event('auth-error'));
            }
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload (${endpoint}):`, error);
        throw error;
    }
}

export async function apiImageUploadService(endpoint, file) {
    const formData = new FormData();
    formData.append('image', file);

    // ATUALIZAÇÃO: Injeção do token no header para garantir autenticação em requisições Multipart
    const token = localStorage.getItem('accessToken');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: 'POST',
        credentials: 'include', // Essencial para cookies
        headers, // Headers adicionados aqui
        body: formData,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new Event('auth-error'));
            }
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload da imagem (${endpoint}):`, error);
        throw error;
    }
}
