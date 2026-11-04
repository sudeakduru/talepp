// ---------------------------------------------------------------------------
// AYARLAR
// Buradaki anahtarlar public; service_role, secret key gibi gizli anahtarları ASLA buraya koyma.
// Supabase anahtarları supabase.js'te.
// ---------------------------------------------------------------------------

// RevenueCat: Project settings → API keys → App Store "Public API key" (appl_ ile başlar).
// Boş kaldıkça satın alma kapalıdır; abonelik ekranı "App Store sürümünde aktif olacak" der.
export const REVENUECAT_IOS_KEY = '';

// App Store Connect'te uygulama kaydı açılınca belli olur, örn. https://apps.apple.com/app/id1234567890
// Boşken davet mesajında link yerine "App Store'da Talepp'i arat" yazar.
export const APP_STORE_URL = '';

// Apple abonelik kuralı: abonelik ekranında bu iki bağlantı bulunmalı.
// Kullanım koşulları için Apple'ın standart sözleşmesi kullanılabilir; gizlilik politikası senin olmalı.
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
// GitHub Pages'ten yayınlanır: repodaki docs/gizlilik.html (Settings → Pages → main / docs)
export const PRIVACY_URL = 'https://sudeakduru.github.io/talepp/gizlilik.html';
