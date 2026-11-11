// Onaylanan talep yaklaşınca hatırlatma: 1 gün ve 12 saat önce, telefonun kendisi bildirim atar.
// Kurulan hatırlatmalar telefonda tutulur; talep silinirse ya da hattan çıkılırsa iptal edilir.
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'talepp:remind';
const HOUR = 60 * 60 * 1000;
const NO_TIME_HOUR = 9; // saati yazılmamış talep sabah 9'da sayılır: hatırlatmalar önceki gün 09:00 ve 21:00
let planned = null; // { talepId: [bildirimId] }
const busy = new Set();

async function load() {
  if (!planned) {
    try {
      planned = JSON.parse(await AsyncStorage.getItem(KEY)) || {};
    } catch (e) {
      planned = {};
    }
  }
  return planned;
}
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(planned)).catch(() => {});

function startOf(r) {
  const [y, m, d] = r.date.split('-').map(Number);
  const [h, mi] = r.time ? r.time.split(':').map(Number) : [NO_TIME_HOUR, 0];
  return new Date(y, m - 1, d, h, mi);
}

// lineId: bildirime dokununca açılacak hat
export async function scheduleReminders(r, { lineId, line, cat } = {}) {
  if (!r || r.status !== 'approved' || !r.date || busy.has(r.id)) return;
  busy.add(r.id);
  try {
    const map = await load();
    if (map[r.id]) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    const start = startOf(r).getTime();
    const what = `${cat ? `${cat.e} ` : ''}${r.title}`;
    const where = [r.time && `🕗 ${r.time}`, r.place && `📍 ${r.place}`, line && `💌 ${line}`].filter(Boolean).join('  ·  ');
    const ids = [];
    for (const [before, title] of [[24 * HOUR, `📅 Yarın: ${what}`], [12 * HOUR, `⏰ 12 saat kaldı: ${what}`]]) {
      const at = start - before;
      if (at <= Date.now()) continue;
      ids.push(await Notifications.scheduleNotificationAsync({
        content: { title, body: where || 'Onaylı talebin yaklaşıyor ✦', data: { line: lineId, request: r.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
      }));
    }
    map[r.id] = ids; // hepsi geçmişte kaldıysa da boş liste: bir daha denenmez
    await save();
  } catch (e) {
    // izin yoksa ya da kurulamadıysa hatırlatmasız devam
  } finally {
    busy.delete(r.id);
  }
}

// Her yenilemede: onaylananlara kur, artık görünmeyen taleplerin hatırlatmasını iptal et
export async function syncReminders(lines) {
  const map = await load();
  const seen = new Set();
  for (const l of lines) {
    for (const r of l.requests) {
      seen.add(r.id);
      if (r.from !== l.meId && r.to !== l.meId) continue;
      await scheduleReminders(r, { lineId: l.id, line: l.line.name, cat: l.line.cats.find(c => c.id === r.catId) });
    }
  }
  const gone = Object.keys(map).filter(id => !seen.has(id));
  for (const id of gone) {
    await Promise.all(map[id].map(n => Notifications.cancelScheduledNotificationAsync(n).catch(() => {})));
    delete map[id];
  }
  if (gone.length) await save();
}

// Geliştirmede deneme: 10 saniye sonra örnek hatırlatma
export async function testReminder() {
  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) ({ granted } = await Notifications.requestPermissionsAsync());
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: '📅 Yarın: 🍣 Sushi date', body: '🕗 20:30  ·  📍 Moda sahil  ·  💌 Diva Talep Hattı' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
  });
  return true;
}

// Çıkışta: bu telefonda başka hesap açılırsa eski hesabın hatırlatmaları gelmesin
export async function clearReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  planned = {};
  await save();
}
