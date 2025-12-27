# 🚗 RentCar - Açık Kaynak Araç Kiralama Sistemi

RentCar, modern web teknolojileri kullanılarak geliştirilmiş, hızlı, güvenli ve özelleştirilebilir bir araç kiralama (Rent a Car) yönetim sistemidir. Node.js ve SQLite tabanlı yapısı sayesinde kurulumu çok kolaydır ve yüksek performans sunar.
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)

## 🌟 Özellikler

*   **Yönetim Paneli:** Araçları, rezervasyonları ve site ayarlarını kolayca yönetin.
*   **Dinamik Araç Yönetimi:** Araç ekleme, düzenleme, silme ve fiyatlandırma.
*   **Rezervasyon Sistemi:** Müşteriler için kolay rezervasyon formu ve admin onayı.
*   **Telegram Entegrasyonu:** Yeni rezervasyon, ödeme ve hızlı rezervasyon taleplerinde anında Telegram bildirimi.
*   **Özel Gün Efektleri:** Yılbaşı gibi özel günlerde site genelinde otomatik görsel efektler (Kar yağışı vb.).
*   **Ziyaretçi Takibi:** Site trafiğini ve ziyaretçi istatistiklerini panelden izleyin.
*   **Güvenlik:** JWT tabanlı kimlik doğrulama, Rate Limiting (DDoS koruması), Helmet (Header güvenliği).
*   **Responsive Tasarım:** Mobil uyumlu modern arayüz (Tailwind CSS).
*   **Yedekleme Sistemi:** Veritabanı ve dosyaları panel üzerinden yedekleme imkanı.
*   **SQLite Veritabanı:** Ekstra kurulum gerektirmeyen dosya tabanlı veritabanı.

## 🚀 Kurulum

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler

*   [Node.js](https://nodejs.org/) (v16 veya üzeri)
*   npm (Node.js ile birlikte gelir)

### Adım 1: Projeyi Klonlayın

```bash
git clone https://github.com/redghost-dev/rentcar.git
cd rentcar
```

### Adım 2: Bağımlılıkları Yükleyin

```bash
npm install
```

### Adım 3: Çevresel Değişkenleri Ayarlayın

Proje kök dizininde `.env` dosyası oluşturun (veya `.env.example` dosyasını kopyalayın) ve gerekli ayarları yapın:

```bash
# .env dosyası içeriği
PORT=3000
JWT_SECRET=buraya_cok_gizli_ve_uzun_bir_sifre_yazin
NODE_ENV=development

# Telegram Bildirim Ayarları
TELEGRAM_BOT_TOKEN=bot_tokeniniz
TELEGRAM_CHAT_ID=chat_id_niz
```

### Adım 4: Uygulamayı Başlatın

Geliştirme modunda başlatmak için:

```bash
npm run dev
```

Production modunda başlatmak için:

```bash
npm start
```

Tarayıcınızda `http://localhost:3000` adresine gidin.

## 🔐 Yönetim Paneli ve İlk Kurulum

Sistem ilk kez çalıştırıldığında veritabanı otomatik olarak oluşturulur.

1.  **Admin Paneli:** `http://localhost:3000/admin.html` adresine gidin.
2.  **İlk Admin Hesabı:** İlk kurulumda admin hesabı yoktur. Postman veya benzeri bir araçla aşağıdaki isteği atarak ilk admini oluşturun (veya `setup.html` varsa oradan yapın):
    *   **URL:** `POST http://localhost:3000/api/auth/setup`
    *   **Body (JSON):**
        ```json
        {
          "username": "admin",
          "password": "GucluBirSifre123!",
          "email": "admin@example.com"
        }
        ```

### 🆘 Root Kullanıcısı ve Güvenlik (Sistem Kurtarma)

Sistemde, veritabanı erişiminin kaybedilmesi veya admin şifresinin unutulması durumunda kullanılmak üzere kod içine gömülü bir **root** kullanıcısı bulunur.

*   **Kullanıcı Adı:** `root`
*   **Varsayılan Şifre:** `root123`

#### ⚠️ Root Şifresini Değiştirme (ÖNEMLİ)

Sistemde bir **Bütünlük Kontrolü (Integrity Monitor)** bulunmaktadır (`monitor.cjs`). Bu mekanizma, `server.cjs` dosyasındaki güvenlik ayarlarının değiştirilip değiştirilmediğini kontrol eder. Root şifresini değiştirmek için **aşağıdaki adımları sırasıyla uygulamanız gerekir**, aksi takdirde sunucu güvenlik ihlali algılayıp çalışmayı durdurur.

1.  Yeni şifreniz için bir **BCrypt Hash** oluşturun (Online bcrypt generator kullanabilirsiniz).
2.  **`server.cjs` dosyasını açın:**
    *   `const SYS_ROOT_HASH = '...'` satırını bulun ve yeni hash değerinizi buraya yazın.
3.  **`monitor.cjs` dosyasını açın:**
    *   `const hashSignature = "const SYS_ROOT_HASH = '...';";` satırını bulun.
    *   Bu satırın içeriğini, `server.cjs` dosyasında yaptığınız değişikliğin **birebir aynısı** olacak şekilde güncelleyin. (Boşluklar ve noktalı virgül dahil tam eşleşme gereklidir).

Bu iki dosyayı senkronize bir şekilde güncellemezseniz sistem başlamayacaktır.

## 🛠️ Teknoloji Yığını

*   **Backend:** Node.js, Express.js
*   **Veritabanı:** SQLite3
*   **Frontend:** HTML5, JavaScript (ES6+), Tailwind CSS
*   **Güvenlik:** bcryptjs, jsonwebtoken, helmet, express-rate-limit

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak isterseniz çok seviniriz! Lütfen `CONTRIBUTING.md` dosyasını inceleyin.

1.  Bu depoyu Fork'layın.
2.  Yeni bir özellik dalı (branch) oluşturun (`git checkout -b yeni-ozellik`).
3.  Değişikliklerinizi yapın ve commit'leyin (`git commit -m 'Yeni özellik eklendi'`).
4.  Dalınızı Push'layın (`git push origin yeni-ozellik`).
5.  Bir Pull Request oluşturun.

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır. Herkes tarafından ücretsiz olarak kullanılabilir ve değiştirilebilir.
