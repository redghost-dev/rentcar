import { SiteSettings } from './site-settings.js';

// OPTİMİZE EDİLMİŞ SLAYT SİSTEMİ
let currentSlideIndex = 0;
let allSlides = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg'];
let autoInterval = null;
let isTransitioning = false;

async function startSlider() {
    console.log('🎬 Slider Başlatılıyor...');
    
    // Ayarları yükle
    const settings = await SiteSettings.load();
    const whatsappNumber = settings.whatsappNumber;

    const container = document.getElementById('heroSlider');
    if (!container) return;

    // Mobil uyumluluk için parent elemente sınıf ekle
    const section = container.parentElement;
    if (section) {
        section.classList.add('mobile-slider-section');
    }

    // HTML Yapısını Oluştur
    container.innerHTML = `
        <style>
            .slide-item {
                transition: opacity 1.2s ease-in-out;
                will-change: opacity;
            }
            .slider-bg-blur {
                filter: blur(20px) brightness(0.7);
                transform: scale(1.1); /* Kenar beyazlıklarını önlemek için */
            }
            .slider-main-img {
                height: 100%;
                width: auto;
                max-width: 100%;
                object-fit: contain;
                
                /* Belirgin kenar yumuşatma (Fade Efekti) */
                -webkit-mask-image: linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%);
                mask-image: linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%);
                
                filter: drop-shadow(0 0 20px rgba(0,0,0,0.4));
            }

            /* Mobil Görünüm Özelleştirmeleri */
            @media (max-width: 768px) {
                .mobile-slider-section {
                    height: auto !important;
                    aspect-ratio: 3/2; /* Yükseklik 4/3 ile 16/9 arasında dengelendi */
                }
                /* Arka plan görseli mobilde de görünsün (display: none kaldırıldı) */
                .slider-main-img {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important; /* Görsel alana yayılarak sığdırıldı */
                    object-position: center !important;
                    mask-image: none !important; /* Mobilde maskeleme kaldırıldı */
                    -webkit-mask-image: none !important;
                    filter: none !important;
                }
            }
        </style>
        ${allSlides.map((image, index) => `
            <div id="slide-${index}" class="slide-item absolute inset-0 w-full h-full" 
                 style="opacity: ${index === 0 ? '1' : '0'}; z-index: ${index === 0 ? '10' : '1'};">
                
                <!-- Arka Plan (Bulanık) -->
                <div class="absolute inset-0 bg-cover bg-center slider-bg-blur" 
                     style="background-image: url('/img/slyt/${image}');"></div>
                
                <!-- Ön Plan (Net Görsel) -->
                <div class="absolute inset-0 flex items-center justify-center z-10">
                    <div class="relative h-full flex items-center justify-center">
                        <img src="/img/slyt/${image}" 
                             alt="Kiralık Araç Kampanyası ${index + 1} - Uygun Fiyatlı Rent a Car" 
                             class="slider-main-img">
                        
                        <!-- Whatsapp Rezervasyon Butonu -->
                        <div class="absolute left-4 bottom-8 md:left-8 md:bottom-12 z-30">
                            <a href="https://wa.me/${whatsappNumber}" target="_blank" 
                               class="flex items-center gap-1 md:gap-3 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 md:px-6 md:py-3 rounded-full shadow-lg transition-all hover:scale-105 group whitespace-nowrap">
                                <i class="ri-whatsapp-line text-base md:text-2xl"></i>
                                <span class="font-bold text-xs md:text-lg">Hemen Kirala</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
        
        <!-- Navigasyon Butonları -->
        <div class="absolute inset-0 z-20 flex justify-between items-center px-2 md:px-4 pointer-events-none">
            <button onclick="window.prevSlide()" class="pointer-events-auto bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all transform active:scale-95">
                <i class="ri-arrow-left-s-line text-2xl md:text-3xl"></i>
            </button>
            <button onclick="window.nextSlide()" class="pointer-events-auto bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all transform active:scale-95">
                <i class="ri-arrow-right-s-line text-2xl md:text-3xl"></i>
            </button>
        </div>
    `;

    startAutoPlay();
}

function updateSlideDisplay() {
    const slides = document.querySelectorAll('.slide-item');
    
    slides.forEach((slide, index) => {
        if (index === currentSlideIndex) {
            // Aktif Slayt
            slide.style.opacity = '1';
            slide.style.zIndex = '10';
        } else {
            // Pasif Slayt
            slide.style.opacity = '0';
            slide.style.zIndex = '1';
        }
    });

    // Geçiş süresi kadar bekle
    setTimeout(() => {
        isTransitioning = false;
    }, 1200);
}

function nextSlide() {
    if (isTransitioning) return;
    isTransitioning = true;
    
    currentSlideIndex = (currentSlideIndex + 1) % allSlides.length;
    updateSlideDisplay();
    
    resetAutoPlay();
}

function prevSlide() {
    if (isTransitioning) return;
    isTransitioning = true;
    
    currentSlideIndex = (currentSlideIndex - 1 + allSlides.length) % allSlides.length;
    updateSlideDisplay();
    
    resetAutoPlay();
}

function startAutoPlay() {
    if (autoInterval) clearInterval(autoInterval);
    autoInterval = setInterval(() => {
        if (!isTransitioning) {
            nextSlide();
        }
    }, 9000); // 9 saniye bekleme
}

function resetAutoPlay() {
    clearInterval(autoInterval);
    startAutoPlay();
}

// Touch/Swipe Desteği
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) nextSlide();
        else prevSlide();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        startSlider();
        
        const container = document.getElementById('heroSlider');
        if (container) {
            container.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, {passive: true});
            container.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, {passive: true});
        }
    }, 100);
});

// Global Exports
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.changeSlide = (dir) => dir === 1 ? nextSlide() : prevSlide();
