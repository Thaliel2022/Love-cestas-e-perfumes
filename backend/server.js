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
const crypto = require('crypto');
const { Resend } = require('resend');

// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();


// --- Configuração do Resend ---
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL;


// ---> Constantes para status de pedidos
const ORDER_STATUS = {
    PENDING: 'Pendente',
    PAYMENT_APPROVED: 'Pagamento Aprovado',
    PAYMENT_REJECTED: 'Pagamento Recusado',
    PROCESSING: 'Separando Pedido',
    SHIPPED: 'Enviado',
    OUT_FOR_DELIVERY: 'Saiu para Entrega',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado'
};


// Verificação de Variáveis de Ambiente Essenciais
const checkRequiredEnvVars = () => {
    const requiredVars = [
        'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET',
        'MP_ACCESS_TOKEN', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET', 'APP_URL', 'BACKEND_URL', 'ME_TOKEN', 'ORIGIN_CEP',
        'RESEND_API_KEY', 'FROM_EMAIL', 'CRON_SECRET'
    ];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error('ERRO CRÍTICO: As seguintes variáveis de ambiente estão faltando:');
        missingVars.forEach(varName => console.error(`- ${varName}`));
        console.error('O servidor não pode iniciar. Por favor, configure as variáveis no seu arquivo .env');
        process.exit(1);
    }
    console.log('Verificação de variáveis de ambiente concluída com sucesso.');
};
checkRequiredEnvVars();


// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

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
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
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


// --- FUNÇÕES E MIDDLEWARES AUXILIARES ---

// Validador de email
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

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

const updateOrderStatus = async (orderId, newStatus, connection, notes = null) => {
    await connection.query("UPDATE orders SET status = ? WHERE id = ?", [newStatus, orderId]);
    await connection.query(
        "INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)",
        [orderId, newStatus, notes]
    );
    console.log(`Status do pedido #${orderId} atualizado para "${newStatus}" e registrado no histórico.`);
};

const sendEmailAsync = async (options) => {
    try {
        await resend.emails.send(options);
        console.log(`E-mail com assunto "${options.subject}" enviado para ${options.to}.`);
    } catch (emailError) {
        console.error(`FALHA AO ENVIAR E-MAIL para ${options.to}:`, emailError);
    }
};


// --- E-MAIL TEMPLATES ---
const getFirstImage = (imagesJsonString) => {
    try {
        if (!imagesJsonString) return 'https://placehold.co/80x80/2A3546/D4AF37?text=?';
        const images = JSON.parse(imagesJsonString);
        return (Array.isArray(images) && images.length > 0) ? images[0] : 'https://placehold.co/80x80/2A3546/D4AF37?text=?';
    } catch (e) {
        return 'https://placehold.co/80x80/2A3546/D4AF37?text=?';
    }
};

