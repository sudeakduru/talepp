# TalApp: App Store Connect metinleri

App Store Connect'te ilgili alanlara kopyala-yapıştır yap. Parantez içindeki sayılar karakter sınırları.

## Temel bilgiler

| Alan | Değer |
|---|---|
| Ad (30) | TalApp: Sana Özel Talep Hattı |
| Alt başlık (30) | Kişiye özel talep sistemi kur |
| Bundle ID | com.talepp.app |
| SKU | talapp-ios-1 |
| Birincil dil | Türkçe |
| Birincil kategori | Yaşam Tarzı (Lifestyle) |
| İkincil kategori | Sosyal Ağ (Social Networking) |
| Destek URL'si | https://sudeakduru.github.io/talepp/destek.html |
| Gizlilik Politikası URL'si | https://sudeakduru.github.io/talepp/gizlilik.html |
| Telif hakkı | 2026 [adın soyadın] |

## Anahtar kelimeler (100)

Virgülle ayrılır, virgülden sonra boşluk yok. Ad ve alt başlıktaki kelimeler tekrar edilmedi, çünkü onlar zaten aramada sayılıyor.

```
sevgili,çift,kanka,arkadaş,istek,dilek,onay,pazarlık,ilişki,partner,liste,plan,davet,randevu,itiraz
```

## Tanıtım metni (170)

```
Gece 2'de pizza mı istiyorsun? Talebini at, onay mı ret mi pazarlık mı, hemen öğren 🍕 Sevgilinle, kankanla ya da ev arkadaşlarınla kendi talep hattını kur.
```

## Açıklama (4000)

```
Bir isteğin mi var? Söyle değil, talep at ✦

TalApp ile sevgilinle, kankanla, ailenle ya da ev arkadaşlarınla size özel bir talep hattı kurarsın. "Bu akşam sinema", "pazar kahvaltısı", "gece 2'de pizza"… Her istek düzgün bir talep olur. Karşı taraf onaylar, reddeder ya da pazarlığa oturur.

HAT KUR, DAVET ET
• Hattına bir ad ve emoji seç, davet kodunu paylaş
• İstediğin kadar hat kur: biri sevgilinle, biri kankalarınla, biri evle
• Tüm hatların tek ekranda: "hatlarım"

TALEBİNİ DETAYLI AT
• Başlık ve açıklama yaz
• Takvimden gün seç (ileriki aylar dahil), saati yaz, konumu ekle
• İstersen fotoğraf ekle
• Hazır kategorilerden seç ya da kendi kategorini emojisiyle oluştur

ONAY, RET, PAZARLIK, İTİRAZ
• Gelen talebi onayla ya da reddet
• "Olur ama…" mı diyorsun? Karşı teklif ver, pazarlık başlasın 🤝
• Reddedilen talebe bir kez itiraz hakkın var ⚖️
• Her adımda anında bildirim gelir
• Onaylanan talep, gün ve saatiyle telefon takvimine otomatik eklenir 📅
• Tarihi yaklaşınca 1 gün ve 12 saat önce hatırlatma gelir 🔔

ÜCRETSİZ BAŞLA
• Haftada 2 talep ücretsiz, her pazartesi yenilenir
• TalApp+: haftada 10 talep
• TalApp Sınırsız: sınırsız talep, diva modu 👑

GÜVENLİ
• Talepler yalnızca hattaki kişilere görünür
• Uygunsuz içeriği şikayet edebilir, kişileri engelleyebilirsin
• Reklam yok, takip yok

ABONELİK BİLGİSİ
TalApp+ ve TalApp Sınırsız, haftalık ya da aylık otomatik yenilenen aboneliklerdir. Ödeme, satın alma onaylandığında Apple Kimliği hesabından alınır. Abonelik, mevcut dönem bitmeden en az 24 saat önce iptal edilmezse otomatik olarak yenilenir ve yenileme ücreti dönem bitmeden önceki 24 saat içinde tahsil edilir. Aboneliklerini satın aldıktan sonra App Store hesap ayarlarından yönetebilir ve iptal edebilirsin.

Kullanım Koşulları: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Gizlilik Politikası: https://sudeakduru.github.io/talepp/gizlilik.html
Destek: talapp.app.destek@gmail.com
```

## Abonelikler (In-App Purchases → Subscriptions)

Abonelik grubu: **TalApp Premium**. Sınırsız üst seviye (1), Plus alt seviye (2) olmalı. Böylece kullanıcı Plus'tan Sınırsız'a geçince Apple bunu yükseltme olarak sayar.

