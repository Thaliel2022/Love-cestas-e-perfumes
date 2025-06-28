// ARQUIVO: server.js (ATUALIZADO COM WEBHOOK ROBUSTO)

// Importa os pacotes necessários
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const cloudinary = require('cloudinary').v2;
const stream = require('stream');

// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only';

// --- CONFIGURAÇÕES DE SEGURANÇA ---
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_IN_MINUTES = 15;
const loginAttempts = {};

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].trim();
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    next();
};
app.use(sanitizeInput);

// --- CONFIGURAÇÃO DA CONEXÃO COM O BANCO DE DADOS ---
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lovecestas_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection()
    .then(connection => {
        console.log('Conectado ao banco de dados MySQL com sucesso!');
        connection.release();
    })
    .catch(err => {
        console.error('Falha ao conectar ao banco de dados:', err);
    });

// --- CONFIGURAÇÃO DO CLIENTE DO MERCADO PAGO ---
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const preference = new Preference(mpClient);

// --- CONFIGURAÇÃO DO CLOUDINARY ---
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// --- CONFIGURAÇÃO DO MULTER PARA UPLOAD ---
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });


// --- MIDDLEWARE DE VERIFICAÇÃO DE TOKEN ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token inválido.' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
    }
    next();
};


// --- ROTA DE UPLOAD DE IMAGEM (CLOUDINARY) ---
app.post('/api/upload/image', verifyToken, memoryUpload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo de imagem enviado.' });
    }
    try {
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: "image" },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary upload error:", error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            uploadStream.end(req.file.buffer);
        });
        res.status(200).json({ message: 'Upload bem-sucedido', imageUrl: result.secure_url });
    } catch (error) {
        console.error("Erro no upload para o Cloudinary:", error);
        res.status(500).json({ message: 'Falha ao fazer upload da imagem.' });
    }
});


