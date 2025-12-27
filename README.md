# 🚗 RentCar - Open Source Car Rental System

RentCar is a fast, secure, and customizable car rental management system developed using modern web technologies. Its Node.js and SQLite-based structure makes it very easy to install and offers high performance.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)

[Kurdî](#-rentcar---sîstema-kirêkirina-otomobîlan-a-çavkaniya-vekirî) | [Türkçe](#-rentcar---açık-kaynak-araç-kiralama-sistemi)

## 🌟 Features

*   **Admin Panel:** Easily manage vehicles, reservations, and site settings.
*   **Dynamic Vehicle Management:** Add, edit, delete, and price vehicles.
*   **Reservation System:** Easy reservation form for customers and admin approval.
*   **Telegram Integration:** Instant Telegram notifications for new reservations, payments, and quick reservation requests.
*   **Special Day Effects:** Automatic visual effects across the site on special days like New Year's (Snowfall, etc.).
*   **Visitor Tracking:** Monitor site traffic and visitor statistics from the panel.
*   **Security:** JWT-based authentication, Rate Limiting (DDoS protection), Helmet (Header security).
*   **Responsive Design:** Mobile-compatible modern interface (Tailwind CSS).
*   **Backup System:** Ability to backup database and files via the panel.
*   **SQLite Database:** File-based database requiring no extra installation.

## 🚀 Installation

Follow the steps below to run the project on your local machine.

### Requirements

*   [Node.js](https://nodejs.org/) (v16 or higher)
*   npm (comes with Node.js)

### Step 1: Clone the Project

```bash
git clone https://github.com/redghost-dev/rentcar.git
cd rentcar
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Environment Variables

Create a `.env` file in the project root directory (or copy the `.env.example` file) and configure the necessary settings:

```bash
# .env file content
PORT=3000
JWT_SECRET=write_a_very_secret_and_long_password_here
NODE_ENV=development

# Telegram Notification Settings
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Step 4: Start the Application

To start in development mode:

```bash
npm run dev
```

To start in production mode:

```bash
npm start
```

Go to `http://localhost:3000` in your browser.

## 🔐 Admin Panel and Initial Setup

The database is automatically created when the system is run for the first time.

1.  **Admin Panel:** Go to `http://localhost:3000/admin.html`.
2.  **First Admin Account:** There is no admin account on the first install. Create the first admin by sending the following request with Postman or a similar tool (or via `setup.html` if available):
    *   **URL:** `POST http://localhost:3000/api/auth/setup`
    *   **Body (JSON):**
        ```json
        {
          "username": "admin",
          "password": "StrongPassword123!",
          "email": "admin@example.com"
        }
        ```

### 🆘 Root User and Security (System Recovery)

The system includes a hardcoded **root** user in the code to be used in case database access is lost or the admin password is forgotten.

*   **Username:** `root`
*   **Default Password:** `root123`

#### ⚠️ Changing Root Password (IMPORTANT)

The system has an **Integrity Monitor** (`monitor.cjs`). This mechanism checks if the security settings in `server.cjs` have been modified. To change the root password, **you must follow the steps below in order**, otherwise the server will detect a security breach and stop working.

1.  Generate a **BCrypt Hash** for your new password (you can use an online bcrypt generator).
2.  **Open `server.cjs`:**
    *   Find the line `const SYS_ROOT_HASH = '...'` and write your new hash value here.
3.  **Open `monitor.cjs`:**
    *   Find the line `const hashSignature = "const SYS_ROOT_HASH = '...';";`.
    *   Update the content of this line to match exactly what you changed in `server.cjs`. (Exact match including spaces and semicolons is required).

If you do not update these two files synchronously, the system will not start.

## 🛠️ Tech Stack

*   **Backend:** Node.js, Express.js
*   **Database:** SQLite3
*   **Frontend:** HTML5, JavaScript (ES6+), Tailwind CSS
*   **Security:** bcryptjs, jsonwebtoken, helmet, express-rate-limit

## 🤝 Contributing

We would love for you to contribute to the project! Please review the `CONTRIBUTING.md` file.

1.  Fork this repository.
2.  Create a new feature branch (`git checkout -b new-feature`).
3.  Commit your changes (`git commit -m 'Added new feature'`).
4.  Push your branch (`git push origin new-feature`).
5.  Create a Pull Request.

## 📄 License

This project is licensed under the [MIT License](LICENSE). It is free for everyone to use and modify.

---

# 🚗 RentCar - Sîstema Kirêkirina Otomobîlan a Çavkaniya Vekirî

RentCar, sîstemeke rêvebirina kirêkirina otomobîlan (Rent a Car) e ku bi teknolojiyên webê yên nûjen hatiye pêşxistin, bilez, ewle û xwerû ye. Bi saya avahiya xwe ya li ser Node.js û SQLite, sazkirina wê pir hêsan e û performansa bilind pêşkêş dike.

[English](#-rentcar---open-source-car-rental-system) | [Türkçe](#-rentcar---açık-kaynak-araç-kiralama-sistemi)

## 🌟 Taybetmendî

*   **Panela Rêvebiriyê:** Otomobîl, rezervasyon û mîhengên malperê bi hêsanî birêve bibin.
*   **Rêvebirina Otomobîlan a Dînamîk:** Zêdekirin, sererastkirin, jêbirin û bihayê otomobîlan.
*   **Sîstema Rezervasyonê:** Forma rezervasyonê ya hêsan ji bo xerîdaran û erêkirina rêvebir.
*   **Entegrasyona Telegramê:** Ji bo rezervasyonên nû, dravdan û daxwazên rezervasyona bilez agahdariya Telegramê ya tavilê.
*   **Efektên Rojên Taybet:** Di rojên taybet ên wekî Sersalê de li seranserê malperê efektên dîtbarî yên otomatîk (Barîna berfê hwd.).
*   **Şopandina Ziyaretvanan:** Trafîka malperê û statîstîkên ziyaretvanan ji panelê bişopînin.
*   **Ewlehî:** Rastkirina nasnameyê ya li ser JWT, Rate Limiting (Parastina DDoS), Helmet (Ewlehiya Header).
*   **Sêwirana Bersivdar (Responsive):** Navrûya nûjen a lihevhatî bi mobîlê re (Tailwind CSS).
*   **Sîstema Vegerandinê (Backup):** Derfeta hilanîna databas û pelan bi rêya panelê.
*   **Databasa SQLite:** Databasa li ser pelan ku sazkirina zêde hewce nake.

## 🚀 Sazkirin

Ji bo xebitandina projeyê li ser makîneya xwe ya herêmî, gavên jêrîn bişopînin.

### Pêdivî

*   [Node.js](https://nodejs.org/) (v16 an bilindtir)
*   npm (bi Node.js re tê)

### Gav 1: Projeyê Klon Bikin

```bash
git clone https://github.com/redghost-dev/rentcar.git
cd rentcar
```

### Gav 2: Pêdiviyan Saz Bikin

```bash
npm install
```

### Gav 3: Guherbarên Hawîrdorê Mîheng Bikin

Di pelrêça sereke ya projeyê de pelek `.env` biafirînin (an pelê `.env.example` kopî bikin) û mîhengên pêwîst bikin:

```bash
# Naveroka pelê .env
PORT=3000
JWT_SECRET=li_vir_şîfreyek_pir_nepenî_û_dirêj_binivîsin
NODE_ENV=development

# Mîhengên Agahdariya Telegramê
TELEGRAM_BOT_TOKEN=tokena_bota_we
TELEGRAM_CHAT_ID=idya_chata_we
```

### Gav 4: Serîlêdanê Bidin Destpêkirin

Ji bo destpêkirina di moda pêşxistinê de:

```bash
npm run dev
```

Ji bo destpêkirina di moda hilberînê (production) de:

```bash
npm start
```

Di geroka xwe de biçin navnîşana `http://localhost:3000`.

## 🔐 Panela Rêvebiriyê û Sazkirina Destpêkê

Dema ku sîstem cara yekem tê xebitandin, databas bixweber tê afirandin.

1.  **Panela Rêvebir:** Biçin navnîşana `http://localhost:3000/admin.html`.
2.  **Hesabê Rêvebir ê Yekem:** Di sazkirina yekem de hesabê rêvebir tune. Bi Postman an amûrek mîna wê daxwaza jêrîn bişînin û rêvebirê yekem biafirînin (an heke `setup.html` hebe ji wir bikin):
    *   **URL:** `POST http://localhost:3000/api/auth/setup`
    *   **Body (JSON):**
        ```json
        {
          "username": "admin",
          "password": "ŞîfreyekBihêz123!",
          "email": "admin@example.com"
        }
        ```

### 🆘 Bikarhênerê Root û Ewlehî (Rizgarkirina Sîstemê)

Di sîstemê de, bikarhênerek **root** a ku di kodê de hatî bicîh kirin heye ku di rewşa windakirina gihîştina databasê an jibîrkirina şîfreya rêvebir de were bikar anîn.

*   **Navê Bikarhêner:** `root`
*   **Şîfreya Pêşwext:** `root123`

#### ⚠️ Guhertina Şîfreya Root (GIRÎNG)

Di sîstemê de **Kontrola Yekparebûnê (Integrity Monitor)** heye (`monitor.cjs`). Ev mekanîzma kontrol dike ka mîhengên ewlehiyê yên di `server.cjs` de hatine guhertin an na. Ji bo guhertina şîfreya root, **divê hûn gavên jêrîn bi rêz bişopînin**, wekî din server dê binpêkirina ewlehiyê bibîne û xebatê rawestîne.

1.  Ji bo şîfreya xwe ya nû **BCrypt Hash** biafirînin (hûn dikarin hilberînerê bcrypt ê serhêl bikar bînin).
2.  **Pelê `server.cjs` vekin:**
    *   Rêza `const SYS_ROOT_HASH = '...'` bibînin û nirxa xweya nû ya hash li vir binivîsin.
3.  **Pelê `monitor.cjs` vekin:**
    *   Rêza `const hashSignature = "const SYS_ROOT_HASH = '...';";` bibînin.
    *   Naveroka vê rêzê nûve bikin da ku bi ya ku we di `server.cjs` de guhertiye re tam li hev bike. (Lihevhatina tam a tevî valahî û xal-bêhnok pêwîst e).

Heke hûn van her du pelan bi hevdemî nûve nekin, sîstem dest pê nake.

## 🛠️ Staka Teknolojiyê

*   **Backend:** Node.js, Express.js
*   **Databas:** SQLite3
*   **Frontend:** HTML5, JavaScript (ES6+), Tailwind CSS
*   **Ewlehî:** bcryptjs, jsonwebtoken, helmet, express-rate-limit

## 🤝 Beşdarbûn

Heke hûn bixwazin beşdarî projeyê bibin em ê pir kêfxweş bibin! Ji kerema xwe pelê `CONTRIBUTING.md` binihêrin.

1.  Vê depoyê Fork bikin.
2.  Şaxek (branch) taybetmendiyek nû biafirînin (`git checkout -b taybetmendiya-nu`).
3.  Guhertinên xwe commit bikin (`git commit -m 'Taybetmendiya nû lê zêde kir'`).
4.  Şaxa xwe Push bikin (`git push origin taybetmendiya-nu`).
5.  Daxwazek Pull (Pull Request) biafirînin.

## 📄 Lîsans

Ev proje bi [Lîsansa MIT](LICENSE) hatiye lîsanskirin. Her kes dikare belaş bikar bîne û biguherîne.

---

# 🚗 RentCar - Açık Kaynak Araç Kiralama Sistemi

RentCar, modern web teknolojileri kullanılarak geliştirilmiş, hızlı, güvenli ve özelleştirilebilir bir araç kiralama (Rent a Car) yönetim sistemidir. Node.js ve SQLite tabanlı yapısı sayesinde kurulumu çok kolaydır ve yüksek performans sunar.

[English](#-rentcar---open-source-car-rental-system) | [Kurdî](#-rentcar---sîstema-kirêkirina-otomobîlan-a-çavkaniya-vekirî)

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