const createEmailBase = (content) => {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Love Cestas e Perfumes</title>
        <style>
            body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #111827; }
            table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            td, p, h1, h3 { font-family: Arial, Helvetica, sans-serif; }
            .container { width: 100%; max-width: 600px; margin: 0 auto; }
            .content-cell { padding: 35px; background-color: #1F2937; border-radius: 8px; }
            @media screen and (max-width: 600px) {
                .content-cell { padding: 20px !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; width: 100%; background-color: #111827;">
        <center>
            <table class="container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px;">
                <tr>
                    <td align="center" style="padding: 20px 0;">
                        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 28px; margin: 0;">Love Cestas e Perfumes</h1>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                                <td class="content-cell" style="padding: 35px; background-color: #1F2937; border-radius: 8px;">
                                    ${content}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td align="center" style="padding: 20px 0;">
                        <p style="color: #9CA3AF; font-size: 12px; font-family: Arial, sans-serif; margin:0;">&copy; ${new Date().getFullYear()} Love Cestas e Perfumes. Todos os direitos reservados.</p>
                    </td>
                </tr>
            </table>
        </center>
    </body>
    </html>
    `;
};

const createItemsListHtml = (items, title) => {
    if (!items || items.length === 0) return '';
   
    const itemsHtml = items.map(item => {
        const variationText = item.variation_details 
            ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: #9CA3AF; font-family: Arial, sans-serif;">${item.variation_details.color} / ${item.variation_details.size}</p>` 
            : '';

        return `
        <tr style="border-bottom: 1px solid #4B5563;">
            <td valign="top" style="padding: 15px 10px 15px 0;">
                <img src="${getFirstImage(item.images)}" alt="${item.name}" width="60" style="border-radius: 4px; object-fit: contain; background-color: #ffffff; padding: 2px;">
            </td>
            <td valign="middle">
                <p style="margin: 0; font-weight: bold; color: #E5E7EB; font-family: Arial, sans-serif; font-size: 15px;">${item.name}</p>
                ${variationText}
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #9CA3AF; font-family: Arial, sans-serif;">Quantidade: ${item.quantity}</p>
            </td>
        </tr>
    `}).join('');

    return `
        <h3 style="color: #E5E7EB; border-bottom: 1px solid #4B5563; padding-bottom: 8px; margin: 25px 0 10px; font-family: Arial, sans-serif; font-size: 18px;">${title}</h3>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
            ${itemsHtml}
        </table>
    `;
};

const createWelcomeEmail = (customerName) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Seja Bem-Vindo(a)!</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Sua conta em nossa loja foi criada com sucesso. Estamos felizes em ter você conosco!</p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 20px 0;"><a href="${appUrl}" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #D4AF37; color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Visitar a Loja</a></td></tr></table>
    `;
    return createEmailBase(content);
};

const createGeneralUpdateEmail = (customerName, orderId, newStatus, items) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const itemsHtml = createItemsListHtml(items, "Itens no seu pedido:");
   
    let introMessage;
    switch(newStatus) {
        case ORDER_STATUS.CANCELLED:
            introMessage = `Temos uma atualização sobre o seu pedido #${orderId}. Ele foi cancelado. Se você não solicitou o cancelamento, por favor, entre em contato conosco.`;
            break;
        case ORDER_STATUS.REFUNDED:
            introMessage = `Temos uma atualização sobre o seu pedido #${orderId}. O reembolso foi processado com sucesso.`;
            break;
        default:
            introMessage = `Boas notícias! O status do seu pedido #${orderId} foi atualizado para:`;
    }

    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Atualização do Pedido #${orderId}</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">${introMessage}</p>
        <div style="font-size: 18px; font-weight: bold; color: #111827; padding: 12px; background-color: #D4AF37; border-radius: 5px; text-align: center; margin: 20px 0; font-family: Arial, sans-serif;">${newStatus}</div>
        ${itemsHtml}
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 20px 0;"><a href="${appUrl}/#account/orders" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #D4AF37; color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Ver Detalhes do Pedido</a></td></tr></table>
    `;
    return createEmailBase(content);
};

const createShippedEmail = (customerName, orderId, trackingCode, items) => {
    const trackingUrl = `https://www.linketrack.com.br/track/${trackingCode}`;
    const itemsHtml = createItemsListHtml(items, "Itens enviados:");

    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Seu Pedido Foi Enviado!</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Ótima notícia! Seu pedido #${orderId} já está a caminho!</p>
        <div style="border: 1px dashed #4B5563; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0 0 10px 0; color: #E5E7EB; font-family: Arial, sans-serif;">Use o código de rastreio abaixo:</p>
            <div style="font-size: 18px; font-weight: bold; color: #E5E7EB; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;">${trackingCode}</div>
        </div>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 20px 0;"><a href="${trackingUrl}" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #D4AF37; color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Rastrear Pedido</a></td></tr></table>
        ${itemsHtml}
    `;
    return createEmailBase(content);
};


// --- ROTAS DA APLICAÇÃO ---

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Servidor está no ar!', timestamp: new Date().toISOString() });
});

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
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Formato de e-mail inválido." });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter no mínimo 6 caracteres." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [result] = await db.query("INSERT INTO users (`name`, `email`, `cpf`, `password`) VALUES (?, ?, ?, ?)", [name, email, cpf.replace(/\D/g, ''), hashedPassword]);
       
        sendEmailAsync({
            from: FROM_EMAIL,
            to: email,
            subject: 'Bem-vindo(a) à Love Cestas e Perfumes!',
            html: createWelcomeEmail(name),
        });

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

        const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        const { password: _, ...userData } = user;
        res.json({ message: "Login bem-sucedido", user: userData, token: token });
    } catch (err) {
        console.error("Erro ao fazer login:", err);
        res.status(500).json({ message: "Erro interno ao fazer login." });
    }
});

// ********************************************************************
// * INÍCIO DA ATUALIZAÇÃO: Lógica de Redefinição de Senha Simplificada *
// ********************************************************************
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
// ******************************************************************
// * FIM DA ATUALIZAÇÃO: Lógica de Redefinição de Senha Simplificada *
// ******************************************************************


// --- ROTA DE RASTREIO ---
app.get('/api/track/:code', async (req, res) => {
    const { code } = req.params;
   
    const LT_USER = process.env.LT_USER || 'teste';
    const LT_TOKEN = process.env.LT_TOKEN || '1abcd00b2731640e886fb41a8a9671ad1434c599dbaa0a0de9a5aa619f29a83f';
    const LT_API_URL = `https://api.linketrack.com/track/json?user=${LT_USER}&token=${LT_TOKEN}&codigo=${code}`;

    console.log(`Iniciando rastreio para o código: ${code}`);
    try {
        const apiResponse = await fetch(LT_API_URL);
        const responseText = await apiResponse.text();
       
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
   
    try {
        const cepCheckResponse = await fetch(`https://viacep.com.br/ws/${cep_destino.replace(/\D/g, '')}/json/`);
        const cepCheckData = await cepCheckResponse.json();
        if (cepCheckData.erro) {
            return res.status(404).json({ message: "CEP não encontrado. Por favor, verifique o CEP digitado." });
        }
    } catch (cepError) {
        console.warn("Aviso: Falha ao pré-validar CEP com ViaCEP, o cálculo prosseguirá.", cepError);
    }
   
    const ME_TOKEN = process.env.ME_TOKEN;
   
    const productIds = products.map(p => p.id);
    const [dbProducts] = await db.query(`SELECT id, weight, width, height, length FROM products WHERE id IN (?)`, [productIds]);
   
    const productsWithDetails = products.map(p => {
        const dbProduct = dbProducts.find(dbp => dbp.id == p.id);
        return {...p, ...dbProduct};
    });

    const payload = {
        from: { postal_code: process.env.ORIGIN_CEP },
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
    } catch (err) { 
        console.error("Erro ao buscar produto por ID:", err);
        res.status(500).json({ message: "Erro ao buscar produto." }); 
    }
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
    const { product_type = 'perfume', ...productData } = req.body;
   
    const fields = [
        'name', 'brand', 'category', 'price', 'images', 'description', 
        'weight', 'width', 'height', 'length', 'is_active', 'product_type'
    ];
    const values = [
        productData.name, productData.brand, productData.category, productData.price, 
        productData.images, productData.description, productData.weight, productData.width, 
        productData.height, productData.length, productData.is_active ? 1 : 0, product_type
    ];

    if (product_type === 'perfume') {
        fields.push('stock', 'notes', 'how_to_use', 'ideal_for', 'volume');
        values.push(productData.stock, productData.notes, productData.how_to_use, productData.ideal_for, productData.volume);
    } else if (product_type === 'clothing') {
        fields.push('variations', 'size_guide', 'care_instructions', 'stock');
        const variations = JSON.parse(productData.variations || '[]');
        const totalStock = variations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        values.push(productData.variations, productData.size_guide, productData.care_instructions, totalStock);
    }

    try {
        const sql = `INSERT INTO products (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
        const [result] = await db.query(sql, values);
        res.status(201).json({ message: "Produto criado com sucesso!", productId: result.insertId });
    } catch (err) { 
        console.error("Erro ao criar produto:", err);
        res.status(500).json({ message: "Erro interno ao criar produto." }); 
    }
});

app.put('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { product_type = 'perfume', ...productData } = req.body;

    let fieldsToUpdate = [
        'name', 'brand', 'category', 'price', 'images', 'description', 
        'weight', 'width', 'height', 'length', 'is_active', 'product_type'
    ];
    let values = [
        productData.name, productData.brand, productData.category, productData.price, 
        productData.images, productData.description, productData.weight, productData.width, 
        productData.height, productData.length, productData.is_active, product_type
    ];

    if (product_type === 'perfume') {
        fieldsToUpdate.push('stock', 'notes', 'how_to_use', 'ideal_for', 'volume');
        values.push(productData.stock, productData.notes, productData.how_to_use, productData.ideal_for, productData.volume);
    } else if (product_type === 'clothing') {
        fieldsToUpdate.push('variations', 'size_guide', 'care_instructions', 'stock');
        const variations = JSON.parse(productData.variations || '[]');
        const totalStock = variations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        values.push(productData.variations, productData.size_guide, productData.care_instructions, totalStock);
    }
   
    values.push(id);

    try {
        const setClause = fieldsToUpdate.map(field => `\`${field}\` = ?`).join(', ');
        const sql = `UPDATE products SET ${setClause} WHERE id = ?`;
        await db.query(sql, values);
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
                    if (!row.name || !row.price || !row.product_type) return;

                    let values;
                    if (row.product_type === 'perfume') {
                        values = {
                            product_type: 'perfume',
                            name: row.name, brand: row.brand || '', category: row.category || 'Geral', price: parseFloat(row.price) || 0,
                            stock: parseInt(row.stock) || 0, images: row.images ? `["${row.images.split(',').join('","')}"]` : '[]',
                            description: row.description || '', notes: row.notes || '', how_to_use: row.how_to_use || '',
                            ideal_for: row.ideal_for || '', volume: row.volume || '',
                            weight: parseFloat(row.weight) || 0.3, width: parseInt(row.width) || 11,
                            height: parseInt(row.height) || 11, length: parseInt(row.length) || 16,
                            is_active: row.is_active === '1' || String(row.is_active).toLowerCase() === 'true' ? 1 : 0
                        };
                    } else if (row.product_type === 'clothing') {
                        const variations = JSON.parse(row.variations || '[]');
                        const totalStock = variations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
                        values = {
                            product_type: 'clothing',
                            name: row.name, brand: row.brand || '', category: row.category || 'Geral', price: parseFloat(row.price) || 0,
                            stock: totalStock, images: row.images ? `["${row.images.split(',').join('","')}"]` : '[]',
                            description: row.description || '', variations: row.variations || '[]',
                            size_guide: row.size_guide || '', care_instructions: row.care_instructions || '',
                            weight: parseFloat(row.weight) || 0.3, width: parseInt(row.width) || 11,
                            height: parseInt(row.height) || 11, length: parseInt(row.length) || 16,
                            is_active: row.is_active === '1' || String(row.is_active).toLowerCase() === 'true' ? 1 : 0
                        };
                    }
                    if (values) products.push(values);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (products.length > 0) {
            await connection.beginTransaction();
            for (const product of products) {
                const fields = Object.keys(product);
                const values = Object.values(product);
                const sql = `INSERT INTO products (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
                await connection.query(sql, values);
            }
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
    } catch (err) { 
        console.error("Erro ao buscar avaliações:", err);
        res.status(500).json({ message: "Erro ao buscar avaliações." }); 
    }
});

app.post('/api/reviews', verifyToken, async (req, res) => {
    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating || !req.user.id) return res.status(400).json({ message: "ID do produto, avaliação e ID do usuário são obrigatórios." });
    try {
        await db.query("INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)", [product_id, req.user.id, rating, comment]);
        res.status(201).json({ message: "Avaliação adicionada com sucesso!" });
    } catch (err) { 
        console.error("Erro ao adicionar avaliação:", err);
        res.status(500).json({ message: "Erro interno ao adicionar avaliação." }); 
    }
});


// --- ROTAS DE CARRINHO PERSISTENTE ---
app.get('/api/cart', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const sql = `
            SELECT p.*, uc.quantity as qty, uc.variation_details
            FROM user_carts uc
            JOIN products p ON uc.product_id = p.id
            WHERE uc.user_id = ?
        `;
        const [cartItems] = await db.query(sql, [userId]);
        const parsedItems = cartItems.map(item => {
            const variation = item.variation_details ? JSON.parse(item.variation_details) : null;
            const cartItemId = variation 
                ? `${item.id}-${variation.color}-${variation.size}` 
                : String(item.id);
            return {
                ...item,
                variation,
                cartItemId
            };
        });
        res.json(parsedItems);
    } catch (error) {
        console.error("Erro ao buscar carrinho do usuário:", error);
        res.status(500).json({ message: "Erro ao buscar carrinho." });
    }
});

app.post('/api/cart', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { productId, quantity, variation } = req.body;

    if (!productId || !quantity || quantity < 1) {
        return res.status(400).json({ message: "ID do produto e quantidade são obrigatórios." });
    }
   
    const variationDetailsString = variation ? JSON.stringify(variation) : null;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [existingItem] = await connection.query(
            "SELECT id FROM user_carts WHERE user_id = ? AND product_id = ? AND (variation_details <=> ?)",
            [userId, productId, variationDetailsString]
        );

        if (existingItem.length > 0) {
            await connection.query(
                "UPDATE user_carts SET quantity = ? WHERE id = ?",
                [quantity, existingItem[0].id]
            );
        } else {
            await connection.query(
                "INSERT INTO user_carts (user_id, product_id, quantity, variation_details) VALUES (?, ?, ?, ?)",
                [userId, productId, quantity, variationDetailsString]
            );
        }
        await connection.commit();
        res.status(200).json({ message: "Carrinho atualizado com sucesso." });
    } catch (error) {
        await connection.rollback();
        console.error("Erro ao atualizar o carrinho:", error);
        res.status(500).json({ message: "Erro ao atualizar carrinho." });
    } finally {
        connection.release();
    }
});

app.delete('/api/cart/:productId', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;
    const { variation } = req.body; 
    const variationDetailsString = variation ? JSON.stringify(variation) : null;

    if (!productId) {
        return res.status(400).json({ message: "ID do produto é obrigatório." });
    }
   
    try {
        await db.query("DELETE FROM user_carts WHERE user_id = ? AND product_id = ? AND (variation_details <=> ?)", [userId, productId, variationDetailsString]);
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
            const [items] = await db.query("SELECT oi.*, p.name, p.images, p.product_type, p.stock, p.variations FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?", [order.id]);
            const parsedItems = items.map(item => ({
                ...item,
                variation: item.variation_details ? JSON.parse(item.variation_details) : null
            }));
            const [history] = await db.query("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY status_date ASC", [order.id]);
            return { ...order, items: parsedItems, history };
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
    } catch (err) { 
        console.error("Erro ao buscar pedidos (admin):", err);
        res.status(500).json({ message: "Erro ao buscar pedidos." }); 
    }
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
       
        // ATUALIZADO: Parseia os detalhes da variação para enviar ao frontend
        const parsedItems = items.map(item => ({
            ...item,
            variation: item.variation_details ? JSON.parse(item.variation_details) : null
        }));
       
        const detailedOrder = { ...order, items: parsedItems };
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

        // Validação de cupom (lógica existente)
        // ...

        for (const item of items) {
            const [productResult] = await connection.query("SELECT product_type, variations, stock FROM products WHERE id = ? FOR UPDATE", [item.id]);
            const product = productResult[0];
            if (!product) throw new Error(`Produto com ID ${item.id} não encontrado.`);

            if (product.product_type === 'clothing') {
                if (!item.variation || !item.variation.color || !item.variation.size) {
                    throw new Error(`Variação não especificada para o produto ${item.name}.`);
                }
                let variations = JSON.parse(product.variations || '[]');
                const variationIndex = variations.findIndex(v => v.color === item.variation.color && v.size === item.variation.size);
               
                if (variationIndex === -1) throw new Error(`Variação ${item.variation.color}/${item.variation.size} não encontrada para ${item.name}.`);
                if (variations[variationIndex].stock < item.qty) throw new Error(`Estoque insuficiente para ${item.name} (${item.variation.color}/${item.variation.size}).`);
               
            } else { // perfume
                if (product.stock < item.qty) {
                    throw new Error(`Produto "${item.name || item.id}" não tem estoque suficiente.`);
                }
            }
        }
       
        const orderSql = "INSERT INTO orders (user_id, total, status, shipping_address, payment_method, shipping_method, shipping_cost, coupon_code, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const orderParams = [req.user.id, total, ORDER_STATUS.PENDING, JSON.stringify(shippingAddress), paymentMethod, shipping_method, shipping_cost, coupon_code || null, discount_amount || 0];
        const [orderResult] = await connection.query(orderSql, orderParams);
        const orderId = orderResult.insertId;

        await updateOrderStatus(orderId, ORDER_STATUS.PENDING, connection, "Pedido criado pelo cliente.");
       
        for (const item of items) {
            const variationDetailsString = item.variation ? JSON.stringify(item.variation) : null;
            await connection.query("INSERT INTO order_items (order_id, product_id, quantity, price, variation_details) VALUES (?, ?, ?, ?, ?)", [orderId, item.id, item.qty, item.price, variationDetailsString]);
           
            const [productResult] = await connection.query("SELECT product_type, variations FROM products WHERE id = ?", [item.id]);
            const product = productResult[0];

            if (product.product_type === 'clothing') {
                let variations = JSON.parse(product.variations || '[]');
                const variationIndex = variations.findIndex(v => v.color === item.variation.color && v.size === item.variation.size);
                if (variationIndex !== -1) {
                    variations[variationIndex].stock -= item.qty;
                    const newTotalStock = variations.reduce((sum, v) => sum + v.stock, 0);
                    await connection.query("UPDATE products SET variations = ?, stock = ?, sales = sales + ? WHERE id = ?", [JSON.stringify(variations), newTotalStock, item.qty, item.id]);
                }
            } else {
                await connection.query("UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?", [item.qty, item.qty, item.id]);
            }
        }
       
        // Lógica de uso de cupom (existente)
        // ...
       
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
        if (order[0].status !== ORDER_STATUS.PENDING && order[0].status !== ORDER_STATUS.PAYMENT_APPROVED) {
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

    const STATUS_PROGRESSION = [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PAYMENT_APPROVED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.OUT_FOR_DELIVERY,
        ORDER_STATUS.DELIVERED
    ];
   
    const statusesThatTriggerEmail = [
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.OUT_FOR_DELIVERY,
        ORDER_STATUS.DELIVERED,
        ORDER_STATUS.CANCELLED,
        ORDER_STATUS.REFUNDED
    ];

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [currentOrderResult] = await connection.query("SELECT * FROM orders WHERE id = ? FOR UPDATE", [id]);
        if (currentOrderResult.length === 0) {
            throw new Error("Pedido não encontrado.");
        }
        const { status: currentStatus, payment_gateway_id, payment_status: currentPaymentStatus } = currentOrderResult[0];

        if (status && status !== currentStatus) {
            const currentIndex = STATUS_PROGRESSION.indexOf(currentStatus);
            const newIndex = STATUS_PROGRESSION.indexOf(status);

            if (newIndex > currentIndex) {
                const statusesToInsert = STATUS_PROGRESSION.slice(currentIndex + 1, newIndex + 1);
                for (const intermediateStatus of statusesToInsert) {
                    await updateOrderStatus(id, intermediateStatus, connection, "Status atualizado pelo administrador");
                }
            } else {
                await updateOrderStatus(id, status, connection, "Status atualizado pelo administrador");
            }
           
            if (status === ORDER_STATUS.REFUNDED) {
                if (!payment_gateway_id) throw new Error("Reembolso falhou: ID de pagamento não encontrado.");
                if (currentPaymentStatus !== 'approved') throw new Error(`Reembolso falhou: Status do pagamento é '${currentPaymentStatus}'.`);
               
                console.log(`[Reembolso] Iniciando reembolso para o pagamento do MP: ${payment_gateway_id}`);
                const refundResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_gateway_id}/refunds`, { 
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': crypto.randomUUID()
                    }
                });
                const refundData = await refundResponse.json();
                if (!refundResponse.ok) throw new Error(refundData.message || "O Mercado Pago recusou o reembolso.");
                console.log(`[Reembolso] Sucesso para pagamento ${payment_gateway_id}.`);
            }
           
            const isRevertingStock = (status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED || status === ORDER_STATUS.PAYMENT_REJECTED);
            const wasAlreadyReverted = (currentStatus === ORDER_STATUS.CANCELLED || currentStatus === ORDER_STATUS.REFUNDED || currentStatus === ORDER_STATUS.PAYMENT_REJECTED);

            if (isRevertingStock && !wasAlreadyReverted) {
                const [itemsToAdjust] = await connection.query("SELECT product_id, quantity, variation_details FROM order_items WHERE order_id = ?", [id]);
                for (const item of itemsToAdjust) {
                    const [productResult] = await connection.query("SELECT product_type, variations FROM products WHERE id = ?", [item.product_id]);
                    const product = productResult[0];
                    if (product.product_type === 'clothing' && item.variation_details) {
                        const variation = JSON.parse(item.variation_details);
                        let variations = JSON.parse(product.variations || '[]');
                        const variationIndex = variations.findIndex(v => v.color === variation.color && v.size === variation.size);
                        if (variationIndex !== -1) {
                            variations[variationIndex].stock += item.quantity;
                            const newTotalStock = variations.reduce((sum, v) => sum + v.stock, 0);
                            await connection.query("UPDATE products SET variations = ?, stock = ?, sales = GREATEST(0, sales - ?) WHERE id = ?", [JSON.stringify(variations), newTotalStock, item.quantity, item.product_id]);
                        }
                    } else {
                        await connection.query("UPDATE products SET stock = stock + ?, sales = GREATEST(0, sales - ?) WHERE id = ?", [item.quantity, item.quantity, item.product_id]);
                    }
                }
                console.log(`Estoque e vendas do pedido #${id} revertidos.`);
            }
        }
       
        if (tracking_code !== undefined) { 
            await connection.query("UPDATE orders SET tracking_code = ? WHERE id = ?", [tracking_code, id]);
        }

        await connection.commit();
       
        // Envio de email fora da transação
        if (status && statusesThatTriggerEmail.includes(status)) {
            const [userResult] = await db.query("SELECT u.email, u.name FROM users u JOIN orders o ON u.id = o.user_id WHERE o.id = ?", [id]);
            if (userResult.length > 0) {
                const customerEmail = userResult[0].email;
                const customerName = userResult[0].name;
                const finalTrackingCode = tracking_code || currentOrderResult[0].tracking_code;
                const [orderItems] = await db.query("SELECT oi.quantity, p.name, p.images, oi.variation_details FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?", [id]);
                const parsedItems = orderItems.map(item => ({...item, variation_details: item.variation_details ? JSON.parse(item.variation_details) : null}));

                let emailHtml, emailSubject;
                if (status === ORDER_STATUS.SHIPPED && finalTrackingCode) {
                    emailHtml = createShippedEmail(customerName, id, finalTrackingCode, parsedItems);
                    emailSubject = `Seu Pedido #${id} foi enviado!`;
                } else {
                    emailHtml = createGeneralUpdateEmail(customerName, id, status, parsedItems);
                    emailSubject = `Atualização sobre seu Pedido #${id}`;
                }

                if (emailHtml && emailSubject) {
                    sendEmailAsync({ from: FROM_EMAIL, to: customerEmail, subject: emailSubject, html: emailHtml });
                }
            }
        }

        res.json({ message: "Pedido atualizado com sucesso." });

    } catch (err) { 
        await connection.rollback();
        console.error("Erro ao atualizar pedido:", err);
        res.status(500).json({ message: err.message || "Erro interno ao atualizar o pedido." }); 
    } finally {
        connection.release();
    }
});


