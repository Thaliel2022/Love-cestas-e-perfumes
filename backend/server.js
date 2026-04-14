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
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const cloudinary = require('cloudinary').v2;
const stream = require('stream');
const crypto = require('crypto');
const { Resend } = require('resend');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const webpush = require('web-push');
const { z } = require('zod'); // Substitui express-validator
const compression = require('compression'); 
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const sanitizeHtml = require('sanitize-html'); // NOVO: Biblioteca profissional contra XSS
const Fuse = require('fuse.js');
// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();

// --- CONFIGURAÇÕES DE SEGURANÇA JWT ---
const ACCESS_TOKEN_EXPIRY = '15m'; // Curta duração (Segurança)
const REFRESH_TOKEN_EXPIRY = '7d'; // Longa duração (Conveniência)
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

// --- Configuração do Resend ---
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL;


// ---> Constantes para status de pedidos
const ORDER_STATUS = {
    PENDING: 'Pendente',
    PAYMENT_APPROVED: 'Pagamento Aprovado',
    PAYMENT_REJECTED: 'Pagamento Recusado',
    PROCESSING: 'Separando Pedido',
    READY_FOR_PICKUP: 'Pronto para Retirada',
    SHIPPED: 'Enviado',
    OUT_FOR_DELIVERY: 'Saiu para Entrega',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado'
};

// --- Memória Temporária para Biometria ---
// Armazena os desafios criptográficos baseados no ID do usuário ou sessão
const webauthnChallenges = {};

// --- Configuração das Chaves de Notificação ---
// Adicione este bloco LOGO APÓS os imports e ANTES das rotas
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:thaliel1994@hotmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Sistema de Notificação Push Ativado');
} else {
    console.warn('⚠️ AVISO: Chaves VAPID não encontradas no .env. Notificações não funcionarão.');
}


// Verificação de Variáveis de Ambiente Essenciais
const checkRequiredEnvVars = async () => {
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

    const originCep = process.env.ORIGIN_CEP.replace(/\D/g, '');
    if (originCep.length !== 8) {
        console.error('ERRO CRÍTICO: O valor de ORIGIN_CEP na sua variável de ambiente é inválido. Deve ser um CEP de 8 dígitos.');
        process.exit(1);
    }
    try {
        console.log(`Validando o CEP de origem (ORIGIN_CEP): ${originCep}...`);
        const response = await fetch(`https://viacep.com.br/ws/${originCep}/json/`);
        const data = await response.json();
        if (data.erro) {
            console.error(`ERRO CRÍTICO: O CEP de origem '${process.env.ORIGIN_CEP}' não foi encontrado ou é inválido.`);
            console.error('Por favor, corrija a variável de ambiente ORIGIN_CEP no seu servidor.');
            process.exit(1);
        }
        console.log(`CEP de origem validado com sucesso: ${data.logradouro}, ${data.localidade} - ${data.uf}`);
    } catch (error) {
        console.warn('AVISO: Não foi possível validar o CEP de origem automaticamente. O servidor continuará, mas podem ocorrer erros no cálculo de frete se o CEP estiver incorreto.');
        console.warn('Erro na validação do CEP:', error.message);
    }
    
    console.log('Verificação de variáveis de ambiente concluída com sucesso.');
};
checkRequiredEnvVars();

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
app.set('trust proxy', true); // Necessário para obter o IP correto atrás de um proxy (como o Render)
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// --- CONFIGURAÇÕES DE SEGURANÇA ---
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_IN_MINUTES = 15;
const loginAttempts = {};

// --- MIDDLEWARES ---
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const allowedOrigins = [
    process.env.APP_URL,
    `https://www.${process.env.APP_URL?.split('//')[1]}`,
    'http://localhost:3000',
    'https://love-cestas-e-perfumes.vercel.app' 
];

// Regex para aceitar qualquer subdomínio de deploy do Vercel para o seu projeto
const vercelPreviewRegex = /^https:\/\/love-cestas-e-perfumes-.*\.vercel\.app$/;

app.use(cors({
    origin: function (origin, callback) {
        // Permite se a origem estiver na lista, corresponder ao Regex, ou se não houver origem (ex: Postman)
        if (!origin || allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS Bloqueado para a origem: ${origin}`);
            callback(new Error('Acesso de origem não permitido por CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(compression()); 
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://sdk.mercadopago.com"],
            styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline pode ser necessário para bibliotecas de UI
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://placehold.co"],
            connectSrc: ["'self'", process.env.BACKEND_URL, "https://api.mercadopago.com", "https://viacep.com.br", "https://api.linketrack.com", "https://www.melhorenvio.com.br"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

// --- MIDDLEWARE DE PROTEÇÃO CONTRA XSS (ALTA SEGURANÇA) ---
// Sanitiza recursivamente strings usando a biblioteca sanitize-html
const xssProtectionMiddleware = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value !== 'string') return value;
        
        // Remove completamente qualquer tag HTML e atributos perigosos.
        // Ideal para APIs JSON que não devem receber HTML do cliente.
        return sanitizeHtml(value, {
            allowedTags: [], // Não permite nenhuma tag HTML
            allowedAttributes: {}, // Não permite nenhum atributo
            disallowedTagsMode: 'discard'
        });
    };

    const sanitizeObject = (obj) => {
        if (!obj) return;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (typeof obj[key] === 'string') {
                    // Ignora campos que intencionalmente podem conter HTML ou aspas (como configurações json em string)
                    // if (key === 'setting_value' || key === 'variations') continue; 
                    
                    obj[key] = sanitizeValue(obj[key]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        }
    };

    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);

    next();
};

// ATIVAÇÃO DO XSS (CRÍTICO)
app.use(xssProtectionMiddleware);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // Limite mais alto para ambiente de desenvolvimento
    standardHeaders: 'draft-7', // Usa o padrão mais recente
    legacyHeaders: false,
    message: 'Muitas requisições deste IP, por favor tente novamente após 15 minutos',
    // Configuração de segurança específica para a Render.com
    // Confia no primeiro proxy na cadeia (que é o proxy da Render)
    trustProxy: 1
});
app.use('/api/', limiter); // Aplica o rate limiting a todas as rotas da API

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

// --- MIDDLEWARE DE VALIDAÇÃO ZOD (NOVO) ---
const validate = (schema) => (req, res, next) => {
    try {
        // Valida body, query e params contra o schema
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        });
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            // Formata erros do Zod para resposta amigável
            const errors = err.errors.map(e => ({ 
                field: e.path.join('.'), 
                message: e.message 
            }));
            return res.status(400).json({ 
                message: "Dados inválidos.", 
                errors: errors 
            });
        }
        next(err);
    }
};

// --- SCHEMAS DE VALIDAÇÃO (DEFINIÇÕES) ---

// Expressão regular para forçar letras e números
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)/;
const passwordMessage = "A senha deve conter letras e números";

// Schemas de Autenticação
const authSchemas = {
    login: z.object({
        body: z.object({
            email: z.string().email("E-mail inválido"),
            password: z.string().min(1, "Senha obrigatória")
        })
    }),
    register: z.object({
        body: z.object({
            name: z.string().min(3, "Nome muito curto"),
            email: z.string().email("E-mail inválido"),
            password: z.string()
                .min(8, "Senha deve ter no mínimo 8 caracteres")
                .regex(passwordRegex, passwordMessage),
            cpf: z.string().min(11, "CPF inválido"), 
            phone: z.string().optional()
        })
    }),
    verify2FA: z.object({
        body: z.object({
            token: z.string().length(6, "O código deve ter 6 dígitos"),
            tempAuthToken: z.string().min(1, "Token de autorização ausente")
        })
    }),
    enable2FA: z.object({
        body: z.object({
            token: z.string().length(6, "O código deve ter 6 dígitos")
        })
    }),
    disable2FA: z.object({
        body: z.object({
            password: z.string().min(1, "Senha obrigatória"),
            token: z.string().length(6, "O código deve ter 6 dígitos")
        })
    }),
    forgotPassword: z.object({
        body: z.object({
            email: z.string().email("E-mail inválido"),
            cpf: z.string().min(1, "CPF obrigatório")
        })
    }),
    resetPassword: z.object({
        body: z.object({
            email: z.string().email("E-mail inválido"),
            cpf: z.string().min(1, "CPF obrigatório"),
            newPassword: z.string()
                .min(8, "A nova senha deve ter no mínimo 8 caracteres")
                .regex(passwordRegex, passwordMessage)
        })
    }),
    verifyAction: z.object({
        body: z.object({
            password: z.string().optional(),
            token: z.string().length(6).optional()
        }).refine(data => data.password || data.token, {
            message: "Senha ou código 2FA é necessário"
        })
    })
};

// Schema de Produtos (Admin)
const productSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        brand: z.string().min(1),
        category: z.string().min(1),
        price: z.preprocess((val) => parseFloat(val), z.number().positive()), // Força número
        sale_price: z.preprocess((val) => val ? parseFloat(val) : null, z.number().positive().nullable().optional()),
        is_on_sale: z.preprocess((val) => Boolean(val), z.boolean()),
        stock: z.preprocess((val) => parseInt(val, 10), z.number().int().nonnegative()),
        description: z.string().optional(),
        images: z.string().optional(), // JSON string
        variations: z.string().optional(), // JSON string
        product_type: z.enum(['perfume', 'clothing']).optional(),
        // Campos opcionais para evitar erro de strip
        weight: z.any().optional(),
        width: z.any().optional(),
        height: z.any().optional(),
        length: z.any().optional(),
        is_active: z.any().optional(),
        video_url: z.string().optional().nullable(),
        sale_end_date: z.string().optional().nullable(),
        // Campos específicos
        notes: z.string().optional(),
        how_to_use: z.string().optional(),
        ideal_for: z.string().optional(),
        volume: z.string().optional(),
        size_guide: z.string().optional(),
        care_instructions: z.string().optional()
    })
});

// Schema de Pedidos
const orderSchema = z.object({
    body: z.object({
        items: z.array(z.object({
            id: z.number().int().positive(),
            qty: z.number().int().positive(),
            // Permite outros campos mas valida os críticos
            price: z.any().optional(),
            variation: z.any().optional()
        })).min(1, "O pedido deve ter pelo menos um item"),
        paymentMethod: z.string(),
        shipping_method: z.string(),
        shipping_cost: z.number().nonnegative(),
        total: z.number().nonnegative(),
        shippingAddress: z.any().optional(),
        coupon_code: z.string().optional().nullable(),
        discount_amount: z.number().optional(),
        pickup_details: z.any().optional(),
        phone: z.string().optional()
    })
});

// --- FUNÇÃO PARA INICIALIZAR DADOS ESSENCIAIS ---
const initializeData = async () => {
    const connection = await db.getConnection();
    try {
        console.log('Verificando dados iniciais e tabelas...');

        // --- NOVO: GARANTE QUE A TABELA DE BIOMETRIA EXISTA ---
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`user_authenticators\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`user_id\` int(11) NOT NULL,
              \`credential_id\` varchar(255) NOT NULL,
              \`credential_public_key\` text NOT NULL,
              \`counter\` bigint(20) NOT NULL DEFAULT 0,
              \`transports\` varchar(255) DEFAULT NULL,
              \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
              PRIMARY KEY (\`id\`),
              UNIQUE KEY \`credential_id\` (\`credential_id\`),
              CONSTRAINT \`fk_user_auth\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // --- SEED DE CATEGORIAS DA COLEÇÃO ---
        const [categories] = await connection.query("SELECT COUNT(*) as count FROM collection_categories");
        if (categories[0].count === 0) {
            console.log('Tabela collection_categories está vazia. Populando com dados iniciais...');
            const initialCategories = [
                { name: "Perfumes Masculino", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372606/njzkrlzyiy3mwp4j5b1x.png", filter: "Perfumes Masculino", product_type_association: 'perfume', menu_section: 'Perfumaria' },
                { name: "Perfumes Feminino", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372618/h8uhenzasbkwpd7afygw.png", filter: "Perfumes Feminino", product_type_association: 'perfume', menu_section: 'Perfumaria' },
                { name: "Cestas de Perfumes", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372566/gsliungulolshrofyc85.png", filter: "Cestas de Perfumes", product_type_association: 'perfume', menu_section: 'Perfumaria' },
                { name: "Blusas", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372642/ruxsqqumhkh228ga7n5m.png", filter: "Blusas", product_type_association: 'clothing', menu_section: 'Roupas' },
                { name: "Blazers", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372598/qblmaygxkv5runo5og8n.png", filter: "Blazers", product_type_association: 'clothing', menu_section: 'Roupas' },
                { name: "Calças", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372520/gobrpsw1chajxuxp6anl.png", filter: "Calças", product_type_association: 'clothing', menu_section: 'Roupas' },
                { name: "Shorts", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372524/rppowup5oemiznvjnltr.png", filter: "Shorts", product_type_association: 'clothing', menu_section: 'Roupas' },
                { name: "Saias", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752373223/etkzxqvlyp8lsh81yyyl.png", filter: "Saias", product_type_association: 'clothing', menu_section: 'Roupas' },
                { name: "Vestidos", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372516/djbkd3ygkkr6tvfujmbd.png", filter: "Vestidos", product_type_association: 'clothing', menu_section: 'Roupas' },
                { name: "Conjunto de Calças", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372547/xgugdhfzusrkxqiat1jb.png", filter: "Conjunto de Calças", product_type_association: 'clothing', menu_section: 'Conjuntos' },
                { name: "Conjunto de Shorts", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372530/ieridlx39jf9grfrpsxz.png", filter: "Conjunto de Shorts", product_type_association: 'clothing', menu_section: 'Conjuntos' },
                { name: "Lingerie", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372583/uetn3vaw5gwyvfa32h6o.png", filter: "Lingerie", product_type_association: 'clothing', menu_section: 'Moda Íntima' },
                { name: "Moda Praia", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372574/c5jie2jdqeclrj94ecmh.png", filter: "Moda Praia", product_type_association: 'clothing', menu_section: 'Moda Íntima' },
                { name: "Sandálias", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372591/ecpe7ezxjfeuusu4ebjx.png", filter: "Sandálias", product_type_association: 'clothing', menu_section: 'Calçados' },
                { name: "Presente", image: "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752372557/l6milxrvjhttpmpaotfl.png", filter: "Presente", product_type_association: 'clothing', menu_section: 'Acessórios' },
            ];
            
            const sql = "INSERT INTO collection_categories (name, image, filter, is_active, product_type_association, menu_section, display_order) VALUES ?";
            const values = initialCategories.map((c, index) => [c.name, c.image, c.filter, 1, c.product_type_association, c.menu_section, index]);
            await connection.query(sql, [values]);
            console.log(`${initialCategories.length} categorias de coleção inseridas com novos campos.`);
        } else {
            console.log('Tabela collection_categories já populada.');
        }

        // --- SEED DE BANNERS ---
        const [banners] = await connection.query("SELECT COUNT(*) as count FROM banners");
        if (banners[0].count === 0) {
            console.log('Tabela banners está vazia. Populando com banner principal...');
            const mainBanner = [
                'Elegância que Veste e Perfuma',
                'Descubra fragrâncias e peças que definem seu estilo e marcam momentos.',
                'https://res.cloudinary.com/dvflxuxh3/image/upload/v1751867966/i2lmcb7oxa3zf71imdm2.png',
                null, // image_url_mobile
                '#products',
                'Explorar Coleção',
                1, // cta_enabled
                1, // is_active
                0  // display_order
            ];
            const sql = "INSERT INTO banners (title, subtitle, image_url, image_url_mobile, link_url, cta_text, cta_enabled, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await connection.query(sql, mainBanner);
            console.log('Banner principal inserido com sucesso.');
        } else {
            console.log('Tabela banners já populada.');
        }

        // --- SEED CONFIGURAÇÕES DE ÍCONES DO APP ---
        const defaultIcons = {
            favicon: { current: 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png', previous: null, default: 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png' },
            pwa_icon: { current: 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png', previous: null, default: 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png' }
        };
        await connection.query(
            "INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES ('app_icons', ?)",
            [JSON.stringify(defaultIcons)]
        );

        // --- NOVO: SEED CONFIGURAÇÕES DE NOME DO APP ---
        const defaultAppName = {
            short_name: 'Love Cestas',
            name: 'Love Cestas e Perfumes'
        };
        await connection.query(
            "INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES ('app_name', ?)",
            [JSON.stringify(defaultAppName)]
        );

    } catch (err) {
        console.error("Erro ao inicializar dados:", err);
    } finally {
        connection.release();
    }
};

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
        initializeData();
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

const imageUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => {
        // ATUALIZAÇÃO DE SEGURANÇA: Removido SVG. Mantido apenas imagens raster e ícones estáticos.
        const allowedMimes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp', 
            'image/x-icon', 
            'image/vnd.microsoft.icon'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo de imagem inválido. Apenas JPG, PNG, GIF, WEBP ou ICO são permitidos.'), false);
        }
    }
}).single('image');

const csvUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB para CSVs
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido. Apenas arquivos .csv são permitidos.'), false);
        }
    }
}).single('file');


// --- FUNÇÕES E MIDDLEWARES AUXILIARES ---
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

const verifyToken = (req, res, next) => {
    // Tenta pegar o token do header de Autorização (Bearer Token) ou do cookie
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.accessToken;

    if (!token) {
        // Retornamos 401 para o frontend disparar o fluxo de refresh
        return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ message: 'Token inválido.' });
    }
};

const verifyAdmin = async (req, res, next) => {
    try {
        // 1. Verifica se o usuário foi autenticado pelo verifyToken
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Token inválido ou usuário não identificado." });
        }
        
        // 2. Consulta o banco de dados para verificar a role ATUAL
        // Isso impede que alguém que era admin e foi rebaixado continue acessando com token antigo
        const [users] = await db.query("SELECT role, status FROM users WHERE id = ?", [req.user.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado no banco de dados." });
        }

        const user = users[0];

        if (user.status === 'blocked') {
            return res.status(403).json({ message: "Sua conta está bloqueada." });
        }

        if (user.role !== 'admin') {
            // Log de tentativa de acesso não autorizado (Opcional, mas recomendado)
            console.warn(`[SEGURANÇA] Tentativa de acesso admin negada para usuário ID ${req.user.id}`);
            return res.status(403).json({ message: "Acesso negado. Requer privilégios de administrador." });
        }
        
        // Se passou, prossegue
        next();
    } catch (error) {
        console.error("Erro na verificação de admin:", error);
        return res.status(500).json({ message: "Erro interno na verificação de permissões." });
    }
};
// --- ATUALIZAÇÃO: Função de Log com Suporte a IP ---
const logAdminAction = async (user, action, details = null, ip = null) => {
    if (!user || !user.id || !user.name) {
        console.error("Tentativa de log de ação sem informações do usuário.");
        return;
    }
    try {
        // Agora salva também o IP
        const sql = "INSERT INTO admin_logs (user_id, user_name, action, details, ip_address) VALUES (?, ?, ?, ?, ?)";
        await db.query(sql, [user.id, user.name, action, details, ip]);
    } catch (err) {
        console.error("Falha ao registrar log de admin:", err);
    }
};

const checkMaintenanceMode = async (req, res, next) => {
    try {
        const vercelUrl = process.env.VERCEL_URL;
        const origin = req.headers.origin;

        // Exceção #1: Permite acesso total se a requisição vier do domínio da Vercel.
        if (vercelUrl && origin && origin.includes(vercelUrl)) {
            return next();
        }

        const [settings] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'maintenance_mode'");
        const maintenanceMode = settings[0]?.setting_value || 'off';

       if (maintenanceMode === 'on') {
            // CORREÇÃO: Busca o token do cookie, não do header
            const token = req.cookies.accessToken;

            if (token) {
                try {
                    // Verifica se o token é válido
                    const user = jwt.verify(token, JWT_SECRET);
                    // Exceção: Permite acesso total se o usuário for um admin logado
                    if (user && user.role === 'admin') {
                        return next();
                    }
                } catch (err) {
                    // Token inválido ou expirado, trata como visitante comum.
                    // O código continuará e bloqueará o acesso abaixo.
                    console.log("Token de admin inválido durante modo de manutenção, bloqueando acesso.");
                }
            }
            // Se não houver token ou se o token não for de um admin, bloqueia o acesso.
            return res.status(503).json({ message: 'Site em manutenção. Por favor, tente novamente mais tarde.' });
        }

        // Se o modo de manutenção estiver 'off', permite o acesso.
        next();
    } catch (error) {
        console.error("Erro ao verificar modo de manutenção:", error);
        // Em caso de erro no DB, permite o acesso para não travar o site.
        next();
    }
};

// --- FUNÇÕES AUXILIARES DE NOTIFICAÇÃO ---

// Função que dispara a mensagem para o celular
const sendPushNotificationToUser = async (userId, payload) => {
    try {
        // Busca todos os celulares cadastrados para este usuário
        const [subscriptions] = await db.query("SELECT * FROM push_subscriptions WHERE user_id = ?", [userId]);
        
        if (subscriptions.length === 0) return;

        const notifications = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            };
            return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
                .catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Se o celular não existe mais, remove do banco para limpar
                        db.query("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]);
                    } else {
                        console.error("Erro ao enviar push:", err);
                    }
                });
        });

        await Promise.all(notifications);
    } catch (error) {
        console.error("Erro geral no envio de push:", error);
    }
};

// --- ROTA PARA O FRONTEND SALVAR A INSCRIÇÃO ---
// O React vai chamar essa rota quando o usuário clicar em "Permitir Notificações"
app.post('/api/notifications/subscribe', verifyToken, async (req, res) => {
    const subscription = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: "Dados inválidos." });
    }

    try {
        // Verifica se já existe para não duplicar
        const [existing] = await db.query("SELECT id FROM push_subscriptions WHERE endpoint = ?", [subscription.endpoint]);
        
        if (existing.length === 0) {
            await db.query(
                "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)",
                [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
            );
        } else {
            // Atualiza o dono do dispositivo se necessário
            await db.query("UPDATE push_subscriptions SET user_id = ? WHERE id = ?", [userId, existing[0].id]);
        }
        res.status(201).json({ message: "Notificações ativadas com sucesso." });
    } catch (err) {
        console.error("Erro ao salvar push:", err);
        res.status(500).json({ message: "Erro interno." });
    }
});


// 1. SUBSTITUA A FUNÇÃO updateOrderStatus EXISTENTE POR ESTA VERSÃO COMPLETA:
const updateOrderStatus = async (orderId, newStatus, connection, notes = null) => {
    // Atualiza o status E marca como "não visto" (has_unseen_update = 1) no banco de dados
    await connection.query("UPDATE orders SET status = ?, has_unseen_update = 1 WHERE id = ?", [newStatus, orderId]);
    await connection.query("INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)", [orderId, newStatus, notes]);
    
    // --- LÓGICA DE NOTIFICAÇÃO PUSH (COMPLETA) ---
    try {
        // Busca o ID do usuário dono do pedido
        const [orderData] = await connection.query("SELECT user_id FROM orders WHERE id = ?", [orderId]);
        
        if (orderData.length > 0) {
            const userId = orderData[0].user_id;
            
            // Personaliza a mensagem baseada no status
            let title = `Atualização do Pedido #${orderId}`;
            let body = `Status alterado para: ${newStatus}`;
            
            // Ícone grande colorido
            const icon = 'https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png';
            
            // Ícone pequeno monocromático (Badge) - Link Cloudinary REDIMENSIONADO para 96px
            // Isso evita o erro do "W" por imagem muito grande
            const badge = 'https://res.cloudinary.com/dvflxuxh3/image/upload/w_96,h_96,c_scale/v1766856538/ek6yjbqj5ozhup2yzlwp.png';

            if (newStatus === 'Saiu para Entrega') {
                title = 'Seu pedido está chegando! 🛵';
                body = 'O entregador já saiu com sua encomenda. Fique atento!';
            } else if (newStatus === 'Pronto para Retirada') {
                title = 'Pode vir buscar! 🛍️';
                body = 'Seu pedido já está separado na loja aguardando você.';
            } else if (newStatus === 'Entregue') {
                title = 'Pedido Entregue ✅';
                body = 'Obrigado pela compra! Esperamos que ame seus produtos.';
            }

            const payload = {
                title: title,
                body: body,
                icon: icon,
                badge: badge, 
                data: {
                    url: `/#account/orders/${orderId}` 
                },
                vibrate: [200, 100, 200]
            };

            // Dispara a notificação usando a função auxiliar existente
            await sendPushNotificationToUser(userId, payload);
        }
    } catch (pushErr) {
        console.error("Erro ao tentar disparar notificação automática:", pushErr);
    }
    
    console.log(`Status do pedido #${orderId} atualizado para "${newStatus}", marcado como não visto e registrado no histórico.`);
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

const createReadyForPickupEmail = (customerName, orderId, pickupDetails) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const personName = pickupDetails?.personName || customerName;

    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Seu Pedido está Pronto para Retirada!</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Ótima notícia! Seu pedido #${orderId} já está separado e pronto para ser retirado em nossa loja.</p>
        <div style="border: 1px dashed #4B5563; padding: 15px; text-align: left; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0 0 10px 0; color: #E5E7EB; font-family: Arial, sans-serif; font-weight: bold;">Endereço de Retirada:</p>
            <p style="margin: 0; color: #E5E7EB; font-family: Arial, sans-serif;">R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB</p>
            <p style="margin: 15px 0 10px 0; color: #E5E7EB; font-family: Arial, sans-serif; font-weight: bold;">Horário de Funcionamento:</p>
            <p style="margin: 0; color: #E5E7EB; font-family: Arial, sans-serif;">Segunda a Sábado, das 9h às 11h30 e das 15h às 17h30.</p>
            <p style="margin: 15px 0 10px 0; color: #E5E7EB; font-family: Arial, sans-serif; font-weight: bold;">Instruções:</p>
            <p style="margin: 0; color: #E5E7EB; font-family: Arial, sans-serif;">Apresentar um documento com foto de <strong>${personName}</strong> e o número do pedido (#${orderId}).</p>
        </div>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 20px 0;"><a href="${appUrl}/#account/orders/${orderId}" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #D4AF37; color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Ver Detalhes do Pedido</a></td></tr></table>
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
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 20px 0;"><a href="${appUrl}/#account/orders/${orderId}" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #D4AF37; color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Ver Detalhes do Pedido</a></td></tr></table>
    `;
    return createEmailBase(content);
};

const createShippedEmail = (customerName, orderId, trackingCode, items) => {
    const trackingUrl = `https://www.linketrack.com.br/track/${trackingCode}`;
    const itemsHtml = createItemsListHtml(items, "Itens enviados:");
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Seu Pedido Foi Enviado!</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Ótima notícia! Seu pedido #${orderId} já está a caminho!</p>
        <div style="border: 1px dashed #4B5563; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0 0 10px 0; color: #E5E7EB; font-family: Arial, sans-serif;">Use o código de rastreio abaixo:</p>
            <div style="font-size: 18px; font-weight: bold; color: #E5E7EB; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;">${trackingCode}</div>
        </div>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 10px 0 20px;"><a href="${trackingUrl}" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #D4AF37; color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Rastrear na Transportadora</a></td></tr></table>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 0px 0 20px;"><a href="${appUrl}/#account/orders/${orderId}" target="_blank" style="font-size: 14px; color: #D4AF37; text-decoration: underline; font-family: Arial, sans-serif;">Ver detalhes do pedido em nossa loja</a></td></tr></table>
        ${itemsHtml}
    `;
    return createEmailBase(content);
};

const createRefundProcessedEmail = (customerName, orderId, refundAmount, reason) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Reembolso Processado</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Confirmamos que o reembolso para o seu pedido <strong>#${orderId}</strong> foi processado com sucesso.</p>
        <div style="border: 1px solid #4B5563; padding: 15px; text-align: left; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0 0 10px 0; color: #E5E7EB; font-family: Arial, sans-serif;"><strong>Valor Reembolsado:</strong> <span style="font-weight: bold; color: #D4AF37;">R$ ${refundAmount.toFixed(2).replace('.', ',')}</span></p>
            <p style="margin: 0; color: #E5E7EB; font-family: Arial, sans-serif;"><strong>Motivo:</strong> ${reason}</p>
        </div>
        <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 20px 0 15px;">O valor será estornado no mesmo método de pagamento utilizado na compra. O prazo para que o valor apareça em sua fatura ou conta depende da operadora do seu cartão ou banco.</p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 20px 0;"><a href="${appUrl}/#account/orders/${orderId}" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #D4AF37; color: #111827; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Ver Detalhes do Pedido</a></td></tr></table>
    `;
    return createEmailBase(content);
};

const createAdminDirectEmail = (customerName, subject, message) => {
    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">${subject}</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <div style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">
            ${message.replace(/\n/g, '<br>')}
        </div>
        <p style="color: #9CA3AF; font-size: 14px; margin-top: 25px;">Esta é uma mensagem enviada pela administração da Love Cestas e Perfumes.</p>
    `;
    return createEmailBase(content);
};

const createAdminNewOrderEmail = (order, items, customerName) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const isPickup = order.shipping_method === 'Retirar na loja';
    
    let shippingInfoHtml = '';
    if (isPickup) {
        shippingInfoHtml = `
            <div style="background-color: #374151; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <p style="color: #D4AF37; font-weight: bold; margin: 0 0 5px;">📍 Método: Retirada na Loja</p>
                <p style="color: #E5E7EB; margin: 0; font-size: 14px;">O cliente irá retirar o produto no endereço da loja.</p>
            </div>`;
    } else {
        let address = {};
        try { address = JSON.parse(order.shipping_address); } catch (e) {}
        shippingInfoHtml = `
            <div style="background-color: #374151; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <p style="color: #D4AF37; font-weight: bold; margin: 0 0 10px;">🚚 Método: Envio para Endereço</p>
                <p style="color: #E5E7EB; margin: 0 0 2px; font-size: 14px;"><strong>Rua:</strong> ${address.logradouro || 'N/A'}, ${address.numero || 'S/N'}</p>
                <p style="color: #E5E7EB; margin: 0 0 2px; font-size: 14px;"><strong>Bairro:</strong> ${address.bairro || 'N/A'}</p>
                <p style="color: #E5E7EB; margin: 0 0 2px; font-size: 14px;"><strong>Cidade:</strong> ${address.localidade || 'N/A'} - ${address.uf || ''}</p>
                <p style="color: #E5E7EB; margin: 0; font-size: 14px;"><strong>CEP:</strong> ${address.cep || 'N/A'}</p>
                ${address.complemento ? `<p style="color: #E5E7EB; margin: 2px 0 0; font-size: 14px;"><strong>Comp.:</strong> ${address.complemento}</p>` : ''}
            </div>`;
    }

    const itemsList = items.map(item => `
        <tr style="border-bottom: 1px solid #4B5563;">
            <td style="padding: 10px 0; color: #E5E7EB;">${item.quantity}x</td>
            <td style="padding: 10px 10px; color: #E5E7EB;">
                ${item.name}
                ${item.variation_details ? `<br><span style="font-size: 12px; color: #9CA3AF;">${JSON.parse(item.variation_details).color} / ${JSON.parse(item.variation_details).size}</span>` : ''}
            </td>
            <td style="padding: 10px 0; text-align: right; color: #D4AF37;">R$ ${Number(item.price).toFixed(2)}</td>
        </tr>
    `).join('');

    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Nova Venda Aprovada! 💰</h1>
        <p style="color: #E5E7EB; margin: 0 0 20px;">Olá Admin, um novo pedido foi confirmado e o pagamento foi aprovado.</p>
        
        <div style="background-color: #111827; border: 1px solid #374151; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
            <div style="padding: 15px; border-bottom: 1px solid #374151; display: flex; justify-content: space-between;">
                <span style="color: #9CA3AF;">Pedido <strong>#${order.id}</strong></span>
                <span style="color: #10B981; font-weight: bold;">R$ ${Number(order.total).toFixed(2)}</span>
            </div>
            <div style="padding: 15px;">
                <p style="color: #E5E7EB; margin: 0 0 5px;"><strong>Cliente:</strong> ${customerName}</p>
                <p style="color: #E5E7EB; margin: 0;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
        </div>

        <h3 style="color: #E5E7EB; margin: 0 0 10px;">📦 Detalhes do Envio</h3>
        ${shippingInfoHtml}

        <h3 style="color: #E5E7EB; margin: 0 0 10px;">🛒 Produtos</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
            ${itemsList}
        </table>

        <div style="text-align: center;">
            <a href="${appUrl}/#admin/orders" style="background-color: #D4AF37; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Gerenciar Pedido</a>
        </div>
    `;
    return createEmailBase(content);
};

const createAdminStockAlertEmail = (zeroStockItems, lowStockItems) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    let zeroStockHtml = '';
    if (zeroStockItems.length > 0) {
        zeroStockHtml = `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #EF4444; border-bottom: 1px solid #EF4444; padding-bottom: 8px; margin-bottom: 15px;">🚨 PRODUTOS ESGOTADOS (ESTOQUE 0)</h3>
                <ul style="padding-left: 20px; margin: 0;">
                    ${zeroStockItems.map(p => `
                        <li style="color: #E5E7EB; margin-bottom: 8px;">
                            <strong>${p.name}</strong> 
                            ${p.variation ? `<span style="color: #9CA3AF; font-size: 13px;">(${p.variation})</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    let lowStockHtml = '';
    if (lowStockItems.length > 0) {
        lowStockHtml = `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #F59E0B; border-bottom: 1px solid #F59E0B; padding-bottom: 8px; margin-bottom: 15px;">⚠️ ALERTA DE ESTOQUE BAIXO</h3>
                <ul style="padding-left: 20px; margin: 0;">
                    ${lowStockItems.map(p => `
                        <li style="color: #E5E7EB; margin-bottom: 8px;">
                            <strong>${p.name}</strong> 
                            ${p.variation ? `<span style="color: #9CA3AF; font-size: 13px;">(${p.variation})</span>` : ''}
                            <span style="color: #F59E0B; font-weight: bold; margin-left: 10px;">Restam: ${p.stock}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Relatório de Estoque Crítico</h1>
        <p style="color: #E5E7EB; margin: 0 0 20px;">Atenção Admin, detectamos atualizações críticas no inventário após a última venda.</p>
        
        ${zeroStockHtml}
        ${lowStockHtml}

        <div style="text-align: center; margin-top: 30px;">
            <a href="${appUrl}/#admin/products" style="background-color: #374151; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; border: 1px solid #4B5563;">Repor Estoque Agora</a>
        </div>
    `;
    return createEmailBase(content);
};

// --- ROTAS DA APLICAÇÃO ---

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Servidor está no ar!', timestamp: new Date().toISOString() });
});

app.post('/api/upload/image', verifyToken, imageUpload, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo de imagem enviado.' });
    }
    try {
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    resource_type: "image",
                    // ATUALIZAÇÃO DE SEGURANÇA: Limpa códigos maliciosos (XSS) de arquivos SVG
                    sanitize: true 
                },
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


app.post('/api/register', validate(authSchemas.register), async (req, res) => {
    // O Zod já validou formato de email, tamanho de senha e presença dos campos.
    // Mantemos a validação lógica de CPF (algoritmo) e duplicidade aqui.
    
    const { name, email, password, cpf, phone } = req.body;

    // Validação Manual de CPF (Algoritmo)
    const cleanCpf = String(cpf).replace(/[^\d]/g, '');
    
    // Função auxiliar de validação de CPF (mantida da lógica original)
    const isValidCPF = (strCPF) => {
        let sum = 0, remainder;
        if (strCPF === "00000000000" || strCPF.length !== 11) return false;
        for (let i = 1; i <= 9; i++) sum += parseInt(strCPF.substring(i - 1, i)) * (11 - i);
        remainder = (sum * 10) % 11;
        if ((remainder === 10) || (remainder === 11)) remainder = 0;
        if (remainder !== parseInt(strCPF.substring(9, 10))) return false;
        sum = 0;
        for (let i = 1; i <= 10; i++) sum += parseInt(strCPF.substring(i - 1, i)) * (12 - i);
        remainder = (sum * 10) % 11;
        if ((remainder === 10) || (remainder === 11)) remainder = 0;
        if (remainder !== parseInt(strCPF.substring(10, 11))) return false;
        return true;
    };

    if (!isValidCPF(cleanCpf)) {
        return res.status(400).json({ message: "CPF inválido (falha na verificação do dígito)." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // INSERT completo mantendo a lógica de telefone opcional
        const [result] = await db.query(
            "INSERT INTO users (`name`, `email`, `cpf`, `password`, `phone`) VALUES (?, ?, ?, ?, ?)", 
            [name, email, cleanCpf, hashedPassword, phone ? phone.replace(/\D/g, '') : null]
        );
        
        // Envio de E-mail de Boas-vindas
        await sendEmailAsync({
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

// --- ROTA DE LOGIN (COM ROTAÇÃO E DB) ---
app.post('/api/login', validate(authSchemas.login), async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Email ou senha inválidos." });
        }
        if (user.status === 'blocked') {
            return res.status(403).json({ message: "Conta bloqueada." });
        }

        if (user.role === 'admin' && user.is_two_factor_enabled) {
             const tempToken = jwt.sign({ id: user.id, twoFactorAuth: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
             return res.json({ twoFactorEnabled: true, token: tempToken });
        }

        const userPayload = { id: user.id, name: user.name, role: user.role };
        const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
        const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
        await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, refreshToken, expiresAt]);

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        };

        res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE });

        await db.query("INSERT INTO login_history (user_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, 'success')", [user.id, email, req.ip, req.headers['user-agent']]);

        // --- CORREÇÃO: Busca se a biometria está ativa no ato do login ---
        const [auths] = await db.query("SELECT id FROM user_authenticators WHERE user_id = ?", [user.id]);
        const { password: _, two_factor_secret, ...userData } = user;
        
        userData.has_biometrics = auths.length > 0; // Informa o painel imediatamente

        res.json({ message: "Login realizado com sucesso.", user: userData, accessToken, refreshToken });

    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ message: "Erro interno." });
    }
});

// --- ROTAS DE GERENCIAMENTO 2FA (ADMIN) ---

// Gera um segredo e QR Code para o admin logado
app.post('/api/2fa/generate', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: `LoveCestas (${req.user.name})`
        });

        await db.query("UPDATE users SET two_factor_secret = ? WHERE id = ?", [secret.base32, req.user.id]);

        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                throw new Error('Não foi possível gerar o QR Code.');
            }
            res.json({
                secret: secret.base32,
                qrCodeUrl: data_url
            });
        });
   } catch (err) {
        console.error("Erro ao gerar segredo 2FA:", err);
        res.status(500).json({ message: "Erro interno ao gerar o segredo 2FA." });
    }
});

