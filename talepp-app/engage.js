// İki günde bir akşam "bir talep aç" bildirimi: telefonun kendisi atar, sunucu gerekmez.
// Her açılışta ileriye birkaç tane kurulur; azalınca tamamlanır. Çıkışta clearReminders hepsini siler.
import * as Notifications from 'expo-notifications';

const KIND = 'engage';
const DAY = 24 * 60 * 60 * 1000;
const EVERY = 2 * DAY;
const HOUR = 19; // akşam 19:00
const AHEAD = 5; // ileriye kurulan bildirim sayısı (yaklaşık 10 gün)

const IDEAS = [
  ['☕ Kahve molası?', 'Bu akşam arkadaşınla kahve içmeye ne dersin? Hemen bir talep aç ✦'],
  ['🍿 Film gecesi', 'Bu akşam film gecesi yapalım mı? Talebini fırlat, bakalım onaylanacak mı 👀'],
  ['🍣 Canın sushi mi çekti?', 'Söylemeden olmaz. Bir talep aç, gerisini ona bırak 😌'],
  ['💅 Kendini şımart', 'Hak ettiğin o şeyi iste. Diva modu açık 👑'],
  ['🌊 Sahilde yürüyüş?', 'Hava güzelse bir yürüyüş talebi at, kafa dağılsın ✦'],
  ['🎮 Oyun gecesi', 'Kankalarını topla, oyun gecesi talebi aç 🕹️'],
  ['🍕 Pizza akşamı', 'Bu akşam yemek derdi olmasın. Pizza talebi tam zamanı 🍕'],
  ['💌 Bugün kimi mutlu edeceksin?', 'Küçük bir plan, büyük bir gülümseme. Bir talep yeter ✦'],
  ['📸 Hafta sonu planı', 'Hafta sonu için şimdiden plan yap, talebini aç 🗓️'],
  ['🧁 Tatlı krizi', 'Bir tatlı talebi kimseyi incitmez 🍰'],
  ['🛍️ Alışveriş turu?', 'O çantaya bakmaya gidelim mi? Talep aç, ikna et 😌'],
  ['🍝 Akşam yemeği', 'Bu akşam dışarıda yemeğe ne dersin? Mekanı sen seç, talebi sen aç ✦'],
];

// Gün sırasına göre döner: aynı fikir art arda gelmez
const ideaFor = at => IDEAS[Math.floor(at / EVERY) % IDEAS.length];

function nextSlot(after) {
  const d = new Date(after + EVERY);
  d.setHours(HOUR, 0, 0, 0);
  return d.getTime();
}

export async function scheduleEngage() {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    const mine = (await Notifications.getAllScheduledNotificationsAsync())
      .filter(n => n.content.data && n.content.data.kind === KIND);
    if (mine.length >= 3) return;
    let last = Math.max(Date.now(), ...mine.map(n => n.content.data.at || 0));
    for (let i = mine.length; i < AHEAD; i++) {
      last = nextSlot(last);
      const [title, body] = ideaFor(last);
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { kind: KIND, at: last } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(last) },
      });
    }
  } catch (e) {
    // kurulamadıysa bildirimsiz devam
  }
}