// --- SEÇÃO DE PAGAMENTOS E WEBHOOK ---

app.get('/api/orders/:id/status', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const [orderResult] = await db.query("SELECT status, user_id FROM orders WHERE id = ?", [id]);
        if (orderResult.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        if (orderResult[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado a este pedido.' });
        }
        res.json({ status: orderResult[0].status });
    } catch(err) {
        console.error(`Erro ao buscar status do pedido ${id}:`, err);
        res.status(500).json({ message: 'Erro ao consultar o status do pedido.' });
    }
});

app.post('/api/create-mercadopago-payment', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.body;
       
        if (!orderId) {
            return res.status(400).json({ message: "ID do pedido é obrigatório." });
        }
        const appUrl = process.env.APP_URL;
        const backendUrl = process.env.BACKEND_URL;

        const [orderResult] = await db.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        if (!orderResult.length) {
            return res.status(404).json({ message: "Pedido não encontrado."});
        }
        const order = orderResult[0];

        const [orderItems] = await db.query(
            `SELECT oi.quantity, oi.price, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`, 
            [orderId]
        );
        if (!orderItems.length) {
            return res.status(400).json({ message: "Nenhum item encontrado para este pedido." });
        }
       
        const subtotal = orderItems.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
        const shipping = Number(order.shipping_cost || 0);
        const discount = Number(order.discount_amount || 0);
        const total = Number(order.total || 0);

        let finalItemPriceForMP = subtotal;
        let finalShippingCostForMP = shipping;
        let isFreeShippingCoupon = false;

        if (order.coupon_code) {
            const [couponResult] = await db.query("SELECT type FROM coupons WHERE code = ?", [order.coupon_code]);
            if (couponResult.length > 0 && couponResult[0].type === 'free_shipping') {
                isFreeShippingCoupon = true;
            }
        }

        if(isFreeShippingCoupon) {
            finalItemPriceForMP = subtotal;
            finalShippingCostForMP = 0;
        } else {
            finalItemPriceForMP = subtotal - discount;
        }

        finalItemPriceForMP = Math.max(0.01, finalItemPriceForMP);
       
        let description = `Subtotal: R$ ${subtotal.toFixed(2)}.`;
       
        if (isFreeShippingCoupon) {
            description += ` Frete: GRÁTIS.`;
        } else {
            description += ` Frete: R$ ${shipping.toFixed(2)}.`;
        }

        if (!isFreeShippingCoupon && discount > 0) {
            description += ` Desconto: -R$ ${discount.toFixed(2)}.`;
        }
       
        description += ` Total: R$ ${total.toFixed(2)}.`;
       
        let maxInstallments;
        if (total > 100) {
            maxInstallments = 10;
        } else {
            maxInstallments = 1;
        }

        const preferenceBody = {
            items: [
                {
                    title: `Pedido #${order.id} - Love Cestas e Perfumes`,
                    description: description,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: Number(finalItemPriceForMP.toFixed(2))
                }
            ],
            payment_methods: {
                excluded_payment_methods: [],
                excluded_payment_types: [],
                installments: maxInstallments,
                default_installments: 1
            },
            external_reference: orderId.toString(),
            back_urls: {
                success: `${appUrl}/#order-success/${orderId}`,
                failure: `${appUrl}/#cart`,
                pending: `${appUrl}/#account`,
            },
            notification_url: `${backendUrl}/api/mercadopago-webhook`,
        };

        if (finalShippingCostForMP > 0) {
             preferenceBody.shipments = {
                cost: Number(finalShippingCostForMP.toFixed(2)),
                mode: 'not_specified',
            };
        }
       
        console.log(`[Webhook URL Gerada]: ${preferenceBody.notification_url}`);

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


// --- INÍCIO DA ATUALIZAÇÃO ---
// Rota de parcelas corrigida
app.get('/api/mercadopago/installments', async (req, res) => {
    const { amount } = req.query;

    if (!amount) {
        return res.status(400).json({ message: "O valor (amount) é obrigatório." });
    }
   
    try {
        const installmentsResponse = await fetch(`https://api.mercadopago.com/v1/payment_methods/installments?amount=${amount}&payment_method_id=master`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (!installmentsResponse.ok) {
            const errorData = await installmentsResponse.json();
            throw new Error(errorData.message || 'Não foi possível obter os parcelamentos.');
        }

        const installmentsData = await installmentsResponse.json();
       
        if (installmentsData.length > 0 && installmentsData[0].payer_costs) {
            res.json(installmentsData[0].payer_costs);
        } else {
            res.status(404).json({ message: 'Não foram encontradas opções de parcelamento.' });
        }

    } catch (error) {
        console.error("Erro ao buscar parcelas do Mercado Pago:", error);
        res.status(500).json({ message: error.message || "Erro interno do servidor ao buscar parcelas." });
    }
});
// --- FIM DA ATUALIZAÇÃO ---


const processPaymentWebhook = async (paymentId) => {
    try {
        if (!paymentId || paymentId === 123456 || paymentId === '123456') {
            console.log(`[Webhook] Notificação de simulação recebida (ID: ${paymentId}). Processo ignorado.`);
            return;
        }

        console.log(`[Webhook] Consultando detalhes do pagamento ${paymentId} no Mercado Pago...`);
        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (!paymentResponse.ok) {
            const errorText = await paymentResponse.text();
            console.error(`[Webhook] Falha ao consultar pagamento ${paymentId} no MP: Status ${paymentResponse.status}`, errorText);
            return;
        }
       
        const payment = await paymentResponse.json();
        const orderId = payment.external_reference;
        const paymentStatus = payment.status;

        if (!orderId) {
            console.log(`[Webhook] Notificação para pagamento ${paymentId} não continha um ID de pedido (external_reference).`);
            return;
        }

        console.log(`[Webhook] Pedido ID: ${orderId}. Status do Pagamento MP: ${paymentStatus}`);
       
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [currentOrderResult] = await connection.query("SELECT status FROM orders WHERE id = ? FOR UPDATE", [orderId]);
            if (currentOrderResult.length === 0) {
                console.log(`[Webhook] Pedido ${orderId} não encontrado no banco de dados.`);
                await connection.commit();
                return;
            }
            const currentDBStatus = currentOrderResult[0].status;
            console.log(`[Webhook] Status atual do pedido ${orderId} no DB: '${currentDBStatus}'`);

            await connection.query(
                "UPDATE orders SET payment_status = ?, payment_gateway_id = ? WHERE id = ?", 
                [paymentStatus, payment.id, orderId]
            );
           
            if (paymentStatus === 'approved' && currentDBStatus === ORDER_STATUS.PENDING) {
                await updateOrderStatus(orderId, ORDER_STATUS.PAYMENT_APPROVED, connection);
            } else if ((paymentStatus === 'rejected' || paymentStatus === 'cancelled') && currentDBStatus !== ORDER_STATUS.CANCELLED) {
                await updateOrderStatus(orderId, ORDER_STATUS.PAYMENT_REJECTED, connection);
                await updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, connection, "Pagamento recusado pela operadora.");
               
                const [itemsToReturn] = await connection.query("SELECT product_id, quantity, variation_details FROM order_items WHERE order_id = ?", [orderId]);
                if (itemsToReturn.length > 0) {
                    for (const item of itemsToReturn) {
                        const [productResult] = await connection.query("SELECT product_type, variations FROM products WHERE id = ?", [item.product_id]);
                        const product = productResult[0];
                        if (product.product_type === 'clothing' && item.variation_details) {
                            const variation = JSON.parse(item.variation_details);
                            let variations = JSON.parse(product.variations || '[]');
                            const variationIndex = variations.findIndex(v => v.color === variation.color && v.size === variation.size);
                            if (variationIndex !== -1) {
                                variations[variationIndex].stock += item.quantity;
                                const newTotalStock = variations.reduce((sum, v) => sum + v.stock, 0);
                                await connection.query("UPDATE products SET variations = ?, stock = ?, sales = GREATEST(0, sales - ?) WHERE id = ?", [JSON.stringify(variations), newTotalStock, item.quantity, item.product_id]);
                            }
                        } else {
                            await connection.query("UPDATE products SET stock = stock + ?, sales = GREATEST(0, sales - ?) WHERE id = ?", [item.quantity, item.quantity, item.product_id]);
                        }
                    }
                    console.log(`[Webhook] Estoque e vendas de ${itemsToReturn.length} item(ns) do pedido ${orderId} foram revertidos.`);
                }
            } else {
                 console.log(`[Webhook] Nenhuma atualização de status necessária para o pedido ${orderId}. Status atual: '${currentDBStatus}'.`);
            }
           
            await connection.commit();
            console.log(`[Webhook] Transação para o pedido ${orderId} finalizada com sucesso.`);

        } catch(dbError) {
            console.error(`[Webhook] ERRO DE BANCO DE DADOS ao processar pedido ${orderId}:`, dbError);
            if (connection) await connection.rollback();
        } finally {
            if (connection) connection.release();
        }

    } catch (error) {
        console.error('Erro GRAVE e inesperado ao processar o webhook de pagamento:', error);
    }
};