// Ativa o 2FA
app.post('/api/2fa/verify-enable', verifyToken, verifyAdmin, async (req, res) => {
    const { token } = req.body;
    
    if (!token) return res.status(400).json({ message: "O código é obrigatório." });

    // Limpa qualquer espaço vazio, letra ou formatação que o celular mande junto
    const cleanToken = String(token).replace(/\D/g, '');

    if (cleanToken.length !== 6) {
        return res.status(400).json({ message: "O código deve ter exatamente 6 números." });
    }

    try {
        const [users] = await db.query("SELECT two_factor_secret FROM users WHERE id = ?", [req.user.id]);
        if (users.length === 0 || !users[0].two_factor_secret) {
            return res.status(400).json({ message: 'Segredo 2FA não encontrado. Feche a janela e gere um novo QR Code.' });
        }

        // Janela de tolerância alta (window: 4) aceita códigos de até 2 minutos atrás ou na frente
        const isVerified = speakeasy.totp.verify({
            secret: users[0].two_factor_secret,
            encoding: 'base32',
            token: cleanToken,
            window: 4
        });

        if (isVerified) {
            await db.query("UPDATE users SET is_two_factor_enabled = 1 WHERE id = ?", [req.user.id]);
            logAdminAction(req.user, 'ATIVOU_2FA', null, req.headers['x-forwarded-for'] || req.ip); 
            res.json({ message: '2FA ativado com sucesso!' });
        } else {
            console.error(`[2FA FALHOU] Token recebido: ${cleanToken}, Segredo no DB: ${users[0].two_factor_secret}`);
            res.status(400).json({ message: 'Código de verificação inválido. Exclua do aplicativo e tente gerar um novo QR Code.' });
        }
    } catch (err) {
        console.error("Erro ao verificar e ativar o 2FA:", err);
        res.status(500).json({ message: "Erro interno ao ativar o 2FA." });
    }
});

// Desativa o 2FA
app.post('/api/2fa/disable', verifyToken, verifyAdmin, async (req, res) => {
    const { password, token } = req.body;

    if (!password || !token) return res.status(400).json({ message: "Senha e código são obrigatórios." });

    const cleanToken = String(token).replace(/\D/g, '');

    try {
        const [users] = await db.query("SELECT password, two_factor_secret FROM users WHERE id = ?", [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        const user = users[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: 'Senha incorreta.' });

        const isTokenVerified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: cleanToken,
            window: 4
        });

        if (!isTokenVerified) return res.status(401).json({ message: 'Código 2FA inválido.' });

        await db.query("UPDATE users SET is_two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?", [req.user.id]);
        logAdminAction(req.user, 'DESATIVOU_2FA', null, req.headers['x-forwarded-for'] || req.ip); 
        res.json({ message: '2FA desativado com sucesso.' });

    } catch (err) {
        console.error("Erro ao desativar 2FA:", err);
        res.status(500).json({ message: "Erro interno ao desativar o 2FA." });
    }
});

// Login com 2FA
app.post('/api/login/2fa/verify', async (req, res) => {
    const { token, tempAuthToken } = req.body;
    
    if (!token || !tempAuthToken) return res.status(400).json({ message: "Dados incompletos para validação 2FA." });

    const cleanToken = String(token).replace(/\D/g, '');

    try {
        const decodedTemp = jwt.verify(tempAuthToken, process.env.JWT_SECRET);
        if (!decodedTemp.twoFactorAuth) return res.status(403).json({ message: 'Token de autorização inválido para 2FA.' });
        
        const [users] = await db.query("SELECT * FROM users WHERE id = ?", [decodedTemp.id]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const user = users[0];

        const isVerified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: cleanToken,
            window: 4
        });

        if (!isVerified) return res.status(401).json({ message: 'Código 2FA inválido.' });

        const userPayload = { id: user.id, name: user.name, role: user.role };
        const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
        const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
        await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, refreshToken, expiresAt]);

        const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' };
        res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE });
        
        const { password: _, two_factor_secret, ...userData } = user;
        res.json({ message: "Login bem-sucedido", user: userData, accessToken, refreshToken });

    } catch (err) {
        console.error("Erro na verificação 2FA do login:", err);
        res.status(500).json({ message: 'Sessão temporária expirada. Volte e faça login novamente.' });
    }
});

// Ação de Segurança com 2FA
app.post('/api/auth/verify-action', verifyToken, verifyAdmin, async (req, res) => {
    const { password, token } = req.body;
    const adminId = req.user.id;

    if (!password && !token) return res.status(400).json({ message: 'Senha ou código 2FA é necessário para confirmação.' });

    try {
        const [users] = await db.query("SELECT password, two_factor_secret, is_two_factor_enabled FROM users WHERE id = ?", [adminId]);
        if (users.length === 0) return res.status(404).json({ message: 'Administrador não encontrado.' });
        const admin = users[0];

        if (admin.is_two_factor_enabled && token) {
            const cleanToken = String(token).replace(/\D/g, '');
            const isVerified = speakeasy.totp.verify({
                secret: admin.two_factor_secret,
                encoding: 'base32',
                token: cleanToken,
                window: 4
            });
            if (isVerified) return res.json({ success: true, message: 'Identidade verificada com 2FA.' });
        }

        if (password) {
            const isPasswordCorrect = await bcrypt.compare(password, admin.password);
            if (isPasswordCorrect) return res.json({ success: true, message: 'Identidade verificada com senha.' });
        }
        
        return res.status(401).json({ message: 'Credencial de verificação inválida.' });

    } catch (err) {
        console.error("Erro na verificação de ação crítica:", err);
        res.status(500).json({ message: "Erro interno ao verificar a identidade." });
    }
});

// --- ROTA DE REFRESH TOKEN (ROTAÇÃO SEGURA) ---
app.post('/api/refresh-token', async (req, res) => {
    // Tenta pegar o refresh token do body (localStorage mobile) ou dos cookies
    const oldRefreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (!oldRefreshToken) {
        return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Verifica se o token existe no banco e é válido
        const [storedToken] = await connection.query("SELECT * FROM refresh_tokens WHERE token = ?", [oldRefreshToken]);

        // DETECÇÃO DE REUSO DE TOKEN (Roubo de Sessão)
        if (storedToken.length === 0) {
            try {
                const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
                console.warn(`[SEGURANÇA] Tentativa de reuso de Refresh Token detectada para User ID ${decoded.id}. Invalidando todas as sessões.`);
                await connection.query("DELETE FROM refresh_tokens WHERE user_id = ?", [decoded.id]);
            } catch (e) {
                // Token inválido/expirado, apenas ignora
            }
            await connection.commit();
            return res.status(403).json({ message: 'Sessão inválida (Reuso detectado). Faça login novamente.' });
        }

        const currentTokenData = storedToken[0];

        // Verifica validade criptográfica
        const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
        
        // Verifica expiração do banco
        if (new Date() > new Date(currentTokenData.expires_at)) {
            await connection.query("DELETE FROM refresh_tokens WHERE id = ?", [currentTokenData.id]);
            await connection.commit();
            return res.status(403).json({ message: 'Sessão expirada.' });
        }

        // --- ROTAÇÃO DE TOKEN ---
        // 2. Deleta o token antigo (Single Use)
        await connection.query("DELETE FROM refresh_tokens WHERE id = ?", [currentTokenData.id]);

        // 3. Gera novos tokens
        const [users] = await connection.query("SELECT id, name, role, cpf FROM users WHERE id = ?", [decoded.id]);
        if (users.length === 0) throw new Error("Usuário não encontrado.");
        const user = users[0];

        const userPayload = { id: user.id, name: user.name, role: user.role };
        const newAccessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
        const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
        
        // 4. Salva novo Refresh Token
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
        await connection.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, newRefreshToken, expiresAt]);

        await connection.commit();

        // 5. Envia Cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        };

        res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE });

        // Retorna os tokens na resposta
        res.json({ message: 'Sessão renovada.', accessToken: newAccessToken, refreshToken: newRefreshToken });

    } catch (err) {
        await connection.rollback();
        console.error("Erro no refresh token:", err);
        return res.status(403).json({ message: 'Sessão inválida.' });
    } finally {
        connection.release();
    }
});

// --- ROTA DE LOGOUT (LIMPEZA SEGURA) ---
app.post('/api/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
        try {
            // Remove o token específico do banco
            await db.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
        } catch (e) {
            console.error("Erro ao limpar token no logout:", e);
        }
    }

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/' 
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    // Força bruta para garantir limpeza
    res.cookie('accessToken', '', { ...cookieOptions, maxAge: 0, expires: new Date(0) });
    res.cookie('refreshToken', '', { ...cookieOptions, maxAge: 0, expires: new Date(0) });

    res.status(200).json({ message: 'Logout realizado com sucesso.' });
});

// --- ROTA DE CÁLCULO DE FRETE ---
app.post('/api/shipping/calculate', checkMaintenanceMode, async (req, res) => {
    const { cep_destino, products } = req.body;

    console.log('[FRETE] Requisição recebida:', { cep_destino, products });

    if (!cep_destino || !products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "CEP de destino e informações dos produtos são obrigatórios." });
    }
    
    try {
        const ME_TOKEN = process.env.ME_TOKEN;
        
        const productIds = products.map(p => p.id);
        const [dbProducts] = await db.query(`SELECT id, weight, width, height, length FROM products WHERE id IN (?)`, [productIds]);
        
        const productsWithDetails = products.map(p => {
            const dbProduct = dbProducts.find(dbp => dbp.id == p.id);
            if (!dbProduct) {
                console.error(`[FRETE] ERRO: Produto com ID ${p.id} não encontrado no banco de dados.`);
                throw new Error(`Produto com ID ${p.id} não foi encontrado.`);
            }
            return {...p, ...dbProduct};
        });

        const payload = {
            from: { postal_code: process.env.ORIGIN_CEP.replace(/\D/g, '') },
            to: { postal_code: cep_destino.replace(/\D/g, '') },
            products: productsWithDetails.map(product => {
                const safeHeight = Math.max(Number(product.height) || 0, 1);
                const safeWidth = Math.max(Number(product.width) || 0, 8);
                const safeLength = Math.max(Number(product.length) || 0, 13);
                const safeWeight = Math.max(Number(product.weight) || 0, 0.1);
                
                return {
                    id: String(product.id),
                    width: safeWidth,
                    height: safeHeight,
                    length: safeLength,
                    weight: safeWeight,
                    insurance_value: Number(product.price),
                    quantity: product.quantity || product.qty || 1
                }
            })
        };

        console.log('[FRETE] Payload enviado para Melhor Envio:', JSON.stringify(payload, null, 2));

        const ME_API_URL = 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';

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
            console.error(`[FRETE] Erro da API Melhor Envio (Status: ${apiResponse.status}):`, JSON.stringify(data, null, 2));
            const errorMessage = data.message || (data.errors ? JSON.stringify(data.errors) : 'Erro desconhecido no cálculo de frete.');
            return res.status(apiResponse.status).json({ message: `Erro no cálculo do frete: ${errorMessage}` });
        }
        
        const filteredOptions = data
            .filter(option => !option.error)
            .map(option => ({
                name: option.name,
                price: parseFloat(option.price),
                delivery_time: option.delivery_time,
                company: { name: option.company.name, picture: option.company.picture }
            }));
        
        console.log('[FRETE] Cálculo bem-sucedido. Opções retornadas:', filteredOptions.length);
        res.json(filteredOptions);

    } catch (error) {
        console.error("[FRETE] Erro interno no servidor ao calcular frete:", error);
        res.status(500).json({ message: "Erro interno no servidor ao tentar calcular o frete." });
    }
});

