// ============================================
// API Wrapper - db.js'den inline olarak eklenmiş
// ============================================
const DB = {
    // Dinamik API URL - production ve local için
    get API_URL() {
        const port = window.location.port ? `:${window.location.port}` : '';
        return `${window.location.protocol}//${window.location.hostname}${port}/api`;
    },

    // Araçları sunucudan al
    async getVehicles() {
        try {
            const response = await fetch(`${this.API_URL}/vehicles`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (e) {
            console.error('Araçları getirme hatası:', e);
            return [];
        }
    },

    // Yeni araç ekle
    async addVehicle(vehicle) {
        try {
            const response = await fetch(`${this.API_URL}/vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicle)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error('Araç eklenme hatası:', e);
            throw e;
        }
    },

    // Araç güncelle
    async updateVehicle(id, vehicle) {
        try {
            const response = await fetch(`${this.API_URL}/vehicles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicle)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error('Araç güncelleme hatası:', e);
            throw e;
        }
    },

    // Araç sil
    async deleteVehicle(id) {
        try {
            const response = await fetch(`${this.API_URL}/vehicles/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error('Araç silme hatası:', e);
            throw e;
        }
    }
};

// Polling: Her 2 saniyede bir verileri kontrol et (gerçek-zamanlı gibi)
// setInterval(() => {
//    window.dispatchEvent(new CustomEvent('dataRefresh'));
// }, 2000);

// Global window object'ine ata
window.DB = DB;

// ============================================
// Landing Page Logic
// ============================================

let allVehicles = []; // Tüm araçları saklamak için global değişken

async function renderVehicles(filterCategory = 'all') {
    try {
        // Eğer araçlar henüz yüklenmediyse yükle
        if (allVehicles.length === 0) {
            allVehicles = await VehicleManager.load();
        }

        // Filtreleme
        let filteredVehicles = allVehicles;
        if (filterCategory !== 'all') {
            filteredVehicles = allVehicles.filter(v => v.category === filterCategory);
        }

        // Son eklenenden ilk eklenene doğru sırala (ID'ye göre ters sıralama)
        const sortedVehicles = filteredVehicles.sort((a, b) => {
            const idA = typeof a.id === 'string' ? parseInt(a.id) || 0 : a.id;
            const idB = typeof b.id === 'string' ? parseInt(b.id) || 0 : b.id;
            return idB - idA; // Büyükten küçüğe (son eklenen önce)
        });
        
        const vehicleList = document.getElementById('vehicle-list');

        // Global site ayarlarını async olarak yükle
        let settings = null;
        try {
            if (window.SiteSettings && typeof window.SiteSettings.load === 'function') {
                settings = await window.SiteSettings.load();
            }
        } catch (e) {
            console.warn('SiteSettings yüklenemedi, varsayılanlar kullanılacak', e);
        }

        // Ayarlardan indirim oranını oku (yoksa 15)
        let discountRateForBadge = 15;
        if (settings && typeof settings.discountRate === 'number') {
            discountRateForBadge = settings.discountRate;
        }

        if (vehicleList) {
            vehicleList.innerHTML = ''; // Clear existing static content

            if (sortedVehicles.length === 0) {
                vehicleList.innerHTML = '<div class="text-center py-8 col-span-full text-gray-500">Bu kategoride araç bulunamadı.</div>';
                return;
            }

            // Global ayarlardan telefon/whatsapp numarası al
            let whatsappNumber = '905551234567';
            if (settings && typeof settings.whatsappNumber === 'string' && settings.whatsappNumber.trim()) {
                whatsappNumber = settings.whatsappNumber.trim();
            }

            sortedVehicles.forEach(vehicle => {
                const vehicleCard = `
                    <div class="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative cursor-pointer" data-vehicle-id="${vehicle.id}" data-vehicle-model="${vehicle.model}" data-vehicle-price="${vehicle.price}">
                        <div class="absolute top-2 md:top-4 left-0 bg-primary text-white px-4 md:px-6 py-1 md:py-2 font-bold text-xs md:text-sm transform -rotate-45 -translate-x-6 md:-translate-x-8 translate-y-1 md:translate-y-2 z-10 shadow-lg quick-discount-badge">
                            <span class="quick-discount-text">%${discountRateForBadge} İNDİRİM</span>
                    </div>
                    <div class="relative h-48 md:h-56 bg-gray-100">
                        <img src="${vehicle.image}"
                             alt="Kiralık ${vehicle.model} - Uygun Fiyat"
                             class="w-full h-full object-contain md:object-cover p-2 md:p-0">
                    </div>
                    <div class="p-4 md:p-6">
                        <h3 class="text-lg md:text-2xl font-bold text-secondary mb-2 md:mb-3 truncate">${vehicle.model}</h3>
                        <div class="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                            <span class="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                                <i class="ri-user-line"></i> ${vehicle.passengers || 5} Kişi
                            </span>
                            <span class="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                                <i class="ri-gas-station-line"></i> ${vehicle.fuel || 'Benzin'}
                            </span>
                            <span class="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                                <i class="ri-settings-3-line"></i> ${vehicle.transmission || 'Otomatik'}
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
                            <div class="bg-red-50 rounded-lg p-3 md:p-4 text-center">
                                <div class="text-[10px] md:text-xs text-gray-600 mb-1">Günlük</div>
                                <div class="text-lg md:text-2xl font-bold text-primary">${vehicle.price}</div>
                            </div>
                            <div class="bg-gray-100 rounded-lg p-3 md:p-4 text-center">
                                <div class="text-[10px] md:text-xs text-gray-600 mb-1">Depozito</div>
                                <div class="text-lg md:text-2xl font-bold text-secondary">${vehicle.deposit}</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2 md:gap-3">
                            <a href="tel:+${whatsappNumber}" data-dynamic-phone
                               class="bg-blue-500 text-white py-2.5 md:py-3 rounded-lg font-semibold text-center hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-base">
                                <i class="ri-phone-line text-sm md:text-base"></i>
                                <span class="hidden sm:inline">Bizi Arayın</span>
                                <span class="sm:hidden">Ara</span>
                            </a>
                            <a href="https://wa.me/${whatsappNumber}" data-dynamic-whatsapp
                                         class="bg-whatsapp text-white py-2.5 md:py-3 rounded-lg font-semibold text-center hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[11px] md:text-sm">
                                <i class="ri-whatsapp-line text-sm md:text-base"></i>
                                <span>WhatsApp</span>
                            </a>
                            <button type="button"
                                    class="border border-primary text-primary bg-white py-2.5 md:py-3 rounded-lg font-semibold text-center hover:bg-primary hover:text-white active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[10px] md:text-xs quick-reserve-btn">
                                <i class="ri-flashlight-line text-xs md:text-sm"></i>
                                <span>Hızlı Rezervasyon</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            vehicleList.innerHTML += vehicleCard;
        });

                // Kartlardaki hızlı rezervasyon butonlarını modal ile bağla
                setupQuickReservationTriggers();
    }
    } catch (error) {
        console.error('❌ renderVehicles error:', error);
        const vehicleList = document.getElementById('vehicle-list');
        if (vehicleList) {
            vehicleList.innerHTML = `<div class="text-center py-8 col-span-full text-red-500">Hata: ${error.message}</div>`;
        }
    }
}

// Kategori filtreleme fonksiyonu
window.filterVehicles = function(category) {
    // Buton stillerini güncelle
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        // Önce tüm butonları pasif duruma getir
        btn.classList.remove('bg-primary', 'text-white', 'border-primary');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-300');
        
        // Pasif butonlar için hover efektlerini ekle
        btn.classList.add('hover:border-primary', 'hover:text-primary');
        
        // Tıklanan butonu aktif yap
        if (btn.getAttribute('onclick').includes(`'${category}'`)) {
            // Pasif sınıfları kaldır
            btn.classList.remove('bg-white', 'text-gray-600', 'border-gray-300');
            // Hover efektlerini kaldır (çakışmayı önlemek için)
            btn.classList.remove('hover:border-primary', 'hover:text-primary');
            
            // Aktif sınıfları ekle
            btn.classList.add('bg-primary', 'text-white', 'border-primary');
        }
    });

    renderVehicles(category);
};

