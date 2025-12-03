// Global tema ayarları (server üzerinden yönetilen)

export const SiteSettings = {
  themes: {
    blue: { name: 'Mavi', primary: '#3b82f6', secondary: '#1e40af' },
    red: { name: 'Kırmızı', primary: '#ef4444', secondary: '#b91c1c' },
    green: { name: 'Yeşil', primary: '#10b981', secondary: '#047857' },
    orange: { name: 'Turuncu', primary: '#f97316', secondary: '#c2410c' },
    purple: { name: 'Mor', primary: '#a855f7', secondary: '#7e22ce' }
  },

  async load() {
    try {
      const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : `${window.location.protocol}//${window.location.hostname}/api`;

      const response = await fetch(`${apiBase}/settings`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Tema ayarları yüklenemedi');
      const data = await response.json();
      return {
        siteName: data.siteName ?? 'RentCar',
        phone: data.phone ?? '0555 123 45 67',
        email: data.email ?? 'info@rentcar.com',
        whatsappNumber: data.whatsappNumber ?? '905551234567',
        colorTheme: data.colorTheme ?? 'blue',
        discountRate: data.discountRate ?? 15,
        vatRate: data.vatRate ?? 20
      };
    } catch (e) {
      console.error('Tema ayarları yüklenirken hata:', e);
      return {
        siteName: 'RentCar',
        phone: '0555 123 45 67',
        email: 'info@rentcar.com',
        whatsappNumber: '905551234567',
        colorTheme: 'blue',
        discountRate: 15,
        vatRate: 20
      };
    }
  }
};

export async function applyThemeToDocument(doc = document) {
  const settings = await SiteSettings.load();
  const themeKey = settings.colorTheme || 'blue';
  const theme = SiteSettings.themes[themeKey] || SiteSettings.themes.blue;

  doc.documentElement.style.setProperty('--color-primary', theme.primary);
  doc.documentElement.style.setProperty('--color-primary-dark', theme.secondary);
}

export async function applyContactInfoToDocument(doc = document) {
    const settings = await SiteSettings.load();
    
    // Footer Telefon
    const footerPhones = doc.querySelectorAll('.footer-phone span');
    footerPhones.forEach(el => el.textContent = settings.phone);

    // Footer Email
    const footerEmails = doc.querySelectorAll('.footer-email span');
    footerEmails.forEach(el => el.textContent = settings.email);

    // Sticky Mobile Menu WhatsApp
    const mobileWhatsapp = doc.getElementById('mobileWhatsappBtn');
    if (mobileWhatsapp) {
        mobileWhatsapp.href = `https://wa.me/${settings.whatsappNumber}`;
    }

    // Sticky Mobile Menu Phone
    const mobilePhone = doc.getElementById('mobilePhoneBtn');
    if (mobilePhone) {
        mobilePhone.href = `tel:${settings.phone.replace(/\s/g, '')}`;
    }

    // Floating WhatsApp Button
    const floatingWhatsapp = doc.getElementById('whatsappFloatingBtn');
    if (floatingWhatsapp) {
        floatingWhatsapp.href = `https://wa.me/${settings.whatsappNumber}`;
    }

    // Reservation Form Phone Placeholder
    const phoneInputs = doc.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        if (input.placeholder.includes('0555')) {
            input.placeholder = settings.phone;
        }
    });
}
