<!-- Teklifler Sekmesi HTML -->
<!-- Bu HTML'i admin.html dosyasında vehicles-section'dan sonra settings-section'dan önce ekle -->

<!-- Quotations Section -->
<section id="quotations-section" class="section-content hidden animate-fade-in">
    <h2 class="text-3xl font-bold text-secondary mb-6">Teklif Talepleri</h2>

    <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <table class="w-full">
            <thead class="bg-gray-100 border-b">
                <tr>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-secondary">Ad Soyad</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-secondary">Email</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-secondary">Telefon</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-secondary">Araç</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-secondary">Durum</th>
                    <th class="px-6 py-4 text-left text-sm font-semibold text-secondary">Tarih</th>
                    <th class="px-6 py-4 text-center text-sm font-semibold text-secondary">İşlemler</th>
                </tr>
            </thead>
            <tbody id="quotations-table-body" class="divide-y">
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">Teklifler yükleniyor...</td>
                </tr>
            </tbody>
        </table>
    </div>
</section>

<script>
// Admin Panel - Teklifler Yönetimi
const QuotationAdmin = {
    get API_URL() {
        const isProduction = window.location.hostname === 'www.kiralikcar.com' || 
                            window.location.hostname === 'kiralikcar.com' ||
                            !window.location.hostname.includes('localhost');
        
        return isProduction 
            ? `${window.location.protocol}//${window.location.hostname}/api`
            : 'http://localhost:3000/api';
    },
    
    async loadQuotations() {
        try {
            const response = await fetch(`${this.API_URL}/quotations`);
            if (!response.ok) throw new Error('Teklifler yüklenemedi');
            
            const quotations = await response.json();
            this.displayQuotations(quotations);
        } catch (error) {
            console.error('Teklifler yükleme hatası:', error);
            const tbody = document.getElementById('quotations-table-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-500">Hata: ${error.message}</td></tr>`;
            }
        }
    },

    displayQuotations(quotations) {
        const tbody = document.getElementById('quotations-table-body');
        if (!tbody) return;

        if (quotations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">Henüz teklif yok</td></tr>';
            return;
        }

        tbody.innerHTML = quotations.map(q => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 text-sm text-gray-700">${q.name}</td>
                <td class="px-6 py-4 text-sm text-gray-700">
                    <a href="mailto:${q.email}" class="text-primary hover:underline">${q.email}</a>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700">
                    <a href="tel:${q.phone}" class="text-primary hover:underline">${q.phone}</a>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700">${q.vehicleName || 'N/A'}</td>
                <td class="px-6 py-4">
                    <select class="px-3 py-2 border rounded-lg text-sm font-medium ${this.getStatusColor(q.status)}" 
                            onchange="QuotationAdmin.updateStatus(${q.id}, this.value)">
                        <option value="yeni" ${q.status === 'yeni' ? 'selected' : ''}>Yeni</option>
                        <option value="iletisim" ${q.status === 'iletisim' ? 'selected' : ''}>İletişim Kuruldu</option>
                        <option value="bitirme_asamasinda" ${q.status === 'bitirme_asamasinda' ? 'selected' : ''}>Bitirme Aşamasında</option>
                        <option value="tamamlandi" ${q.status === 'tamamlandi' ? 'selected' : ''}>Tamamlandı</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${new Date(q.createdAt).toLocaleDateString('tr-TR')}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="QuotationAdmin.viewDetails(${q.id})" class="text-primary hover:text-blue-700 mr-3">
                        <i class="ri-eye-line text-lg"></i>
                    </button>
                    <button onclick="QuotationAdmin.deleteQuotation(${q.id})" class="text-red-600 hover:text-red-800">
                        <i class="ri-delete-bin-line text-lg"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    getStatusColor(status) {
        const colors = {
            'yeni': 'bg-yellow-100 text-yellow-800',
            'iletisim': 'bg-blue-100 text-blue-800',
            'bitirme_asamasinda': 'bg-purple-100 text-purple-800',
            'tamamlandi': 'bg-green-100 text-green-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    },

    async updateStatus(id, status) {
        try {
            const response = await fetch(`${this.API_URL}/quotations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error('Durum güncellenemedi');
            this.loadQuotations();
        } catch (error) {
            alert('Hata: ' + error.message);
        }
    },

    viewDetails(id) {
        alert('Detay görüntüleme özelliği yakında eklenecek. Teklif ID: ' + id);
    },

    async deleteQuotation(id) {
        if (!confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;
        
        try {
            const response = await fetch(`${this.API_URL}/quotations/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Teklif silinemedi');
            this.loadQuotations();
        } catch (error) {
            alert('Hata: ' + error.message);
        }
    }
};

// Admin panelden section gösterdikten hemen sonra teklifleri yükle
const originalShowSection = window.showSection;
window.showSection = function(section, event) {
    if (event) event.preventDefault();
    
    // Orijinal fonksiyonu çağır
    originalShowSection.call(window, section, event);
    
    // Teklifler sekmesi açıldığında verileri yükle
    if (section === 'quotations') {
        QuotationAdmin.loadQuotations();
    }
};

// Sayfa yüklendiğinde teklifler sekmesini başlat
document.addEventListener('DOMContentLoaded', () => {
    // Periyodik olarak teklifleri güncelle (5 saniye aralıklı)
    setInterval(() => {
        const quotationsSection = document.getElementById('quotations-section');
        if (quotationsSection && !quotationsSection.classList.contains('hidden')) {
            QuotationAdmin.loadQuotations();
        }
    }, 5000);
});
</script>