// --- ROTA DE METADADOS (Usada para preencher os filtros da loja sem carregar os produtos) ---
app.get('/api/products/metadata', async (req, res) => {
    try {
        const [brands] = await db.query("SELECT DISTINCT brand FROM products WHERE is_active = 1 AND brand IS NOT NULL AND brand != '' ORDER BY brand ASC");
        res.json({
            brands: brands.map(b => b.brand)
        });
    } catch (err) {
        console.error("Erro ao buscar metadados de produtos:", err);
        res.status(500).json({ message: "Erro ao buscar metadados." });
    }
});

// --- ROTA DE BUSCA EM LOTE (Usada para a vitrine de Vistos Recentemente) ---
app.get('/api/products/batch', checkMaintenanceMode, async (req, res) => {
    const { ids } = req.query;
    if (!ids) return res.json([]);

    try {
        // Limpa e converte os IDs para array de números
        const idArray = ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (idArray.length === 0) return res.json([]);

        const placeholders = idArray.map(() => '?').join(',');
        const sql = `
            SELECT 
                p.*,
                r_agg.avg_rating,
                COALESCE(r_agg.review_count, 0) as review_count
            FROM products p
            LEFT JOIN (
                SELECT product_id, AVG(rating) as avg_rating, COUNT(id) as review_count 
                FROM reviews GROUP BY product_id
            ) AS r_agg ON p.id = r_agg.product_id
            WHERE p.id IN (${placeholders}) AND p.is_active = 1
        `;
        
        const [products] = await db.query(sql, idArray);
        
        // Reordena os produtos para manter a ordem exata em que o cliente viu (do mais recente pro mais antigo)
        const sortedProducts = idArray.map(id => products.find(p => p.id === id)).filter(Boolean);

        res.json(sortedProducts);
    } catch (err) {
        console.error("Erro ao buscar produtos em lote:", err);
        res.status(500).json({ message: "Erro ao buscar produtos." });
    }
});

// --- ROTA DE PRODUTOS PAGINADA (Arquitetura Híbrida: SQL + Fuzzy Search) ---
app.get('/api/products', checkMaintenanceMode, async (req, res) => {
    try {
        // Recebe os parâmetros de paginação e filtro do frontend
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const promo = req.query.promo === 'true';

        let baseSql = `
            SELECT 
                p.*,
                r_agg.avg_rating,
                COALESCE(r_agg.review_count, 0) as review_count
            FROM products p
            LEFT JOIN (
                SELECT product_id, AVG(rating) as avg_rating, COUNT(id) as review_count 
                FROM reviews GROUP BY product_id
            ) AS r_agg ON p.id = r_agg.product_id
            WHERE p.is_active = 1
        `;
        
        let countSql = `SELECT COUNT(p.id) as total FROM products p WHERE p.is_active = 1`;
        
        const params = [];
        let conditions = "";

        if (category) {
            if (category === 'Roupas') {
                conditions += " AND p.product_type = 'clothing'";
            } else if (category === 'Perfumes') {
                conditions += " AND p.product_type = 'perfume'";
            } else {
                conditions += " AND p.category = ?";
                params.push(category);
            }
        }

        if (brand) {
            conditions += " AND p.brand = ?";
            params.push(brand);
        }

        if (promo) {
            conditions += " AND p.is_on_sale = 1";
        }

        // 1. MÁXIMA PERFORMANCE: Se não houver busca inteligente, paginamos direto no MySQL
        if (!search) {
            const [countResult] = await db.query(countSql + conditions, params);
            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / limit);
            const offset = (page - 1) * limit;

            const finalSql = baseSql + conditions + ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
            const [paginatedProducts] = await db.query(finalSql, [...params, limit, offset]);

            return res.json({
                products: paginatedProducts,
                totalItems,
                totalPages,
                currentPage: page
            });
        } 
        
        // 2. BUSCA INTELIGENTE: Filtramos o básico no SQL, passamos o Fuse.js para tolerar erros e paginamos
        const finalSql = baseSql + conditions + ` ORDER BY p.created_at DESC`;
        const [allFilteredProducts] = await db.query(finalSql, params);

        const fuse = new Fuse(allFilteredProducts, {
            keys: [
                { name: 'name', weight: 0.6 },
                { name: 'brand', weight: 0.2 },
                { name: 'category', weight: 0.2 }
            ],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2
        });

        const fuzzyResults = fuse.search(search).map(result => result.item);
        
        const totalItems = fuzzyResults.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedProducts = fuzzyResults.slice(startIndex, endIndex);

        return res.json({
            products: paginatedProducts,
            totalItems,
            totalPages,
            currentPage: page
        });

    } catch (err) {
        console.error("Erro ao buscar produtos paginados:", err);
        res.status(500).json({ message: "Erro ao buscar produtos." });
    }
});

app.get('/api/products/all', verifyToken, verifyAdmin, async (req, res) => {
    const { search } = req.query;
    try {
        let sql = `
            SELECT 
                p.*,
                r_agg.avg_rating,
                COALESCE(r_agg.review_count, 0) as review_count
            FROM 
                products p
            LEFT JOIN 
                (SELECT 
                    product_id, 
                    AVG(rating) as avg_rating, 
                    COUNT(id) as review_count 
                FROM 
                    reviews 
                GROUP BY 
                    product_id) AS r_agg ON p.id = r_agg.product_id
        `;
        const params = [];
        if (search) {
            sql += " WHERE p.name LIKE ? OR p.brand LIKE ? OR p.category LIKE ?";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        sql += " ORDER BY p.id DESC";
        const [products] = await db.query(sql, params);
        res.json(products);
    } catch (err) {
        console.error("Erro ao buscar todos os produtos:", err);
        res.status(500).json({ message: "Erro ao buscar todos os produtos." });
    }
});

app.get('/api/products/search-suggestions', checkMaintenanceMode, async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 1) {
        return res.json([]);
    }
    try {
        // Busca os dados básicos de todos os produtos ativos
        const sql = "SELECT id, name, brand, category, images, price, sale_price, is_on_sale FROM products WHERE is_active = 1";
        const [products] = await db.query(sql);

        // Configura o Fuse.js para busca fuzzy (tolerância a erros de digitação)
        const fuse = new Fuse(products, {
            keys: [
                { name: 'name', weight: 0.6 },     // O Nome tem peso maior na busca
                { name: 'brand', weight: 0.2 },    // Marca e Categoria ajudam a encontrar
                { name: 'category', weight: 0.2 }
            ],
            threshold: 0.4, // Nível de tolerância a erros (0.0 é exato, 1.0 aceita qualquer coisa)
            ignoreLocation: true, // Procura em qualquer parte do texto
            minMatchCharLength: 2
        });

        // Realiza a busca inteligente
        const results = fuse.search(q);
        
        // Retorna apenas os 5 melhores resultados formatados de volta para o padrão esperado pelo React
        const suggestions = results.slice(0, 5).map(result => result.item);

        res.json(suggestions);
    } catch (err) {
        console.error("Erro ao buscar sugestões de pesquisa:", err);
        res.status(500).json({ message: "Erro ao buscar sugestões." });
    }
});


app.get('/api/products/low-stock', verifyToken, verifyAdmin, async (req, res) => {
    const LOW_STOCK_THRESHOLD = 5;
    try {
        const [allProducts] = await db.query("SELECT id, name, stock, product_type, variations, images FROM products WHERE is_active = 1");

        const lowStockItems = [];

        for (const product of allProducts) {
            if (product.product_type === 'clothing') {
                try {
                    const variations = JSON.parse(product.variations || '[]');
                    for (const v of variations) {
                        if (v.stock < LOW_STOCK_THRESHOLD) {
                            lowStockItems.push({
                                id: product.id,
                                name: `${product.name} (${v.color} / ${v.size})`,
                                stock: v.stock,
                                images: v.images && v.images.length > 0 ? JSON.stringify(v.images) : product.images, // Usa imagens da variação se houver, senão as principais
                                product_type: 'clothing',
                                variation: v // <--- ADICIONADO: Inclui o objeto completo da variação
                            });
                        }
                    }
                } catch (e) {
                    console.error(`Erro ao parsear variações do produto ${product.id}:`, e);
                }
            } else { // perfume
                if (product.stock < LOW_STOCK_THRESHOLD) {
                    lowStockItems.push({
                        id: product.id,
                        name: product.name,
                        stock: product.stock,
                        images: product.images
                    });
                }
            }
        }
        res.json(lowStockItems);
    } catch (err) {
        console.error("Erro ao buscar produtos com estoque baixo:", err);
        res.status(500).json({ message: "Erro ao buscar produtos com estoque baixo." });
    }
});

app.get('/api/products/:id', checkMaintenanceMode, async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.*,
                r_agg.avg_rating,
                COALESCE(r_agg.review_count, 0) as review_count
            FROM 
                products p
            LEFT JOIN 
                (SELECT 
                    product_id, 
                    AVG(rating) as avg_rating, 
                    COUNT(id) as review_count 
                FROM 
                    reviews 
                WHERE 
                    product_id = ?
                GROUP BY 
                    product_id) AS r_agg ON p.id = r_agg.product_id
            WHERE 
                p.id = ?;
        `;
        const [products] = await db.query(sql, [req.params.id, req.params.id]);
        if (products.length === 0) return res.status(404).json({ message: "Produto não encontrado." });
        
        const product = products[0];
        if (product.review_count === null) {
            product.review_count = 0;
        }
        if (product.avg_rating === null) {
            product.avg_rating = 0;
        }

        res.json(product);
    } catch (err) {
        console.error("Erro ao buscar produto por ID:", err);
        res.status(500).json({ message: "Erro ao buscar produto." });
    }
});

app.get('/api/products/:id/related-by-purchase', checkMaintenanceMode, async (req, res) => {
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
            GROUP BY p.id
            ORDER BY purchase_frequency DESC
            LIMIT 8;
        `;
        // Correção: Alterado GROUP BY oi.product_id para GROUP BY p.id para respeitar o ONLY_FULL_GROUP_BY do MySQL
        const [relatedProducts] = await db.query(sqlFindRelated, [orderIds, id]);
        res.json(relatedProducts);

    } catch (err) {
        console.error("Erro ao buscar produtos relacionados por compra:", err);
        res.status(500).json({ message: "Erro ao buscar produtos relacionados." });
    }
});

// --- TAREFA AUTOMÁTICA (CRON JOB) ---
// Verifica promoções expiradas a cada minuto de forma segura para não vazar conexões
setInterval(async () => {
    let connection;
    try {
        connection = await db.getConnection();
        // Define is_on_sale = 0, zera sale_price e limpa a data onde a data atual é maior que sale_end_date
        const [result] = await connection.query(`
            UPDATE products 
            SET is_on_sale = 0, sale_price = NULL, sale_end_date = NULL 
            WHERE is_on_sale = 1 AND sale_end_date IS NOT NULL AND sale_end_date < NOW()
        `);
        
        if (result.affectedRows > 0) {
            console.log(`[AUTO-PROMO] ${result.affectedRows} promoções expiradas foram encerradas e preços revertidos.`);
        }
    } catch (err) {
        console.error("[AUTO-PROMO] Erro ao verificar promoções expiradas:", err);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}, 60000);

// --- CRON JOB: RELATÓRIO DIÁRIO DE ESTOQUE (08:00 BRT) ---
let lastDailyReportDate = null;

setInterval(async () => {
    // Obtém a hora atual forçando o fuso horário de São Paulo/Brasil
    const now = new Date();
    const options = { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: 'numeric', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);

    // Verifica se é 08:00 da manhã
    if (hour === 8 && minute === 0) {
        const todayStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        // Evita execução duplicada no mesmo dia (garante que rode apenas uma vez)
        if (lastDailyReportDate === todayStr) return;
        lastDailyReportDate = todayStr;

        console.log('[AUTO-STOCK-DAILY] Iniciando verificação diária de estoque (08:00 BRT)...');

        try {
            const connection = await db.getConnection();
            try {
                const LOW_STOCK_THRESHOLD = 5;
                const [allProducts] = await connection.query("SELECT name, stock, product_type, variations FROM products WHERE is_active = 1");
                
                let zeroStockList = [];
                let lowStockList = [];

                allProducts.forEach(p => {
                    if (p.product_type === 'clothing') {
                        const vars = JSON.parse(p.variations || '[]');
                        vars.forEach(v => {
                            if (v.stock <= 0) {
                                zeroStockList.push({ name: p.name, variation: `${v.color} - ${v.size}`, stock: 0 });
                            } else if (v.stock <= LOW_STOCK_THRESHOLD) {
                                lowStockList.push({ name: p.name, variation: `${v.color} - ${v.size}`, stock: v.stock });
                            }
                        });
                    } else {
                        if (p.stock <= 0) {
                            zeroStockList.push({ name: p.name, variation: null, stock: 0 });
                        } else if (p.stock <= LOW_STOCK_THRESHOLD) {
                            lowStockList.push({ name: p.name, variation: null, stock: p.stock });
                        }
                    }
                });

                if (zeroStockList.length > 0 || lowStockList.length > 0) {
                    const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
                    const emailHtml = createAdminStockAlertEmail(zeroStockList, lowStockList);
                    
                    // Assunto personalizado para o relatório diário
                    await sendEmailAsync({
                        from: FROM_EMAIL,
                        to: adminEmail,
                        subject: `📅 Relatório Diário (08:00): ${zeroStockList.length} Esgotados / ${lowStockList.length} Baixos`,
                        html: emailHtml
                    });
                    console.log('[AUTO-STOCK-DAILY] Relatório diário enviado com sucesso.');
                } else {
                    console.log('[AUTO-STOCK-DAILY] Estoque saudável. Nenhum e-mail enviado.');
                }

            } finally {
                connection.release();
            }
        } catch (err) {
            console.error("[AUTO-STOCK-DAILY] Erro ao executar relatório diário:", err);
        }
    }
}, 60000); // Verifica a cada minuto

// 1. Criação de Produto (Bloqueado e Validado)

app.post('/api/products', verifyToken, verifyAdmin, validate(productSchema), async (req, res) => {
    const { product_type = 'perfume', ...productData } = req.body;
    
    const fields = [
        'name', 'brand', 'category', 'price', 'sale_price', 'sale_end_date', 'is_on_sale', 'images', 'description',
        'weight', 'width', 'height', 'length', 'is_active', 'product_type', 'video_url'
    ];
    
    const saleEndDate = productData.sale_end_date ? new Date(productData.sale_end_date) : null;

    const values = [
        productData.name, 
        productData.brand, 
        productData.category, 
        productData.price, 
        productData.sale_price || null, 
        saleEndDate,
        productData.is_on_sale ? 1 : 0,
        productData.images, 
        productData.description, 
        productData.weight, 
        productData.width,
        productData.height, 
        productData.length, 
        productData.is_active ? 1 : 0, 
        product_type, 
        productData.video_url || null
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
        
        logAdminAction(req.user, 'CRIOU PRODUTO', `ID: ${result.insertId}, Nome: "${productData.name}"`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.status(201).json({ message: "Produto criado com sucesso!", productId: result.insertId });
    } catch (err) {
        console.error("Erro ao criar produto:", err);
        res.status(500).json({ message: "Erro interno ao criar produto." });
    }
});

app.put('/api/products/stock-update', verifyToken, verifyAdmin, async (req, res) => {
    const { productId, newStock, variation } = req.body; // variation object is passed for clothing

    // Add initial log
    console.log('[STOCK_UPDATE] Received request:', { productId, newStock, variation });
    console.log('[STOCK_UPDATE] Detailed variation object received:', JSON.stringify(variation, null, 2)); // Log detalhado da variação recebida

    if (!productId || newStock === undefined || newStock < 0) {
        console.error('[STOCK_UPDATE] Invalid input:', { productId, newStock });
        return res.status(400).json({ message: "ID do produto e novo estoque válido são obrigatórios." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        console.log('[STOCK_UPDATE] Transaction started for product:', productId);

        const [products] = await connection.query("SELECT * FROM products WHERE id = ? FOR UPDATE", [productId]);
        if (products.length === 0) {
            console.error('[STOCK_UPDATE] Product not found:', productId);
            throw new Error("Produto não encontrado.");
        }
        const product = products[0];
        console.log('[STOCK_UPDATE] Product found:', { id: product.id, type: product.product_type });

        if (product.product_type === 'clothing') {
            if (!variation || !variation.color || !variation.size) {
                 console.error('[STOCK_UPDATE] Missing variation details for clothing:', { productId, variation });
                 throw new Error("Variação (cor e tamanho) é obrigatória para produtos de vestuário.");
            }
            console.log('[STOCK_UPDATE] Processing clothing variation update. Target variation:', variation);

            let variations;
            try {
                variations = JSON.parse(product.variations || '[]');
                console.log('[STOCK_UPDATE] Variations parsed from DB:', variations);
            } catch (parseError) {
                console.error('[STOCK_UPDATE] Failed to parse variations JSON from DB:', product.variations, parseError);
                throw new Error("Erro interno: Dados de variação do produto estão corrompidos.");
            }

            // More robust findIndex: Check for ID if available, otherwise color/size
            const variationIndex = variations.findIndex(v =>
                (variation.id && v.id === variation.id) || // Prefer ID if present
                (v.color === variation.color && v.size === variation.size) // Fallback to color/size
            );

            if (variationIndex === -1) {
                console.error(`[STOCK_UPDATE] Variation not found in DB variations array. Target: ${JSON.stringify(variation)}, DB Variations: ${JSON.stringify(variations)}`);
                throw new Error("Variação especificada não encontrada no produto. Não foi possível atualizar o estoque.");
            }
            console.log(`[STOCK_UPDATE] Variation found at index ${variationIndex}. Updating stock to ${newStock}.`);

            variations[variationIndex].stock = parseInt(newStock, 10);
            // Use the corrected reduce from the previous step
            const totalStock = variations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
            console.log(`[STOCK_UPDATE] New total stock calculated: ${totalStock}`);

            await connection.query("UPDATE products SET variations = ?, stock = ? WHERE id = ?", [JSON.stringify(variations), totalStock, productId]);
            console.log('[STOCK_UPDATE] Clothing product stock updated in DB.');
            logAdminAction(req.user, 'ATUALIZOU ESTOQUE (VARIAÇÃO)', `Produto ID: ${productId} (${variation.color}/${variation.size}), Novo Estoque: ${newStock}`);

        } else { // Perfume or other type
             console.log(`[STOCK_UPDATE] Processing simple stock update for product type: ${product.product_type}`);
             await connection.query("UPDATE products SET stock = ? WHERE id = ?", [parseInt(newStock, 10), productId]);
             console.log('[STOCK_UPDATE] Simple product stock updated in DB.');
             logAdminAction(req.user, 'ATUALIZOU ESTOQUE (SIMPLES)', `Produto ID: ${productId}, Novo Estoque: ${newStock}`);
        }

        await connection.commit();
        console.log('[STOCK_UPDATE] Transaction committed successfully for product:', productId);
        res.json({ message: "Estoque atualizado com sucesso!" });

    } catch (err) {
        console.error("[STOCK_UPDATE] Error during stock update, rolling back transaction:", err); // Log the actual error
        await connection.rollback();
        // Send back a more specific error if available
        res.status(500).json({ message: err.message || "Erro interno ao atualizar estoque." });
    } finally {
        if (connection) {
            connection.release();
            console.log('[STOCK_UPDATE] DB connection released for product:', productId);
        }
    }
});

// 3. Promoções em Massa (Bloqueado)
app.put('/api/products/bulk-promo', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productIds, discountPercentage, saleEndDate, isLimitedTime } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: "Nenhum produto selecionado." });
        }
        
        const discount = parseFloat(discountPercentage);
        if (isNaN(discount) || discount <= 0 || discount >= 100) {
            return res.status(400).json({ message: "Porcentagem de desconto inválida." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const placeholders = productIds.map(() => '?').join(',');
            const [products] = await connection.query(`SELECT id, price, product_type, variations FROM products WHERE id IN (${placeholders})`, productIds);

            const productsToNotify = [];

            for (const product of products) {
                const originalPrice = parseFloat(product.price);
                const discountValue = originalPrice * (discount / 100);
                const salePrice = (originalPrice - discountValue).toFixed(2);
                
                const finalDate = (isLimitedTime && saleEndDate) ? new Date(saleEndDate) : null;

                if (product.product_type === 'clothing') {
                    let variations = [];
                    if (product.variations) {
                        try { variations = JSON.parse(product.variations); } catch (e) { console.error(`Erro parse JSON prod ${product.id}`, e); }
                    }
                    
                    const updatedVariations = variations.map(v => ({ ...v, is_promo: true }));

                    await connection.query(
                        "UPDATE products SET is_on_sale = 1, sale_price = ?, sale_end_date = ?, variations = ? WHERE id = ?",
                        [salePrice, finalDate, JSON.stringify(updatedVariations), product.id]
                    );
                } else {
                    await connection.query(
                        "UPDATE products SET is_on_sale = 1, sale_price = ?, sale_end_date = ? WHERE id = ?",
                        [salePrice, finalDate, product.id]
                    );
                }
                
                productsToNotify.push(product.id);
            }

            await connection.commit();
            
            const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || null);
            logAdminAction(req.user, 'PROMOÇÃO EM MASSA', `Aplicou ${discount}% em ${products.length} produtos.`, clientIp);
            
            res.json({ message: `Promoção aplicada com sucesso em ${products.length} produtos!` });

            if (productsToNotify.length > 0) {
                notifyWishlistUsers(productsToNotify, db).catch(e => console.error("Erro background notify:", e));
            }

        } catch (err) {
            await connection.rollback();
            console.error("===== ERRO DETALHADO TRANSAÇÃO BULK-PROMO =====");
            console.error(err.stack || err);
            // Retorna o erro exato para o frontend
            res.status(500).json({ message: `Erro BD: ${err.message}` });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("===== ERRO FATAL ROTA BULK-PROMO =====");
        console.error(error.stack || error);
        // Retorna o erro exato para o frontend
        res.status(500).json({ message: `Erro Servidor: ${error.message}` });
    }
});

// --- ROTA PARA ENCERRAR PROMOÇÕES SELECIONADAS (PUT) ---
app.put('/api/products/bulk-clear-promo', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productIds } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: "Nenhum produto selecionado para encerrar promoção." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const placeholders = productIds.map(() => '?').join(',');
            
            const sql = `UPDATE products SET is_on_sale = 0, sale_price = NULL, sale_end_date = NULL WHERE id IN (${placeholders})`;
            const [result] = await connection.query(sql, productIds);

            const [clothingProducts] = await connection.query(`SELECT id, variations FROM products WHERE id IN (${placeholders}) AND product_type = 'clothing'`, productIds);
            
            for (const product of clothingProducts) {
                let variations = [];
                if (product.variations) {
                    try { variations = JSON.parse(product.variations); } catch (e) {}
                }
                
                const updatedVariations = variations.map(v => ({ ...v, is_promo: false }));

                await connection.query(
                    "UPDATE products SET variations = ? WHERE id = ?",
                    [JSON.stringify(updatedVariations), product.id]
                );
            }

            await connection.commit();
            
            const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || null);
            logAdminAction(req.user, 'ENCERROU PROMOÇÕES (SELEÇÃO)', `Removeu promoção de ${result.affectedRows} produtos.`, clientIp);
            
            res.json({ message: `Promoção encerrada em ${result.affectedRows} produtos com sucesso!` });

        } catch (err) {
            await connection.rollback();
            console.error("===== ERRO DETALHADO TRANSAÇÃO BULK-CLEAR-PROMO =====");
            console.error(err.stack || err);
            res.status(500).json({ message: `Erro BD: ${err.message}` });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("===== ERRO FATAL ROTA BULK-CLEAR-PROMO =====");
        console.error(error.stack || error);
        res.status(500).json({ message: `Erro Servidor: ${error.message}` });
    }
});

// 2. Edição de Produto
app.put('/api/products/:id', verifyToken, verifyAdmin, validate(productSchema), async (req, res) => {
    const { id } = req.params;
    const { product_type = 'perfume', ...productData } = req.body;

    let fieldsToUpdate = [
        'name', 'brand', 'category', 'price', 'sale_price', 'sale_end_date', 'is_on_sale', 'images', 'description',
        'weight', 'width', 'height', 'length', 'is_active', 'product_type', 'video_url'
    ];

    const saleEndDate = productData.sale_end_date ? new Date(productData.sale_end_date) : null;

    let values = [
        productData.name, 
        productData.brand, 
        productData.category, 
        productData.price, 
        productData.sale_price || null, 
        saleEndDate, 
        productData.is_on_sale ? 1 : 0,
        productData.images, 
        productData.description, 
        productData.weight, 
        productData.width,
        productData.height, 
        productData.length, 
        productData.is_active ? 1 : 0, 
        product_type, 
        productData.video_url || null
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

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [current] = await connection.query("SELECT is_on_sale FROM products WHERE id = ?", [id]);
        const wasOnSale = current[0] ? current[0].is_on_sale : 0;

        const setClause = fieldsToUpdate.map(field => `\`${field}\` = ?`).join(', ');
        const sql = `UPDATE products SET ${setClause} WHERE id = ?`;
        await connection.query(sql, values);

        await connection.commit();
        
        logAdminAction(req.user, 'EDITOU PRODUTO', `ID: ${id}, Nome: "${productData.name}"`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: "Produto atualizado com sucesso!" });

        const isNowOnSale = productData.is_on_sale ? 1 : 0;
        if (!wasOnSale && isNowOnSale) {
            notifyWishlistUsers([id], db).catch(e => console.error("Erro background notify:", e));
        }

    } catch (err) {
        await connection.rollback();
        console.error("Erro ao atualizar produto:", err);
        res.status(500).json({ message: "Erro interno ao atualizar produto." });
    } finally {
        connection.release();
    }
});

