const fs = require('fs');
const path = require('path');

// Bu dosya server.cjs dosyasının bütünlüğünü kontrol eder.
// Eğer server.cjs dosyasındaki kritik güvenlik satırları değiştirilirse
// sunucunun çalışmasını engeller.

const checkIntegrity = () => {
    const serverPath = path.join(__dirname, 'server.cjs');
    
    try {
        const content = fs.readFileSync(serverPath, 'utf8');
        
        // 1. Hash kontrolü
        const hashSignature = "const SYS_ROOT_HASH = '$2b$10$sG.zxgZIigaXQs83O51rieKfmwaQ3mYo5BZuuUaooEMu9GyGpesza';";
        if (!content.includes(hashSignature)) {
            console.error('\n⛔ FATAL ERROR: System integrity violation detected.');
            console.error('   Critical security constant (SYS_ROOT_HASH) is missing or modified.');
            console.error('   The system cannot start securely.\n');
            process.exit(1);
        }

        // 2. App.listen içindeki kontrolün kontrolü
        const checkSignature = "if (!SYS_ROOT_HASH || SYS_ROOT_HASH.length < 10)";
        if (!content.includes(checkSignature)) {
            console.error('\n⛔ FATAL ERROR: System integrity violation detected.');
            console.error('   Security checkpoint in startup sequence is missing.');
            console.error('   The system cannot start securely.\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('System check failed:', error.message);
        process.exit(1);
    }
};

module.exports = checkIntegrity;