app.post('/api/mercadopago-webhook', (req, res) => {
    res.sendStatus(200);

    const notification = req.body;
    const topic = req.query.topic || req.query.type;

    console.log('[Webhook] Notificação recebida. Query:', req.query, 'Body:', notification);

    if (notification && topic === 'payment') {
        const paymentId = req.query.id || notification.data?.id;
        console.log(`[Webhook] Tópico 'payment' detectado. ID do pagamento: ${paymentId}.`);
        if (paymentId) {
            processPaymentWebhook(paymentId);
        } else {
            console.log('[Webhook] Tópico "payment", mas sem ID de pagamento encontrado na notificação.');
        }
    } else {
         console.log(`[Webhook] Tópico não é 'payment' ou notificação está vazia. Tópico: ${topic}. Ignorando.`);
    }
});


// --- ROTAS DE USUÁRIOS (para Admin e Perfil) ---
app.get('/api/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [users] = await db.query("SELECT id, name, email, cpf, role, created_at FROM users");
        res.json(users);
    } catch (err) { 
        console.error("Erro ao buscar usuários:", err);
        res.status(500).json({ message: "Erro ao buscar usuários." }); 
    }
});

app.get('/api/users/me', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado." });
        res.json(rows[0]);
    } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
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
        console.error("Erro ao atualizar senha do usuário:", err);
        res.status(500).json({ message: "Erro ao atualizar a senha." });
    }
});