app.delete('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
        
        const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
        logAdminAction(req.user, 'DELETOU PRODUTO', `ID: ${req.params.id}`, clientIp);
        
        res.json({ message: "Produto deletado com sucesso." });
    } catch (err) {
        // Correção: Trata o erro de produto atrelado a um pedido (Chave Estrangeira)
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(409).json({ message: "Este produto está vinculado a um pedido e não pode ser excluído. Em vez disso, clique em Editar e desative-o." });
        }
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
        logAdminAction(req.user, 'DELETOU PRODUTOS EM MASSA', `Total: ${totalAffectedRows}, IDs: ${ids.join(', ')}`, req.ip); // CORREÇÃO: IP ADICIONADO
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

const createWishlistPromoEmail = (customerName, products) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    // Gera o HTML para a lista de produtos (limitado a 5 para não quebrar o email, com link "ver mais" se tiver muitos)
    const displayProducts = products.slice(0, 5);
    const remainingCount = products.length - 5;

    const productsHtml = displayProducts.map(p => {
        const originalPrice = parseFloat(p.price);
        const salePrice = parseFloat(p.sale_price);
        const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);

        return `
            <div style="background-color: #fff; border-radius: 8px; overflow: hidden; margin-bottom: 15px; border: 1px solid #374151; display: flex;">
                <div style="width: 100px; height: 100px; padding: 10px; flex-shrink: 0; background-color: #f9fafb;">
                    <img src="${getFirstImage(p.images)}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: contain; display: block;">
                </div>
                <div style="padding: 10px 15px; flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
                    <h3 style="color: #111827; font-size: 14px; margin: 0 0 5px 0; font-weight: 600;">${p.name}</h3>
                    <div style="font-size: 12px; color: #6B7280; text-decoration: line-through;">R$ ${originalPrice.toFixed(2).replace('.', ',')}</div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px;">
                        <div style="color: #D4AF37; font-size: 16px; font-weight: bold;">R$ ${salePrice.toFixed(2).replace('.', ',')}</div>
                        <div style="background-color: #059669; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">-${discount}%</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const moreItemsHtml = remainingCount > 0 
        ? `<p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 10px;">E mais ${remainingCount} itens em oferta...</p>` 
        : '';

    const content = `
        <div style="text-align: center; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <div style="margin-bottom: 20px;">
                <span style="background-color: #D4AF37; color: #000; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Alerta de Ofertas</span>
            </div>
            <h1 style="color: #ffffff; font-size: 22px; margin-bottom: 10px; font-weight: 300;">Sua Lista de Desejos está brilhando! ✨</h1>
            <p style="color: #9CA3AF; font-size: 15px; margin-bottom: 30px; line-height: 1.5;">Olá, ${customerName}. Selecionamos as melhores oportunidades dos itens que você salvou. Aproveite antes que o estoque acabe!</p>
            
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                ${productsHtml}
                ${moreItemsHtml}
            </div>
            
            <div style="margin-top: 30px; padding: 0 20px 20px;">
                <a href="${appUrl}/#wishlist" target="_blank" style="display: block; width: 100%; max-width: 250px; margin: 0 auto; padding: 14px 0; background-color: #D4AF37; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; text-align: center; transition: background 0.3s;">
                    Ver Minha Lista Completa
                </a>
            </div>
            
            <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">Estas ofertas são por tempo limitado.</p>
        </div>
    `;
    return createEmailBase(content);
};

// --- FUNÇÃO PARA NOTIFICAR USUÁRIOS DA WISHLIST (AGRUPADA) ---
const notifyWishlistUsers = async (productIds, connection) => {
    try {
        if (!productIds || productIds.length === 0) return;

        // 1. Buscar detalhes de TODOS os produtos que entraram em promoção e estão válidos
        const [products] = await connection.query(`
            SELECT id, name, brand, price, sale_price, images, is_on_sale 
            FROM products 
            WHERE id IN (?) AND is_on_sale = 1 AND sale_price > 0
        `, [productIds]);

        if (products.length === 0) return;

        // Cria um mapa de produtos para acesso rápido
        const productsMap = products.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        const validProductIds = products.map(p => p.id);

        // 2. Buscar usuários que têm ESSES produtos na wishlist
        // Trazemos: ID do usuário, Nome, Email e ID do produto que ele quer
        const [wishlistEntries] = await connection.query(`
            SELECT u.id as user_id, u.email, u.name, w.product_id
            FROM users u 
            JOIN wishlist w ON u.id = w.user_id 
            WHERE w.product_id IN (?)
        `, [validProductIds]);

        if (wishlistEntries.length === 0) return;

        // 3. Agrupar produtos por usuário
        const userNotifications = {};

        wishlistEntries.forEach(entry => {
            if (!userNotifications[entry.user_id]) {
                userNotifications[entry.user_id] = {
                    name: entry.name,
                    email: entry.email,
                    items: []
                };
            }
            // Adiciona o produto completo à lista deste usuário
            if (productsMap[entry.product_id]) {
                userNotifications[entry.user_id].items.push(productsMap[entry.product_id]);
            }
        });

        console.log(`[Wishlist Notify] Preparando envio para ${Object.keys(userNotifications).length} usuários.`);

        // 4. Enviar UM e-mail por usuário com a lista de itens
        for (const userId in userNotifications) {
            const user = userNotifications[userId];
            if (user.items.length > 0) {
                try {
                    const html = createWishlistPromoEmail(user.name, user.items);
                    const subjectItemCount = user.items.length > 1 ? `${user.items.length} itens` : `Um item`;
                    
                    await sendEmailAsync({
                        from: FROM_EMAIL,
                        to: user.email,
                        subject: `Oportunidade! ${subjectItemCount} da sua lista em oferta ⚡`,
                        html: html
                    });
                } catch (emailErr) {
                    console.error(`Erro ao enviar notificação de wishlist para ${user.email}:`, emailErr);
                }
            }
        }

    } catch (err) {
        console.error(`[Wishlist Notify] Erro crítico ao notificar usuários:`, err);
    }
};

// --- ROTAS DE AVALIAÇÕES (REVIEWS) ---
app.post('/api/reviews', verifyToken, async (req, res) => {
    const { product_id, order_id, rating, comment, images } = req.body;
    const userId = req.user.id;
    const MAX_COMMENT_LENGTH = 500;

    if (!product_id || !order_id || !rating) {
        return res.status(400).json({ message: "ID do produto, ID do pedido e avaliação são obrigatórios." });
    }

    if (comment && comment.length > MAX_COMMENT_LENGTH) {
        return res.status(400).json({ message: `O comentário não pode exceder ${MAX_COMMENT_LENGTH} caracteres.` });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [purchase] = await connection.query(
            `SELECT o.id FROM orders o JOIN order_items oi ON o.id = oi.order_id 
             WHERE o.user_id = ? AND oi.product_id = ? AND o.id = ? AND o.status = ? LIMIT 1`,
            [userId, product_id, order_id, ORDER_STATUS.DELIVERED]
        );

        if (purchase.length === 0) {
            throw new Error("Você só pode avaliar produtos de pedidos que já foram entregues.");
        }

        // Converte o array de imagens em JSON se houver imagens
        const imagesJson = images && Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : null;

        await connection.query(
            "INSERT INTO reviews (product_id, user_id, order_id, rating, comment, images) VALUES (?, ?, ?, ?, ?, ?)",
            [product_id, userId, order_id, rating, comment || '', imagesJson]
        );

        await connection.commit();
        res.status(201).json({ message: "Avaliação adicionada com sucesso!" });

    } catch (err) {
        await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Você já avaliou este produto para esta compra." });
        }
        if (err.message.includes("Você só pode avaliar")) {
             return res.status(403).json({ message: err.message });
        }
        console.error("Erro ao adicionar avaliação:", err);
        res.status(500).json({ message: "Erro interno ao adicionar avaliação." });
    } finally {
        connection.release();
    }
});

app.get('/api/products/:id/reviews', checkMaintenanceMode, async (req, res) => {
    try {
        const [reviews] = await db.query("SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC", [req.params.id]);
        res.json(reviews);
    } catch (err) {
        console.error("Erro ao buscar avaliações:", err);
        res.status(500).json({ message: "Erro ao buscar avaliações." });
    }
});

// --- NOVA ROTA: Marcar avaliação como útil ---
app.post('/api/reviews/:id/helpful', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("UPDATE reviews SET helpful_votes = helpful_votes + 1 WHERE id = ?", [id]);
        res.json({ message: "Voto registrado com sucesso." });
    } catch (err) {
        console.error("Erro ao registrar voto útil:", err);
        res.status(500).json({ message: "Erro interno ao registrar voto." });
    }
});

app.delete('/api/reviews/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query("DELETE FROM reviews WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Avaliação não encontrada." });
        }
        logAdminAction(req.user, 'DELETOU AVALIAÇÃO', `ID da avaliação: ${id}`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.status(200).json({ message: "Avaliação deletada com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar avaliação:", err);
        res.status(500).json({ message: "Erro interno ao deletar avaliação." });
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
            let variation = null;
            if (item.variation_details) {
                try {
                    // CORREÇÃO: Garante que os detalhes da variação (cor/tamanho) sejam lidos corretamente do banco
                    variation = (typeof item.variation_details === 'string') 
                        ? JSON.parse(item.variation_details) 
                        : item.variation_details;
                } catch(e) { 
                    console.error('Erro ao parsear variation_details do carrinho:', item.variation_details); 
                    variation = null;
                }
            }
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
    // ATUALIZAÇÃO: Extrai também 'variation' e 'variation_details' do corpo da requisição
    const { productId, quantity, variationId, variation, variation_details } = req.body;

    if (!productId || !quantity || quantity < 1) {
        return res.status(400).json({ message: "ID do produto e quantidade são obrigatórios." });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let variationDetailsString = null;

        // Lógica de Prioridade para salvar a variação:
        // 1. Tenta usar 'variation_details' (string pronta enviada pelo frontend)
        if (variation_details) {
            variationDetailsString = typeof variation_details === 'string' 
                ? variation_details 
                : JSON.stringify(variation_details);
        } 
        // 2. Se não, tenta usar o objeto 'variation' direto
        else if (variation) {
            variationDetailsString = JSON.stringify(variation);
        }
        // 3. Fallback: Tenta buscar pelo ID no banco (comportamento antigo)
        else if (variationId) {
            const [productResult] = await connection.query("SELECT variations FROM products WHERE id = ?", [productId]);
            if (productResult.length > 0) {
                try {
                    const variations = JSON.parse(productResult[0].variations || '[]');
                    const foundVariation = variations.find(v => v.id === variationId);
                    if (foundVariation) {
                        variationDetailsString = JSON.stringify(foundVariation);
                    }
                } catch(e) {
                    console.error("Erro ao processar variações no backend:", e);
                }
            }
        }

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
    let variationDetailsString = null;
    if (variation) {
        try {
            variationDetailsString = JSON.stringify(variation);
        } catch(e) { console.error("Erro ao stringificar variação para deleção:", e); }
    }


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

app.get('/api/notifications/orders/count', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // Conta quantos pedidos deste usuário têm has_unseen_update = 1
        const [rows] = await db.query(
            "SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND has_unseen_update = 1", 
            [userId]
        );
        res.json({ count: rows[0].count });
    } catch (err) {
        console.error("Erro ao contar notificações:", err);
        res.status(500).json({ count: 0 });
    }
});

// Rota para marcar pedido como visto (Chamada ao abrir detalhes do pedido)
app.put('/api/orders/:id/mark-seen', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        // Reseta o campo has_unseen_update para 0
        await db.query(
            "UPDATE orders SET has_unseen_update = 0 WHERE id = ? AND user_id = ?", 
            [id, userId]
        );
        res.json({ message: "Pedido marcado como visto." });
    } catch (err) {
        console.error("Erro ao marcar pedido como visto:", err);
        res.status(500).json({ message: "Erro ao atualizar status de visualização." });
    }
});

// --- ROTAS DE PEDIDOS ---
app.get('/api/orders/my-orders', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { id: orderId } = req.query; 

   try {
        // CORREÇÃO CRÍTICA: Adicionado 'r.notes as refund_notes'
        // Agora o motivo da recusa será enviado para o frontend
        let sql = `
            SELECT 
                o.*, 
                o.has_unseen_update, 
                r.status as refund_status, 
                r.created_at as refund_created_at, 
                r.notes as refund_notes
            FROM orders o
            LEFT JOIN refunds r ON o.refund_id = r.id
            WHERE o.user_id = ?
        `;
        const params = [userId];

        if (orderId) {
            sql += " AND o.id = ?";
            params.push(orderId);
        }

        sql += " ORDER BY o.date DESC";
        
        const [orders] = await db.query(sql, params);
        
        const detailedOrders = await Promise.all(orders.map(async (order) => {
            const [items] = await db.query(`
                SELECT 
                    oi.*, 
                    p.name, p.images, p.product_type, p.stock, p.variations, p.is_on_sale, p.sale_price,
                    (SELECT COUNT(*) > 0 FROM reviews r WHERE r.user_id = ? AND r.product_id = oi.product_id AND r.order_id = oi.order_id) AS is_reviewed
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            `, [order.user_id, order.id]);

            const parsedItems = items.map(item => ({
                ...item,
                is_reviewed: !!item.is_reviewed,
                variation: item.variation_details ? JSON.parse(item.variation_details) : null
            }));
            const [history] = await db.query("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY status_date ASC", [order.id]);
            return { ...order, items: parsedItems, history: Array.isArray(history) ? history : [] };
        }));
        res.json(detailedOrders);
    } catch (err) {
        console.error("Erro ao buscar histórico de pedidos:", err);
        res.status(500).json({ message: "Erro ao buscar histórico de pedidos." });
    }
});

app.get('/api/orders', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT 
                o.*, 
                u.name as user_name,
                u.phone as user_phone,
                u.cpf as user_cpf,
                r.status as refund_status
            FROM orders o 
            JOIN users u ON o.user_id = u.id
            LEFT JOIN refunds r ON o.refund_id = r.id
            ORDER BY o.date DESC
        `;
        const [orders] = await db.query(sql);
        res.json(orders);
    } catch (err) {
        console.error("Erro ao buscar pedidos (admin):", err);
        res.status(500).json({ message: "Erro ao buscar pedidos." });
    }
});

app.get('/api/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // ATUALIZAÇÃO: Adicionado 'u.cpf as user_cpf' na consulta SQL para retornar o CPF do cliente
        const [orders] = await db.query("SELECT o.*, u.name as user_name, u.phone as user_phone, u.cpf as user_cpf FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?", [id]);
        if (orders.length === 0) {
            return res.status(404).json({ message: "Pedido não encontrado." });
        }
        const order = orders[0];
        const [items] = await db.query("SELECT oi.*, p.name, p.images FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?", [id]);
        
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

// 3. Criação de Pedido (Validado - CRÍTICO)
app.post('/api/orders', verifyToken, validate(orderSchema), async (req, res) => {
    const { items, shippingAddress, paymentMethod, shipping_method, shipping_cost, coupon_code, pickup_details, phone } = req.body;
    
    // Validações lógicas extras que o Zod já filtrou parcialmente (ex: items.length > 0)
    if (!req.user.id) return res.status(400).json({ message: "Usuário não identificado." });
    
    const connection = await db.getConnection();
    
    // --- ATUALIZAÇÃO DO TELEFONE (ISOLADA) ---
    if (phone) {
        try {
            const cleanPhone = String(phone).replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
                await connection.query("UPDATE users SET phone = ? WHERE id = ?", [cleanPhone, req.user.id]);
            }
        } catch (phoneError) {
            console.error("Aviso (Não Crítico): Falha ao atualizar telefone.", phoneError.message);
        }
    }

    // --- INÍCIO DA TRANSAÇÃO DO PEDIDO ---
    try {
        await connection.beginTransaction();

        // 1. Recalcular Subtotal e Validar Estoque
        let calculatedSubtotal = 0;
        let verifiedItems = [];

        for (const item of items) {
            const [productResult] = await connection.query("SELECT id, name, price, sale_price, is_on_sale, product_type, variations, stock, category, brand FROM products WHERE id = ? FOR UPDATE", [item.id]);
            const product = productResult[0];
            if (!product) throw new Error(`Produto ID ${item.id} não encontrado.`);

            // Validação de Estoque
            if (product.product_type === 'clothing') {
                if (!item.variation || !item.variation.color || !item.variation.size) {
                    throw new Error(`Variação (cor/tamanho) inválida ou ausente para o produto "${product.name}".`);
                }
                const variations = JSON.parse(product.variations || '[]');
                const vIndex = variations.findIndex(v => v.color === item.variation.color && v.size === item.variation.size);
                
                if (vIndex === -1) {
                     throw new Error(`A variação ${item.variation.color} / ${item.variation.size} não está disponível para "${product.name}".`);
                }
                
                if (variations[vIndex].stock < item.qty) {
                    throw new Error(`Estoque insuficiente para "${product.name}" (${item.variation.color}/${item.variation.size}). Disponível: ${variations[vIndex].stock}.`);
                }
            } else {
                if (product.stock < item.qty) {
                    throw new Error(`Estoque insuficiente para "${product.name}". Disponível: ${product.stock}.`);
                }
            }

            // Preço Oficial do Banco (Ignora preço vindo do front)
            const unitPrice = (product.is_on_sale && product.sale_price) ? parseFloat(product.sale_price) : parseFloat(product.price);
            calculatedSubtotal += unitPrice * item.qty;
            
            verifiedItems.push({
                ...item,
                dbCategory: product.category,
                dbBrand: product.brand,
                unitPrice: unitPrice,
                totalPrice: unitPrice * item.qty
            });
        }

        // 2. Calcular Desconto do Cupom (Servidor - Validação Rigorosa)
        let serverDiscountAmount = 0;
        let couponIdToLog = null;

        if (coupon_code) {
            const [coupons] = await connection.query("SELECT * FROM coupons WHERE code = ?", [coupon_code]);
            if (coupons.length > 0) {
                const coupon = coupons[0];
                let isValid = true;

                if (!coupon.is_active) isValid = false;
                
                if (coupon.validity_days) {
                    const createdAt = new Date(coupon.created_at);
                    const expiryDate = new Date(createdAt.setDate(createdAt.getDate() + coupon.validity_days));
                    if (new Date() > expiryDate) isValid = false;
                }

                if (coupon.is_first_purchase) {
                    const [pastOrders] = await connection.query("SELECT id FROM orders WHERE user_id = ? LIMIT 1", [req.user.id]);
                    if (pastOrders.length > 0) isValid = false;
                }

                if (coupon.is_single_use_per_user) {
                    const [usage] = await connection.query("SELECT id FROM coupon_usage WHERE user_id = ? AND coupon_id = ?", [req.user.id, coupon.id]);
                    if (usage.length > 0) isValid = false;
                }

                if (isValid) {
                    couponIdToLog = coupon.id;
                    
                    if (coupon.type === 'free_shipping') {
                        serverDiscountAmount = parseFloat(shipping_cost || 0);
                    } else {
                        let eligibleTotal = 0;
                        const isGlobal = coupon.is_global === 1;
                        const allowedCats = coupon.allowed_categories ? JSON.parse(coupon.allowed_categories) : [];
                        const allowedBrands = coupon.allowed_brands ? JSON.parse(coupon.allowed_brands) : [];

                        verifiedItems.forEach(item => {
                            let isEligible = false;
                            if (isGlobal) {
                                isEligible = true;
                            } else {
                                const catMatch = allowedCats.includes(item.dbCategory);
                                const brandMatch = allowedBrands.includes(item.dbBrand);
                                if (catMatch || brandMatch) isEligible = true;
                            }

                            if (isEligible) {
                                eligibleTotal += item.totalPrice;
                            }
                        });

                        if (eligibleTotal > 0) {
                            if (coupon.type === 'percentage') {
                                serverDiscountAmount = eligibleTotal * (parseFloat(coupon.value) / 100);
                            } else if (coupon.type === 'fixed') {
                                serverDiscountAmount = Math.min(parseFloat(coupon.value), eligibleTotal);
                            }
                        }
                    }
                }
            }
        }

        // 3. Finalizar Valores
        const shipping = parseFloat(shipping_cost || 0);
        const finalTotal = Math.max(0, calculatedSubtotal + shipping - serverDiscountAmount);

        // 4. Inserir Pedido
        const orderSql = "INSERT INTO orders (user_id, total, status, shipping_address, payment_method, shipping_method, shipping_cost, coupon_code, discount_amount, pickup_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const [orderResult] = await connection.query(orderSql, [
            req.user.id, finalTotal, ORDER_STATUS.PENDING, 
            shipping_method === 'Retirar na loja' ? null : JSON.stringify(shippingAddress),
            paymentMethod, shipping_method, shipping, coupon_code || null, serverDiscountAmount, pickup_details || null
        ]);
        
        const orderId = orderResult.insertId;
        await updateOrderStatus(orderId, ORDER_STATUS.PENDING, connection, "Pedido criado.");

        // 5. Baixar Estoque e Itens
        for (const item of verifiedItems) {
            const varJson = item.variation ? JSON.stringify(item.variation) : null;
            await connection.query("INSERT INTO order_items (order_id, product_id, quantity, price, variation_details) VALUES (?, ?, ?, ?, ?)", [orderId, item.id, item.qty, item.unitPrice, varJson]);
            
            if (item.variation) {
                const [p] = await connection.query("SELECT variations FROM products WHERE id = ?", [item.id]);
                let vars = JSON.parse(p[0].variations);
                const idx = vars.findIndex(v => v.color === item.variation.color && v.size === item.variation.size);
                if (idx !== -1) {
                    vars[idx].stock -= item.qty;
                    const newStock = vars.reduce((a,b)=>a+b.stock,0);
                    await connection.query("UPDATE products SET variations = ?, stock = ?, sales = sales + ? WHERE id = ?", [JSON.stringify(vars), newStock, item.qty, item.id]);
                }
            } else {
                await connection.query("UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?", [item.qty, item.qty, item.id]);
            }
        }

        // Registrar uso do cupom único
        if (couponIdToLog) {
            await connection.query("INSERT INTO coupon_usage (user_id, coupon_id, order_id) VALUES (?, ?, ?)", [req.user.id, couponIdToLog, orderId]);
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

const createLocalDeliveryTrackingEmail = (customerName, orderId, trackingLink, items) => {
    const itemsHtml = createItemsListHtml(items, "Itens a caminho:");
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const content = `
        <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin: 0 0 20px;">Seu Pedido Saiu para Entrega! 🛵</h1>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Olá, ${customerName},</p>
        <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Seu pedido <strong>#${orderId}</strong> acabou de sair para entrega com nosso parceiro.</p>
        
        <div style="background-color: #1F2937; border: 1px solid #374151; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <p style="color: #E5E7EB; margin-bottom: 20px; font-size: 16px;">Acompanhe o trajeto em tempo real clicando abaixo:</p>
            <a href="${trackingLink}" target="_blank" style="background-color: #10B981; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Acompanhar Entrega</a>
            <p style="color: #9CA3AF; margin-top: 20px; font-size: 12px;">Se o botão não funcionar, acesse o link:<br><a href="${trackingLink}" style="color: #D4AF37; text-decoration: underline; word-break: break-all;">${trackingLink}</a></p>
        </div>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding: 0px 0 20px;"><a href="${appUrl}/#account/orders/${orderId}" target="_blank" style="font-size: 14px; color: #D4AF37; text-decoration: underline; font-family: Arial, sans-serif;">Ver detalhes do pedido no site</a></td></tr></table>
        ${itemsHtml}
    `;
    return createEmailBase(content);
};

// Esta rota deve substituir a existente app.put('/api/orders/:id')
app.put('/api/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, tracking_code } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress; // Captura o IP

    // --- BLOQUEIO DE SEGURANÇA ---
    if (status === ORDER_STATUS.REFUNDED) {
        return res.status(403).json({ message: "Ação bloqueada. Para reembolsar um pedido, utilize o sistema de 'Solicitar Reembolso'." });
    }

    const STATUS_PROGRESSION = [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PAYMENT_APPROVED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.READY_FOR_PICKUP,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.OUT_FOR_DELIVERY,
        ORDER_STATUS.DELIVERED
    ];
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [currentOrderResult] = await connection.query("SELECT * FROM orders WHERE id = ? FOR UPDATE", [id]);
        if (currentOrderResult.length === 0) {
            throw new Error("Pedido não encontrado.");
        }
        const currentOrder = currentOrderResult[0];
        const { status: currentStatus } = currentOrder;

        if (status && status !== currentStatus) {
            // Lógica de progressão de status (mantida igual)
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
            
            // Lógica de reversão de estoque
            const isRevertingStock = (status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.PAYMENT_REJECTED);
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
            }
        }
        
        if (tracking_code !== undefined) {
            await connection.query("UPDATE orders SET tracking_code = ? WHERE id = ?", [tracking_code, id]);
        }

        await connection.commit();
        
        // --- AUDITORIA: Registra Ação com IP ---
        const logDetails = `ID: ${id}, Status Antigo: ${currentStatus}, Novo Status: ${status || 'Inalterado'}${tracking_code ? ', Cód. Rastreio atualizado' : ''}`;
        logAdminAction(req.user, 'ATUALIZOU PEDIDO', logDetails, clientIp);

        res.json({ message: "Pedido atualizado com sucesso." });

    } catch (err) {
        await connection.rollback();
        console.error("Erro ao atualizar pedido:", err);
        res.status(500).json({ message: "Erro interno ao atualizar o pedido." });
    } finally {
        connection.release();
    }
});

// Template de E-mail para Boas-vindas da Newsletter
const createNewsletterWelcomeEmail = () => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    // Conteúdo HTML profissional "Nível Amazon"
    const content = `
        <div style="text-align: center;">
            <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 28px; margin-bottom: 10px;">Bem-vindo(a) ao Clube VIP! 🥂</h1>
            <p style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 25px;">
                Você agora faz parte de um grupo exclusivo. Prepare-se para receber ofertas relâmpago, lançamentos antecipados e mimos especiais.
            </p>
            
            <div style="background-color: #374151; padding: 20px; border-radius: 8px; border: 1px dashed #D4AF37; margin: 30px auto; max-width: 400px;">
                <p style="color: #9CA3AF; margin: 0 0 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Seu presente de boas-vindas</p>
                <div style="font-size: 24px; font-weight: bold; color: #fff; letter-spacing: 2px;">VIP10</div>
                <p style="color: #D4AF37; margin: 5px 0 0; font-size: 12px;">Use este cupom para <strong>10% OFF</strong> na sua próxima compra.</p>
            </div>

            <p style="color: #9CA3AF; font-size: 14px; margin-top: 30px;">
                Fique de olho na sua caixa de entrada. As melhores oportunidades chegam primeiro por aqui.
            </p>

            <div style="margin-top: 30px;">
                <a href="${appUrl}" style="background-color: #D4AF37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif;">Ir para a Loja</a>
            </div>
        </div>
    `;
    return createEmailBase(content);
};

// (Público) Inscrever na Newsletter
app.post('/api/newsletter/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Por favor, insira um e-mail válido." });
    }

    const connection = await db.getConnection();
    try {
        const [existing] = await connection.query("SELECT id FROM newsletter_subscribers WHERE email = ?", [email]);
        
        if (existing.length > 0) {
            return res.status(409).json({ message: "Este e-mail já faz parte do nosso Clube VIP!" });
        }

        await connection.query("INSERT INTO newsletter_subscribers (email) VALUES (?)", [email]);

        // Tenta enviar o e-mail, mas não trava se falhar (apenas loga o erro)
        try {
            await sendEmailAsync({
                from: process.env.FROM_EMAIL,
                to: email,
                subject: 'Bem-vindo ao Clube VIP! Aqui está seu presente 🎁',
                html: createNewsletterWelcomeEmail()
            });
        } catch (emailError) {
            console.error("Erro ao enviar e-mail de boas-vindas:", emailError);
        }

        res.status(201).json({ message: "Inscrição confirmada! Verifique seu e-mail para um presente especial." });

    } catch (err) {
        console.error("Erro na inscrição da newsletter:", err);
        res.status(500).json({ message: "Erro interno ao processar inscrição." });
    } finally {
        connection.release();
    }
});

// --- ROTAS DE GESTÃO DA NEWSLETTER (ADMIN) ---

// (Admin) Listar todos os inscritos
app.get('/api/newsletter/subscribers', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [subscribers] = await db.query("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
        res.json(subscribers);
    } catch (err) {
        console.error("Erro ao listar inscritos:", err);
        res.status(500).json({ message: "Erro ao buscar lista de e-mails." });
    }
});

// (Admin) Enviar Campanha (Broadcast)
app.post('/api/newsletter/broadcast', verifyToken, verifyAdmin, async (req, res) => {
    const { subject, message, ctaLink, ctaText, productId, discountText } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ message: "Assunto e mensagem são obrigatórios." });
    }

    const connection = await db.getConnection();
    try {
        // Busca todos os inscritos ativos
        const [subscribers] = await connection.query("SELECT email FROM newsletter_subscribers WHERE is_active = 1");

        if (subscribers.length === 0) {
            return res.status(400).json({ message: "Não há inscritos ativos para enviar." });
        }

        let productHtml = '';
        if (productId) {
            const [products] = await connection.query("SELECT * FROM products WHERE id = ?", [productId]);
            if (products.length > 0) {
                const product = products[0];
                const imageUrl = getFirstImage(product.images); // Usando a função auxiliar existente
                const productUrl = `${process.env.APP_URL || 'http://localhost:3000'}/#product/${product.id}`;
                
                productHtml = `
                    <div style="background-color: #2D3748; border: 1px solid #4A5568; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                        <p style="color: #F6E05E; font-weight: bold; text-transform: uppercase; font-size: 14px; margin-bottom: 15px; letter-spacing: 1px;">
                            ${discountText || 'Oferta Especial para Você'}
                        </p>
                        <img src="${imageUrl}" alt="${product.name}" style="max-width: 200px; max-height: 200px; border-radius: 4px; margin-bottom: 15px; object-fit: contain;">
                        <h3 style="color: #fff; font-size: 18px; margin: 0 0 5px;">${product.name}</h3>
                        <p style="color: #CBD5E0; font-size: 14px; margin: 0 0 15px;">${product.brand}</p>
                        
                        <div style="margin-bottom: 20px;">
                            ${product.is_on_sale 
                                ? `<span style="text-decoration: line-through; color: #718096; margin-right: 10px;">R$ ${Number(product.price).toFixed(2)}</span>
                                   <span style="color: #F6E05E; font-size: 20px; font-weight: bold;">R$ ${Number(product.sale_price).toFixed(2)}</span>`
                                : `<span style="color: #fff; font-size: 20px; font-weight: bold;">R$ ${Number(product.price).toFixed(2)}</span>`
                            }
                        </div>
                        
                        <a href="${productUrl}" style="background-color: #F6E05E; color: #1A202C; padding: 10px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif; display: inline-block;">
                            Comprar Agora
                        </a>
                    </div>
                `;
            }
        }

        console.log(`[Newsletter] Iniciando envio para ${subscribers.length} contatos...`);

        // Função para gerar o HTML do e-mail de campanha
        const createCampaignEmail = (msg, link, text, prodHtml) => {
            let buttonHtml = '';
            if (link && text) {
                buttonHtml = `
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${link}" style="background-color: #D4AF37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif; display: inline-block;">
                            ${text}
                        </a>
                    </div>
                `;
            }

            const content = `
                <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin-bottom: 20px;">${subject}</h1>
                <div style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; white-space: pre-line;">
                    ${msg}
                </div>
                ${prodHtml}
                ${buttonHtml}
                <hr style="border: 0; border-top: 1px solid #374151; margin: 40px 0 20px;" />
                <p style="text-align: center; color: #6B7280; font-size: 12px;">
                    Você recebeu este e-mail porque se inscreveu no Clube VIP da Love Cestas e Perfumes.
                </p>
            `;
            return createEmailBase(content);
        };

        const emailHtml = createCampaignEmail(message, ctaLink, ctaText, productHtml);
        
        // Envio em lotes (Promises) para não bloquear, mas garantindo execução
        const emailPromises = subscribers.map(sub => 
            sendEmailAsync({
                from: process.env.FROM_EMAIL,
                to: sub.email,
                subject: subject,
                html: emailHtml
            })
        );

        // Não aguarda todos os promises terminarem para responder ao Admin (evita timeout)
        Promise.allSettled(emailPromises).then(results => {
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            console.log(`[Newsletter] Envio concluído. Sucesso: ${successCount}/${subscribers.length}`);
            
            // Opcional: Registrar no log do admin
            logAdminAction(req.user, 'ENVIOU NEWSLETTER', `Assunto: "${subject}" para ${successCount} inscritos.`);
        });

        res.json({ message: `Campanha iniciada! Enviando para ${subscribers.length} inscritos.` });

    } catch (err) {
        console.error("Erro no envio da newsletter:", err);
        res.status(500).json({ message: "Erro interno ao processar o envio." });
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
        if (total >= 100) {
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
                pending: `${appUrl}/#account/orders`,
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
        res.status(500).json({ message: 'Falha ao gerar o link de pagamento. Tente novamente mais tarde.' });
    }
});

