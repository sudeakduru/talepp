// Onaylanan talepleri telefonun takvimine ekler.
// Eklenen talepler telefonda tutulur: kullanıcı etkinliği takvimden silerse tekrar eklenmez.
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'talepp:cal';
let added = null; // { talepId: etkinlikId }
const busy = new Set(); // aynı talep iki yerden aynı anda eklenmesin

const pad = n => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

async function loadAdded() {
  if (!added) {
    try {
      added = JSON.parse(await AsyncStorage.getItem(KEY)) || {};
    } catch (e) {
      added = {};
    }
  }
  return added;
}

function startOf(r) {
  const [y, m, d] = r.date.split('-').map(Number);
  if (!r.time) return new Date(y, m - 1, d);
  const [h, mi] = r.time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
}

async function calendarId() {
  if (Platform.OS === 'ios') {
    try {
      return (await Calendar.getDefaultCalendarAsync()).id;
    } catch (e) {
      // varsayılan takvim yok: yazılabilir ilk takvime düş
    }
  }
  const list = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const cal = list.find(c => c.allowsModifications && c.isPrimary) || list.find(c => c.allowsModifications);
  return cal ? cal.id : null;
}

// Günü olan ve geçmişte kalmamış talepler takvime girer
export const calendarable = r => !!(r && r.status === 'approved' && r.date && r.date >= todayKey());

// 'added' | 'skip' | 'denied' | 'error'
export async function addToCalendar(r, { line, cat } = {}) {
  if (!calendarable(r) || busy.has(r.id)) return 'skip';
  busy.add(r.id);
  try {
    const map = await loadAdded();
    if (map[r.id]) return 'skip';
    const perm = await Calendar.getCalendarPermissionsAsync();
    let ok = perm.granted;
    if (!ok && perm.canAskAgain) ok = (await Calendar.requestCalendarPermissionsAsync()).granted;
    if (!ok) return 'denied';
    const calId = await calendarId();
    if (!calId) return 'error';
    const start = startOf(r);
    const allDay = !r.time;
    const id = await Calendar.createEventAsync(calId, {
      title: `${cat ? `${cat.e} ` : ''}${r.title}`,
      startDate: start,
      endDate: allDay ? start : new Date(start.getTime() + 60 * 60 * 1000),
      allDay,
      location: r.place || undefined,
      notes: [r.desc, line && `💌 TalApp · ${line}`].filter(Boolean).join('\n\n'),
      alarms: allDay ? [] : [{ relativeOffset: -60 }],
    });
    map[r.id] = id;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
    return 'added';
  } catch (e) {
    return 'error';
  } finally {
    busy.delete(r.id);
  }
}

// Başka telefonda onaylanan taleplerim (gönderdiğim ya da bana gelen): eklenenleri döner
export async function syncCalendar(lines) {
  const out = [];
  for (const l of lines) {
    for (const r of l.requests) {
      if (r.from !== l.meId && r.to !== l.meId) continue;
      const res = await addToCalendar(r, { line: l.line.name, cat: l.line.cats.find(c => c.id === r.catId) });
      if (res === 'added') out.push(r);
      if (res === 'denied') return out; // izin yoksa diğerlerini denemeye gerek yok
    }
  }
  return out;
}