| Seviye | Ürün ID | Görünen ad | Süre | Fiyat | RevenueCat paketi | Entitlement |
|---|---|---|---|---|---|---|
| 1 | talapp_inf_month | TalApp Sınırsız | 1 ay | ₺179,99 | inf_month | inf |
| 1 | talapp_inf_week | TalApp Sınırsız | 1 hafta | ₺69,99 | inf_week | inf |
| 2 | talapp_plus_month | TalApp+ | 1 ay | ₺99,99 | p10_month | p10 |
| 2 | talapp_plus_week | TalApp+ | 1 hafta | ₺39,99 | p10_week | p10 |

Her ürünün açıklaması (45 karakter):
- TalApp+: `Haftada 10 talep gönder`
- Sınırsız: `Sınırsız talep gönder`

Not: ürün ID'leri bir kez açılınca değiştirilemez ve silinse bile tekrar kullanılamaz.

## Uygulama Gizliliği (App Privacy) cevapları

Veri topluyor musun? **Evet.** Toplanan verilerin hiçbiri izleme (tracking) için kullanılmaz. Hepsi kullanıcıya bağlıdır ve amaç her biri için **App Functionality**.

| Kategori | Veri türü | Neden |
|---|---|---|
| Contact Info | Name | kayıt adı ve hattaki ad |
| Contact Info | Email Address | giriş |
| User Content | Photos or Videos | profil fotoğrafı, talep görselleri |
| User Content | Other User Content | talepler, hat adları, kategoriler |
| Identifiers | User ID | hesap kimliği (Supabase / RevenueCat) |
| Purchases | Purchase History | abonelik durumu (RevenueCat) |
| Other Data | Other Data Types | yaş (13+ doğrulaması) |

Toplanmayanlar: konum (konum sadece kullanıcının yazdığı metin), kişiler, sağlık, finans bilgisi, tarama geçmişi, reklam verisi.

## Yaş derecelendirmesi

- Kullanıcı tarafından oluşturulan içerik (User-Generated Content): **Evet**. Şikayet, engelleme ve hesap silme var.
- Kullanıcılar arası mesajlaşma ya da iletişim: **Evet** (hattaki kişilerle sınırlı)
- Şiddet, cinsellik, kumar ve benzeri soruların hepsi: **Hayır**
- Sonuç büyük olasılıkla 13+ çıkacak. Uygulama zaten 13 yaş altını kabul etmiyor.

## İnceleyici notu (App Review Information → Notes)

İngilizce yazıldı, çünkü inceleme ekibi genelde İngilizce çalışır. Demo hesabın e-posta ve şifresi bu nota değil, "Sign-in required" alanlarına yazılır.

```
TalApp lets couples and friends send each other "requests" (e.g. "movie tonight") inside a private shared space called a "line" (hat). The other members can approve, reject or counter-offer (pazarlık); a rejected request can be appealed once (itiraz). The UI is in Turkish.

DEMO ACCOUNT
The demo account already belongs to a line ("Diva Talep Hattı") with a second demo member and some sample requests, so every feature can be tried without inviting anyone.

HOW TO TEST
1. Sign in with the demo account. A short guided tour explains each button. The first screen is "hatlarım" (my lines). Tap "Diva Talep Hattı".
2. Tap a request to open it. Approve (onayla), reject (reddet) or counter-offer (pazarlık).
3. Tap the main button to create a new request: title, date (calendar), time, place, optional photo.
4. "＋ davet et" shows the invite code. A second user joins with "davet kodum var · kodla katıl" on the hatlarım screen.

SUBSCRIPTIONS
Free users can send 2 requests per week (resets every Monday). TalApp+ (10/week) and TalApp Sınırsız (unlimited) are auto-renewable subscriptions offered weekly or monthly. They are reachable from the quota card on the hatlarım screen. "satın alımları geri yükle" = Restore Purchases.

SAFETY (UGC)
In request detail: "🚩 şikayet et" = Report, "🚫 engelle" = Block user. Reports are reviewed within 24 hours at talapp.app.destek@gmail.com.

ACCOUNT DELETION
hatlarım → 👤 (top right) → "hesabımı sil" (Delete my account).

Push notifications are sent when a request is created or its status changes.
CALENDAR: when a request that has a date is approved, the app asks for calendar access and adds it to the device calendar (used only to add that event; existing calendar events are never read or uploaded).
```

## Ekran görüntüleri

- Zorunlu boyut: 6.9" iPhone (1320 × 2868), ya da 6.5" (1284 × 2778). Güncel bir Pro Max ile çekilen ekran görüntüsü doğrudan bu boyutta olur. Elindeki telefon farklı boyuttaysa söyle, ölçeklendiririm.
- 4–6 adet, bu sırayla: hatlarım → hat içi (talep listesi) → yeni talep (takvim açık) → talep detayı (pazarlık) → davet ekranı → TalApp+ ekranı
- Gerçek kişisel bilgi olmasın; demo hesaptan çek.