app.delete('/api/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ message: "Usuário deletado com sucesso." });
    } catch (err) { 
        console.error("Erro ao deletar usuário:", err);
        res.status(500).json({ message: "Erro interno ao deletar usuário." }); 
    }
});

// --- ROTAS DE CUPONS ---
app.get('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [coupons] = await db.query("SELECT * FROM coupons ORDER BY id DESC");
        res.json(coupons);
    } catch (err) { 
        console.error("Erro ao buscar cupons:", err);
        res.status(500).json({ message: "Erro ao buscar cupons." }); 
    }
});

app.post('/api/coupons/validate', async (req, res) => {
    const { code } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let user = null;

    if (token) {
        try {
            user = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.log("Token de validação de cupom inválido ou expirado, tratando como deslogado.");
        }
    }
   
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
       
        if (coupon.is_first_purchase || coupon.is_single_use_per_user) {
            if (!user) {
                return res.status(403).json({ message: "Você precisa estar logado para usar este cupom." });
            }
        }
       
        if (user && coupon.is_first_purchase) {
            const [orders] = await db.query("SELECT id FROM orders WHERE user_id = ? LIMIT 1", [user.id]);
            if (orders.length > 0) {
                return res.status(403).json({ message: "Este cupom é válido apenas para a primeira compra." });
            }
        }
       
        if (user && coupon.is_single_use_per_user) {
            const [usage] = await db.query("SELECT id FROM coupon_usage WHERE user_id = ? AND coupon_id = ?", [user.id, coupon.id]);
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
    } catch (err) { 
        console.error("Erro ao deletar cupom:", err);
        res.status(500).json({ message: "Erro interno ao deletar cupom." }); 
    }
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

// --- ROTAS DE GERENCIAMENTO DE ENDEREÇOS ---
app.get('/api/addresses', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const [addresses] = await db.query("SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, alias ASC", [userId]);
        res.json(addresses);
    } catch (err) {
        console.error("Erro ao buscar endereços:", err);
        res.status(500).json({ message: "Erro ao buscar endereços." });
    }
});

