// Araç Yönetimi - API üzerinden SQLite sunucusu ile
const VehicleManager = {
    // Araçları API'den al
    async load() {
        try {
            const vehicles = await window.DB.getVehicles();
            return vehicles;
        } catch (e) {
            console.error('Vehicles load error:', e);
            return [];
        }
    },

    // Yeni araç ekle
    async add(vehicle) {
        try {
            // Benzersiz ID oluştur
            if (!vehicle.id) {
                vehicle.id = Date.now().toString();
            }
            await window.DB.addVehicle(vehicle);
            // Sayfayı güncelle (polling ile çalışıyor ama istersen manuel da yapabilirsin)
        } catch (e) {
            console.error('Add vehicle error:', e);
            throw e;
        }
    },

    // Aracı güncelle
    async update(updatedVehicle) {
        try {
            console.log('🔄 VehicleManager.update çağrıldı - ID:', updatedVehicle.id, 'Type:', typeof updatedVehicle.id);
            console.log('📝 Güncellenecek veri:', updatedVehicle);
            await window.DB.updateVehicle(updatedVehicle.id, updatedVehicle);
        } catch (e) {
            console.error('Update vehicle error:', e);
            throw e;
        }
    },

    // Aracı sil
    async delete(vehicleId) {
        try {
            console.log('🗑️ VehicleManager.delete çağrıldı - ID:', vehicleId, 'Type:', typeof vehicleId);
            await window.DB.deleteVehicle(vehicleId);
        } catch (e) {
            console.error('Delete vehicle error:', e);
            throw e;
        }
    },

    // ID'ye göre araç bul
    async findById(vehicleId) {
        try {
            const vehicles = await this.load();
            return vehicles.find(v => v.id == vehicleId);
        } catch (e) {
            console.error('Find vehicle error:', e);
            return null;
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VehicleManager;
}

if (typeof window !== 'undefined') {
    window.VehicleManager = VehicleManager;
}

// ES Module export
export default VehicleManager;