// --- NOVA ROTA: Processamento de Pagamento Direto (Bricks) ---
app.post('/api/process-payment', verifyToken, async (req, res) => {
    try {
        const { orderId, paymentData } = req.body;
        
        if (!orderId || !paymentData) {
            return res.status(400).json({ message: "ID do pedido e dados de pagamento são obrigatórios." });
        }
        
        const backendUrl = process.env.BACKEND_URL;
        const connection = await db.getConnection();
        
        try {
            // 1. Verifica se o pedido existe e pertence ao usuário
            const [orderResult] = await connection.query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [orderId, req.user.id]);
            if (!orderResult.length) {
                return res.status(404).json({ message: "Pedido não encontrado ou acesso negado."});
            }
            const order = orderResult[0];

            // 2. Busca os dados reais do usuário no banco para forçar a geração do PIX
            const [users] = await connection.query("SELECT email, name, cpf FROM users WHERE id = ?", [req.user.id]);
            const userDb = users[0];
            
            // Divide o nome do usuário
            const nameParts = userDb.name.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Cliente';

            // Instancia a classe de Pagamento
            const payment = new Payment(mpClient);

            // 3. Monta o Payer blindado (Garante que o MP tenha tudo para gerar o PIX)
            const finalPayer = {
                ...paymentData.payer,
                email: paymentData.payer?.email || userDb.email,
                first_name: paymentData.payer?.first_name || firstName,
                last_name: paymentData.payer?.last_name || lastName,
            };

            // Se o cliente tem CPF e o Brick não mandou, nós injetamos!
            if (userDb.cpf && !finalPayer.identification) {
                finalPayer.identification = {
                    type: "CPF",
                    number: userDb.cpf.replace(/\D/g, '')
                };
            }

            // 4. Prepara o payload para a API do MP
            const mpPayload = {
                body: {
                    ...paymentData,
                    payer: finalPayer, // <-- Enviando o pagador garantido
                    transaction_amount: Number(order.total),
                    external_reference: orderId.toString(),
                    description: `Pedido #${orderId} - Love Cestas e Perfumes`,
                    notification_url: `${backendUrl}/api/mercadopago-webhook`
                },
                requestOptions: {
                    idempotencyKey: crypto.randomUUID()
                }
            };

            console.log(`[Pagamento Direto] Processando pagamento para pedido #${orderId} no valor de R$${order.total}...`);
            const result = await payment.create(mpPayload);

            // Atualiza o status do pedido no banco
            let newStatus = ORDER_STATUS.PENDING;
            if (result.status === 'approved') {
                newStatus = ORDER_STATUS.PAYMENT_APPROVED;
            } else if (result.status === 'rejected') {
                newStatus = ORDER_STATUS.PAYMENT_REJECTED;
            }

            // Define o método exato retornado
            const methodId = paymentData.payment_method_id || result.payment_method_id;

            let paymentDetailsPayload = {
                method: methodId, 
                type: result.payment_type_id 
            };

            // 5. Trata a resposta do Pix e pega o QR Code
            if (methodId === 'pix' && result.point_of_interaction?.transaction_data) {
                paymentDetailsPayload.qr_code = result.point_of_interaction.transaction_data.qr_code;
                paymentDetailsPayload.qr_code_base64 = result.point_of_interaction.transaction_data.qr_code_base64;
                paymentDetailsPayload.ticket_url = result.point_of_interaction.transaction_data.ticket_url; 
            }
            
            // Trata a resposta do Boleto
            if (result.payment_type_id === 'ticket' && result.transaction_details) {
                paymentDetailsPayload.external_resource_url = result.transaction_details.external_resource_url;
                paymentDetailsPayload.barcode = result.barcode?.content;
            }

            // Trata a resposta de Cartão
            if (result.payment_type_id === 'credit_card' && result.card) {
                paymentDetailsPayload.card_brand = result.payment_method_id;
                paymentDetailsPayload.card_last_four = result.card.last_four_digits;
                paymentDetailsPayload.installments = result.installments;
            }

            // Atualiza os detalhes no banco
            await connection.query(
                "UPDATE orders SET payment_status = ?, payment_gateway_id = ?, payment_details = ? WHERE id = ?",
                [result.status, result.id, JSON.stringify(paymentDetailsPayload), orderId]
            );

            // Se já foi aprovado ou recusado de cara
            if (newStatus !== ORDER_STATUS.PENDING) {
                 await updateOrderStatus(orderId, newStatus, connection, `Pagamento processado via Brick. Status MP: ${result.status}`);
            }

            res.json({ status: result.status, paymentId: result.id });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Erro ao processar pagamento via Brick do Mercado Pago:', error?.cause || error?.message || error);
        const errorMessage = error?.cause?.message || error?.message || 'Falha ao processar o pagamento com a operadora.';
        res.status(500).json({ message: errorMessage });
    }
});

app.get('/api/mercadopago/installments', checkMaintenanceMode, async (req, res) => {
    const { amount } = req.query;

    if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "O valor (amount) é obrigatório e deve ser um número." });
    }
    
    const numericAmount = parseFloat(amount);

    try {
        // Regra 1: Abaixo de R$100, apenas 1x sem juros
        if (numericAmount < 100) {
            const singleInstallment = [{
                installments: 1,
                installment_rate: 0,
                discount_rate: 0,
                reimbursement_rate: null,
                labels: [],
                installment_payment_type: "credit_card",
                min_allowed_amount: 0,
                max_allowed_amount: 0,
                recommended_message: `1x de R$ ${numericAmount.toFixed(2).replace('.', ',')} sem juros`,
                installment_amount: numericAmount,
                total_amount: numericAmount
            }];
            return res.json(singleInstallment);
        }

        // Regra 2: Igual ou acima de R$100
        const installmentsResponse = await fetch(`https://api.mercadopago.com/v1/payment_methods/installments?amount=${numericAmount}&issuer.id=24&payment_method_id=master`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (!installmentsResponse.ok) {
            const errorData = await installmentsResponse.json();
            throw new Error(errorData.message || 'Não foi possível obter os parcelamentos.');
        }

        const installmentsData = await installmentsResponse.json();
        
        if (installmentsData.length > 0 && installmentsData[0].payer_costs) {
            const allPayerCosts = installmentsData[0].payer_costs;

            const processedInstallments = allPayerCosts
                .filter(pc => pc.installments <= 10) // Limita a 10x
                .map(pc => {
                    // De 1x a 4x: força a ser SEM juros
                    if (pc.installments <= 4) {
                        const installmentAmount = numericAmount / pc.installments;
                        return {
                            ...pc,
                            installment_rate: 0,
                            total_amount: numericAmount,
                            installment_amount: installmentAmount,
                            recommended_message: `${pc.installments}x de R$ ${installmentAmount.toFixed(2).replace('.', ',')} sem juros`
                        };
                    }
                    // De 5x a 10x: usa os juros calculados pelo Mercado Pago
                    return {
                        ...pc,
                        recommended_message: pc.recommended_message.replace('.', ',') // Apenas formata o ponto para vírgula
                    };
                });

            res.json(processedInstallments);
        } else {
            res.status(404).json({ message: 'Não foram encontradas opções de parcelamento.' });
        }

    } catch (error) {
        console.error("Erro ao buscar parcelas do Mercado Pago:", error);
        res.status(500).json({ message: "Erro interno do servidor ao buscar parcelas." });
    }
});



const processPaymentWebhook = async (paymentId) => {
    try {
        // Ignora IDs de teste padrão da documentação
        if (!paymentId || paymentId === 123456 || paymentId === '123456') {
            console.log(`[Webhook] Notificação de simulação recebida (ID: ${paymentId}). Processo ignorado.`);
            return;
        }

        console.log(`[Webhook] Consultando detalhes do pagamento ${paymentId} no Mercado Pago...`);
        
        // 1. Validação na Fonte: Busca dados direto na API do MP (Nunca confia no req.body)
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

            // 2. Validação de Pedido: Garante que o pedido existe
            const [currentOrderResult] = await connection.query("SELECT * FROM orders WHERE id = ? FOR UPDATE", [orderId]);
            if (currentOrderResult.length === 0) {
                console.log(`[Webhook] Pedido ${orderId} não encontrado no banco de dados.`);
                await connection.commit();
                return;
            }
            const currentOrder = currentOrderResult[0];
            const { status: currentDBStatus } = currentOrder;

            // 3. SEGURANÇA CRÍTICA: Validação de Valor
            const paidAmount = parseFloat(payment.transaction_amount);
            const orderTotal = parseFloat(currentOrder.total);
            const difference = Math.abs(paidAmount - orderTotal);

            if (paymentStatus === 'approved' && difference > 0.05) {
                console.error(`[SEGURANÇA] 🚨 FRAUDE DETECTADA: Divergência de valor no Pedido #${orderId}. Esperado: R$ ${orderTotal}, Pago: R$ ${paidAmount}`);
                
                await connection.query(
                    "UPDATE orders SET status = 'Pagamento Recusado', payment_status = 'fraud_suspected', notes = ? WHERE id = ?",
                    [`FRAUDE: Valor pago (R$ ${paidAmount}) diverge do total (R$ ${orderTotal}).`, orderId]
                );
                
                await connection.commit();
                return; 
            }

            // 4. Mapeamento de Detalhes de Pagamento (CORRIGIDO: NÃO APAGA O QR CODE E O BOLETO)
            let paymentDetailsPayload = null;
            
            if (payment.payment_type_id === 'credit_card' && payment.card && payment.card.last_four_digits) {
                paymentDetailsPayload = {
                    method: 'credit_card',
                    card_brand: payment.payment_method_id,
                    card_last_four: payment.card.last_four_digits,
                    installments: payment.installments
                };
            } else if (payment.payment_method_id === 'pix' || payment.payment_type_id === 'bank_transfer') {
                paymentDetailsPayload = { method: 'pix', type: payment.payment_type_id };
                
                // Extrai o QR Code do próprio webhook para garantir que não será perdido
                if (payment.point_of_interaction?.transaction_data) {
                    paymentDetailsPayload.qr_code = payment.point_of_interaction.transaction_data.qr_code;
                    paymentDetailsPayload.qr_code_base64 = payment.point_of_interaction.transaction_data.qr_code_base64;
                    paymentDetailsPayload.ticket_url = payment.point_of_interaction.transaction_data.ticket_url;
                } else {
                    // Se o webhook vier sem o QR Code, preserva o que o backend já tinha salvo
                    try {
                        const existingDetails = currentOrder.payment_details ? JSON.parse(currentOrder.payment_details) : null;
                        if (existingDetails && existingDetails.qr_code) {
                            paymentDetailsPayload.qr_code = existingDetails.qr_code;
                            paymentDetailsPayload.qr_code_base64 = existingDetails.qr_code_base64;
                        }
                    } catch(e) {}
                }
            } else if (payment.payment_type_id === 'ticket') {
                paymentDetailsPayload = { method: payment.payment_method_id, type: 'ticket' };
                
                if (payment.transaction_details && payment.transaction_details.external_resource_url) {
                    paymentDetailsPayload.external_resource_url = payment.transaction_details.external_resource_url;
                    paymentDetailsPayload.barcode = payment.barcode?.content || payment.barcode;
                } else {
                    try {
                        const existingDetails = currentOrder.payment_details ? JSON.parse(currentOrder.payment_details) : null;
                        if (existingDetails && existingDetails.external_resource_url) {
                            paymentDetailsPayload.external_resource_url = existingDetails.external_resource_url;
                            paymentDetailsPayload.barcode = existingDetails.barcode;
                        }
                    } catch(e) {}
                }
            } else {
                try { paymentDetailsPayload = currentOrder.payment_details ? JSON.parse(currentOrder.payment_details) : { method: payment.payment_method_id }; } catch(e) {}
            }
            
            // Atualiza dados técnicos do pagamento no banco
            await connection.query(
                "UPDATE orders SET payment_status = ?, payment_gateway_id = ?, payment_details = ? WHERE id = ?",
                [
                    paymentStatus, 
                    payment.id, 
                    paymentDetailsPayload ? JSON.stringify(paymentDetailsPayload) : null, 
                    orderId
                ]
            );
            
            // Lógica de Aprovação
            if (paymentStatus === 'approved' && currentDBStatus === ORDER_STATUS.PENDING) {
                await updateOrderStatus(orderId, ORDER_STATUS.PAYMENT_APPROVED, connection);
                
                // --- Notificação de Nova Venda para Admin ---
                const [userResult] = await connection.query("SELECT name FROM users WHERE id = ?", [currentOrder.user_id]);
                const customerName = userResult.length > 0 ? userResult[0].name : "Cliente";
                
                const [itemsResult] = await connection.query(`
                    SELECT oi.quantity, oi.price, p.name, oi.variation_details
                    FROM order_items oi 
                    JOIN products p ON oi.product_id = p.id 
                    WHERE oi.order_id = ?
                `, [orderId]);

                const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
                const adminEmailHtml = createAdminNewOrderEmail(currentOrder, itemsResult, customerName);
                
                sendEmailAsync({
                    from: FROM_EMAIL,
                    to: adminEmail,
                    subject: `Nova Venda Aprovada! Pedido #${orderId} - R$ ${Number(currentOrder.total).toFixed(2)}`,
                    html: adminEmailHtml
                });

            } else if ((paymentStatus === 'rejected' || paymentStatus === 'cancelled') && currentDBStatus !== ORDER_STATUS.CANCELLED) {
                // Lógica de Rejeição e Estorno de Estoque
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
                }
            }
            
            await connection.commit();

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
        const [users] = await db.query("SELECT id, name, email, cpf, role, status, created_at FROM users");
        res.json(users);
    } catch (err) {
        console.error("Erro ao buscar usuários:", err);
        res.status(500).json({ message: "Erro ao buscar usuários." });
    }
});

app.get('/api/users/:id/details', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // ATUALIZAÇÃO: Adicionado phone e cpf explicitamente
        const [users] = await db.query("SELECT id, name, email, cpf, phone, role, status FROM users WHERE id = ?", [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        const user = users[0];

        const [orders] = await db.query("SELECT id, date, total, status FROM orders WHERE user_id = ? ORDER BY date DESC LIMIT 5", [id]);
        const [loginHistory] = await db.query("SELECT ip_address, user_agent, status, created_at FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [id]);

        res.json({ ...user, orders, loginHistory });
    } catch (err) {
        console.error(`Erro ao buscar detalhes do usuário ${id}:`, err);
        res.status(500).json({ message: "Erro ao buscar detalhes do usuário." });
    }
});

app.put('/api/users/:id/status', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'blocked') {
        return res.status(400).json({ message: "Status inválido. Use 'active' ou 'blocked'." });
    }

    try {
        const [result] = await db.query("UPDATE users SET status = ? WHERE id = ?", [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        logAdminAction(req.user, 'ATUALIZOU STATUS DE USUÁRIO', `ID do usuário: ${id}, Novo Status: ${status}`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: `Usuário ${status === 'active' ? 'desbloqueado' : 'bloqueado'} com sucesso.` });
    } catch (err) {
        console.error("Erro ao atualizar status do usuário:", err);
        res.status(500).json({ message: "Erro ao atualizar status do usuário." });
    }
});
app.get('/api/users/me', verifyToken, async (req, res) => {
    try {
        // CORREÇÃO: Adicionado o campo 'is_two_factor_enabled' na consulta SQL
        const [rows] = await db.query("SELECT id, name, email, role, cpf, phone, is_two_factor_enabled FROM users WHERE id = ?", [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado." });
        const user = rows[0];

        // Verifica se o usuário tem biometria cadastrada
        const [auths] = await db.query("SELECT id FROM user_authenticators WHERE user_id = ?", [user.id]);
        user.has_biometrics = auths.length > 0;

        res.json(user);
    } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        res.status(500).json({ message: "Erro ao buscar dados do usuário." });
    }
});

// (Novo) Rota para remover a biometria cadastrada
app.delete('/api/webauthn/remove', verifyToken, async (req, res) => {
    try {
        await db.query("DELETE FROM user_authenticators WHERE user_id = ?", [req.user.id]);
        res.json({ message: "Biometria removida com sucesso." });
    } catch (err) {
        console.error("Erro ao remover biometria:", err);
        res.status(500).json({ message: "Erro ao remover biometria." });
    }
});

// 4. Verifica a digital/face lida e faz o Login
app.post('/api/webauthn/verify-authentication', async (req, res) => {
    if (!webauthnServer) return res.status(500).json({ message: "Biblioteca de biometria não instalada." });
    
    const { body, sessionId } = req.body;
    const expectedChallenge = webauthnChallenges[`auth_${sessionId}`];

    if (!expectedChallenge) return res.status(400).json({ message: "Sessão de login expirada. Tente novamente." });

    try {
        const [authenticators] = await db.query("SELECT * FROM user_authenticators WHERE credential_id = ?", [body.id]);
        if (authenticators.length === 0) return res.status(404).json({ message: "Biometria não reconhecida ou não cadastrada neste aparelho." });
        
        const authenticator = authenticators[0];
        const publicKeyBuffer = Buffer.from(authenticator.credential_public_key, 'base64');

        const verification = await webauthnServer.verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            credential: {
                id: authenticator.credential_id,
                publicKey: publicKeyBuffer,
                counter: Number(authenticator.counter),
                transports: ['internal'],
            },
        });

        if (verification.verified) {
            await db.query("UPDATE user_authenticators SET counter = ? WHERE id = ?", [verification.authenticationInfo.newCounter, authenticator.id]);
            delete webauthnChallenges[`auth_${sessionId}`];

            const [users] = await db.query("SELECT * FROM users WHERE id = ?", [authenticator.user_id]);
            const user = users[0];

            if (user.status === 'blocked') return res.status(403).json({ message: "Conta bloqueada." });

            if (user.role === 'admin' && user.is_two_factor_enabled) {
                 const tempToken = jwt.sign({ id: user.id, twoFactorAuth: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
                 return res.json({ twoFactorEnabled: true, token: tempToken });
            }

            const userPayload = { id: user.id, name: user.name, role: user.role };
            const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
            const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

            const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
            await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, refreshToken, expiresAt]);

            const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' };
            res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
            res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE });

            const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
            await db.query("INSERT INTO login_history (user_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, 'success')", [user.id, user.email, clientIp, req.headers['user-agent']]);

            // --- CORREÇÃO: Como o usuário acabou de usar a biometria, ele CLARAMENTE tem biometria! ---
            const { password: _, two_factor_secret, ...userData } = user;
            userData.has_biometrics = true; 
            
            res.json({ message: "Login biométrico realizado com sucesso.", user: userData, accessToken, refreshToken });
        } else {
            res.status(401).json({ message: "A verificação biométrica falhou." });
        }
    } catch (err) {
        console.error("Erro no login biométrico:", err);
        res.status(500).json({ message: `Falha na verificação: ${err.message}` });
    }
});