// --- ROTAS DE AUTENTICAÇÃO E USUÁRIOS ---
app.post('/api/register', async (req, res) => {
    const { name, email, password, cpf } = req.body;
    if (!name || !email || !password || !cpf) {
        return res.status(400).json({ message: "Nome, email, senha e CPF são obrigatórios." });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [result] = await db.query("INSERT INTO users (`name`, `email`, `cpf`, `password`) VALUES (?, ?, ?, ?)", [name, email, cpf.replace(/\D/g, ''), hashedPassword]);
        res.status(201).json({ message: "Usuário registrado com sucesso!", userId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const message = err.message.includes('email') 
                ? "Este e-mail já está em uso." 
                : "Este CPF já está cadastrado.";
            return res.status(409).json({ message });
        }
        console.error("Erro ao registrar usuário:", err);
        res.status(500).json({ message: "Erro interno ao registrar usuário." });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email e senha são obrigatórios." });

    if (loginAttempts[email] && loginAttempts[email].lockUntil > Date.now()) {
        return res.status(429).json({ message: `Muitas tentativas de login. Tente novamente em ${LOCK_TIME_IN_MINUTES} minutos.` });
    }

    try {
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            loginAttempts[email] = loginAttempts[email] || { count: 0, lockUntil: null };
            loginAttempts[email].count++;
            if (loginAttempts[email].count >= MAX_LOGIN_ATTEMPTS) {
                loginAttempts[email].lockUntil = Date.now() + LOCK_TIME_IN_MINUTES * 60 * 1000;
            }
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }

        delete loginAttempts[email];

        const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        const { password: _, ...userData } = user;
        res.json({ message: "Login bem-sucedido", user: userData, token: token });
    } catch (err) {
        console.error("Erro ao fazer login:", err);
        res.status(500).json({ message: "Erro interno ao fazer login." });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    const { email, cpf } = req.body;
    if (!email || !cpf) {
        return res.status(400).json({ message: "Email e CPF são obrigatórios." });
    }
    try {
        const [users] = await db.query("SELECT id FROM users WHERE email = ? AND cpf = ?", [email, cpf.replace(/\D/g, '')]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado com o e-mail e CPF fornecidos." });
        }
        res.status(200).json({ message: "Usuário validado com sucesso." });
    } catch (err) {
        console.error("Erro ao validar usuário para recuperação de senha:", err);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { email, cpf, newPassword } = req.body;
    if (!email || !cpf || !newPassword) {
        return res.status(400).json({ message: "Email, CPF e nova senha são obrigatórios." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    try {
        const [users] = await db.query("SELECT id FROM users WHERE email = ? AND cpf = ?", [email, cpf.replace(/\D/g, '')]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Credenciais inválidas. Não é possível redefinir a senha." });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await db.query("UPDATE users SET password = ? WHERE email = ? AND cpf = ?", [hashedPassword, email, cpf.replace(/\D/g, '')]);
        
        res.status(200).json({ message: "Senha redefinida com sucesso." });

    } catch (err) {
        console.error("Erro ao redefinir a senha:", err);
        res.status(500).json({ message: "Erro interno do servidor ao redefinir a senha." });
    }
});


// --- ROTA DE RASTREIO (INTEGRAÇÃO REAL COM LINK & TRACK) ---
app.get('/api/track/:code', async (req, res) => {
    const { code } = req.params;
    
    const LT_USER = process.env.LT_USER || 'teste';
    const LT_TOKEN = process.env.LT_TOKEN || '1abcd00b2731640e886fb41a8a9671ad1434c599dbaa0a0de9a5aa619f29a83f';
    const LT_API_URL = `https://api.linketrack.com/track/json?user=${LT_USER}&token=${LT_TOKEN}&codigo=${code}`;

    console.log(`Iniciando rastreio para o código: ${code} na URL: ${LT_API_URL}`);
    try {
        const apiResponse = await fetch(LT_API_URL);
        const responseText = await apiResponse.text();
        console.log(`Resposta da API Link&Track - Status: ${apiResponse.status}, Corpo: ${responseText}`);
        
        const data = JSON.parse(responseText);

        if (!apiResponse.ok || data.erro) {
            const errorMessage = data.erro || 'Não foi possível rastrear o objeto. Verifique o código.';
            return res.status(404).json({ message: errorMessage });
        }
        
        const formattedHistory = data.eventos.map(event => ({
            status: event.status,
            location: event.local,
            date: new Date(`${event.data.split('/').reverse().join('-')}T${event.hora}`).toISOString()
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error("ERRO DETALHADO ao buscar rastreio com Link&Track:", error);
        res.status(500).json({ message: "Erro interno no servidor ao tentar buscar o rastreio." });
    }
});


// --- ROTA DE CÁLCULO DE FRETE ---
app.post('/api/shipping/calculate', async (req, res) => {
    const { cep_destino, products } = req.body; 
    if (!cep_destino || !products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "CEP de destino e informações dos produtos são obrigatórios." });
    }
    
    const ME_TOKEN = process.env.ME_TOKEN;
    if (!ME_TOKEN) {
        return res.status(500).json({ message: "API de frete não configurada no servidor." });
    }

    const productIds = products.map(p => p.id);
    const [dbProducts] = await db.query(`SELECT id, weight, width, height, length FROM products WHERE id IN (?)`, [productIds]);
    
    const productsWithDetails = products.map(p => {
        const dbProduct = dbProducts.find(dbp => dbp.id == p.id);
        return {...p, ...dbProduct};
    });

    const payload = {
        from: { postal_code: process.env.ORIGIN_CEP || "58038101" },
        to: { postal_code: cep_destino.replace(/\D/g, '') },
        products: productsWithDetails.map(product => ({ 
            id: String(product.id),
            width: Number(product.width),
            height: Number(product.height),
            length: Number(product.length),
            weight: Number(product.weight),
            insurance_value: Number(product.price),
            quantity: product.quantity || product.qty || 1
        }))
    };

    const ME_API_URL = 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';

    try {
        const apiResponse = await fetch(ME_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ME_TOKEN}`,
                'User-Agent': 'Love Cestas e Perfumes (contato@lovecestaseperfumes.com.br)'
            },
            body: JSON.stringify(payload)
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            const errorMessage = data.message || (data.errors ? JSON.stringify(data.errors) : 'Erro desconhecido no cálculo de frete.');
            return res.status(apiResponse.status).json({ message: errorMessage });
        }
        
        const filteredOptions = data
            .filter(option => !option.error)
            .map(option => ({
                name: option.name,
                price: parseFloat(option.price),
                delivery_time: option.delivery_time,
                company: { name: option.company.name, picture: option.company.picture }
            }));
        
        res.json(filteredOptions);
    } catch (error) {
        console.error("Erro ao calcular frete com Melhor Envio:", error);
        res.status(500).json({ message: "Erro interno no servidor ao tentar calcular o frete." });
    }
});


// --- ROTAS DE PRODUTOS ---
app.get('/api/products', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, AVG(r.rating) as avg_rating
            FROM products p
            LEFT JOIN reviews r ON p.id = r.product_id
            WHERE p.is_active = 1
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;
        const [products] = await db.query(sql);
        res.json(products);
    } catch (err) { 
        console.error("Erro ao buscar produtos:", err);
        res.status(500).json({ message: "Erro ao buscar produtos." }); 
    }
});

app.get('/api/products/all', verifyToken, verifyAdmin, async (req, res) => {
    const { search } = req.query;
    try {
        let sql = `
            SELECT p.*, AVG(r.rating) as avg_rating
            FROM products p
            LEFT JOIN reviews r ON p.id = r.product_id
        `;
        const params = [];
        if (search) {
            sql += " WHERE p.name LIKE ? OR p.brand LIKE ? OR p.category LIKE ?";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        sql += " GROUP BY p.id ORDER BY p.id DESC";
        const [products] = await db.query(sql, params);
        res.json(products);
    } catch (err) {
        console.error("Erro ao buscar todos os produtos:", err);
        res.status(500).json({ message: "Erro ao buscar todos os produtos." });
    }
});

app.get('/api/products/search-suggestions', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
        return res.json([]);
    }
    try {
        const searchTerm = `%${q}%`;
        const sql = "SELECT id, name FROM products WHERE is_active = 1 AND (name LIKE ? OR brand LIKE ?) LIMIT 10";
        const [suggestions] = await db.query(sql, [searchTerm, searchTerm]);
        res.json(suggestions);
    } catch (err) {
        console.error("Erro ao buscar sugestões de pesquisa:", err);
        res.status(500).json({ message: "Erro ao buscar sugestões." });
    }
});


app.get('/api/products/:id', async (req, res) => {
    try {
        const [products] = await db.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
        if (products.length === 0) return res.status(404).json({ message: "Produto não encontrado." });
        res.json(products[0]);
    } catch (err) { res.status(500).json({ message: "Erro ao buscar produto." }); }
});

app.get('/api/products/:id/related-by-purchase', async (req, res) => {
    const { id } = req.params;
    try {
        const sqlFindOrders = `SELECT DISTINCT order_id FROM order_items WHERE product_id = ?`;
        const [ordersWithProduct] = await db.query(sqlFindOrders, [id]);
        
        if (ordersWithProduct.length === 0) {
            return res.json([]);
        }

        const orderIds = ordersWithProduct.map(o => o.order_id);

        const sqlFindRelated = `
            SELECT 
                p.*,
                COUNT(oi.product_id) AS purchase_frequency
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id IN (?)
            AND oi.product_id != ?
            AND p.is_active = 1
            GROUP BY oi.product_id
            ORDER BY purchase_frequency DESC
            LIMIT 8;
        `;
        const [relatedProducts] = await db.query(sqlFindRelated, [orderIds, id]);
        res.json(relatedProducts);

    } catch (err) {
        console.error("Erro ao buscar produtos relacionados por compra:", err);
        res.status(500).json({ message: "Erro ao buscar produtos relacionados." });
    }
});

app.post('/api/products', verifyToken, verifyAdmin, async (req, res) => {
    const { name, brand, category, price, stock, images, description, notes, how_to_use, ideal_for, volume, weight, width, height, length, is_active } = req.body;
    try {
        const sql = "INSERT INTO products (name, brand, category, price, stock, images, description, notes, how_to_use, ideal_for, volume, weight, width, height, length, sales, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)";
        const params = [name, brand, category, price, stock, images, description, notes, how_to_use, ideal_for, volume, weight, width, height, length, is_active ? 1 : 0];
        const [result] = await db.query(sql, params);
        res.status(201).json({ message: "Produto criado com sucesso!", productId: result.insertId });
    } catch (err) { 
        console.error("Erro ao criar produto:", err);
        res.status(500).json({ message: "Erro interno ao criar produto." }); 
    }
});

app.put('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, brand, category, price, stock, images, description, notes, how_to_use, ideal_for, volume, weight, width, height, length, is_active } = req.body;
    try {
        const sql = "UPDATE products SET name = ?, brand = ?, category = ?, price = ?, stock = ?, images = ?, description = ?, notes = ?, how_to_use = ?, ideal_for = ?, volume = ?, weight = ?, width = ?, height = ?, length = ?, is_active = ? WHERE id = ?";
        const params = [name, brand, category, price, stock, images, description, notes, how_to_use, ideal_for, volume, weight, width, height, length, is_active, id];
        await db.query(sql, params);
        res.json({ message: "Produto atualizado com sucesso!" });
    } catch (err) { 
        console.error("Erro ao atualizar produto:", err);
        res.status(500).json({ message: "Erro interno ao atualizar produto." }); 
    }
});

app.delete('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
        res.json({ message: "Produto deletado com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar produto:", err);
        res.status(500).json({ message: "Erro interno ao deletar produto." });
    }
});

app.delete('/api/products', verifyToken, verifyAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "É necessário fornecer um array de IDs de produtos." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const CHUNK_SIZE = 100;
        let totalAffectedRows = 0;

        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE);
            const placeholders = chunk.map(() => '?').join(',');
            const sql = `DELETE FROM products WHERE id IN (${placeholders})`;
            const [result] = await connection.query(sql, chunk);
            totalAffectedRows += result.affectedRows;
        }
        
        await connection.commit();
        res.json({ message: `${totalAffectedRows} produtos deletados com sucesso.` });
    } catch (err) {
        await connection.rollback();
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            console.error("Tentativa de deletar produto referenciado em pedidos:", err);
            return res.status(409).json({ message: "Erro: Um ou mais produtos não puderam ser excluídos pois estão associados a pedidos existentes. Considere desativá-los em vez de excluir." });
        }
        console.error("Erro ao deletar múltiplos produtos:", err);
        res.status(500).json({ message: "Erro interno ao deletar produtos." });
    } finally {
        connection.release();
    }
});

app.post('/api/products/import', verifyToken, verifyAdmin, memoryUpload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo CSV enviado.' });
    }

    const products = [];
    const connection = await db.getConnection();

    try {
        await new Promise((resolve, reject) => {
            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);

            bufferStream
                .pipe(csv())
                .on('data', (row) => {
                    if (!row.name || !row.price) return;
                     products.push([
                        row.name, row.brand || '', row.category || 'Geral', parseFloat(row.price) || 0,
                        parseInt(row.stock) || 0, row.images ? `["${row.images.split(',').join('","')}"]` : '[]', row.description || '',
                        row.notes || '', row.how_to_use || '', row.ideal_for || '',
                        row.volume || '', 
                        parseFloat(row.weight) || 0.3, parseInt(row.width) || 11, parseInt(row.height) || 11, parseInt(row.length) || 16,
                        row.is_active === '1' || String(row.is_active).toLowerCase() === 'true' ? 1 : 0
                    ]);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (products.length > 0) {
            await connection.beginTransaction();
            const sql = "INSERT INTO products (name, brand, category, price, stock, images, description, notes, how_to_use, ideal_for, volume, weight, width, height, length, is_active) VALUES ?";
            await connection.query(sql, [products]);
            await connection.commit();
            res.status(201).json({ message: `${products.length} produtos importados com sucesso!` });
        } else {
            res.status(400).json({ message: 'Nenhum produto válido foi encontrado no arquivo CSV.' });
        }
    } catch (err) {
        await connection.rollback();
        console.error("Erro durante a importação de CSV:", err);
        res.status(500).json({ message: `Erro ao processar o arquivo: ${err.message}` });
    } finally {
        connection.release();
    }
});


// --- ROTAS DE AVALIAÇÕES (REVIEWS) ---
app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const [reviews] = await db.query("SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC", [req.params.id]);
        res.json(reviews);
    } catch (err) { res.status(500).json({ message: "Erro ao buscar avaliações." }); }
});

app.post('/api/reviews', verifyToken, async (req, res) => {
    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating || !req.user.id) return res.status(400).json({ message: "ID do produto, avaliação e ID do usuário são necessários." });
    try {
        await db.query("INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)", [product_id, req.user.id, rating, comment]);
        res.status(201).json({ message: "Avaliação adicionada com sucesso!" });
    } catch (err) { res.status(500).json({ message: "Erro interno ao adicionar avaliação." }); }
});


// --- ROTAS DE CARRINHO PERSISTENTE ---
app.get('/api/cart', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const sql = `
            SELECT p.*, uc.quantity as qty
            FROM user_carts uc
            JOIN products p ON uc.product_id = p.id
            WHERE uc.user_id = ?
        `;
        const [cartItems] = await db.query(sql, [userId]);
        res.json(cartItems);
    } catch (error) {
        console.error("Erro ao buscar carrinho do usuário:", error);
        res.status(500).json({ message: "Erro ao buscar carrinho." });
    }
});

app.post('/api/cart', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
        return res.status(400).json({ message: "ID do produto e quantidade são obrigatórios." });
    }

    try {
        const sql = `
            INSERT INTO user_carts (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = ?;
        `;
        await db.query(sql, [userId, productId, quantity, quantity]);
        res.status(200).json({ message: "Carrinho atualizado com sucesso." });
    } catch (error) {
        console.error("Erro ao atualizar o carrinho:", error);
        res.status(500).json({ message: "Erro ao atualizar carrinho." });
    }
});

app.delete('/api/cart/:productId', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;

    try {
        await db.query("DELETE FROM user_carts WHERE user_id = ? AND product_id = ?", [userId, productId]);
        res.status(200).json({ message: "Item removido do carrinho." });
    } catch (error) {
        console.error("Erro ao remover item do carrinho:", error);
        res.status(500).json({ message: "Erro ao remover item do carrinho." });
    }
});

app.delete('/api/cart', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        await db.query("DELETE FROM user_carts WHERE user_id = ?", [userId]);
        res.status(200).json({ message: "Carrinho esvaziado com sucesso." });
    } catch (error) {
        console.error("Erro ao esvaziar o carrinho:", error);
        res.status(500).json({ message: "Erro ao esvaziar o carrinho." });
    }
});

// --- ROTAS DE PEDIDOS ---
app.get('/api/orders/my-orders', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const [orders] = await db.query("SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC", [userId]);
        const detailedOrders = await Promise.all(orders.map(async (order) => {
            const [items] = await db.query("SELECT oi.*, p.name, p.images FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?", [order.id]);
            return { ...order, items };
        }));
        res.json(detailedOrders);
    } catch (err) {
        console.error("Erro ao buscar histórico de pedidos:", err);
        res.status(500).json({ message: "Erro ao buscar histórico de pedidos." });
    }
});

app.get('/api/orders', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [orders] = await db.query("SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.date DESC");
        res.json(orders);
    } catch (err) { res.status(500).json({ message: "Erro ao buscar pedidos." }); }
});

app.get('/api/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [orders] = await db.query("SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?", [id]);
        if (orders.length === 0) {
            return res.status(404).json({ message: "Pedido não encontrado." });
        }
        const order = orders[0];
        const [items] = await db.query("SELECT oi.*, p.name, p.images FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?", [id]);
        
        const detailedOrder = { ...order, items };
        res.json(detailedOrder);
    } catch (err) {
        console.error("Erro ao buscar detalhes do pedido:", err);
        res.status(500).json({ message: "Erro ao buscar detalhes do pedido." });
    }
});

app.post('/api/orders', verifyToken, async (req, res) => {
    const { items, total, shippingAddress, paymentMethod, shipping_method, shipping_cost, coupon_code, discount_amount } = req.body;
    if (!req.user.id || !items || items.length === 0 || total === undefined) return res.status(400).json({ message: "Faltam dados para criar o pedido." });
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const item of items) {
            const [product] = await connection.query("SELECT stock FROM products WHERE id = ? FOR UPDATE", [item.id]);
            if (product.length === 0 || product[0].stock < item.qty) {
                throw new Error(`Produto "${item.name || item.id}" não tem estoque suficiente.`);
            }
        }
        
        const orderSql = "INSERT INTO orders (user_id, total, shipping_address, payment_method, shipping_method, shipping_cost, coupon_code, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const orderParams = [req.user.id, total, JSON.stringify(shippingAddress), paymentMethod, shipping_method, shipping_cost, coupon_code || null, discount_amount || 0];
        const [orderResult] = await connection.query(orderSql, orderParams);
        const orderId = orderResult.insertId;
        
        const itemPromises = items.map(item => Promise.all([
            connection.query("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)", [orderId, item.id, item.qty, item.price]),
            connection.query("UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?", [item.qty, item.qty, item.id])
        ]));
        await Promise.all(itemPromises);
        
        if (coupon_code) {
            const [coupons] = await connection.query("SELECT id FROM coupons WHERE code = ?", [coupon_code]);
            if (coupons.length > 0) {
                const couponId = coupons[0].id;
                await connection.query(
                    "INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES (?, ?, ?)",
                    [couponId, req.user.id, orderId]
                );
            }
        }
        
        await connection.query("DELETE FROM user_carts WHERE user_id = ?", [req.user.id]);
        
        await connection.commit();
        res.status(201).json({ message: "Pedido criado com sucesso!", orderId: orderId });
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao criar pedido:", err);
        res.status(500).json({ message: err.message || "Falha ao criar o pedido." });
    } finally {
        connection.release();
    }
});


app.put('/api/orders/:id/address', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { address } = req.body;
    const userId = req.user.id;

    try {
        const [order] = await db.query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [id, userId]);
        if (order.length === 0) {
            return res.status(404).json({ message: "Pedido não encontrado ou não pertence a este usuário." });
        }
        if (order[0].status !== 'Pendente') {
            return res.status(403).json({ message: "Endereço não pode ser alterado para este pedido." });
        }
        await db.query("UPDATE orders SET shipping_address = ? WHERE id = ?", [JSON.stringify(address), id]);
        res.json({ message: "Endereço do pedido atualizado com sucesso." });
    } catch (err) {
        console.error("Erro ao atualizar endereço do pedido:", err);
        res.status(500).json({ message: "Erro interno ao atualizar endereço." });
    }
});

app.put('/api/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, tracking_code } = req.body;
    
    let fieldsToUpdate = [];
    let queryParams = [];

    if (status) {
        fieldsToUpdate.push("status = ?");
        queryParams.push(status);
    }
    if (tracking_code !== undefined) { 
        fieldsToUpdate.push("tracking_code = ?");
        queryParams.push(tracking_code);
    }
    
    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "Nenhum dado para atualizar foi fornecido." });
    }

    queryParams.push(id);
    
    try {
        const sql = `UPDATE orders SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        await db.query(sql, queryParams);
        res.json({ message: "Pedido atualizado com sucesso." });
    } catch (err) { 
        console.error("Erro ao atualizar pedido:", err);
        res.status(500).json({ message: "Erro interno ao atualizar o pedido." }); 
    }
});

// --- ROTA PARA CRIAR PAGAMENTO COM MERCADO PAGO ---
app.post('/api/create-mercadopago-payment', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ message: "ID do pedido é obrigatório." });
        }
        const appUrl = process.env.APP_URL;
        if (!appUrl) {
            console.error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida. Pagamentos não podem ser processados.");
            return res.status(500).json({ message: "Erro de configuração do servidor: a URL da aplicação não está definida." });
        }

        const [orderResult] = await db.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        if (!orderResult.length) {
            return res.status(404).json({ message: "Pedido não encontrado."});
        }
        const order = orderResult[0];

        const MINIMUM_TRANSACTION_VALUE = 1.00;
        const orderTotal = Number(Number(order.total).toFixed(2));
        if (orderTotal < MINIMUM_TRANSACTION_VALUE) {
            return res.status(400).json({ 
                message: `O valor total do pedido (R$ ${orderTotal.toFixed(2)}) é muito baixo. O valor mínimo para pagamentos online é de R$ ${MINIMUM_TRANSACTION_VALUE.toFixed(2)}.` 
            });
        }

        const [orderItems] = await db.query(
            `SELECT oi.quantity, oi.price, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`, 
            [orderId]
        );
        if (!orderItems.length) {
            return res.status(400).json({ message: "Nenhum item encontrado para este pedido." });
        }
        
        const productsSubtotal = orderItems.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
        
        let finalItemPriceForMP = productsSubtotal;
        let finalShippingCostForMP = Number(Number(order.shipping_cost).toFixed(2));
        
        if (order.coupon_code) {
            const [couponResult] = await db.query("SELECT type FROM coupons WHERE code = ?", [order.coupon_code]);
            if (couponResult.length > 0) {
                const couponType = couponResult[0].type;
                if (couponType === 'free_shipping') {
                    finalShippingCostForMP = 0;
                } else {
                    finalItemPriceForMP -= Number(order.discount_amount || 0);
                }
            }
        }
        
        finalItemPriceForMP = Math.max(0, finalItemPriceForMP);

        const productNames = orderItems.map(item => `${item.quantity}x ${item.name}`).join(', ');

        const preferenceBody = {
            items: [
                {
                    title: `Pedido #${order.id} - Love Cestas e Perfumes`,
                    description: `Itens: ${productNames}`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: Number(finalItemPriceForMP.toFixed(2))
                }
            ],
            external_reference: orderId.toString(),
            back_urls: {
                success: `${appUrl}/#order-success/${orderId}`,
                failure: `${appUrl}/#cart`,
                pending: `${appUrl}/#account`,
            },
            notification_url: `${process.env.BACKEND_URL || appUrl}/api/mercadopago-webhook`
        };

        if (finalShippingCostForMP > 0) {
            preferenceBody.shipments = {
                cost: finalShippingCostForMP,
                mode: 'not_specified',
            };
        }
        
        const result = await preference.create({ body: preferenceBody });

        res.json({
            preferenceId: result.id,
            init_point: result.init_point,
        });

    } catch (error) {
        console.error('Erro ao criar preferência do Mercado Pago:', error?.cause || error);
        const errorMessage = error?.cause?.error || error.message || 'Falha ao gerar link de pagamento.';
        res.status(500).json({ message: errorMessage });
    }
});

app.get('/api/mercadopago/installments', async (req, res) => {
    const { amount } = req.body;

    if (!amount) {
        return res.status(400).json({ message: "O valor (amount) é obrigatório." });
    }
    
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
        return res.status(500).json({ message: "API de pagamento não configurada no servidor." });
    }

    try {
        const paymentMethodsResponse = await fetch('https://api.mercadopago.com/v1/payment_methods', {
             headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });
        const paymentMethods = await paymentMethodsResponse.json();

        const creditCardMethods = paymentMethods.filter(pm => 
            pm.payment_type_id === 'credit_card' && 
            pm.status === 'active' &&
            pm.settings && pm.settings.length > 0
        );
        
        let bestInstallmentPlan = [];
        let maxNoInterestInstallments = 0;

        for(const pm of creditCardMethods) {
            const installmentsResponse = await fetch(`https://api.mercadopago.com/v1/payment_methods/installments?amount=${amount}&payment_method_id=${pm.id}`, {
                 headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
            });
            
            if (installmentsResponse.ok) {
                const installmentsData = await installmentsResponse.json();
                if (installmentsData.length > 0 && installmentsData[0].payer_costs) {
                    const currentPlan = installmentsData[0].payer_costs;
                    
                    const currentMaxNoInterest = Math.max(0, ...currentPlan
                        .filter(p => p.installment_rate === 0)
                        .map(p => p.installments)
                    );

                    if (currentMaxNoInterest > maxNoInterestInstallments) {
                        maxNoInterestInstallments = currentMaxNoInterest;
                        bestInstallmentPlan = currentPlan;
                    } else if (maxNoInterestInstallments === 0 && currentPlan.length > bestInstallmentPlan.length) {
                        bestInstallmentPlan = currentPlan;
                    }
                }
            }
        }
        
        if(bestInstallmentPlan.length === 0) {
            return res.status(404).json({ message: 'Não foi possível obter opções de parcelamento para este valor.' });
        }
        
        res.json(bestInstallmentPlan);

    } catch (error) {
        console.error("Erro ao buscar parcelas do Mercado Pago:", error);
        res.status(500).json({ message: "Erro interno do servidor ao buscar parcelas." });
    }
});


// <<< ALTERAÇÃO: ROTA DE WEBHOOK ROBUSTA >>>
app.post('/api/mercadopago-webhook', (req, res) => {
    // 1. Responde imediatamente ao Mercado Pago para evitar timeouts
    res.sendStatus(200); 

    // 2. Processa a notificação de forma assíncrona
    (async () => {
        try {
            const { query, body } = req;
            if (!body) {
                console.log("Webhook recebido com corpo vazio.");
                return;
            }

            const topic = query.topic || query.type || body.topic;
            const paymentId = query.id || query['data.id'] || body.data?.id;

            console.log("Processando webhook do Mercado Pago:", { topic, id: paymentId });

            if (topic === 'payment' && paymentId) {
                const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${mpClient.config.accessToken}` }
                });

                if (!paymentResponse.ok) {
                    const errorText = await paymentResponse.text();
                    console.error(`Falha ao consultar pagamento ${paymentId} no MP: Status ${paymentResponse.status}`, errorText);
                    return;
                }
                
                const payment = await paymentResponse.json();
                const orderId = payment.external_reference;
                const paymentStatus = payment.status;

                if (orderId) {
                    console.log(`Atualizando pedido ${orderId} para o status de pagamento: ${paymentStatus}`);
                    let newOrderStatus = 'Pendente';
                    if (paymentStatus === 'approved') {
                        newOrderStatus = 'Processando';
                    } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
                        newOrderStatus = 'Cancelado';
                    }
                    
                    const [currentOrderResult] = await db.query("SELECT status FROM orders WHERE id = ?", [orderId]);
                    
                    if (currentOrderResult.length > 0) {
                        const currentStatus = currentOrderResult[0].status;

                        if (newOrderStatus === 'Cancelado' && currentStatus !== 'Cancelado') {
                            const connection = await db.getConnection();
                            try {
                                await connection.beginTransaction();
                                const [itemsToReturn] = await connection.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
                                if (itemsToReturn.length > 0) {
                                    const stockUpdatePromises = itemsToReturn.map(item =>
                                        connection.query("UPDATE products SET stock = stock + ?, sales = sales - ? WHERE id = ?", [item.quantity, item.quantity, item.product_id])
                                    );
                                    await Promise.all(stockUpdatePromises);
                                    console.log(`Estoque de ${itemsToReturn.length} item(ns) do pedido ${orderId} foi devolvido e vendas decrementadas.`);
                                }
                                await connection.query("UPDATE orders SET status = ?, payment_status = ? WHERE id = ?", [newOrderStatus, paymentStatus, orderId]);
                                await connection.commit();
                            } catch(stockError) {
                                await connection.rollback();
                                console.error(`ERRO CRÍTICO ao devolver estoque para o pedido ${orderId}:`, stockError);
                            } finally {
                                connection.release();
                            }
                        } else if (currentStatus === 'Pendente') { // Só atualiza se o status for pendente para evitar sobrescrever status manuais
                            await db.query("UPDATE orders SET status = ?, payment_status = ? WHERE id = ?", [newOrderStatus, paymentStatus, orderId]);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Erro GRAVE ao processar webhook do Mercado Pago de forma assíncrona:', error);
        }
    })(); // Imediatamente invoca a função assíncrona
});

// --- ROTAS DE USUÁRIOS (para Admin e Perfil) ---
app.get('/api/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [users] = await db.query("SELECT id, name, email, cpf, role, created_at FROM users");
        res.json(users);
    } catch (err) { res.status(500).json({ message: "Erro ao buscar usuários." }); }
});

app.get('/api/users/me', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado." });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar dados do usuário." });
    }
});

app.put('/api/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    if (!name || !email || !role) {
        return res.status(400).json({ message: "Nome, email e função são obrigatórios." });
    }

    try {
        let queryParams = [name, email, role];
        let sql = "UPDATE users SET name = ?, email = ?, role = ?";

        if (password && password.trim() !== '') {
            if (password.length < 6) {
                return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
            }
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            sql += ", password = ?";
            queryParams.push(hashedPassword);
        }

        sql += " WHERE id = ?";
        queryParams.push(id);

        const [result] = await db.query(sql, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        res.json({ message: "Usuário atualizado com sucesso!" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Este e-mail já está em uso por outro usuário." });
        }
        console.error("Erro ao atualizar usuário:", err);
        res.status(500).json({ message: "Erro interno ao atualizar usuário." });
    }
});

app.put('/api/users/me/password', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { password } = req.body;
    if (!password || password.length < 6) {
        return res.status(400).json({ message: "A senha é obrigatória e deve ter no mínimo 6 caracteres." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
        res.json({ message: "Senha atualizada com sucesso." });
    } catch(err) {
        res.status(500).json({ message: "Erro ao atualizar a senha." });
    }
});

app.delete('/api/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ message: "Usuário deletado com sucesso." });
    } catch (err) { res.status(500).json({ message: "Erro interno ao deletar usuário." }); }
});

// --- ROTAS DE CUPONS (CRUD COMPLETO E AVANÇADO) ---
app.get('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [coupons] = await db.query("SELECT * FROM coupons ORDER BY id DESC");
        res.json(coupons);
    } catch (err) { res.status(500).json({ message: "Erro ao buscar cupons." }); }
});

app.post('/api/coupons/validate', verifyToken, async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;

    try {
        const [coupons] = await db.query("SELECT * FROM coupons WHERE code = ?", [code.toUpperCase()]);
        if (coupons.length === 0) {
            return res.status(404).json({ message: "Cupom inválido ou não existe." });
        }
        const coupon = coupons[0];

        if (!coupon.is_active) {
            return res.status(400).json({ message: "Este cupom não está mais ativo." });
        }

        if (coupon.validity_days) {
            const createdAt = new Date(coupon.created_at);
            const expiryDate = new Date(createdAt.setDate(createdAt.getDate() + coupon.validity_days));
            if (new Date() > expiryDate) {
                return res.status(400).json({ message: "Este cupom expirou." });
            }
        }
        
        if (coupon.is_first_purchase) {
            const [orders] = await db.query("SELECT id FROM orders WHERE user_id = ?", [userId]);
            if (orders.length > 0) {
                return res.status(403).json({ message: "Este cupom é válido apenas para a primeira compra." });
            }
        }
        
        if (coupon.is_single_use_per_user) {
            const [usage] = await db.query("SELECT id FROM coupon_usage WHERE user_id = ? AND coupon_id = ?", [userId, coupon.id]);
            if (usage.length > 0) {
                return res.status(403).json({ message: "Você já utilizou este cupom." });
            }
        }
        
        res.json({ coupon });

    } catch (err) {
        console.error("Erro ao validar cupom:", err);
        res.status(500).json({ message: "Erro interno ao validar cupom." });
    }
});

app.post('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
    const { code, type, value, is_active, validity_days, is_first_purchase, is_single_use_per_user } = req.body;
    if (!code || !type || (type !== 'free_shipping' && (value === undefined || value === null || value === ''))) {
        return res.status(400).json({ message: "Código, tipo e valor (exceto para frete grátis) são obrigatórios." });
    }
    try {
        const sql = "INSERT INTO coupons (code, type, value, is_active, validity_days, is_first_purchase, is_single_use_per_user) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const params = [
            code.toUpperCase(), type, type === 'free_shipping' ? null : value, 
            is_active ? 1 : 0, validity_days || null, is_first_purchase ? 1 : 0, 
            is_single_use_per_user ? 1 : 0
        ];
        const [result] = await db.query(sql, params);
        res.status(201).json({ message: "Cupom criado com sucesso!", couponId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Este código de cupom já existe." });
        }
        console.error("Erro ao criar cupom:", err);
        res.status(500).json({ message: "Erro interno ao criar cupom." });
    }
});

app.put('/api/coupons/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { code, type, value, is_active, validity_days, is_first_purchase, is_single_use_per_user } = req.body;
    if (!code || !type || (type !== 'free_shipping' && (value === undefined || value === null || value === ''))) {
        return res.status(400).json({ message: "Código, tipo e valor (exceto para frete grátis) são obrigatórios." });
    }
    try {
        const sql = "UPDATE coupons SET code = ?, type = ?, value = ?, is_active = ?, validity_days = ?, is_first_purchase = ?, is_single_use_per_user = ? WHERE id = ?";
        const params = [
            code.toUpperCase(), type, type === 'free_shipping' ? null : value, 
            is_active ? 1 : 0, validity_days || null, is_first_purchase ? 1 : 0, 
            is_single_use_per_user ? 1 : 0, id
        ];
        await db.query(sql, params);
        res.json({ message: "Cupom atualizado com sucesso." });
    } catch (err) {
         if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Este código de cupom já existe." });
         }
        console.error("Erro ao atualizar cupom:", err);
        res.status(500).json({ message: "Erro interno ao atualizar cupom." });
    }
});

app.delete('/api/coupons/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM coupons WHERE id = ?", [req.params.id]);
        res.json({ message: "Cupom deletado com sucesso." });
    } catch (err) { res.status(500).json({ message: "Erro interno ao deletar cupom." }); }
});

// --- ROTAS DA LISTA DE DESEJOS (WISHLIST) ---
app.get('/api/wishlist', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const sql = "SELECT p.* FROM products p JOIN wishlist w ON p.id = w.product_id WHERE w.user_id = ?";
        const [wishlistItems] = await db.query(sql, [userId]);
        res.json(wishlistItems);
    } catch (err) {
        console.error("Erro ao buscar lista de desejos:", err);
        res.status(500).json({ message: "Erro ao buscar lista de desejos." });
    }
});

app.post('/api/wishlist', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "ID do produto é obrigatório." });

    try {
        const sql = "INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)";
        await db.query(sql, [userId, productId]);
        const [product] = await db.query("SELECT * FROM products WHERE id = ?", [productId]);
        res.status(201).json(product[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const [product] = await db.query("SELECT * FROM products WHERE id = ?", [productId]);
            return res.status(200).json(product[0]);
        }
        console.error("Erro ao adicionar à lista de desejos:", err);
        res.status(500).json({ message: "Erro ao adicionar à lista de desejos." });
    }
});

app.delete('/api/wishlist/:productId', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ message: "ID do produto é obrigatório." });

    try {
        const sql = "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?";
        const [result] = await db.query(sql, [userId, productId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Produto não encontrado na lista de desejos." });
        }
        res.status(200).json({ message: "Produto removido da lista de desejos." });
    } catch (err) {
        console.error("Erro ao remover da lista de desejos:", err);
        res.status(500).json({ message: "Erro ao remover da lista de desejos." });
    }
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Servidor backend completo rodando na porta ${PORT}`);
});