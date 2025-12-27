// Üst Kampanya Banner Slayt Sistemi
let topBannerIndex = 0;
let topBannerInterval = null;

const topBannerSlides = [
    {
        image: '/img/fiat_egea_sedan_1762918210574.webp',
        title: '🎉 İlk Kiralama %15 İndirimli',
        subtitle: 'Hemen Rezervasyon Yapın!'
    },
    {
        image: '/img/bmw_320i_1762917914732.webp',
        title: '🚗 Premium Araçlar Uygun Fiyatlarla',
        subtitle: 'BMW, Audi ve Daha Fazlası'
    },
    {
        image: '/img/alfa_romeo_tonale_1762915056457.webp',
        title: '⚡ 7/24 Ücretsiz Teslimat',
        subtitle: 'İstediğiniz Yere Getiriyoruz'
    }
];

function initTopBanner() {
    const container = document.getElementById('topBannerSlides');
    if (!container) return;

    // Tüm slaytları oluştur
    container.innerHTML = topBannerSlides.map((slide, index) => `
        <div id="topSlide-${index}" class="absolute inset-0 flex items-center justify-center transition-all duration-700" style="opacity: ${index === 0 ? '1' : '0'}; transform: translateX(${index === 0 ? '0' : '100%'});">
            <!-- Arka Plan Araç Görseli -->
            <div class="absolute inset-0 bg-cover bg-center opacity-20" style="background-image: url('${slide.image}'); filter: blur(1px);"></div>
            
            <!-- İçerik -->
            <div class="relative z-10 flex items-center gap-3 px-4">
                <i class="ri-megaphone-line text-xl md:text-2xl text-white drop-shadow-lg"></i>
                <div class="flex flex-col md:flex-row md:items-center md:gap-2 text-white">
                    <span class="font-bold text-xs md:text-sm drop-shadow-lg">${slide.title}</span>
                    <span class="text-[10px] md:text-xs drop-shadow-md">${slide.subtitle}</span>
                </div>
            </div>
        </div>
    `).join('');

    startTopBanner();
}

function updateTopBanner() {
    const slides = document.querySelectorAll('[id^="topSlide-"]');
    slides.forEach((slide, index) => {
        if (index === topBannerIndex) {
            slide.style.opacity = '1';
            slide.style.transform = 'translateX(0)';
            slide.style.zIndex = '10';
        } else if (index < topBannerIndex) {
            slide.style.opacity = '0';
            slide.style.transform = 'translateX(-100%)';
            slide.style.zIndex = '1';
        } else {
            slide.style.opacity = '0';
            slide.style.transform = 'translateX(100%)';
            slide.style.zIndex = '1';
        }
    });
}

function startTopBanner() {
    topBannerInterval = setInterval(() => {
        topBannerIndex = (topBannerIndex + 1) % topBannerSlides.length;
        updateTopBanner();
    }, 4000); // 4 saniyede bir değişir
}

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopBanner);
} else {
    initTopBanner();
}
