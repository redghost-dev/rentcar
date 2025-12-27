# RentCar Roadmap

Bu dosya ödeme ve müşteri profili entegrasyon yol haritasını ve ilerleme durumlarını içerir.

## Durum Özeti
- Mock Ödeme Sağlayıcı: Başlangıç (gerçek banka bağlantısı yok)
- Veritabanı: customers + payments tabloları, reservations.customerId bağlantısı
- Backend: customers upsert ve mock payment intent uçları eklendi
- Admin: rezervasyon listesi müşteri bilgisiyle zenginleştirildi

## Görevler
1. Audit current system — TAMAMLANDI
   - Backend [rentcar/server.cjs](rentcar/server.cjs), DB şema, auth ve frontend akışları incelendi.

2. Select payment provider — TAMAMLANDI
   - Şimdilik Mock; sonraki aşamada Stripe (test → prod). Kart verisi sunucuda tutulmaz.

3. Extend database schema — DEVAM EDİYOR
   - `customers`, `payments` tabloları; `reservations.customerId`.
   - Kart bilgisi olarak yalnızca `brand` ve `last4` saklanır.

4. Backend payment endpoints — DEVAM EDİYOR
   - `POST /api/customers/upsert`
   - `POST /api/payments/mock-intent` (rezervasyon + payment `pending_manual`)
   - Gelecek: `/api/payments/webhook` (Stripe/Iyzico), admin listeleme.

5. Email service integration — BAŞLAMADI
   - Nodemailer + SMTP (SendGrid). Ödeme sonrası aktivasyon linki gönderimi.

6. Customer profile creation — DEVAM EDİYOR
   - Ödeme başarı webhooks ile profil güncelleme, rezervasyon bağlama, aktivasyon tokenı.
   - Şimdilik profil verisi upsert ve görüntüleme için basit akış.

7. Frontend checkout UI — BAŞLAMADI
   - Basit form → `mock-intent`; Stripe Elements entegrasyonu sonraki aşama.

8. Security and compliance — BAŞLAMADI
   - CSP güncellemesi (Stripe/Iyzico), CORS sertleştirme, input doğrulama, rate-limit, GDPR PII.

9. Testing and sandbox flow — BAŞLAMADI
   - Stripe test modu, webhook simülasyonu, rezervasyon ve e-posta doğrulama.

10. Configuration and docs — BAŞLAMADI
    - `.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, SMTP ayarları, `APP_BASE_URL`.

11. Mock payments + support messaging — DEVAM EDİYOR
    - Kart ekleme, masked meta kaydı; capture yoksa destek ekibi bilgilendirmesi.
    - Kayıtlar admin rezervasyon listesinde görünür.

12. Profile endpoints — BAŞLAMADI
    - `/api/customers/me` (view/update) ve `/api/customers/reservations` (email-token/stub).

13. Frontend profile UI — BAŞLAMADI
    - `profile.html`: kişisel bilgi düzenleme ve rezervasyonları listeleme.

14. Admin panel integration — BAŞLAMADI
    - Rezervasyon listesinde ödeme durumu ve masked kart bilgisi; `/api/payments` admin listesi.

## Notlar
- PCI-DSS uyumu: Tam kart numarası/CVV/SKT asla saklanmaz; tokenizasyon sağlayıcı tarafında.
- Parola e-posta ile gönderilmez: Aktivasyon/şifre belirleme linki gönderilir.
- Webhook doğrulaması: Gerçek sağlayıcı entegrasyonunda imza doğrulaması zorunlu.