app.put('/api/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, role, password, cpf, phone } = req.body;

    if (!name || !email || !role) {
        return res.status(400).json({ message: "Nome, email e função são obrigatórios." });
    }

    if (String(req.user.id) === String(id) && role !== 'admin') {
        return res.status(403).json({ message: "Você não pode remover sua própria permissão de administrador." });
    }

    try {
        const cleanCpf = cpf ? String(cpf).replace(/\D/g, '') : null;
        const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;

        let queryParams = [name, email, role, cleanCpf, cleanPhone];
        let sql = "UPDATE users SET name = ?, email = ?, role = ?, cpf = ?, phone = ?";

        if (password && password.trim() !== '') {
            // Nova validação de segurança de senha
            if (password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
                return res.status(400).json({ message: "A nova senha deve ter pelo menos 8 caracteres e conter letras e números." });
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
        
        logAdminAction(req.user, 'EDITOU USUÁRIO', `ID do usuário: ${id}, Nome: ${name}`, req.ip); 

        res.json({ message: "Usuário atualizado com sucesso!" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('email')) return res.status(409).json({ message: "Este e-mail já está em uso." });
            if (err.message.includes('cpf')) return res.status(409).json({ message: "Este CPF já está em uso." });
            return res.status(409).json({ message: "Dados duplicados (Email ou CPF)." });
        }
        console.error("Erro ao atualizar usuário:", err);
        res.status(500).json({ message: "Erro interno ao atualizar usuário." });
    }
});

app.put('/api/users/me/password', verifyToken, async (req, res) => {
    const userId = req.user.id;
    // Agora exigimos a senha atual e a nova senha
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword) {
        return res.status(400).json({ message: "A senha atual é obrigatória para realizar esta alteração." });
    }

    if (!newPassword || newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({ message: "A nova senha deve ter no mínimo 8 caracteres e conter letras e números." });
    }

    try {
        // 1. Busca o hash da senha atual do usuário no banco de dados
        const [users] = await db.query("SELECT password FROM users WHERE id = ?", [userId]);
        if (users.length === 0) return res.status(404).json({ message: "Usuário não encontrado." });

        // 2. Verifica se a senha atual digitada bate com a salva no banco
        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        if (!isMatch) {
            return res.status(401).json({ message: "A senha atual está incorreta." });
        }

        // 3. Se passou pela segurança, faz o hash da nova e salva
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
        
        logAdminAction(req.user, 'ALTEROU A PRÓPRIA SENHA', null, req.ip); 
        res.json({ message: "Senha atualizada com sucesso." });
    } catch(err) {
        console.error("Erro ao atualizar senha do usuário:", err);
        res.status(500).json({ message: "Erro ao atualizar a senha." });
    }
});

app.delete('/api/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;

    if (String(req.user.id) === String(id)) {
        return res.status(403).json({ message: "Você não pode excluir sua própria conta." });
    }

    try {
        const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        logAdminAction(req.user, 'DELETOU USUÁRIO', `ID do usuário: ${id}`, req.ip); // CORREÇÃO: IP ADICIONADO
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

// (Público/Logado) Valida Cupom e Retorna Regras - CORREÇÃO DO LOGOUT (403 -> 400)
app.post('/api/coupons/validate', checkMaintenanceMode, async (req, res) => {
    const { code } = req.body;
    
    // CORREÇÃO CRÍTICA: Tenta pegar o token do Header OU do Cookie
    // Isso impede que o usuário logado seja tratado como visitante (e tome erro 401)
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.accessToken;
    
    let user = null;

    if (token) {
        try {
            user = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.log("Token de validação de cupom inválido ou expirado.");
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
                // Se realmente não tiver token (nem no cookie), aí sim pede login
                return res.status(401).json({ message: "Faça login para usar este cupom." });
            }
        }
        
        if (user && coupon.is_first_purchase) {
            const [orders] = await db.query("SELECT id FROM orders WHERE user_id = ? LIMIT 1", [user.id]);
            if (orders.length > 0) {
                return res.status(400).json({ message: "Este cupom é válido apenas para a primeira compra." });
            }
        }
        
        if (user && coupon.is_single_use_per_user) {
            const [usage] = await db.query("SELECT id FROM coupon_usage WHERE user_id = ? AND coupon_id = ?", [user.id, coupon.id]);
            if (usage.length > 0) {
                return res.status(400).json({ message: "Você já utilizou este cupom." });
            }
        }
        
        res.json({ coupon });

    } catch (err) {
        console.error("Erro ao validar cupom:", err);
        res.status(500).json({ message: "Erro interno ao validar cupom." });
    }
});



app.post('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
    const { code, type, value, is_active, validity_days, is_first_purchase, is_single_use_per_user, is_global, allowed_categories, allowed_brands } = req.body;
    
    if (!code || !type || (type !== 'free_shipping' && (value === undefined || value === null || value === ''))) {
        return res.status(400).json({ message: "Código, tipo e valor são obrigatórios." });
    }
    
    if (!is_global && (!allowed_categories?.length && !allowed_brands?.length)) {
        return res.status(400).json({ message: "Se o cupom não for global, selecione ao menos uma categoria ou marca." });
    }

    try {
        const sql = "INSERT INTO coupons (code, type, value, is_active, validity_days, is_first_purchase, is_single_use_per_user, is_global, allowed_categories, allowed_brands) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const params = [
            code.toUpperCase(), type, type === 'free_shipping' ? null : value,
            is_active ? 1 : 0, validity_days || null, is_first_purchase ? 1 : 0,
            is_single_use_per_user ? 1 : 0,
            is_global ? 1 : 0,
            JSON.stringify(allowed_categories || []),
            JSON.stringify(allowed_brands || [])
        ];
        
        const [result] = await db.query(sql, params);
        logAdminAction(req.user, 'CRIOU CUPOM', `Código: ${code.toUpperCase()}`, req.ip); // CORREÇÃO: IP ADICIONADO
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
    const { code, type, value, is_active, validity_days, is_first_purchase, is_single_use_per_user, is_global, allowed_categories, allowed_brands } = req.body;
    
    if (!code || !type) {
        return res.status(400).json({ message: "Dados inválidos." });
    }
    
    if (!is_global && (!allowed_categories?.length && !allowed_brands?.length)) {
        return res.status(400).json({ message: "Se o cupom não for global, selecione ao menos uma categoria ou marca." });
    }

    try {
        const numericValidityDays = validity_days ? Number(validity_days) : null;
        const sql = `
            UPDATE coupons SET 
                code = ?, type = ?, value = ?, is_active = ?, 
                validity_days = ?, is_first_purchase = ?, is_single_use_per_user = ?,
                is_global = ?, allowed_categories = ?, allowed_brands = ?,
                created_at = IF(? IS NOT NULL AND ? > 0, NOW(), created_at)
            WHERE id = ?`;
        
        const params = [
            code.toUpperCase(), type, type === 'free_shipping' ? null : value,
            is_active ? 1 : 0, numericValidityDays, is_first_purchase ? 1 : 0,
            is_single_use_per_user ? 1 : 0,
            is_global ? 1 : 0,
            JSON.stringify(allowed_categories || []),
            JSON.stringify(allowed_brands || []),
            numericValidityDays, numericValidityDays, id
        ];
        
        await db.query(sql, params);
        logAdminAction(req.user, 'EDITOU CUPOM', `ID: ${id}, Código: ${code.toUpperCase()}`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: "Cupom atualizado com sucesso." });
    } catch (err) {
         if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Este código já existe." });
         }
        console.error("Erro ao atualizar cupom:", err);
        res.status(500).json({ message: "Erro interno." });
    }
});

app.delete('/api/coupons/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM coupons WHERE id = ?", [req.params.id]);
        logAdminAction(req.user, 'DELETOU CUPOM', `ID: ${req.params.id}`, req.ip); // CORREÇÃO: IP ADICIONADO
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
        res.status(500).json({ message: "Erro interno ao adicionar endereço." });
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
        res.status(500).json({ message: "Erro interno ao atualizar endereço." });
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
        res.status(500).json({ message: "Erro interno ao definir endereço padrão." });
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

// --- ROTAS DE GERENCIAMENTO DE COLEÇÕES (Admin & Público) ---

// (Admin) Pega todas as categorias da coleção para o painel
app.get('/api/collections/admin', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [categories] = await db.query("SELECT * FROM collection_categories ORDER BY display_order ASC");
        res.json(categories);
    } catch (err) {
        console.error("Erro ao buscar categorias da coleção (admin):", err);
        res.status(500).json({ message: "Erro ao buscar categorias." });
    }
});

app.post('/api/collections/admin', verifyToken, verifyAdmin, async (req, res) => {
    const { name, image, filter, is_active, product_type_association, menu_section } = req.body;
    if (!name || !image || !filter || !product_type_association || !menu_section) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }
    try {
        const sql = "INSERT INTO collection_categories (name, image, filter, is_active, product_type_association, menu_section, display_order) SELECT ?, ?, ?, ?, ?, ?, COALESCE(MAX(display_order), -1) + 1 FROM collection_categories";
        const params = [name, image, filter, is_active ? 1 : 0, product_type_association, menu_section];
        const [result] = await db.query(sql, params);
        logAdminAction(req.user, 'CRIOU CATEGORIA DE COLEÇÃO', `ID: ${result.insertId}, Nome: "${name}"`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.status(201).json({ message: "Categoria criada com sucesso!", id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Uma categoria com este valor de filtro já existe." });
        }
        console.error("Erro ao criar categoria da coleção:", err);
        res.status(500).json({ message: "Erro ao criar categoria." });
    }
});

app.put('/api/collections/order', verifyToken, verifyAdmin, async (req, res) => {
    const { orderedIds } = req.body; 

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ message: "É necessário fornecer um array de IDs ordenados." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const updatePromises = orderedIds.map((id, index) => {
            return connection.query("UPDATE collection_categories SET display_order = ? WHERE id = ?", [index, id]);
        });

        await Promise.all(updatePromises);

        await connection.commit();
        logAdminAction(req.user, 'REORDENOU CATEGORIAS DE COLEÇÃO', null, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: "Ordem das coleções atualizada com sucesso." });
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao reordenar categorias da coleção:", err);
        res.status(500).json({ message: "Erro ao reordenar categorias." });
    } finally {
        connection.release();
    }
});

app.put('/api/collections/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, image, filter, is_active, product_type_association, menu_section } = req.body;

    if (!name || !image || !filter || !product_type_association || !menu_section) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    try {
        const sql = "UPDATE collection_categories SET name = ?, image = ?, filter = ?, is_active = ?, product_type_association = ?, menu_section = ? WHERE id = ?";
        const params = [name, image, filter, is_active ? 1 : 0, product_type_association, menu_section, id];
        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Categoria não encontrada." });
        }
        logAdminAction(req.user, 'EDITOU CATEGORIA DE COLEÇÃO', `ID: ${id}, Nome: "${name}"`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: "Categoria da coleção atualizada com sucesso." });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Uma categoria com este valor de filtro já existe." });
        }
        console.error("Erro ao atualizar categoria da coleção:", err);
        res.status(500).json({ message: "Erro ao atualizar categoria." });
    }
});

app.delete('/api/collections/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query("DELETE FROM collection_categories WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Categoria não encontrada." });
        }
        logAdminAction(req.user, 'DELETOU CATEGORIA DE COLEÇÃO', `ID: ${id}`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: "Categoria deletada com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar categoria da coleção:", err);
        res.status(500).json({ message: "Erro ao deletar categoria." });
    }
});

// (Público) Pega todas as categorias da coleção para a home page
app.get('/api/collections', checkMaintenanceMode, async (req, res) => {
    try {
        const [categories] = await db.query("SELECT * FROM collection_categories WHERE is_active = 1 ORDER BY display_order ASC");
        res.json(categories);
    } catch (err) {
        console.error("Erro ao buscar categorias da coleção:", err);
        res.status(500).json({ message: "Erro ao buscar categorias." });
    }
});

// --- ROTAS DE GERENCIAMENTO DE BANNERS (Admin & Público) ---

// (Admin) Pega TODOS os banners (incluindo futuros e expirados) para gestão
app.get('/api/banners/admin', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Traz tudo ordenado para o admin ver o calendário
        const [banners] = await db.query("SELECT * FROM banners ORDER BY display_order ASC, start_date DESC");
        res.json(banners);
    } catch (err) {
        console.error("Erro ao buscar banners (admin):", err);
        res.status(500).json({ message: "Erro ao buscar banners." });
    }
});

// --- ROTAS DE GERENCIAMENTO DE BANNERS (Admin & Público) ---

// (Admin) Pega TODOS os banners (incluindo futuros e expirados) para gestão
app.get('/api/banners/admin', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [banners] = await db.query("SELECT * FROM banners ORDER BY display_order ASC, start_date DESC");
        res.json(banners);
    } catch (err) {
        console.error("Erro ao buscar banners (admin):", err);
        res.status(500).json({ message: "Erro ao buscar banners." });
    }
});

// (Admin) Cria um novo banner
app.post('/api/banners/admin', verifyToken, verifyAdmin, async (req, res) => {
    const { image_url, image_url_mobile, title, subtitle, link_url, cta_text, cta_enabled, is_active, display_order, start_date, end_date } = req.body;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
    
    if (!image_url || !link_url) return res.status(400).json({ message: "Dados obrigatórios faltando." });

    const connection = await db.getConnection();
    try {
        let orderToUse = display_order;
        if (orderToUse === undefined || orderToUse === null) {
             const [rows] = await connection.query("SELECT COALESCE(MAX(display_order), -1) + 1 as nextOrder FROM banners WHERE display_order < 50");
             orderToUse = rows[0].nextOrder;
        } else {
            if (orderToUse >= 60) {
                await connection.query("DELETE FROM banners WHERE display_order = ?", [orderToUse]);
            }
        }

        const validStart = start_date ? new Date(start_date) : null;
        const validEnd = end_date ? new Date(end_date) : null;

        const sql = "INSERT INTO banners (image_url, image_url_mobile, title, subtitle, link_url, cta_text, cta_enabled, is_active, display_order, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const params = [image_url, image_url_mobile || null, title || null, subtitle || null, link_url, cta_text || null, cta_enabled ? 1 : 0, is_active ? 1 : 0, orderToUse, validStart, validEnd];
        
        const [result] = await connection.query(sql, params);
        logAdminAction(req.user, 'CRIOU BANNER', `ID: ${result.insertId}, Ordem: ${orderToUse}`, clientIp);
        res.status(201).json({ message: "Banner salvo com sucesso!", id: result.insertId });
    } catch (err) {
        console.error("Erro ao criar banner:", err);
        res.status(500).json({ message: "Erro interno." });
    } finally {
        connection.release();
    }
});

// (Admin) Atualiza a ORDEM de múltiplos banners (Drag & Drop)
app.put('/api/banners/order', verifyToken, verifyAdmin, async (req, res) => {
    const { orderedIds } = req.body; 
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
    
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ message: "É necessário fornecer um array de IDs de banners ordenados." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const updatePromises = orderedIds.map((id, index) => {
            return connection.query("UPDATE banners SET display_order = ? WHERE id = ?", [index, id]);
        });

        await Promise.all(updatePromises);

        await connection.commit();
        logAdminAction(req.user, 'REORDENOU BANNERS', `Nova ordem salva.`, clientIp);
        res.json({ message: "Ordem dos banners atualizada com sucesso." });
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao reordenar banners:", err);
        res.status(500).json({ message: "Erro ao reordenar banners." });
    } finally {
        connection.release();
    }
});

// (Admin) Atualiza os detalhes de um banner
app.put('/api/banners/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { image_url, image_url_mobile, title, subtitle, link_url, cta_text, cta_enabled, is_active, display_order, start_date, end_date } = req.body;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
    
    try {
        const validStart = start_date ? new Date(start_date) : null;
        const validEnd = end_date ? new Date(end_date) : null;

        const sql = "UPDATE banners SET image_url = ?, image_url_mobile = ?, title = ?, subtitle = ?, link_url = ?, cta_text = ?, cta_enabled = ?, is_active = ?, display_order = ?, start_date = ?, end_date = ? WHERE id = ?";
        const params = [image_url, image_url_mobile || null, title || null, subtitle || null, link_url, cta_text || null, cta_enabled ? 1 : 0, is_active ? 1 : 0, display_order, validStart, validEnd, id];
        
        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Banner não encontrado." });
        
        logAdminAction(req.user, 'EDITOU BANNER', `ID: ${id}`, clientIp);
        res.json({ message: "Banner atualizado com sucesso." });
    } catch (err) {
        console.error("Erro ao atualizar banner:", err);
        res.status(500).json({ message: "Erro interno." });
    }
});

// (Admin) Deleta um banner
app.delete('/api/banners/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    try {
        const [result] = await db.query("DELETE FROM banners WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Banner não encontrado." });
        }
        logAdminAction(req.user, 'DELETOU BANNER', `ID: ${id}`, clientIp);
        res.json({ message: "Banner deletado com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar banner:", err);
        res.status(500).json({ message: "Erro ao deletar banner." });
    }
});

// --- ROTA PÚBLICA RESTAURADA (Resolve o erro 404 e traz os banners de volta) ---
// (Público) Pega Banners Ativos e Válidos (Priorizando Eventos Sazonais)
app.get('/api/banners', checkMaintenanceMode, async (req, res) => {
    try {
        const sql = `
            SELECT * FROM banners 
            WHERE is_active = 1 
            AND (start_date IS NULL OR start_date <= NOW()) 
            AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY 
                display_order ASC, 
                CASE WHEN start_date IS NOT NULL THEN 1 ELSE 0 END DESC,
                start_date DESC
        `;
        const [banners] = await db.query(sql);
        res.json(banners);
    } catch (err) {
        console.error("Erro ao buscar banners:", err);
        res.status(500).json({ message: "Erro ao buscar banners." });
    }
});

// (Admin) Popula o banco com banners padrão
app.post('/api/banners/seed-defaults', verifyToken, verifyAdmin, async (req, res) => {
    const connection = await db.getConnection();
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    try {
        await connection.beginTransaction();

        const CAMPAIGN_BLUEPRINTS = [
            {
                title: "Semana do Consumidor", subtitle: "Até 50% OFF em itens selecionados.",
                image_url: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=2070&auto=format&fit=crop",
                link_url: "products?promo=true", cta_text: "Ver Ofertas", display_order: 50
            },
            {
                title: "Amor de Mãe", subtitle: "O presente perfeito para quem sempre cuidou de você.",
                image_url: "https://images.unsplash.com/photo-1599309927876-241f87b320e8?q=80&w=2070&auto=format&fit=crop",
                link_url: "products?category=Perfumes Feminino", cta_text: "Presentes para Mãe",
                month: 5, day: 1, duration: 14, display_order: 50
            },
            {
                title: "Dia dos Namorados", subtitle: "Surpreenda seu amor com presentes inesquecíveis.",
                image_url: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=2070&auto=format&fit=crop",
                link_url: "products", cta_text: "Coleção Romântica",
                month: 6, day: 1, duration: 12, display_order: 50
            },
            {
                title: "Dia dos Pais", subtitle: "Estilo e sofisticação para o seu herói.",
                image_url: "https://images.unsplash.com/photo-1617325247661-675ab4b64ae8?q=80&w=2071&auto=format&fit=crop",
                link_url: "products?category=Perfumes Masculino", cta_text: "Presentes para Pai",
                month: 8, day: 1, duration: 14, display_order: 50
            },
            {
                title: "Black November", subtitle: "O mês inteiro com descontos imperdíveis!",
                image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
                link_url: "products?promo=true", cta_text: "Aproveitar Ofertas",
                month: 11, day: 1, duration: 30, display_order: 50
            },
            {
                title: "Feliz Natal", subtitle: "Celebre a magia com presentes que encantam.",
                image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=2069&auto=format&fit=crop",
                link_url: "products", cta_text: "Presentes de Natal",
                month: 12, day: 1, duration: 25, display_order: 50
            },
            {
                title: "Moda & Estilo", subtitle: "Peças exclusivas.",
                image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
                link_url: "products?category=Roupas", cta_text: "Explorar", display_order: 60
            },
            {
                title: "Perfumaria", subtitle: "Fragrâncias marcantes.",
                image_url: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1974&auto=format&fit=crop",
                link_url: "products?category=Perfumes", cta_text: "Ver Perfumes", display_order: 61
            }
        ];

        const getNextOccurrence = (month, day, duration) => {
            if (!month || !day) return { start: null, end: null };
            const now = new Date();
            let year = now.getFullYear();
            let start = new Date(year, month - 1, day, 0, 0, 0);
            let end = new Date(start);
            end.setDate(end.getDate() + duration);
            end.setHours(23, 59, 59);

            if (now > end) {
                year++;
                start = new Date(year, month - 1, day, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + duration);
                end.setHours(23, 59, 59);
            }
            return { start, end };
        };

        let insertedCount = 0;

        for (const bp of CAMPAIGN_BLUEPRINTS) {
            const [existing] = await connection.query(
                "SELECT id FROM banners WHERE title = ? AND display_order = ?", 
                [bp.title, bp.display_order]
            );

            if (existing.length === 0) {
                const dates = getNextOccurrence(bp.month, bp.day, bp.duration);
                
                await connection.query(
                    "INSERT INTO banners (image_url, title, subtitle, link_url, cta_text, cta_enabled, is_active, display_order, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [bp.image_url, bp.title, bp.subtitle, bp.link_url, bp.cta_text, 1, 1, bp.display_order, dates.start, dates.end]
                );
                insertedCount++;
            }
        }

        await connection.commit();
        logAdminAction(req.user, 'SEED_BANNERS', `Inseriu ${insertedCount} banners padrão.`, clientIp);
        res.json({ message: `Banco atualizado! ${insertedCount} novos banners inseridos.` });

    } catch (err) {
        await connection.rollback();
        console.error("Erro ao popular banners:", err);
        res.status(500).json({ message: "Erro interno ao popular banco." });
    } finally {
        connection.release();
    }
});
// --- ROTAS DE GERENCIAMENTO DE CONFIGURAÇÕES DO SITE ---

// (Público) Rota para o frontend verificar rapidamente se o modo manutenção está ativo
app.get('/api/settings/maintenance-status', async (req, res) => {
    try {
        const [settings] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'maintenance_mode'");
        const maintenanceMode = settings[0]?.setting_value || 'off';
        res.json({ maintenanceMode });
    } catch (err) {
        console.error("Erro ao buscar status de manutenção:", err);
        res.status(500).json({ message: "Erro ao buscar status de manutenção." });
    }
});

// (Admin) Pega o status do modo manutenção para o painel
app.get('/api/settings/maintenance', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [settings] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'maintenance_mode'");
        const maintenanceMode = settings[0]?.setting_value || 'off';
        res.json({ status: maintenanceMode });
    } catch (err) {
        console.error("Erro ao buscar status de manutenção (admin):", err);
        res.status(500).json({ message: "Erro ao buscar status de manutenção." });
    }
});

// (Admin) Atualiza o status do modo manutenção
app.put('/api/settings/maintenance', verifyToken, verifyAdmin, async (req, res) => {
    const { status } = req.body;
    if (status !== 'on' && status !== 'off') {
        return res.status(400).json({ message: "Status inválido. Use 'on' ou 'off'." });
    }
    try {
        await db.query("UPDATE site_settings SET setting_value = ? WHERE setting_key = 'maintenance_mode'", [status]);
        logAdminAction(req.user, 'ATUALIZOU MODO MANUTENÇÃO', `Status: ${status.toUpperCase()}`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: `Modo de manutenção foi ${status === 'on' ? 'ativado' : 'desativado'}.` });
    } catch (err) {
        console.error("Erro ao atualizar status de manutenção:", err);
        res.status(500).json({ message: "Erro ao atualizar status de manutenção." });
    }
});

