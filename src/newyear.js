import { SiteSettings } from './site-settings.js';

console.log('New Year script loaded');

async function initNewYearEffect() {
    console.log('Initializing New Year effects...');
    
    // Ayarları yükle
    const settings = await SiteSettings.load();
    
    // Eğer efekt kapalıysa çık
    if (!settings.newYearEffect) {
        console.log('New Year effect is disabled in settings.');
        return;
    }

    // Eğer zaten eklendiyse tekrar ekleme
    if (document.querySelector('.snow-container')) return;

    // Stil tanımları
    const style = document.createElement('style');
    style.textContent = `
        .snow-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 99999; /* Çok yüksek z-index */
            overflow: hidden;
        }
        .snowflake {
            position: absolute;
            top: -10px;
            background: #87CEEB;
            box-shadow: 0 0 4px rgba(0,0,0,0.1);
            border-radius: 50%;
            opacity: 0.8;
            animation: fall linear infinite;
        }
        @keyframes fall {
            0% { transform: translateY(-10px) translateX(0); }
            25% { transform: translateY(25vh) translateX(15px); }
            50% { transform: translateY(50vh) translateX(-15px); }
            75% { transform: translateY(75vh) translateX(15px); }
            100% { transform: translateY(100vh) translateX(0); }
        }
        
        .new-year-banner {
            background: linear-gradient(-45deg, #c0392b, #8e44ad, #c0392b, #d35400);
            background-size: 400% 400%;
            animation: gradientBG 10s ease infinite;
            color: white;
            text-align: center;
            padding: 20px;
            font-weight: 800;
            font-size: 18px;
            position: relative;
            z-index: 40;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border-bottom: 3px solid #FFD700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .new-year-banner span.icon {
            font-size: 24px;
            animation: bounce 2s infinite;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
    `;
    document.head.appendChild(style);

    // Kar efekti konteyneri
    const container = document.createElement('div');
    container.className = 'snow-container';
    document.body.appendChild(container);

    // Kar taneleri oluştur
    const count = 50;
    for (let i = 0; i < count; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        const size = Math.random() * 4 + 3 + 'px';
        flake.style.width = size;
        flake.style.height = size;
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = Math.random() * 5 + 3 + 's';
        flake.style.animationDelay = Math.random() * 5 + 's';
        flake.style.opacity = Math.random() * 0.6 + 0.4;
        container.appendChild(flake);
    }

    // Yeni yıl banner'ı
    const banner = document.createElement('div');
    banner.className = 'new-year-banner';
    
    // Ayarlardan gelen metni kullan, yoksa varsayılanı kullan
    const bannerText = settings.newYearBannerText || "🎄 Yeni Yılınız Kutlu Olsun! 2026'ya Özel İndirimleri Kaçırmayın! 🎅";
    
    // Eğer metin içinde HTML tagleri yoksa span içine al (ikonlar için basit kontrol)
    if (!bannerText.includes('<span')) {
         banner.innerHTML = `
            <span class="icon">🎄</span>
            <span>${bannerText}</span>
            <span class="icon">🎅</span>
        `;
    } else {
        banner.innerHTML = bannerText;
    }
    
    // Slaytın altına ekle (Hero section'dan sonra)
    const heroSlider = document.getElementById('heroSlider');
    if (heroSlider) {
        const heroSection = heroSlider.closest('section');
        if (heroSection && heroSection.parentNode) {
            heroSection.parentNode.insertBefore(banner, heroSection.nextSibling);
        } else {
            document.body.prepend(banner);
        }
    } else {
        document.body.prepend(banner);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewYearEffect);
} else {
    initNewYearEffect();
}
