// Araç Rezervasyon Formu Yönetimi

// Scroll to reservation form - window'a ekle ki global erişilebilin
window.scrollToReservation = function() {
    const element = document.getElementById('reservationFormContainer');
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Scroll'dan sonra form'a focus ver
        setTimeout(() => {
            document.getElementById('pickupLocation')?.focus();
        }, 800);
    }
};

const ReservationManager = {
    // Dinamik API URL - production ve local için
    get API_URL() {
        const port = window.location.port ? `:${window.location.port}` : '';
        return `${window.location.protocol}//${window.location.hostname}${port}/api`;
    },
    SUBMIT_TIMEOUT: 30000,
    
    async init() {
        const form = document.getElementById('reservationForm');
        if (!form) return;
        
        // Lokasyonları yükle
        await this.loadLocations();
        
        // Araç listesini yükle
        await this.loadVehicles();
        
        // Form submit
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Bugünün tarihi minimum olarak ayarla
        this.setMinimumDates();
        this.generateCaptcha();
    },

    async loadLocations() {
        try {
            const API_URL = this.API_URL;
            let apiUrl = `${API_URL}/locations`;
            
            // ngrok kontrolü
            if (window.location.hostname.includes('ngrok')) {
                apiUrl = `${window.location.protocol}//${window.location.hostname}/api/locations`;
            }
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Lokasyonlar yüklenemedi');
            
            const locations = await response.json();
            
            // Bölgeleri grupla
            const grouped = {};
            locations.forEach(loc => {
                if (!grouped[loc.region]) {
                    grouped[loc.region] = [];
                }
                grouped[loc.region].push(loc);
            });

            // Alış ve İade yerlerini doldur
            const pickupSelect = document.getElementById('pickupLocation');
            const dropoffSelect = document.getElementById('dropoffLocation');

            if (pickupSelect && dropoffSelect) {
                // Mevcut optgroup'ları temizle (sadece first option bırak)
                while (pickupSelect.options.length > 1) {
                    pickupSelect.remove(1);
                }
                while (dropoffSelect.options.length > 1) {
                    dropoffSelect.remove(1);
                }

                // Yeni optgroup'ları ekle
                Object.keys(grouped).sort().forEach(region => {
                    // Alış Yeri için optgroup
                    const pickupGroup = document.createElement('optgroup');
                    pickupGroup.label = region;
                    grouped[region].forEach(loc => {
                        const option = document.createElement('option');
                        option.value = loc.name;
                        const icon = loc.type === 'airport' ? '✈️' : '🏢';
                        option.textContent = `${icon} ${loc.name}`;
                        pickupGroup.appendChild(option);
                    });
                    pickupSelect.appendChild(pickupGroup);

                    // İade Yeri için optgroup
                    const dropoffGroup = document.createElement('optgroup');
                    dropoffGroup.label = region;
                    grouped[region].forEach(loc => {
                        const option = document.createElement('option');
                        option.value = loc.name;
                        const icon = loc.type === 'airport' ? '✈️' : '🏢';
                        option.textContent = `${icon} ${loc.name}`;
                        dropoffGroup.appendChild(option);
                    });
                    dropoffSelect.appendChild(dropoffGroup);
                });
            }
        } catch (error) {
            console.error('Lokasyonları yükleme hatası:', error);
        }
    },

    async loadVehicles() {
        try {
            const API_URL = this.API_URL;
            let apiUrl = `${API_URL}/vehicles`;
            
            // ngrok kontrolü
            if (window.location.hostname.includes('ngrok')) {
                apiUrl = `${window.location.protocol}//${window.location.hostname}/api/vehicles`;
            }
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Araçlar yüklenemedi');
            
            const vehicles = await response.json();
            const select = document.getElementById('vehicleId');
            
            if (select) {
                vehicles.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.id;
                    option.textContent = `${vehicle.model} (${vehicle.price})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Araçları yükleme hatası:', error);
        }
    },

    setMinimumDates() {
        const today = new Date().toISOString().split('T')[0];
        const pickupDateInput = document.getElementById('pickupDate');
        const dropoffDateInput = document.getElementById('dropoffDate');
        
        if (pickupDateInput) {
            pickupDateInput.min = today;
            pickupDateInput.addEventListener('change', () => {
                if (dropoffDateInput) {
                    dropoffDateInput.min = pickupDateInput.value;
                }
            });
        }
        
        if (dropoffDateInput) {
            dropoffDateInput.min = today;
        }
    },

    // Validasyonlar
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    isValidPhone(phone) {
        // Türkçe telefon formatı: 05XX XXX XX XX
        const regex = /^(\+90|0)?(5\d{2})[\s]?(\d{3})[\s]?(\d{2})[\s]?(\d{2})$/;
        return regex.test(phone.replace(/\s/g, ''));
    },

    isValidDates(pickupDate, dropoffDate) {
        const pickup = new Date(pickupDate);
        const dropoff = new Date(dropoffDate);
        return dropoff > pickup;
    },

    validateForm(data) {
        const errors = [];

        if (!data.fullName || data.fullName.trim().length < 3) {
            errors.push('Ad Soyad en az 3 karakter olmalı');
        }

        if (!this.isValidEmail(data.email)) {
            errors.push('Geçerli bir e-mail adresi girin');
        }

        if (!this.isValidPhone(data.phone)) {
            errors.push('Geçerli bir telefon numarası girin (05XX XXX XX XX)');
        }

        if (!data.pickupLocation) {
            errors.push('Alış yerini seçin');
        }

        if (!data.dropoffLocation) {
            errors.push('İade yerini seçin');
        }

        if (!data.pickupDate) {
            errors.push('Alış tarihini seçin');
        }

        if (!data.pickupTime) {
            errors.push('Alış saatini seçin');
        }

        if (!data.dropoffDate) {
            errors.push('İade tarihini seçin');
        }

        if (!data.dropoffTime) {
            errors.push('İade saatini seçin');
        }

        if (!this.isValidDates(data.pickupDate, data.dropoffDate)) {
            errors.push('İade tarihi alış tarihinden sonra olmalı');
        }

        if (!this.isValidCaptcha(data.captchaAnswer, data.captchaCorrect)) {
            errors.push('Lütfen güvenlik sorusunu doğru cevaplayın');
        }

        return errors;
    },

    generateCaptcha() {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const questionEl = document.getElementById('reservationCaptchaQuestion');
        const answerInput = document.getElementById('reservationCaptchaAnswer');
        if (questionEl) questionEl.textContent = `${a} + ${b} = ?`;
        if (answerInput) {
            answerInput.value = '';
            answerInput.dataset.correct = String(a + b);
        }
    },

    isValidCaptcha(answer, correct) {
        if (correct == null) return true; // element yoksa engelleme
        const a = Number(answer || '0');
        const b = Number(correct || '0');
        return !!answer && a === b;
    },

    async handleSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Fiyat hesaplama
        let totalPrice = 0;
        const vehicleId = formData.get('vehicleId');
        const pickupDate = formData.get('pickupDate');
        const dropoffDate = formData.get('dropoffDate');

        if (vehicleId && pickupDate && dropoffDate) {
            try {
                const vehicleSelect = document.getElementById('vehicleId');
                const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
                // Option text: "Model (₺500)" -> Fiyatı parse et
                const priceMatch = selectedOption.textContent.match(/₺([\d.]+)/);
                if (priceMatch) {
                    const dailyPrice = parseFloat(priceMatch[1].replace(/\./g, ''));
                    const d1 = new Date(pickupDate);
                    const d2 = new Date(dropoffDate);
                    const diffTime = Math.abs(d2 - d1);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                    totalPrice = dailyPrice * diffDays;
                }
            } catch (err) {
                console.error('Fiyat hesaplama hatası:', err);
            }
        }

        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            pickupLocation: formData.get('pickupLocation'),
            dropoffLocation: formData.get('dropoffLocation'),
            pickupDate: formData.get('pickupDate'),
            pickupTime: formData.get('pickupTime'),
            dropoffDate: formData.get('dropoffDate'),
            dropoffTime: formData.get('dropoffTime'),
            vehicleId: vehicleId || null,
            specialRequests: formData.get('specialRequests') || '',
            totalPrice: totalPrice || formData.get('totalPrice') || '',
            captchaAnswer: formData.get('captchaAnswer') || '',
            captchaCorrect: document.getElementById('reservationCaptchaAnswer')?.dataset.correct || null
        };

        // Validasyon
        const errors = this.validateForm(data);
        if (errors.length > 0) {
            this.showMessage(errors.join('\n'), 'error');
            return;
        }

        // Submit butonunu devre dışı bırak
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i>Gönderiliyor...';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.SUBMIT_TIMEOUT);

            const API_URL = this.API_URL;
            // ngrok kontrolü
            if (window.location.hostname.includes('ngrok')) {
                var apiUrl = `${window.location.protocol}//${window.location.hostname}/api/reservations`;
            } else {
                var apiUrl = `${API_URL}/reservations`;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.json();
                
                // Ödeme sayfasına yönlendir
                window.location.href = `/checkout.html?reservationId=${result.id}`;
            } else {
                const error = await response.json();
                this.showMessage(`Hata: ${error.error || 'Bir hata oluştu'}`, 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showMessage('Zaman aşımı! Lütfen tekrar deneyin.', 'error');
            } else {
                console.error('Form gönderme hatası:', error);
                this.showMessage('Bağlantı hatası! Lütfen daha sonra tekrar deneyin.', 'error');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    },

    showSuccessMessage(data, reservationId) {
        const container = document.getElementById('reservationFormContainer');
        if (!container) return;

        const pickupDateTime = `${this.formatDate(data.pickupDate)} ${data.pickupTime}`;
        const dropoffDateTime = `${this.formatDate(data.dropoffDate)} ${data.dropoffTime}`;

    const form = document.getElementById('reservationForm');
    const message = document.createElement('div');
    message.className = 'mt-4 bg-gradient-to-r from-green-400 to-green-500 text-white p-4 md:p-6 rounded-lg shadow-lg animate-slide-in';
        message.innerHTML = `
            <div class="flex gap-4">
                <div class="flex-shrink-0 pt-0.5">
                    <i class="ri-check-double-line text-2xl"></i>
                </div>
                <div class="flex-grow">
                    <h3 class="font-bold text-lg mb-2">Rezervasyon Başarıyla Alındı!</h3>
                    <div class="text-sm space-y-1 mb-4">
                        <p><span class="font-semibold">Rezervasyon No:</span> #${reservationId}</p>
                        <p><span class="font-semibold">Alış:</span> ${data.pickupLocation} - ${pickupDateTime}</p>
                        <p><span class="font-semibold">İade:</span> ${data.dropoffLocation} - ${dropoffDateTime}</p>
                        <p class="text-green-100">Onay e-postası gönderildi: <span class="font-semibold">${data.email}</span></p>
                    </div>
                    <p class="text-xs opacity-90">Kısa süre içinde size ulaşacağız. İlgileniz için teşekkür ederiz!</p>
                </div>
            </div>
        `;

        (form || container).appendChild(message);
        
        // 8 saniye sonra kaldır
        setTimeout(() => {
            message.style.animation = 'slide-out 0.3s ease-out forwards';
            setTimeout(() => message.remove(), 300);
        }, 8000);
    },

    showMessage(message, type = 'info') {
        const container = document.getElementById('reservationFormContainer');
        const form = document.getElementById('reservationForm');
        if (!container) return;

        const bgColor = type === 'error' ? 'from-red-400 to-red-500' : 'from-blue-400 to-blue-500';
        const icon = type === 'error' ? 'ri-error-warning-line' : 'ri-information-line';

        const messageEl = document.createElement('div');
        messageEl.className = `mt-4 bg-gradient-to-r ${bgColor} text-white p-3 md:p-4 rounded-lg shadow-lg animate-slide-in`;
        messageEl.innerHTML = `
            <div class="flex gap-3">
                <i class="${icon} text-xl flex-shrink-0 pt-0.5"></i>
                <div class="flex-grow">
                    <p class="text-sm whitespace-pre-line">${message}</p>
                </div>
            </div>
        `;

        (form || container).appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.animation = 'slide-out 0.3s ease-out forwards';
            setTimeout(() => messageEl.remove(), 300);
        }, 5000);
    },

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString + 'T00:00:00').toLocaleDateString('tr-TR', options);
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    ReservationManager.init();
});