// --- NOVAS ROTAS PARA TEMA (Cores do Site) ---
app.get('/api/settings/theme', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'theme_config'");
        
        // Cores atuais (padrão) do site
        const defaultThemeConfig = {
            primary: '#fbbf24',       // amber-400
            primaryHover: '#f59e0b',  // amber-500
            bg: '#000000',            // black
            surface: '#111827',       // gray-900
            surfaceHover: '#1f2937',  // gray-800
            text: '#ffffff',          // white
            textMuted: '#9ca3af'      // gray-400
        };
        
        const config = rows.length > 0 ? JSON.parse(rows[0].setting_value) : defaultThemeConfig;
        res.json(config);
    } catch (err) {
        console.error("Erro ao buscar configurações de tema:", err);
        res.status(500).json({ message: "Erro ao buscar configurações de tema." });
    }
});

// ATENÇÃO: Substitua APENAS a rota 'PUT /api/settings/theme' no seu server.js.
// Não precisa copiar o arquivo inteiro, apenas esta rota que fica na área de Configurações do Site.

app.put('/api/settings/theme', verifyToken, verifyAdmin, async (req, res) => {
    const { themeConfig } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // CORREÇÃO: Aceita a configuração de cores tanto no formato direto quanto aninhado (themeConfig.colors)
    const colors = themeConfig?.colors || themeConfig;

    if (!colors || !colors.primary || !colors.bg) {
        return res.status(400).json({ message: "Configuração de tema inválida. Cores obrigatórias ausentes." });
    }

    try {
        const configString = JSON.stringify(themeConfig);
        await db.query(
            "INSERT INTO site_settings (setting_key, setting_value) VALUES ('theme_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?", 
            [configString, configString]
        );
        logAdminAction(req.user, 'ATUALIZOU TEMA VISUAL', 'Cores do site alteradas', clientIp);
        res.json({ message: "Tema atualizado com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar tema:", err);
        res.status(500).json({ message: "Erro ao salvar configuração." });
    }
});
// (Público/Admin) Busca configurações de ícones do App
app.get('/api/settings/app-icons', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'app_icons'");
        const defaultIcons = {
            favicon: { current: '', previous: null, default: '' },
            pwa_icon: { current: '', previous: null, default: '' }
        };
        const config = rows.length > 0 ? JSON.parse(rows[0].setting_value) : defaultIcons;
        res.json(config);
    } catch (err) {
        console.error("Erro ao buscar ícones do app:", err);
        res.status(500).json({ message: "Erro ao buscar configurações." });
    }
});

// (Público/Admin) Busca configurações de nome do App
app.get('/api/settings/app-name', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'app_name'");
        const defaultConfig = { short_name: 'Love Cestas', name: 'Love Cestas e Perfumes' };
        const config = rows.length > 0 ? JSON.parse(rows[0].setting_value) : defaultConfig;
        res.json(config);
    } catch (err) {
        console.error("Erro ao buscar nome do app:", err);
        res.status(500).json({ message: "Erro ao buscar configurações." });
    }
});

// (Admin) Atualiza configurações de nome do App
app.put('/api/settings/app-name', verifyToken, verifyAdmin, async (req, res) => {
    const { nameConfig } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (!nameConfig || !nameConfig.short_name || !nameConfig.name) {
        return res.status(400).json({ message: "Configuração de nome inválida. Preencha todos os campos." });
    }

    try {
        const configString = JSON.stringify(nameConfig);
        await db.query(
            "INSERT INTO site_settings (setting_key, setting_value) VALUES ('app_name', ?) ON DUPLICATE KEY UPDATE setting_value = ?", 
            [configString, configString]
        );
        logAdminAction(req.user, 'ATUALIZOU NOME DO APP', `Novo nome curto: ${nameConfig.short_name}`, clientIp);
        res.json({ message: "Nomes do aplicativo atualizados com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar nome do app:", err);
        res.status(500).json({ message: "Erro ao salvar configuração." });
    }
});

// (Admin) Atualiza configurações de ícones do App
app.put('/api/settings/app-icons', verifyToken, verifyAdmin, async (req, res) => {
    const { icons } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (!icons) {
        return res.status(400).json({ message: "Configuração de ícones inválida." });
    }

    try {
        const configString = JSON.stringify(icons);
        await db.query(
            "INSERT INTO site_settings (setting_key, setting_value) VALUES ('app_icons', ?) ON DUPLICATE KEY UPDATE setting_value = ?", 
            [configString, configString]
        );
        logAdminAction(req.user, 'ATUALIZOU ÍCONES DO APP', 'Favicon / PWA Icon alterados', clientIp);
        res.json({ message: "Ícones do aplicativo atualizados com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar ícones do app:", err);
        res.status(500).json({ message: "Erro ao salvar configuração." });
    }
});

// (Público) Serve o manifest.json dinâmico para o PWA
app.get('/manifest.json', async (req, res) => {
    try {
        const [iconSettings] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'app_icons'");
        const [nameSettings] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'app_name'");
        
        let rawIconUrl = "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png"; 
        let appNames = { short_name: "Love Cestas", name: "Love Cestas e Perfumes" };
        
        if (iconSettings.length > 0) {
            const parsedIcon = JSON.parse(iconSettings[0].setting_value);
            if (parsedIcon.pwa_icon && parsedIcon.pwa_icon.current) {
                rawIconUrl = parsedIcon.pwa_icon.current; 
            }
        }

        if (nameSettings.length > 0) {
            appNames = JSON.parse(nameSettings[0].setting_value);
        }
        
        const icon192 = rawIconUrl.includes('res.cloudinary.com')
            ? rawIconUrl.replace('/upload/', '/upload/w_192,h_192,c_pad,f_png/')
            : rawIconUrl;

        const icon512 = rawIconUrl.includes('res.cloudinary.com')
            ? rawIconUrl.replace('/upload/', '/upload/w_512,h_512,c_pad,f_png/')
            : rawIconUrl;

        // --- ATUALIZAÇÃO CRÍTICA (RESOLVE O ERRO DO CONSOLE) ---
        // Pega o endereço exato do seu frontend de onde o usuário está acessando
        // e define como a URL inicial do aplicativo.
        let appStartUrl = "/";
        if (req.headers.referer) {
            try {
                // Extrai apenas o domínio principal (ex: https://seusite.vercel.app/)
                appStartUrl = new URL(req.headers.referer).origin + "/";
            } catch (e) {
                console.error("Erro ao processar a URL do frontend", e);
            }
        }

        const manifest = {
            "short_name": appNames.short_name,
            "name": appNames.name,
            "icons": [
                { "src": icon192, "type": "image/png", "sizes": "192x192", "purpose": "any" },
                { "src": icon192, "type": "image/png", "sizes": "192x192", "purpose": "maskable" },
                { "src": icon512, "type": "image/png", "sizes": "512x512", "purpose": "any" },
                { "src": icon512, "type": "image/png", "sizes": "512x512", "purpose": "maskable" }
            ],
            // Agora o start_url será dinâmico e apontará para o seu frontend
            "start_url": appStartUrl, 
            "display": "standalone",
            "theme_color": "#D4AF37",
            "background_color": "#111827"
        };
        
        res.header('Content-Type', 'application/json');
        res.header('Access-Control-Allow-Origin', '*'); 
        res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
        
        res.send(JSON.stringify(manifest, null, 2));
    } catch (error) {
        console.error("Erro ao gerar manifest dinâmico:", error);
        res.status(500).send("Erro ao gerar manifest");
    }
});

// [SEÇÃO AFETADA]: Rotas de Configuração de Frete (Adicionar junto com as outras rotas de settings)

// (Público) Busca configuração de frete local para cálculo no frontend
app.get('/api/settings/shipping-local', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'local_shipping_config'");
        const config = rows.length > 0 ? JSON.parse(rows[0].setting_value) : { base_price: 20, rules: [] };
        res.json(config);
    } catch (err) {
        console.error("Erro ao buscar config de frete:", err);
        res.status(500).json({ base_price: 20, rules: [] }); // Fallback seguro
    }
});

// 2. Edição de Frete Local (Bloqueado)
app.put('/api/settings/shipping-local', verifyToken, verifyAdmin, async (req, res) => {
    const { base_price, rules, password, token } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress; // Captura o IP
    
    if (base_price === undefined || !Array.isArray(rules)) {
        return res.status(400).json({ message: "Formato de configuração inválido." });
    }

    // --- VERIFICAÇÃO DE SEGURANÇA (2FA/SENHA) ---
    const adminId = req.user.id;
    try {
        const [admins] = await db.query("SELECT password, two_factor_secret, is_two_factor_enabled FROM users WHERE id = ?", [adminId]);
        if (admins.length === 0) return res.status(404).json({ message: 'Administrador não encontrado.' });
        const admin = admins[0];

        let isVerified = false;
        
        // Prioriza 2FA se ativado e token fornecido, ou se a conta exige 2FA
        if (admin.is_two_factor_enabled) {
            if (!token) return res.status(400).json({ message: 'Código 2FA é obrigatório para esta alteração crítica.' });
            isVerified = speakeasy.totp.verify({
                secret: admin.two_factor_secret,
                encoding: 'base32',
                token: token
            });
        } else {
            // Fallback para senha se 2FA não estiver ativo
            if (!password) return res.status(400).json({ message: 'Senha é obrigatória para esta alteração crítica.' });
            isVerified = await bcrypt.compare(password, admin.password);
        }

        if (!isVerified) {
            return res.status(401).json({ message: 'Credencial inválida. Alteração de frete negada.' });
        }

    } catch (err) {
        console.error("Erro na verificação de segurança:", err);
        return res.status(500).json({ message: "Erro interno na verificação de segurança." });
    }
    // ---------------------------------------------

    const configString = JSON.stringify({ base_price: parseFloat(base_price), rules });

    try {
        await db.query(
            "INSERT INTO site_settings (setting_key, setting_value) VALUES ('local_shipping_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?", 
            [configString, configString]
        );
        
        // --- AUDITORIA: Registra Edição de Frete com IP ---
        logAdminAction(req.user, 'ATUALIZOU FRETE LOCAL', `Base: R$ ${base_price}, Regras: ${rules.length}`, clientIp);
        
        res.json({ message: "Configuração de frete atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar config de frete:", err);
        res.status(500).json({ message: "Erro ao salvar configuração." });
    }
});

// (Público) Busca configuração de retirada na loja
app.get('/api/settings/pickup', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM site_settings WHERE setting_key = 'pickup_config'");
        const defaultPickup = { 
            address: {
                rua: "R. Leopoldo Pereira Lima",
                numero: "378",
                bairro: "Mangabeira VIII",
                cidade: "João Pessoa",
                estado: "Paraíba",
                cep: "58059-123"
            }, 
            hours: "Segunda a Sábado, das 9h às 11h30 e das 15h às 17h30 (exceto feriados).", 
            instructions: "Apresentar um documento com foto e o número do pedido.", 
            mapsLink: "" 
        };
        const config = rows.length > 0 ? JSON.parse(rows[0].setting_value) : defaultPickup;
        res.json(config);
    } catch (err) {
        console.error("Erro ao buscar config de retirada:", err);
        res.status(500).json({}); 
    }
});

// (Admin) Edição de Retirada na Loja (Com validação 2FA/Senha)
app.put('/api/settings/pickup', verifyToken, verifyAdmin, async (req, res) => {
    const { config, password, token } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    const adminId = req.user.id;
    try {
        const [admins] = await db.query("SELECT password, two_factor_secret, is_two_factor_enabled FROM users WHERE id = ?", [adminId]);
        if (admins.length === 0) return res.status(404).json({ message: 'Administrador não encontrado.' });
        const admin = admins[0];

        let isVerified = false;
        if (admin.is_two_factor_enabled) {
            if (!token) return res.status(400).json({ message: 'Código 2FA é obrigatório para esta alteração.' });
            isVerified = speakeasy.totp.verify({ secret: admin.two_factor_secret, encoding: 'base32', token: token, window: 4 });
        } else {
            if (!password) return res.status(400).json({ message: 'Senha é obrigatória para esta alteração.' });
            isVerified = await bcrypt.compare(password, admin.password);
        }

        if (!isVerified) return res.status(401).json({ message: 'Credencial inválida. Alteração negada.' });
    } catch (err) {
        return res.status(500).json({ message: "Erro interno na verificação de segurança." });
    }

    const configString = JSON.stringify(config);
    try {
        await db.query(
            "INSERT INTO site_settings (setting_key, setting_value) VALUES ('pickup_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?", 
            [configString, configString]
        );
        logAdminAction(req.user, 'ATUALIZOU RETIRADA NA LOJA', `Configurações atualizadas`, clientIp);
        res.json({ message: "Configuração de retirada atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar config de retirada:", err);
        res.status(500).json({ message: "Erro ao salvar configuração." });
    }
});

// (Admin) Rota para buscar os logs de ações
app.get('/api/admin-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [logs] = await db.query("SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 200");
        res.json(logs);
    } catch (err) {
        console.error("Erro ao buscar logs de admin:", err);
        res.status(500).json({ message: "Erro ao buscar logs." });
    }
});


app.get('/api/reports/dashboard', verifyToken, verifyAdmin, async (req, res) => {
    const { filter } = req.query; // 'today', 'week', 'month', 'year'
    let startDate, endDate = new Date(); // endDate (período atual) é AGORA
    let prevStartDate, prevEndDate;

    // Define os períodos ATUAL e ANTERIOR (LÓGICA CORRIGIDA)
    switch (filter) {
        case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0); // Hoje, 00:00

            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 1); // Ontem, 00:00
            prevEndDate = new Date(startDate);
            prevEndDate.setDate(prevEndDate.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999); // Ontem, 23:59
            break;
        case 'week':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6); // 7 dias atrás (contando hoje)
            startDate.setHours(0, 0, 0, 0);
            
            prevEndDate = new Date(startDate);
            prevEndDate.setDate(prevEndDate.getDate() - 1); // Dia anterior ao início da semana
            prevEndDate.setHours(23, 59, 59, 999);
            prevStartDate = new Date(prevEndDate);
            prevStartDate.setDate(prevStartDate.getDate() - 6); // 7 dias antes disso
            prevStartDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            startDate = new Date();
            startDate.setDate(1);
            startDate.setMonth(0); // 1º de Janeiro deste ano
            startDate.setHours(0, 0, 0, 0);

            prevEndDate = new Date(startDate);
            prevEndDate.setDate(prevEndDate.getDate() - 1); // 31 de Dezembro do ano passado
            prevEndDate.setHours(23, 59, 59, 999);
            prevStartDate = new Date(prevEndDate);
            prevStartDate.setDate(1);
            prevStartDate.setMonth(0); // 1º de Janeiro do ano passado
            prevStartDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
        default: // Default é o mês atual
            startDate = new Date();
            startDate.setDate(1); // 1º dia do mês atual
            startDate.setHours(0, 0, 0, 0);

            prevEndDate = new Date(startDate);
            prevEndDate.setDate(prevEndDate.getDate() - 1); // Último dia do mês passado
            prevEndDate.setHours(23, 59, 59, 999);
            prevStartDate = new Date(prevEndDate);
            prevStartDate.setDate(1); // 1º dia do mês passado
            prevStartDate.setHours(0, 0, 0, 0);
    }

    try {
        const validOrderStatus = [
            ORDER_STATUS.PAYMENT_APPROVED,
            ORDER_STATUS.PROCESSING,
            ORDER_STATUS.READY_FOR_PICKUP,
            ORDER_STATUS.SHIPPED,
            ORDER_STATUS.OUT_FOR_DELIVERY,
            ORDER_STATUS.DELIVERED
        ];

        // --- CORREÇÃO: Consultas separadas e em LINHA ÚNICA para evitar erros de sintaxe ---

        // 1. Faturamento e Vendas (Período Atual)
        const [currentSalesStats] = await db.query(
            `SELECT COUNT(id) as totalSales, COALESCE(SUM(total), 0) as totalRevenue FROM orders WHERE status IN (?) AND date >= ? AND date <= ?`,
            [validOrderStatus, startDate, endDate]
        );

        // 2. Faturamento (Período Anterior)
        const [prevSalesStats] = await db.query(
            `SELECT COALESCE(SUM(total), 0) as prevPeriodRevenue FROM orders WHERE status IN (?) AND date >= ? AND date <= ?`,
            [validOrderStatus, prevStartDate, prevEndDate]
        );

        // 3. Novos Clientes (Período Atual)
        const [newCustomersStats] = await db.query(
            `SELECT COUNT(id) as newCustomers FROM users WHERE created_at >= ? AND created_at <= ?`,
            [startDate, endDate]
        );

        // 4. Pedidos Pendentes (Período Atual)
        const [pendingOrdersStats] = await db.query(
            `SELECT COUNT(id) as pendingOrders FROM orders WHERE status = 'Pendente' AND date >= ? AND date <= ?`,
            [startDate, endDate]
        );

        // 5. Vendas Diárias (Gráfico)
        const [dailySales] = await db.query(
            `SELECT DATE(date) as sale_date, SUM(total) as daily_total FROM orders WHERE status IN (?) AND date >= ? AND date <= ? GROUP BY DATE(date) ORDER BY sale_date ASC`,
            [validOrderStatus, startDate, endDate]
        );

        // 6. Mais Vendidos (Gráfico)
        const [bestSellers] = await db.query(
            `SELECT p.id, p.name, SUM(oi.quantity) as sales_in_period FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status IN (?) AND o.date >= ? AND o.date <= ? GROUP BY p.id, p.name ORDER BY sales_in_period DESC LIMIT 5`,
            [validOrderStatus, startDate, endDate]
        );

        // Monta o objeto de resposta
        const responseData = {
            stats: {
                totalRevenue: currentSalesStats[0].totalRevenue,
                totalSales: currentSalesStats[0].totalSales,
                newCustomers: newCustomersStats[0].newCustomers,
                pendingOrders: pendingOrdersStats[0].pendingOrders,
                prevPeriodRevenue: prevSalesStats[0].prevPeriodRevenue
            },
            dailySales,
            bestSellers: bestSellers.map(p => ({ ...p, sales: p.sales_in_period })), // Renomeia 'sales_in_period'
        };

        res.json(responseData);

    } catch (err) {
        console.error("Erro ao gerar dados do dashboard com filtro:", err);
        res.status(500).json({ message: "Erro ao gerar dados do dashboard." });
    }
});

// (Admin) Rota para relatórios detalhados com intervalo de datas
// (Admin) Rota para relatórios detalhados com intervalo de datas
app.get('/api/reports/detailed', verifyToken, verifyAdmin, async (req, res) => {
    let { startDate, endDate } = req.query;

    // Validação e valores padrão
    if (!startDate) {
        startDate = new Date();
        startDate.setDate(1); // Primeiro dia do mês atual
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate = new Date(startDate);
        startDate.setHours(0, 0, 0, 0);
    }

    if (!endDate) {
        endDate = new Date(); // Hoje
        endDate.setHours(23, 59, 59, 999);
    } else {
        endDate = new Date(endDate);
        endDate.setHours(23, 59, 59, 999); // Fim do dia selecionado
    }

    try {
        const validOrderStatus = [
            ORDER_STATUS.PAYMENT_APPROVED,
            ORDER_STATUS.PROCESSING,
            ORDER_STATUS.READY_FOR_PICKUP,
            ORDER_STATUS.SHIPPED,
            ORDER_STATUS.OUT_FOR_DELIVERY,
            ORDER_STATUS.DELIVERED
        ];
        
        // 1. KPIs (Cards de Estatísticas)
        const [kpiStats] = await db.query(
            `SELECT
                COALESCE(SUM(total), 0) as totalRevenue,
                COUNT(id) as totalSales,
                COALESCE(AVG(total), 0) as avgOrderValue,
                (SELECT COUNT(id) FROM users WHERE created_at >= ? AND created_at <= ?) as newCustomers
             FROM orders
             WHERE status IN (?) AND date >= ? AND date <= ?`,
            [startDate, endDate, validOrderStatus, startDate, endDate]
        );

        // 2. Gráfico de Vendas ao Longo do Tempo (Agrupado por dia)
        const [salesOverTime] = await db.query(
            `SELECT DATE(date) as sale_date, SUM(total) as daily_total
             FROM orders
             WHERE status IN (?) AND date >= ? AND date <= ?
             GROUP BY DATE(date)
             ORDER BY sale_date ASC`,
            [validOrderStatus, startDate, endDate]
        );

        // 3. Gráfico/Tabela de Produtos Mais Vendidos
        const [topProducts] = await db.query(
            `SELECT p.name, SUM(oi.quantity) as total_quantity, SUM(oi.quantity * oi.price) as total_revenue
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             JOIN orders o ON oi.order_id = o.id
             WHERE o.status IN (?) AND o.date >= ? AND o.date <= ?
             GROUP BY p.id, p.name
             ORDER BY total_quantity DESC
             LIMIT 10`,
            [validOrderStatus, startDate, endDate]
        );

        // 4. Tabela de Clientes Mais Valiosos
        const [topCustomers] = await db.query(
            `SELECT u.name, u.email, COUNT(o.id) as total_orders, SUM(o.total) as total_spent
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.status IN (?) AND o.date >= ? AND o.date <= ?
             GROUP BY u.id, u.name, u.email
             ORDER BY total_spent DESC
             LIMIT 10`,
            [validOrderStatus, startDate, endDate]
        );

        // 5. (NOVO) Vendas Detalhadas com Itens
        const [detailedSales] = await db.query(
            `SELECT
                o.id,
                o.date,
                o.total,
                o.status,
                u.name as customer_name,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'name', p.name,
                            'quantity', oi.quantity,
                            'price', oi.price
                        )
                    )
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                ) as items
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.status IN (?) AND o.date >= ? AND o.date <= ?
             ORDER BY o.date DESC`,
            [validOrderStatus, startDate, endDate]
        );

        res.json({
            kpis: kpiStats[0],
            salesOverTime,
            topProducts,
            topCustomers,
            detailedSales // Enviando dados detalhados
        });

    } catch (err) {
        console.error("Erro ao gerar relatório detalhado:", err);
        res.status(500).json({ message: "Erro ao gerar dados do relatório." });
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

// --- ROTAS DO SISTEMA DE REEMBOLSO (Admin) ---

// (Admin) Listar todas as solicitações de reembolso
app.get('/api/refunds', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // ATUALIZAÇÃO: Trazendo CPF, Telefone e um JSON com os itens do pedido
        const sql = `
            SELECT 
                r.*, 
                o.id as order_id, 
                o.date as order_date,
                o.payment_method,
                o.payment_details,
                u_req.name as requester_name, 
                u_app.name as approver_name,
                c.name as customer_name,
                c.cpf as customer_cpf,
                c.phone as customer_phone,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'name', p.name,
                            'quantity', oi.quantity,
                            'price', oi.price,
                            'variation', oi.variation_details,
                            'images', p.images
                        )
                    )
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                ) as order_items
            FROM refunds r
            JOIN orders o ON r.order_id = o.id
            JOIN users u_req ON r.requested_by_admin_id = u_req.id
            JOIN users c ON o.user_id = c.id
            LEFT JOIN users u_app ON r.approved_by_admin_id = u_app.id
            ORDER BY r.created_at DESC
        `;
        const [refunds] = await db.query(sql);
        res.json(refunds);
    } catch (err) {
        console.error("Erro ao listar reembolsos:", err);
        res.status(500).json({ message: "Erro interno ao listar reembolsos." });
    }
});

// (Admin) Solicitar um novo reembolso manualmente para um pedido
app.post('/api/refunds', verifyToken, verifyAdmin, async (req, res) => {
    const { order_id, amount, reason } = req.body;
    const requested_by_admin_id = req.user.id;

    if (!order_id || !amount || !reason) {
        return res.status(400).json({ message: "ID do pedido, valor e motivo são obrigatórios." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orderResult] = await connection.query("SELECT * FROM orders WHERE id = ?", [order_id]);
        if (orderResult.length === 0) {
            throw new Error("Pedido não encontrado.");
        }
        const order = orderResult[0];

        // CORREÇÃO CRÍTICA: Permite uma nova solicitação manual se a anterior foi NEGADA
        if (order.refund_id) {
            const [existingRefund] = await connection.query("SELECT status FROM refunds WHERE id = ?", [order.refund_id]);
            if (existingRefund.length > 0 && existingRefund[0].status !== 'denied') {
                throw new Error("Este pedido já possui uma solicitação de devolução em andamento ou concluída.");
            }
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (new Date(order.date) < sevenDaysAgo && order.status === ORDER_STATUS.DELIVERED) {
            throw new Error("Não é possível solicitar devolução para pedidos entregues há mais de 7 dias (Art. 49 CDC).");
        }

        if (parseFloat(amount) > parseFloat(order.total)) {
            throw new Error("O valor da devolução não pode ser maior que o total do pedido.");
        }
        
        const [refundInsertResult] = await connection.query(
            "INSERT INTO refunds (order_id, requested_by_admin_id, amount, reason, status) VALUES (?, ?, ?, ?, ?)",
            [order_id, requested_by_admin_id, amount, reason, 'pending_approval']
        );
        const newRefundId = refundInsertResult.insertId;

        await connection.query("UPDATE orders SET refund_id = ? WHERE id = ?", [newRefundId, order_id]);
        
        await connection.query(
            "INSERT INTO refund_logs (refund_id, admin_id, action, details) VALUES (?, ?, ?, ?)",
            [newRefundId, requested_by_admin_id, 'solicitado', `Motivo: ${reason}`]
        );

        await connection.commit();
        
        logAdminAction(req.user, 'SOLICITOU_REEMBOLSO', `Pedido ID: ${order_id}, Reembolso ID: ${newRefundId}`, req.ip); 
        res.status(201).json({ message: "Solicitação de devolução criada com sucesso.", refundId: newRefundId });

    } catch (err) {
        await connection.rollback();
        console.error("Erro ao solicitar reembolso:", err);
        res.status(500).json({ message: err.message || "Erro interno ao solicitar reembolso." });
    } finally {
        connection.release();
    }
});

// (Admin) Aprovar e processar um reembolso
app.post('/api/refunds/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
    const { id: refundId } = req.params;
    const approved_by_admin_id = req.user.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [refundResult] = await connection.query("SELECT * FROM refunds WHERE id = ? FOR UPDATE", [refundId]);
        if (refundResult.length === 0) throw new Error("Solicitação de reembolso não encontrada.");
        const refund = refundResult[0];

        if (refund.status !== 'pending_approval') throw new Error(`Esta solicitação não está pendente de aprovação (status atual: ${refund.status}).`);

        const [orderResult] = await connection.query("SELECT * FROM orders WHERE id = ?", [refund.order_id]);
        const order = orderResult[0];
        if (!order.payment_gateway_id || order.payment_status !== 'approved') {
            throw new Error(`O pagamento deste pedido não foi aprovado no gateway (Status: ${order.payment_status}). Reembolso bloqueado.`);
        }

        const refundResponse = await fetch(`https://api.mercadopago.com/v1/payments/${order.payment_gateway_id}/refunds`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: parseFloat(refund.amount) })
        });
        const refundData = await refundResponse.json();
        if (!refundResponse.ok) {
            await connection.query("UPDATE refunds SET status = 'failed', notes = ? WHERE id = ?", [refundData.message || "Falha no gateway", refundId]);
            await connection.query("INSERT INTO refund_logs (refund_id, admin_id, action, details) VALUES (?, ?, ?, ?)", [refundId, approved_by_admin_id, 'falhou', refundData.message || "Falha no gateway"]);
            throw new Error(refundData.message || "O Mercado Pago recusou o reembolso.");
        }
        
        await connection.query(
            "UPDATE refunds SET status = 'processed', approved_by_admin_id = ?, approved_at = NOW(), processed_at = NOW() WHERE id = ?",
            [approved_by_admin_id, refundId]
        );
        await updateOrderStatus(order.id, ORDER_STATUS.REFUNDED, connection, `Reembolso processado via painel. ID da Solicitação: ${refundId}.`);
        await connection.query(
            "INSERT INTO refund_logs (refund_id, admin_id, action, details) VALUES (?, ?, ?, ?)",
            [refundId, approved_by_admin_id, 'processado', `Reembolso de R$ ${refund.amount} confirmado no MP.`]
        );
        
        const [itemsToReturn] = await connection.query("SELECT product_id, quantity, variation_details FROM order_items WHERE order_id = ?", [order.id]);
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
        
        await connection.commit();

        const [customer] = await db.query("SELECT name, email FROM users WHERE id = ?", [order.user_id]);
        if (customer.length > 0) {
            const emailHtml = createRefundProcessedEmail(customer[0].name, order.id, Number(refund.amount), refund.reason);
            sendEmailAsync({ from: FROM_EMAIL, to: customer[0].email, subject: `Seu reembolso do pedido #${order.id} foi processado`, html: emailHtml });
        }
        
        logAdminAction(req.user, 'APROVOU_E_PROCESSOU_REEMBOLSO', `Pedido ID: ${order.id}, Reembolso ID: ${refundId}`, req.ip); // CORREÇÃO: IP ADICIONADO
        res.json({ message: "Reembolso aprovado e processado com sucesso!" });

    } catch (err) {
        await connection.rollback();
        console.error("Erro ao aprovar reembolso:", err);
        res.status(500).json({ message: err.message || "Erro interno ao aprovar reembolso." });
    } finally {
        connection.release();
    }
});

