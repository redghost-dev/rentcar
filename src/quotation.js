// Teklif Formu Yönetimi
const QuotationManager = {
    // Dinamik API URL - production ve local için
    get API_URL() {
        const port = window.location.port ? `:${window.location.port}` : '';
        return `${window.location.protocol}//${window.location.hostname}${port}/api`;
    },
    SUBMIT_TIMEOUT: 30000, // 30 saniye
    
    async init() {
        const form = document.getElementById('quotationForm');
        if (!form) return;
        
        // Araç listesini yükle
        await this.loadVehicles();
        
        // Form submit
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    },

    async loadVehicles() {
        try {
            const response = await fetch(`${this.API_URL}/vehicles`);
            if (!response.ok) throw new Error('Araçlar yüklenemedi');
            
            const vehicles = await response.json();
            const select = document.getElementById('formVehicle');
            
            vehicles.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.id;
                option.textContent = `${vehicle.model} (${vehicle.price})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Araçları yükleme hatası:', error);
        }
    },

    // Spam koruması: gizli field doldurulmuşsa formun spam olduğunu say
    isSpam() {
        const spamField = document.getElementById('formSpam');
        return spamField && spamField.value.trim() !== '';
    },

    // Bot koruması: checkbox kontrol et
    isBotProtected() {
        const botCheckbox = document.getElementById('formBot');
        return botCheckbox && botCheckbox.checked;
    },

    // Email validasyonu
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // Telefon validasyonu (Türkiye formatı)
    isValidPhone(phone) {
        const regex = /^(\+90|0)?[1-9]\d{9}$/;
        return regex.test(phone.replace(/\s/g, ''));
    },

    showSuccess() {
        const successDiv = document.getElementById('formSuccess');
        const errorDiv = document.getElementById('formError');
        
        if (successDiv) {
            successDiv.classList.remove('hidden');
            errorDiv.classList.add('hidden');
        }
        
        // 5 saniye sonra gizle
        setTimeout(() => {
            if (successDiv) successDiv.classList.add('hidden');
        }, 5000);
    },

    showError(message) {
        const errorDiv = document.getElementById('formError');
        const successDiv = document.getElementById('formSuccess');
        
        if (errorDiv) {
            errorDiv.textContent = '❌ ' + message;
            errorDiv.classList.remove('hidden');
            successDiv.classList.add('hidden');
        }
    },

    resetForm() {
        const form = document.getElementById('quotationForm');
        if (form) {
            form.reset();
            document.getElementById('formBot').checked = false;
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        try {
            // Spam koruması
            if (this.isSpam()) {
                this.showError('Form spam olarak işaretlendi');
                return;
            }

            // Bot koruması
            if (!this.isBotProtected()) {
                this.showError('Lütfen bot olmadığınızı onaylayın');
                return;
            }

            // Validasyonlar
            const name = document.getElementById('formName').value.trim();
            const email = document.getElementById('formEmail').value.trim();
            const phone = document.getElementById('formPhone').value.trim();
            const vehicle = document.getElementById('formVehicle').value;
            const message = document.getElementById('formMessage').value.trim();

            if (!name || name.length < 3) {
                this.showError('Lütfen geçerli bir ad giriniz');
                return;
            }

            if (!this.isValidEmail(email)) {
                this.showError('Lütfen geçerli bir email adresi giriniz');
                return;
            }

            if (!this.isValidPhone(phone)) {
                this.showError('Lütfen geçerli bir telefon numarası giriniz');
                return;
            }

            if (!vehicle) {
                this.showError('Lütfen bir araç seçiniz');
                return;
            }

            if (!message || message.length < 10) {
                this.showError('Lütfen en az 10 karakter ile mesaj yazınız');
                return;
            }

            // Butonu devre dışı bırak
            submitBtn.disabled = true;
            submitBtn.textContent = 'Gönderiliyor...';

            // API'ye gönder
            const response = await fetch(`${this.API_URL}/quotations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    vehicleId: vehicle,
                    message,
                    status: 'yeni'
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Teklifin gönderimi başarısız oldu');
            }

            this.showSuccess();
            this.resetForm();

        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Teklif Gönder';
        }
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    QuotationManager.init();
});