app.post('/api/addresses', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { alias, cep, logradouro, numero, complemento, bairro, localidade, uf, is_default } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
       
        if (is_default) {
            await connection.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [userId]);
        }

        const sql = "INSERT INTO user_addresses (user_id, alias, cep, logradouro, numero, complemento, bairro, localidade, uf, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const params = [userId, alias, cep, logradouro, numero, complemento, bairro, localidade, uf, is_default ? 1 : 0];
        const [result] = await connection.query(sql, params);
       
        const [newAddress] = await connection.query("SELECT * FROM user_addresses WHERE id = ?", [result.insertId]);

        await connection.commit();
        res.status(201).json(newAddress[0]);
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao adicionar endereço:", err);
        res.status(500).json({ message: err.message || "Erro ao adicionar endereço." });
    } finally {
        connection.release();
    }
});

app.put('/api/addresses/:id', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { alias, cep, logradouro, numero, complemento, bairro, localidade, uf, is_default } = req.body;
   
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (is_default) {
            await connection.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [userId]);
        }

        const sql = "UPDATE user_addresses SET alias = ?, cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, localidade = ?, uf = ?, is_default = ? WHERE id = ? AND user_id = ?";
        const params = [alias, cep, logradouro, numero, complemento, bairro, localidade, uf, is_default ? 1 : 0, id, userId];
        const [result] = await connection.query(sql, params);

        if (result.affectedRows === 0) {
            throw new Error("Endereço não encontrado ou não pertence a este usuário.");
        }

        await connection.commit();
        res.json({ message: "Endereço atualizado com sucesso." });
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao atualizar endereço:", err);
        res.status(500).json({ message: err.message || "Erro ao atualizar endereço." });
    } finally {
        connection.release();
    }
});

