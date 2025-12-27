// API Wrapper - SQLite sunucusu ile iletişim
console.log('📡 db.js yükleniyor...');
const DB = {
    get API_URL() {
        const port = window.location.port ? `:${window.location.port}` : '';
        return `${window.location.protocol}//${window.location.hostname}${port}/api`;
    },

    // Auth header'ı al (admin panelinden erişim için)
    getAuthHeaders() {
        const token = localStorage.getItem('adminToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    // Araçları sunucudan al
    async getVehicles() {
        try {
            console.log('🔄 Araçlar getiriliyor:', this.API_URL + '/vehicles');
            const response = await fetch(`${this.API_URL}/vehicles`);
            if (!response.ok) {
                console.error('❌ API Hatası:', response.status);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('✓ Araçlar geldi:', data);
            console.log('📦 Araç sayısı:', data.length);
            if (data.length > 0) {
                console.log('🚗 İlk araç:', data[0]);
            }
            return data;
        } catch (e) {
            console.error('❌ Araçları getirme hatası:', e);
            console.error('Stack:', e.stack);
            return [];
        }
    },

    // Yeni araç ekle
    async addVehicle(vehicle) {
        try {
            const response = await fetch(`${this.API_URL}/vehicles`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
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
            console.log('📡 DB.updateVehicle - ID:', id, 'Type:', typeof id);
            console.log('📡 API URL:', `${this.API_URL}/vehicles/${id}`);
            const response = await fetch(`${this.API_URL}/vehicles/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(vehicle)
            });
            console.log('📡 Response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Hatası:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Araç güncelleme hatası:', e);
            throw e;
        }
    },

    // Araç sil
    async deleteVehicle(id) {
        try {
            console.log('📡 DB.deleteVehicle - ID:', id, 'Type:', typeof id);
            console.log('📡 API URL:', `${this.API_URL}/vehicles/${id}`);
            const response = await fetch(`${this.API_URL}/vehicles/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            console.log('📡 Response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Hatası:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Araç silme hatası:', e);
            throw e;
        }
    }
};

// Polling: Her 2 saniyede bir verileri kontrol et (gerçek-zamanlı gibi)
setInterval(() => {
    window.dispatchEvent(new CustomEvent('dataRefresh'));
}, 2000);

// Global window object'ine ata (module scripts tarafından erişilebilmesi için)
console.log('✅ db.js tamam, window.DB set ediliyor:', DB);
window.DB = DB;
console.log('✅ window.DB set edildi:', window.DB);

// Module export
export default DB;