document.addEventListener('DOMContentLoaded', async function() {
    await renderVehicles();
    
    // Scroll animasyonları - Her bölüme farklı animasyon
    const sections = document.querySelectorAll('section');
    const animations = ['animate-slide-left', 'animate-fade-in', 'animate-slide-up', 'animate-zoom-in', 'animate-bounce-in'];
    
    sections.forEach((section, index) => {
        // Araçlar bölümü (id='araclar') animasyonsuz başlasın
        if (section.id === 'araclar') {
            section.style.opacity = '1';
            section.style.transform = 'none';
            section.style.transition = 'none';
            section.removeAttribute('data-animation');
            return;
        }
        // İlk section hariç tümünü opacity 0 ile başlat
        if (index !== 0) {
            // Sadece testimonials (index 4) animasyonsuz kalacak
            if (index !== 4) {
                section.style.opacity = '0';
                section.style.transform = 'translateY(30px) translateX(0)';
                section.style.transition = 'none';
                // Eğer data-animation zaten set edilmişse değiştirme
                if (!section.getAttribute('data-animation')) {
                    section.setAttribute('data-animation', animations[index % animations.length]);
                }
            }
        }
    });

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const animClass = entry.target.getAttribute('data-animation') || 'animate-fade-in';
                const delay = entry.target.getAttribute('data-delay') || '0s';
                
                entry.target.style.transition = `opacity 1.2s ease-in-out ${delay}, transform 1.2s ease-in-out ${delay}`;
                entry.target.classList.add(animClass);
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) translateX(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Bölümleri gözle
    sections.forEach((section, index) => {
        // Araçlar bölümü animasyonsuz, gözlemlenmesin
        if (section.id === 'araclar') return;
        if (index !== 0) {
            observer.observe(section);
        }
    });

    // Ödeme hatası kontrolü
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_error') === 'true') {
        // Özel modal oluştur ve göster
        const modalHtml = `
            <div id="paymentErrorModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                    <div class="bg-primary p-6 text-center">
                        <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <i class="ri-customer-service-2-line text-3xl text-white"></i>
                        </div>
                        <h3 class="text-xl font-bold text-white">İşleminiz Alındı</h3>
                    </div>
                    <div class="p-6 text-center">
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            Ödeme işleminiz sırasında teknik bir aksaklık yaşandı ancak rezervasyon talebiniz tarafımıza ulaştı.
                            <br><br>
                            Müşteri hizmetleri yetkilimiz en kısa sürede sizinle iletişime geçerek işleminizi tamamlayacaktır.
                        </p>
                        <button onclick="document.getElementById('paymentErrorModal').remove(); window.history.replaceState({}, document.title, '/');" 
                                class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">
                            Anlaşıldı
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
});

window.addEventListener('storage', async function(e) {
    if (e.key === 'vehicles') {
        await renderVehicles();
    }
});

// Listen for dataChanged event (from other tabs/windows via localStorage)
window.addEventListener('dataChanged', async function(e) {
    if (e.detail.key === 'vehicles') {
        await renderVehicles();
    }
});

// Listen for data refresh from polling (every 2 seconds)
window.addEventListener('dataRefresh', async function() {
    await renderVehicles();
});

// ==============================
// Hızlı Rezervasyon Mantığı
// ==============================

function generateQuickCaptcha() {
    try {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const questionEl = document.getElementById('quickCaptchaQuestion');
        const answerInput = document.getElementById('quickCaptchaAnswer');
        if (questionEl) questionEl.textContent = `${a} + ${b} = ?`;
        if (answerInput) {
            answerInput.value = '';
            answerInput.dataset.correct = String(a + b);
        }
    } catch (e) {
        console.warn('CAPTCHA üretilemedi:', e);
    }
}

function getSiteSettingRates() {
    try {
        if (window.SiteSettings && typeof window.SiteSettings.load === 'function') {
            const s = window.SiteSettings.load();
            return {
                vatRate: s.vatRate ?? 20,
                discountRate: s.discountRate ?? 15
            };
        }
    } catch (e) {
        console.warn('SiteSettings okunamadı, varsayılan oranlar kullanılacak', e);
    }
    return { vatRate: 20, discountRate: 15 };
}

function setupQuickReservationTriggers() {
    const modal = document.getElementById('quickReservationModal');
    const titleEl = document.getElementById('quickVehicleTitle');
    const idInput = document.getElementById('quickVehicleId');
    const priceInput = document.getElementById('quickVehiclePrice');
    const discountLabel = document.getElementById('quickDiscountRateLabel');
    const vatLabel = document.getElementById('quickVatRateLabel');

    if (!modal || !titleEl || !idInput || !priceInput) return;

    const { vatRate, discountRate } = getSiteSettingRates();
    if (discountLabel) discountLabel.textContent = `%${discountRate}`;
    if (vatLabel) vatLabel.textContent = `%${vatRate}`;

    const openModal = (vehicle) => {
        titleEl.textContent = vehicle.model || 'Seçili Araç';
        idInput.value = vehicle.id || '';
        priceInput.value = vehicle.price || '';

        const today = new Date().toISOString().split('T')[0];
        const pickup = document.getElementById('quickPickupDate');
        const dropoff = document.getElementById('quickDropoffDate');
        if (pickup) pickup.min = today;
        if (dropoff) dropoff.min = today;
        if (pickup) pickup.value = '';
        if (dropoff) dropoff.value = '';

        resetQuickPriceBox();
        const msg = document.getElementById('quickReservationMessage');
        if (msg) {
            msg.classList.add('hidden');
            msg.textContent = '';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        generateQuickCaptcha();
    };

    document.querySelectorAll('.quick-reserve-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = e.currentTarget.closest('[data-vehicle-id]');
            if (!card) return;
            const vehicle = {
                id: card.getAttribute('data-vehicle-id'),
                model: card.getAttribute('data-vehicle-model'),
                price: card.getAttribute('data-vehicle-price')
            };
            openModal(vehicle);
        });
    });

    const closeButtons = [
        document.getElementById('quickReservationClose'),
        document.getElementById('quickReservationCancel')
    ];

    closeButtons.forEach(btn => {
        if (btn) {
            btn.onclick = () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            };
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    const pickup = document.getElementById('quickPickupDate');
    const dropoff = document.getElementById('quickDropoffDate');
    if (pickup) pickup.addEventListener('change', () => updateQuickPrice());
    if (dropoff) dropoff.addEventListener('change', () => updateQuickPrice());

    const form = document.getElementById('quickReservationForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitQuickReservation();
        });
    }
}

function resetQuickPriceBox() {
    const fields = ['quickDays', 'quickSubtotal', 'quickVat', 'quickDiscount', 'quickTotal'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '-';
    });
}

function formatCurrencyTRY(value) {
    if (isNaN(value)) return '-';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
}

function updateQuickPrice() {
    const priceInput = document.getElementById('quickVehiclePrice');
    const pickupInput = document.getElementById('quickPickupDate');
    const dropoffInput = document.getElementById('quickDropoffDate');
    if (!priceInput || !pickupInput || !dropoffInput) return;

    const dailyPrice = parseFloat(String(priceInput.value).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    const pickup = pickupInput.value;
    const dropoff = dropoffInput.value;

    if (!dailyPrice || !pickup || !dropoff) {
        resetQuickPriceBox();
        return;
    }

    const start = new Date(pickup + 'T00:00:00');
    const end = new Date(dropoff + 'T00:00:00');
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
        resetQuickPriceBox();
        return;
    }

    const { vatRate, discountRate } = getSiteSettingRates();

    const days = diffDays;
    const subtotal = days * dailyPrice;
    const vat = subtotal * vatRate / 100;
    const beforeDiscount = subtotal + vat;
    const discount = beforeDiscount * discountRate / 100;
    const total = beforeDiscount - discount;

    const daysEl = document.getElementById('quickDays');
    const subtotalEl = document.getElementById('quickSubtotal');
    const vatEl = document.getElementById('quickVat');
    const discountEl = document.getElementById('quickDiscount');
    const totalEl = document.getElementById('quickTotal');

    if (daysEl) daysEl.textContent = `${days} gün`;
    if (subtotalEl) subtotalEl.textContent = formatCurrencyTRY(subtotal);
    if (vatEl) vatEl.textContent = formatCurrencyTRY(vat);
    if (discountEl) discountEl.textContent = `- ${formatCurrencyTRY(discount)}`;
    if (totalEl) totalEl.textContent = formatCurrencyTRY(total);
}

async function submitQuickReservation() {
    if (submitQuickReservation._submitting) {
        return;
    }

    const msgEl = document.getElementById('quickReservationMessage');
    const submitBtn = document.getElementById('quickReservationSubmit');
    const form = document.getElementById('quickReservationForm');
    if (!msgEl || !submitBtn || !form) return;

    const showMsg = (text, type = 'info') => {
        msgEl.textContent = text;
        msgEl.classList.remove('hidden');
        msgEl.classList.remove('bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700', 'bg-blue-100', 'text-blue-700');
        if (type === 'error') {
            msgEl.classList.add('bg-red-100', 'text-red-700');
        } else if (type === 'success') {
            msgEl.classList.add('bg-green-100', 'text-green-700');
        } else {
            msgEl.classList.add('bg-blue-100', 'text-blue-700');
        }
    };

    const fullName = document.getElementById('quickFullName').value.trim();
    const phone = document.getElementById('quickPhone').value.trim();
    const pickupDate = document.getElementById('quickPickupDate').value;
    const dropoffDate = document.getElementById('quickDropoffDate').value;
    const vehicleId = document.getElementById('quickVehicleId').value;
    const priceRaw = document.getElementById('quickVehiclePrice').value;

    if (!fullName || fullName.length < 3) {
        showMsg('Lütfen geçerli bir ad soyad girin.', 'error');
        return;
    }

    const phoneRegex = /^(\+90|0)?(5\d{2})[\s]?(\d{3})[\s]?(\d{2})[\s]?(\d{2})$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        showMsg('Lütfen geçerli bir telefon numarası girin. (05XX XXX XX XX)', 'error');
        return;
    }

    if (!pickupDate || !dropoffDate) {
        showMsg('Lütfen alış ve iade tarihlerini seçin.', 'error');
        return;
    }

    const captchaInput = document.getElementById('quickCaptchaAnswer');
    if (captchaInput) {
        const correct = Number(captchaInput.dataset.correct || '0');
        const given = Number(captchaInput.value || '0');
        if (!captchaInput.value || given !== correct) {
            showMsg('Lütfen güvenlik sorusunu doğru cevaplayın.', 'error');
            return;
        }
    }

    const start = new Date(pickupDate + 'T00:00:00');
    const end = new Date(dropoffDate + 'T00:00:00');
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
        showMsg('İade tarihi, alış tarihinden sonra olmalıdır.', 'error');
        return;
    }

    const dailyPrice = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    if (!dailyPrice) {
        showMsg('Araç fiyatı okunamadı, lütfen daha sonra tekrar deneyin.', 'error');
        return;
    }

    const { vatRate, discountRate } = getSiteSettingRates();
    const subtotal = diffDays * dailyPrice;
    const vat = subtotal * vatRate / 100;
    const beforeDiscount = subtotal + vat;
    const discount = beforeDiscount * discountRate / 100;
    const total = beforeDiscount - discount;

    const payload = {
        fullName,
        phone,
        pickupDate,
        dropoffDate,
        vehicleId,
        days: diffDays,
        dailyPrice,
        subtotal,
        vatRate,
        vatAmount: vat,
        discountRate,
        discountAmount: discount,
        totalPrice: total,
        source: 'quick-card-modal'
    };

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i>Gönderiliyor...';
    submitQuickReservation._submitting = true;

    try {
        const port = window.location.port ? `:${window.location.port}` : '';
        const API_URL = `${window.location.protocol}//${window.location.hostname}${port}/api`;
        let apiUrl = `${API_URL}/quick-reservations`;
        if (window.location.hostname.includes('ngrok')) {
            apiUrl = `${window.location.protocol}//${window.location.hostname}/api/quick-reservations`;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 409) {
                const err = await response.json().catch(() => ({ error: '' }));
                throw new Error(err.error || 'Bu bilgilerle kısa süre önce zaten hızlı rezervasyon talebi oluşturmuşsunuz. Lütfen operatörlerimizin sizi aramasını bekleyin.');
            }
            const err = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
            throw new Error(err.error || 'Rezervasyon talebi gönderilemedi');
        }

        const result = await response.json();
        
        // Ödeme sayfasına yönlendir
        window.location.href = `/checkout.html?reservationId=${result.id}`;

    } catch (e) {
        console.error('Hızlı rezervasyon hatası:', e);
        showMsg(e.message || 'Bağlantı hatası, lütfen daha sonra tekrar deneyin.', 'error');
        submitQuickReservation._submitting = false;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}
