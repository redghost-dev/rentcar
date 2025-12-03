// Site Ayarları Yönetimi
const SiteSettings = {
    // Varsayılan ayarlar
    defaults: {
        whatsappNumber: '905551234567',
        colorTheme: 'blue', // blue, red, green, purple
        siteName: 'RentCar',
        phone: '0555 123 45 67',
        email: 'info@rentcar.com'
    },

    // Renk temaları
    themes: {
        blue: {
            primary: '#2563EB',
            primaryDark: '#1E40AF',
            accent: '#F59E0B',
            accentLight: '#FEF3C7',
            name: 'Mavi Tema'
        },
        red: {
            primary: '#DC2626',
            primaryDark: '#B91C1C',
            accent: '#F59E0B',
            accentLight: '#FEF3C7',
            name: 'Kırmızı Tema'
        },
        green: {
            primary: '#059669',
            primaryDark: '#047857',
            accent: '#F59E0B',
            accentLight: '#FEF3C7',
            name: 'Yeşil Tema'
        },
        purple: {
            primary: '#7C3AED',
            primaryDark: '#6D28D9',
            accent: '#F59E0B',
            accentLight: '#FEF3C7',
            name: 'Mor Tema'
        },
        orange: {
            primary: '#EA580C',
            primaryDark: '#C2410C',
            accent: '#2563EB',
            accentLight: '#DBEAFE',
            name: 'Turuncu Tema'
        }
    },

    // Ayarları yükle (server'dan global tema)
    async load() {
        try {
            const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000/api'
                : `${window.location.protocol}//${window.location.hostname}/api`;

            const response = await fetch(`${apiBase}/settings`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Tema ayarları yüklenemedi');
            const data = await response.json();
            return { ...this.defaults, ...data };
        } catch (e) {
            console.error('Site ayarları yüklenirken hata:', e);
            return this.defaults;
        }
    },

    // Ayarları kaydet (server'a yaz)
    async save(settings) {
        try {
            const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000/api'
                : `${window.location.protocol}//${window.location.hostname}/api`;

            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${apiBase}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) throw new Error('Tema ayarları kaydedilemedi');
            const saved = await response.json();
            this.apply({ ...this.defaults, ...saved });
        } catch (e) {
            console.error('Site ayarları kaydedilirken hata:', e);
            alert('Ayarlar kaydedilemedi. Lütfen tekrar deneyin.');
        }
    },

    // Ayarları uygula
    apply(settings) {
        const theme = this.themes[settings.colorTheme] || this.themes.blue;

        // CSS değişkenlerini güncelle
        document.documentElement.style.setProperty('--color-primary', theme.primary);
        document.documentElement.style.setProperty('--color-primary-dark', theme.primaryDark);
        document.documentElement.style.setProperty('--color-accent', theme.accent);
        document.documentElement.style.setProperty('--color-accent-light', theme.accentLight);

        // WhatsApp linkleri güncelle (slider, floating button vb.)
        const whatsappLinks = document.querySelectorAll('a[href*="wa.me"]');
        whatsappLinks.forEach(link => {
            link.href = `https://wa.me/${settings.whatsappNumber}`;
        });

        // Sabit WhatsApp butonunu güncelle
        const floatingBtn = document.getElementById('whatsappFloatingBtn');
        if (floatingBtn) {
            floatingBtn.href = `https://wa.me/${settings.whatsappNumber}`;
        }

        // Telefon linkleri güncelle
        const phoneLinks = document.querySelectorAll('a[href*="tel:"]');
        phoneLinks.forEach(link => {
            link.href = `tel:${settings.phone.replace(/\s/g, '')}`;
            const phoneText = link.querySelector('span');
            if (phoneText) {
                phoneText.textContent = settings.phone;
            }
        });

        // Footer telefon ve email metinlerini güncelle
        const footerPhone = document.querySelector('.footer-phone span');
        if (footerPhone) {
            footerPhone.textContent = settings.phone;
        }

        const footerEmail = document.querySelector('.footer-email span');
        if (footerEmail) {
            footerEmail.textContent = settings.email;
        }

        // Ham metin olarak geçen varsayılan numarayı da değiştir (örneğin index.html satır 769)
        const rawTextNodes = document.querySelectorAll('body, body *');
        rawTextNodes.forEach(node => {
            if (node.childNodes && node.childNodes.length) {
                node.childNodes.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE && child.nodeValue && child.nodeValue.includes('905551234567')) {
                        child.nodeValue = child.nodeValue.replace(/905551234567/g, settings.whatsappNumber);
                    }
                });
            }
        });
    },

    // Sayfa yüklendiğinde ayarları uygula
    async init() {
        const settings = await this.load();
        this.apply(settings);
    }
};

// Sayfa yüklendiğinde ayarları uygula
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        SiteSettings.init();
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiteSettings;
}

if (typeof window !== 'undefined') {
    window.SiteSettings = SiteSettings;
}

// ES Module export
export default SiteSettings;