// (Admin) Negar uma solicitação de reembolso
app.post('/api/refunds/:id/deny', verifyToken, verifyAdmin, async (req, res) => {
    const { id: refundId } = req.params;
    const { reason } = req.body;
    const admin_id = req.user.id;

    if (!reason) {
        return res.status(400).json({ message: "O motivo da negação é obrigatório." });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [refundResult] = await connection.query("SELECT * FROM refunds WHERE id = ? FOR UPDATE", [refundId]);
        if (refundResult.length === 0) throw new Error("Solicitação de reembolso não encontrada.");
        if (refundResult[0].status !== 'pending_approval') throw new Error("Esta solicitação não pode mais ser negada.");

        // Atualiza a solicitação para negada e guarda o motivo em 'notes'
        await connection.query("UPDATE refunds SET status = 'denied', notes = ?, approved_by_admin_id = ?, approved_at = NOW() WHERE id = ?", [reason, admin_id, refundId]);
        
        // CORREÇÃO CRÍTICA: REMOVIDA A LINHA QUE DESVINCULAVA O REEMBOLSO DO PEDIDO (refund_id = NULL)
        // O pedido precisa continuar vinculado a este ID de reembolso para que o cliente veja o motivo da recusa na tela.
        
        await connection.query("INSERT INTO refund_logs (refund_id, admin_id, action, details) VALUES (?, ?, ?, ?)", [refundId, admin_id, 'negado', `Motivo: ${reason}`]);
        
        await connection.commit();
        
        logAdminAction(req.user, 'NEGOU_REEMBOLSO', `Pedido ID: ${refundResult[0].order_id}, Reembolso ID: ${refundId}`, req.ip);
        res.json({ message: "Solicitação de devolução negada. O cliente será avisado do motivo." });
        
    } catch (err) {
        await connection.rollback();
        console.error("Erro ao negar reembolso:", err);
        res.status(500).json({ message: err.message || "Erro interno ao negar reembolso." });
    } finally {
        connection.release();
    }
});

// (Cliente) Rota para o cliente solicitar um reembolso/cancelamento
app.post('/api/refunds/request', verifyToken, async (req, res) => {
    const { order_id, reason, images, contact_phone } = req.body;
    const user_id = req.user.id;

    if (!order_id || !reason) {
        return res.status(400).json({ message: "ID do pedido e motivo são obrigatórios." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orderResult] = await connection.query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [order_id, user_id]);
        if (orderResult.length === 0) throw new Error("Pedido não encontrado ou não pertence a este usuário.");
        
        const order = orderResult[0];

        if (order.payment_status !== 'approved') {
            throw new Error("Não é possível solicitar devolução para um pedido cujo pagamento não foi aprovado.");
        }

        const cancellableStatuses = [ORDER_STATUS.PAYMENT_APPROVED, ORDER_STATUS.PROCESSING, ORDER_STATUS.DELIVERED];
        if (!cancellableStatuses.includes(order.status)) {
            throw new Error(`Apenas pedidos com status 'Pagamento Aprovado', 'Separando Pedido' ou 'Entregue' podem ter o cancelamento/devolução solicitado.`);
        }

        // CORREÇÃO CRÍTICA: Permite uma nova solicitação se a anterior foi NEGADA
        if (order.refund_id) {
            const [existingRefund] = await connection.query("SELECT status FROM refunds WHERE id = ?", [order.refund_id]);
            if (existingRefund.length > 0 && existingRefund[0].status !== 'denied') {
                throw new Error("Este pedido já possui uma solicitação de devolução em andamento ou concluída.");
            }
        }
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (new Date(order.date) < sevenDaysAgo && order.status === ORDER_STATUS.DELIVERED) {
            throw new Error("O prazo legal de 7 dias (Direito de Arrependimento) para este pedido já expirou.");
        }

        const refundAmount = order.total;
        const imagesJson = images && Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : null;
        const cleanPhone = contact_phone ? String(contact_phone).replace(/\D/g, '') : null;

        // Insere a NOVA solicitação no banco
        const [refundInsertResult] = await connection.query(
            "INSERT INTO refunds (order_id, requested_by_admin_id, amount, reason, status, images, contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [order_id, user_id, refundAmount, reason, 'pending_approval', imagesJson, cleanPhone]
        );
        const newRefundId = refundInsertResult.insertId;

        // Atualiza o pedido para apontar para a NOVA solicitação, substituindo a negada
        await connection.query("UPDATE orders SET refund_id = ? WHERE id = ?", [newRefundId, order_id]);
        
        await connection.query(
            "INSERT INTO refund_logs (refund_id, admin_id, action, details) VALUES (?, ?, ?, ?)",
            [newRefundId, user_id, 'solicitado_pelo_cliente', `Motivo: ${reason}`]
        );

        await connection.commit();
        
        res.status(201).json({ message: "Sua solicitação foi enviada e será analisada em breve.", refundId: newRefundId });

    } catch (err) {
        await connection.rollback();
        console.error("Erro do cliente ao solicitar reembolso:", err);
        res.status(500).json({ message: err.message || "Erro interno ao processar a solicitação." });
    } finally {
        connection.release();
    }
});

// (Admin) Rota para enviar e-mail direto para um usuário
app.post('/api/users/:id/send-email', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { subject, message } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ message: "Assunto e mensagem são obrigatórios." });
    }

    try {
        const [users] = await db.query("SELECT name, email FROM users WHERE id = ?", [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        const user = users[0];

        const emailHtml = createAdminDirectEmail(user.name, subject, message);

        await sendEmailAsync({
            from: FROM_EMAIL,
            to: user.email,
            subject: subject,
            html: emailHtml,
        });
        
        logAdminAction(req.user, 'ENVIOU_EMAIL_DIRETO', `Para: ${user.email}, Assunto: "${subject}"`, req.ip); // CORREÇÃO: IP ADICIONADO

        res.json({ message: `E-mail enviado com sucesso para ${user.name}.` });

    } catch (err) {
        console.error(`Erro ao enviar e-mail direto para o usuário ${id}:`, err);
        res.status(500).json({ message: "Erro interno ao enviar o e-mail." });
    }
});

app.get('/api/newsletter/subscribers', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [subscribers] = await db.query("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
        res.json(subscribers);
    } catch (err) {
        console.error("Erro ao listar inscritos:", err);
        res.status(500).json({ message: "Erro ao buscar lista de e-mails." });
    }
});

app.post('/api/newsletter/broadcast', verifyToken, verifyAdmin, async (req, res) => {
    const { subject, message, ctaLink, ctaText, productId, discountText } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ message: "Assunto e mensagem são obrigatórios." });
    }

    const connection = await db.getConnection();
    try {
        const [subscribers] = await connection.query("SELECT email FROM newsletter_subscribers WHERE is_active = 1");

        if (subscribers.length === 0) {
            return res.status(400).json({ message: "Não há inscritos ativos para enviar." });
        }

        let productHtml = '';
        if (productId) {
            const [products] = await connection.query("SELECT * FROM products WHERE id = ?", [productId]);
            if (products.length > 0) {
                const product = products[0];
                const imageUrl = getFirstImage(product.images); 
                const productUrl = `${process.env.APP_URL || 'http://localhost:3000'}/#product/${product.id}`;
                
                productHtml = `
                    <div style="background-color: #2D3748; border: 1px solid #4A5568; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                        <p style="color: #F6E05E; font-weight: bold; text-transform: uppercase; font-size: 14px; margin-bottom: 15px; letter-spacing: 1px;">
                            ${discountText || 'Oferta Especial para Você'}
                        </p>
                        <img src="${imageUrl}" alt="${product.name}" style="max-width: 200px; max-height: 200px; border-radius: 4px; margin-bottom: 15px; object-fit: contain;">
                        <h3 style="color: #fff; font-size: 18px; margin: 0 0 5px;">${product.name}</h3>
                        <p style="color: #CBD5E0; font-size: 14px; margin: 0 0 15px;">${product.brand}</p>
                        
                        <div style="margin-bottom: 20px;">
                            ${product.is_on_sale 
                                ? `<span style="text-decoration: line-through; color: #718096; margin-right: 10px;">R$ ${Number(product.price).toFixed(2)}</span>
                                   <span style="color: #F6E05E; font-size: 20px; font-weight: bold;">R$ ${Number(product.sale_price).toFixed(2)}</span>`
                                : `<span style="color: #fff; font-size: 20px; font-weight: bold;">R$ ${Number(product.price).toFixed(2)}</span>`
                            }
                        </div>
                        
                        <a href="${productUrl}" style="background-color: #F6E05E; color: #1A202C; padding: 10px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif; display: inline-block;">
                            Comprar Agora
                        </a>
                    </div>
                `;
            }
        }

        const createCampaignEmail = (msg, link, text, prodHtml) => {
            let buttonHtml = '';
            if (link && text) {
                buttonHtml = `
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${link}" style="background-color: #D4AF37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif; display: inline-block;">
                            ${text}
                        </a>
                    </div>
                `;
            }

            const content = `
                <h1 style="color: #D4AF37; font-family: Arial, sans-serif; font-size: 24px; margin-bottom: 20px;">${subject}</h1>
                <div style="color: #E5E7EB; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; white-space: pre-line;">
                    ${msg}
                </div>
                ${prodHtml}
                ${buttonHtml}
                <hr style="border: 0; border-top: 1px solid #374151; margin: 40px 0 20px;" />
                <p style="text-align: center; color: #6B7280; font-size: 12px;">
                    Você recebeu este e-mail porque se inscreveu no Clube VIP da Love Cestas e Perfumes.
                </p>
            `;
            return createEmailBase(content);
        };

        const emailHtml = createCampaignEmail(message, ctaLink, ctaText, productHtml);
        
        const emailPromises = subscribers.map(sub => 
            sendEmailAsync({
                from: process.env.FROM_EMAIL,
                to: sub.email,
                subject: subject,
                html: emailHtml
            })
        );

        Promise.allSettled(emailPromises).then(results => {
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            logAdminAction(req.user, 'ENVIOU NEWSLETTER', `Assunto: "${subject}" para ${successCount} inscritos.`, req.ip); // CORREÇÃO: IP ADICIONADO
        });

        res.json({ message: `Campanha iniciada! Enviando para ${subscribers.length} inscritos.` });

    } catch (err) {
        console.error("Erro no envio da newsletter:", err);
        res.status(500).json({ message: "Erro interno ao processar o envio." });
    } finally {
        connection.release();
    }
});

// ============================================================================
// --- ROTAS DE BIOMETRIA / RECONHECIMENTO FACIAL (WEBAUTHN / PASSKEYS) ---
// ============================================================================

// Tenta carregar a biblioteca de forma segura
let webauthnServer;
try {
    webauthnServer = require('@simplewebauthn/server');
} catch (e) {
    console.error("ERRO CRÍTICO: Biblioteca @simplewebauthn/server não instalada no backend!");
}

const rpName = 'Love Cestas e Perfumes';

const getAppOrigin = () => {
    let url = process.env.APP_URL || 'http://localhost:3000';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    return url;
};

const expectedOrigin = getAppOrigin();
let rpID;
try {
    rpID = new URL(expectedOrigin).hostname;
} catch (e) {
    console.warn("URL inválida detectada, usando localhost como fallback para rpID.");
    rpID = 'localhost';
}

// --- NOVO: Rota para o Frontend verificar silenciosamente se o e-mail tem biometria ---
app.post('/api/webauthn/check', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ hasBiometrics: false });

    try {
        const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.json({ hasBiometrics: false });

        const [auths] = await db.query("SELECT id FROM user_authenticators WHERE user_id = ?", [users[0].id]);
        res.json({ hasBiometrics: auths.length > 0 });
    } catch (err) {
        console.error("Erro ao checar biometria:", err);
        res.json({ hasBiometrics: false }); 
    }
});

// 1. Gera opções para o usuário cadastrar uma nova biometria (Apenas Logados)
app.get('/api/webauthn/generate-registration-options', verifyToken, async (req, res) => {
    if (!webauthnServer) return res.status(500).json({ message: "Biblioteca de biometria não instalada no servidor." });

    try {
        const [users] = await db.query("SELECT id, email, name FROM users WHERE id = ?", [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: "Usuário não encontrado." });
        const user = users[0];

        const [authenticators] = await db.query("SELECT credential_id FROM user_authenticators WHERE user_id = ?", [user.id]);

        // Formata o ID do usuário como Array de Bytes (Uint8Array) exigido pela v10+
        const userIDUint8Array = new Uint8Array(Buffer.from(String(user.id)));

        const options = await webauthnServer.generateRegistrationOptions({
            rpName,
            rpID,
            userID: userIDUint8Array,
            userName: user.email,
            userDisplayName: user.name,
            attestationType: 'none',
            excludeCredentials: authenticators.map(auth => ({
                id: auth.credential_id || '', 
                type: 'public-key',
                transports: ['internal'],
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        // Salva o desafio na memória
        webauthnChallenges[`reg_${user.id}`] = options.challenge;

        res.json(options);
    } catch (err) {
        console.error("Erro ao gerar opções de registro biométrico:", err);
        res.status(500).json({ message: `Erro ao configurar: ${err.message}` });
    }
});

// 2. Verifica a biometria cadastrada e salva no banco
app.post('/api/webauthn/verify-registration', verifyToken, async (req, res) => {
    if (!webauthnServer) return res.status(500).json({ message: "Biblioteca de biometria não instalada." });
    
    const { body } = req;
    const userId = req.user.id;
    const expectedChallenge = webauthnChallenges[`reg_${userId}`];

    if (!expectedChallenge) {
        return res.status(400).json({ message: "Desafio expirado ou inválido. Tente recarregar a página." });
    }

    try {
        const verification = await webauthnServer.verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
        });

        const { verified, registrationInfo } = verification;

        if (verified && registrationInfo) {
            // CORREÇÃO CRÍTICA PARA A VERSÃO 10+ DO SIMPLEWEBAUTHN
            // Em versões novas, os dados vêm dentro de "credential"
            const credentialData = registrationInfo.credential || registrationInfo;
            
            const publicKey = credentialData.publicKey || credentialData.credentialPublicKey;
            const credID = credentialData.id || credentialData.credentialID;
            const counter = credentialData.counter || 0;
            
            // Converte a chave pública e o ID para formato de string do banco de dados
            const base64PublicKey = Buffer.from(publicKey).toString('base64');
            const base64CredentialID = Buffer.isBuffer(credID) || credID instanceof Uint8Array 
                ? Buffer.from(credID).toString('base64url') 
                : String(credID);

            await db.query(
                "INSERT INTO user_authenticators (user_id, credential_id, credential_public_key, counter) VALUES (?, ?, ?, ?)",
                [userId, base64CredentialID, base64PublicKey, counter]
            );

            delete webauthnChallenges[`reg_${userId}`]; // Limpa a memória
            res.json({ verified: true, message: "Biometria ativada com sucesso!" });
        } else {
            res.status(400).json({ message: "A verificação biométrica falhou." });
        }
    } catch (err) {
        console.error("Erro ao verificar registro biométrico:", err);
        res.status(500).json({ message: `Erro ao salvar: ${err.message}` });
    }
});

// 3. Gera opções para o usuário fazer Login com a biometria
app.get('/api/webauthn/generate-authentication-options', async (req, res) => {
    if (!webauthnServer) return res.status(500).json({ message: "Biblioteca de biometria não instalada." });
    
    try {
        const sessionId = crypto.randomBytes(16).toString('hex');

        const options = await webauthnServer.generateAuthenticationOptions({
            rpID,
            userVerification: 'preferred',
        });

        webauthnChallenges[`auth_${sessionId}`] = options.challenge;

        res.json({ options, sessionId });
    } catch (err) {
        console.error("Erro ao gerar opções de login biométrico:", err);
        res.status(500).json({ message: `Falha ao iniciar login: ${err.message}` });
    }
});

// 4. Verifica a digital/face lida e faz o Login
app.post('/api/webauthn/verify-authentication', async (req, res) => {
    if (!webauthnServer) return res.status(500).json({ message: "Biblioteca de biometria não instalada." });
    
    const { body, sessionId } = req.body;
    const expectedChallenge = webauthnChallenges[`auth_${sessionId}`];

    if (!expectedChallenge) {
        return res.status(400).json({ message: "Sessão de login expirada. Tente novamente." });
    }

    try {
        // Encontra o usuário pelo ID da credencial biométrica
        const [authenticators] = await db.query("SELECT * FROM user_authenticators WHERE credential_id = ?", [body.id]);
        
        if (authenticators.length === 0) {
            return res.status(404).json({ message: "Biometria não reconhecida ou não cadastrada neste aparelho." });
        }
        
        const authenticator = authenticators[0];

        // Decodifica a chave pública salva no banco
        const publicKeyBuffer = Buffer.from(authenticator.credential_public_key, 'base64');
        const credentialIdBuffer = Buffer.from(authenticator.credential_id, 'base64url');

        const verification = await webauthnServer.verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: authenticator.credential_id, // Passa a string base64url direta
                credentialPublicKey: publicKeyBuffer,
                counter: authenticator.counter,
                transports: ['internal'],
            },
        });

        const { verified, authenticationInfo } = verification;

        if (verified) {
            await db.query("UPDATE user_authenticators SET counter = ? WHERE id = ?", [authenticationInfo.newCounter, authenticator.id]);
            delete webauthnChallenges[`auth_${sessionId}`];

            const [users] = await db.query("SELECT * FROM users WHERE id = ?", [authenticator.user_id]);
            const user = users[0];

            if (user.status === 'blocked') {
                return res.status(403).json({ message: "Conta bloqueada." });
            }

            // === LÓGICA DE 2FA PARA ADMINS ===
            if (user.role === 'admin' && user.is_two_factor_enabled) {
                 const tempToken = jwt.sign({ id: user.id, twoFactorAuth: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
                 return res.json({ twoFactorEnabled: true, token: tempToken });
            }

            // === LOGIN BEM-SUCEDIDO NORMAL ===
            const userPayload = { id: user.id, name: user.name, role: user.role };
            const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
            const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

            const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
            await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, refreshToken, expiresAt]);

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            };

            res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
            res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE });

            const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
            await db.query("INSERT INTO login_history (user_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, 'success')", [user.id, user.email, clientIp, req.headers['user-agent']]);

            const { password: _, two_factor_secret, ...userData } = user;
            
            res.json({ message: "Login biométrico realizado com sucesso.", user: userData, accessToken, refreshToken });
        } else {
            res.status(401).json({ message: "A verificação biométrica falhou." });
        }
    } catch (err) {
        console.error("Erro no login biométrico:", err);
        res.status(500).json({ message: `Falha na verificação: ${err.message}` });
    }
});

// --- NOVA ROTA: Obter detalhes do pagamento para a tela de Sucesso (Pix/Boleto) ---
app.get('/api/orders/:id/payment-details', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const [orderResult] = await db.query("SELECT payment_status, payment_details FROM orders WHERE id = ? AND user_id = ?", [id, userId]);
        
        if (orderResult.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        
        const order = orderResult[0];
        let paymentDetails = null;
        
        if (order.payment_details) {
            try {
                paymentDetails = JSON.parse(order.payment_details);
            } catch (e) {
                console.error("Erro ao fazer parse dos detalhes do pagamento:", e);
            }
        }
        
        res.json({ 
            payment_status: order.payment_status,
            payment_details: paymentDetails
        });
        
    } catch(err) {
        console.error(`Erro ao buscar detalhes de pagamento do pedido ${id}:`, err);
        res.status(500).json({ message: 'Erro ao consultar detalhes do pagamento.' });
    }
});

// Middleware Global de Tratamento de Erros
app.use((err, req, res, next) => {
    // ATUALIZAÇÃO: Intercepta erros do Multer (arquivos não suportados) para não gerar erro 500
    if (err instanceof multer.MulterError || (err.message && err.message.includes('Tipo de arquivo'))) {
        return res.status(400).json({ message: err.message });
    }

    console.error("Erro não tratado capturado:", err.stack);
    res.status(500).json({ 
        status: 'error',
        message: 'Ocorreu um erro interno no servidor.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.get('/.well-known/assetlinks.json', (req, res) => {
    // Cabeçalho OBRIGATÓRIO para o Android aceitar o arquivo
    res.header('Content-Type', 'application/json');
    
    // Evita cache para garantir que o Android sempre leia a versão mais nova da chave
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    
    res.json([
      {
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
          "namespace": "android_app",
          // ID do pacote confirmado
          "package_name": process.env.ANDROID_PACKAGE_NAME || "br.com.lovecestaseperfumes.www.twa",
          // Chave SHA-256 EXATA (Conforme seu último envio)
          "sha256_cert_fingerprints": [
            process.env.ANDROID_SHA256_FINGERPRINT || "BE:48:3A:9F:BA:5C:2D:00:4F:BE:7D:BB:47:FF:EB:8D:97:0F:C4:27:FC:B5:BC:8A:67:5B:87:FD:40:AF:53:A1"
          ]
        }
      }
    ]);
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Servidor backend completo rodando na porta ${PORT}`);
});