app.put('/api/addresses/:id/default', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [userId]);
        const [result] = await connection.query("UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?", [id, userId]);
       
        if (result.affectedRows === 0) {
            throw new Error("Endereço não encontrado ou não pertence a este usuário.");
        }
       
        await connection.commit();
        res.json({ message: "Endereço padrão definido com sucesso." });
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao definir endereço padrão:", err);
        res.status(500).json({ message: err.message || "Erro ao definir endereço padrão." });
    } finally {
        connection.release();
    }
});

app.delete('/api/addresses/:id', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const [result] = await db.query("DELETE FROM user_addresses WHERE id = ? AND user_id = ?", [id, userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Endereço não encontrado ou não pertence a este usuário." });
        }
        res.json({ message: "Endereço deletado com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar endereço:", err);
        res.status(500).json({ message: "Erro ao deletar endereço." });
    }
});


// --- ROTA PARA TAREFAS AGENDADAS (CRON JOB) ---
app.post('/api/tasks/cancel-pending-orders', async (req, res) => {
    const { secret } = req.body;
    if (secret !== process.env.CRON_SECRET) {
        return res.status(403).json({ message: 'Acesso negado.' });
    }

    console.log('[CRON] Iniciando tarefa de cancelamento de pedidos pendentes...');
    const PENDING_ORDER_TIMEOUT_HOURS = 2;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const timeout = new Date();
        timeout.setHours(timeout.getHours() - PENDING_ORDER_TIMEOUT_HOURS);

        const [pendingOrders] = await connection.query(
            "SELECT id FROM orders WHERE status = ? AND date < ?",
            [ORDER_STATUS.PENDING, timeout]
        );

        if (pendingOrders.length === 0) {
            console.log('[CRON] Nenhum pedido pendente para cancelar.');
            await connection.commit();
            return res.status(200).json({ message: "Nenhum pedido pendente para cancelar." });
        }

        console.log(`[CRON] Encontrados ${pendingOrders.length} pedidos pendentes para cancelar.`);

        for (const order of pendingOrders) {
            const orderId = order.id;
            console.log(`[CRON] Processando cancelamento do pedido #${orderId}`);
           
            // Reverte o estoque
            const [itemsToReturn] = await connection.query("SELECT product_id, quantity, variation_details FROM order_items WHERE order_id = ?", [orderId]);
            for (const item of itemsToReturn) {
                const [productResult] = await connection.query("SELECT product_type, variations FROM products WHERE id = ?", [item.product_id]);
                const product = productResult[0];
                if (product.product_type === 'clothing' && item.variation_details) {
                    const variation = JSON.parse(item.variation_details);
                    let variations = JSON.parse(product.variations || '[]');
                    const variationIndex = variations.findIndex(v => v.color === variation.color && v.size === variation.size);
                    if (variationIndex !== -1) {
                        variations[variationIndex].stock += item.quantity;
                        const newTotalStock = variations.reduce((sum, v) => sum + v.stock, 0);
                        await connection.query("UPDATE products SET variations = ?, stock = ?, sales = GREATEST(0, sales - ?) WHERE id = ?", [JSON.stringify(variations), newTotalStock, item.quantity, item.product_id]);
                    }
                } else {
                    await connection.query("UPDATE products SET stock = stock + ?, sales = GREATEST(0, sales - ?) WHERE id = ?", [item.quantity, item.quantity, item.product_id]);
                }
            }
            console.log(`[CRON] Estoque do pedido #${orderId} revertido.`);
           
            // Atualiza status do pedido para Cancelado
            await updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, connection, "Cancelado automaticamente por falta de pagamento.");
        }

        await connection.commit();
        console.log(`[CRON] Tarefa concluída. ${pendingOrders.length} pedidos cancelados.`);
        res.status(200).json({ message: `${pendingOrders.length} pedidos pendentes foram cancelados com sucesso.` });

    } catch (err) {
        await connection.rollback();
        console.error('[CRON] Erro ao executar a tarefa de cancelamento:', err);
        res.status(500).json({ message: "Erro interno ao executar a tarefa." });
    } finally {
        connection.release();
    }
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Servidor backend completo rodando na porta ${PORT}`);
});
