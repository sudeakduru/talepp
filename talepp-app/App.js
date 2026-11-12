import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Animated, Easing,
  Image, Modal, Share, Alert, KeyboardAvoidingView, Platform, Dimensions, Linking, Keyboard, AppState, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Unbounded_500Medium, Unbounded_700Bold, Unbounded_900Black } from '@expo-google-fonts/unbounded';
import { supabase } from './supabase';
import * as api from './api';
import { registerPush, clearPush, onPushOpen } from './push';
import { purchasesEnabled, initPurchases, onPlanChange, getPackages, buy, restore, logOutPurchases } from './purchases';
import { addToCalendar, syncCalendar } from './calendar';
import { scheduleReminders, syncReminders, clearReminders, testReminder } from './reminders';
import { scheduleEngage } from './engage';
import { APP_STORE_URL, TERMS_URL, PRIVACY_URL, SUPPORT_EMAIL } from './config';

// ─────────────────────────────────────────────────────────────
// Sabitler
// ─────────────────────────────────────────────────────────────
// Sunucudaki verinin telefondaki kopyası: açılışta internet beklemeden ekran dolsun
const STORE_KEY = 'talepp:v3';

const F = { med: 'Unbounded_500Medium', bold: 'Unbounded_700Bold', black: 'Unbounded_900Black' };

const C = {
  ink: '#2B0F45',
  inkSoft: '#6E5487',
  white: '#FFFFFF',
  hot: '#FF2EA6',
  violet: '#B14DFF',
  butter: '#FFF3A3',
  mint: '#9DFFD5',
};

const HOLO = ['#FF2EA6', '#B14DFF', '#3D8BFF'];
const HOT = ['#FF2EA6', '#B14DFF', '#5B8CFF'];
const CHROME = ['#FFFFFF', '#FFD6F2', '#D9C9FF', '#BDEFFF'];

const THEMES = {
  bubblegum: { name: 'Bubblegum', colors: ['#FFB5E8', '#E7C6FF', '#B5DEFF'] },
  cyber: { name: 'Siber Lila', colors: ['#C9A7FF', '#9FE8FF', '#C4FFEA'] },
  peach: { name: 'Şeftali', colors: ['#FFD1B5', '#FFB5D8', '#FFF0A8'] },
  aqua: { name: 'Buz Prenses', colors: ['#B5FFF1', '#B5D8FF', '#E2C6FF'] },
  // erkeksi tonlar: yazılar koyu kaldığı için renkler açık tutuldu
  ocean: { name: 'Okyanus', colors: ['#9FD0FF', '#7FB2F0', '#A8E6E0'] },
  forest: { name: 'Orman', colors: ['#B9E4C0', '#8CCBA8', '#D6EDB8'] },
  steel: { name: 'Çelik', colors: ['#CBD5E1', '#A7B6CA', '#E2E8F0'] },
  night: { name: 'Gece', colors: ['#A9B4E6', '#8E9DD6', '#B7C9F2'] },
};

const EMOJIS = ['💖', '🦋', '🍒', '👑', '🌙', '🧸', '🔥', '🫧', '🍓', '💅', '🐱', '🌸'];
// Kendi eklenen talep başlıkları için
const CAT_EMOJIS = [
  '✨', '🧋', '🍣', '🍔', '🌮', '🍰', '🍷', '🎮', '🎤', '🎨', '📚', '🏋️', '🧘', '🛁', '💄', '👗',
  '👟', '💸', '🚗', '🏖️', '🐶', '🌹', '💤', '📱', '🎂', '🧺',
];

const PRESET_CATS = [
  { e: '💅', t: 'Bakım' }, { e: '🍕', t: 'Yemek' }, { e: '🎁', t: 'Hediye' },
  { e: '✈️', t: 'Gezi' }, { e: '🎬', t: 'Film Gecesi' }, { e: '💐', t: 'Sürpriz' },
  { e: '🛍️', t: 'Alışveriş' }, { e: '🫶', t: 'İlgi & Sevgi' }, { e: '☕', t: 'Kahve' },
  { e: '🧹', t: 'Ev İşi' },
];

const URGENCY = [
  { k: 'chill', t: 'Chill 🧊' },
  { k: 'onemli', t: 'Önemli ✨' },
  { k: 'acil', t: 'ACİL 🚨' },
];

const REJECT_REASONS = [
  'Bugün değil bebeğim 💅', 'Bütçe onaylanmadı 💸', 'Önce bulaşıklar 🧽',
  'Bunu dün de istedin 👀', 'Sistem şu an kapalı 🔌', 'Sevgimle reddediyorum 💔',
];

// Haklar haftalık, tüm hatlarda ortak ve her pazartesi yenilenir.
// Ücretli planlar haftalık ya da (indirimli) aylık faturalanır; App Store'dan fiyat gelirse o gösterilir.
const PLANS = [
  { k: 'free', t: 'Ücretsiz', short: 'ÜCRETSİZ', desc: 'Haftada 2 talep', limit: 2 },
  { k: 'p10', t: 'TalApp+', short: 'PLUS', desc: 'Haftada 10 talep', price: { week: '₺39,99', month: '₺99,99' }, limit: 10, badge: 'En popüler 🔥' },
  { k: 'inf', t: 'TalApp Sınırsız', short: 'SINIRSIZ', desc: 'Sınırsız talep', price: { week: '₺69,99', month: '₺179,99' }, limit: Infinity, badge: 'Diva modu 👑' },
];
const PAID = PLANS.filter(p => p.k !== 'free');
const PERIODS = [{ k: 'week', t: 'Haftalık', per: '/ hafta' }, { k: 'month', t: 'Aylık · indirimli', per: '/ ay' }];

const STATUS = {
  pending: { t: 'BEKLEMEDE', e: '⏳', bg: '#FFF3A3' },
  approved: { t: 'ONAYLANDI', e: '💖', bg: '#9DFFD5' },
  rejected: { t: 'REDDEDİLDİ', e: '💔', bg: '#FFB3C7' },
  nego: { t: 'PAZARLIKTA', e: '🤝', bg: '#C9E6FF' },
  appeal: { t: 'İTİRAZDA', e: '⚖️', bg: '#E2C6FF' },
};
const OPEN = ['pending', 'nego', 'appeal'];
// Sıra kimde? Bekleyen ve itirazdaki talebe alıcı, pazarlıktakine (karşı teklif geri döndüğü için) talebi atan cevap verir.
// Bu yüzden pazarlıktaki talep, talebi atanın "gelen"ine ve karşı teklifi verenin "giden"ine düşer.
const isIncoming = (r, me) => (r.status === 'nego' ? r.from : r.to) === me;
const isOutgoing = (r, me) => (r.status === 'nego' ? r.to : r.from) === me;
const myTurn = (r, me) => OPEN.includes(r.status) && isIncoming(r, me);

// Grup talebi: kaç kişi onayladı, reddetti, pazarlıkta, bekliyor
function tallyOf(rows) {
  const n = f => rows.filter(f).length;
  return {
    total: rows.length,
    yes: n(x => x.status === 'approved'),
    no: n(x => x.status === 'rejected'),
    nego: n(x => x.status === 'nego'),
    wait: n(x => x.status === 'pending' || x.status === 'appeal'),
  };
}
const tallyText = t => [
  t.yes && `💖 ${t.yes} onayladı`, t.no && `💔 ${t.no} reddetti`, t.nego && `🤝 ${t.nego} pazarlıkta`, t.wait && `⏳ ${t.wait} bekliyor`,
].filter(Boolean).join(' · ');
const tallySticker = t => ({
  t: `👥 ${t.yes}/${t.total} ONAYLADI`,
  bg: t.wait + t.nego ? STATUS.pending.bg : t.yes ? STATUS.approved.bg : STATUS.rejected.bg,
});

// Cevap vermeyene (beklemede, itirazda) tekrar bildirim: aynı kişiye 3 saatte bir (sunucu da böyle sınırlar)
const NUDGE_GAP = 3 * 60 * 60 * 1000;
const nudgeable = r => r.status === 'pending' || r.status === 'appeal';
const canNudge = r => nudgeable(r) && (!r.nudgedAt || Date.now() - r.nudgedAt >= NUDGE_GAP);

const HIST = {
  created: '🚀 talebi fırlattı',
  approved: '💖 onayladı',
  rejected: '💔 reddetti',
  nego: '🤝 karşı teklif verdi',
  accepted: '✅ teklifi kabul etti',
  appeal: '⚖️ itiraz etti',
};

const AV_COLORS = [
  ['#FF5FC8', '#B14DFF'], ['#5B8CFF', '#8FE3FF'], ['#FF8A5B', '#FFD25B'],
  ['#2BD9A0', '#8FE3FF'], ['#B14DFF', '#FF5FC8'],
];

const CONFETTI = ['💖', '✦', '🎉', '💅', '🦋', '⭐', '🫧', '👑'];

// ─────────────────────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────────────────────
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayKey = () => dayKey(new Date());

const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const WEEK_HEAD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTH_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function dayLabel(k) {
  const [y, m, d] = k.split('-').map(Number);
  const t = new Date();
  if (k === dayKey(t)) return 'Bugün';
  t.setDate(t.getDate() + 1);
  if (k === dayKey(t)) return 'Yarın';
  const year = y !== new Date().getFullYear() ? ` ${y}` : '';
  return `${d} ${MONTH_SHORT[m - 1]}${year} ${DAY_SHORT[new Date(y, m - 1, d).getDay()]}`;
}

// Saat kutusu: rakamları "20:30" biçimine sokar; 9 ile başlarsa "09" yapar
function fmtTime(s) {
  let d = s.replace(/\D/g, '').slice(0, 4);
  if (d && d[0] > '2') d = `0${d}`.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const whenText = r => [r.date && `📅 ${dayLabel(r.date)}`, r.time && `🕗 ${r.time}`, r.place && `📍 ${r.place}`].filter(Boolean).join('  ·  ');
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'şimdi';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const TR_MAP = { ç: 'C', Ç: 'C', ğ: 'G', Ğ: 'G', ı: 'I', İ: 'I', i: 'I', ö: 'O', Ö: 'O', ş: 'S', Ş: 'S', ü: 'U', Ü: 'U' };
// Davet kodu: hattın adından 4 harf + tahmin edilmesi zor 5 karakter (0/O, 1/I gibi karışanlar yok)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(name) {
  const base = name.split('').map(ch => TR_MAP[ch] || ch.toUpperCase()).join('').replace(/[^A-Z]/g, '').slice(0, 4);
  const tail = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  return `${(base || 'TLPP').padEnd(4, 'X')}-${tail}`;
}

const inviteMessage = line => [
  `${line.emoji} "${line.name}" talep hattıma katıl! 💌`,
  `1) TalApp'i indir: ${APP_STORE_URL || 'App Store\'da "TalApp" diye arat'}`,
  '2) Kaydol, "Kodla katıl"a bas',
  `3) Kodu yaz: ${line.code}`,
].join('\n');

const oops = () => Alert.alert('Olmadı 😵', 'İnternetini kontrol edip tekrar dener misin?');
// toUpperCase Türkçe i/ı'yı bilmiyor
const trUpper = s => s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
const initial = name => trUpper((name || '?').trim()[0] || '?');

const planOf = k => PLANS.find(p => p.k === k) || PLANS[0];
// Bu haftanın pazartesi 00:00'ı: haftalık haklar buradan sayılır
function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
// birden fazla kişiye giden grup talebi tek hak sayılır
const sentThisWeek = (requests, id) => {
  const w = weekStart();
  return new Set(requests.filter(r => r.from === id && r.createdAt >= w).map(r => r.group || r.id)).size;
};
// "ben" bütün hatlarda aynı kişi: haftalık sayım tüm hatlardan toplanır
const myUsedWeek = store => store.lines.reduce((n, l) => n + sentThisWeek(l.requests, l.meId), 0);
const meName = l => ((l && l.members.find(m => m.id === l.meId)) || { name: '' }).name;
const userNameOf = user => (user && user.user_metadata && user.user_metadata.name) || '';

const quotaOf = (plan, used) => ({ limit: planOf(plan).limit, used });
function quotaHintOf(plan, left, tester) {
  if (tester) return '🧪 Test hesabı · sınırsız talep';
  if (plan === 'free') {
    return left > 0 ? '🎁 Haftada 2 ücretsiz talep · her pazartesi yenilenir' : 'Bu haftanın ücretsiz hakları bitti 💅 Pazartesi yenilenir ya da TalApp+';
  }
  const p = planOf(plan);
  return p.limit === Infinity ? 'Diva modu açık 👑 · tüm hatlarda' : `${p.desc} · tüm hatlarda ortak · her pazartesi yenilenir`;
}

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

// ─────────────────────────────────────────────────────────────
// Görsel yapı taşları
// ─────────────────────────────────────────────────────────────
const SPARKS = [
  { x: '7%', y: '9%', s: 18, d: 0 }, { x: '84%', y: '6%', s: 26, d: 600 },
  { x: '72%', y: '36%', s: 14, d: 1200 }, { x: '10%', y: '52%', s: 22, d: 300 },
  { x: '88%', y: '68%', s: 16, d: 900 }, { x: '38%', y: '90%', s: 20, d: 1500 },
];

function Sparkle({ x, y, s, d }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.delay(d),
      Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, []);
  return (
    <Animated.Text
      style={{
        position: 'absolute', left: x, top: y, fontSize: s, color: '#fff', opacity: a, pointerEvents: 'none',
        textShadowColor: 'rgba(255,255,255,0.95)', textShadowRadius: 10,
        transform: [
          { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) },
          { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
        ],
      }}
    >✦</Animated.Text>
  );
}

// Yavaşça renk değiştiren holografik arka plan
function HoloBg({ colors, children }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors[0] }}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: t }]}>
        <LinearGradient colors={[...colors].reverse()} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.sheen} />
      {SPARKS.map((p, i) => <Sparkle key={i} {...p} />)}
      {/* iPad'de içerik ortalanır; telefonda tam genişlik */}
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

// Gradyan dolgulu, beyaz gölgeli "sticker" yazı
function HoloText({ children, style }) {
  return (
    <View>
      <Text style={[style, styles.holoShadow]}>{children}</Text>
      <MaskedView maskElement={<Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>}>
        <LinearGradient colors={HOLO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={[style, { opacity: 0 }]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}

function ChromeButton({ title, onPress, hot, big, small, disabled, style }) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      style={style}
      onPress={() => { if (disabled) return; tap(); onPress && onPress(); }}
      onPressIn={() => Animated.spring(sc, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start()}
    >
      <Animated.View style={[hot ? styles.btnShadowHot : styles.btnShadow, { transform: [{ scale: sc }], opacity: disabled ? 0.45 : 1 }]}>
        <LinearGradient
          colors={hot ? HOT : CHROME}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.btn, big && styles.btnBig, small && styles.btnSmall]}
        >
          <View style={styles.btnShine} />
          <Text style={[styles.btnText, big && styles.btnTextBig, small && styles.btnTextSmall, { color: hot ? '#fff' : C.ink }]}>
            {title}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const Glass = ({ style, children }) => <View style={[styles.glass, style]}>{children}</View>;

function Sticker({ text, bg = '#fff', rotate = '-4deg', small, style }) {
  return (
    <View style={[styles.sticker, small && styles.stickerSmall, { backgroundColor: bg, transform: [{ rotate }] }, style]}>
      <Text style={[styles.stickerTxt, small && { fontSize: 8 }]}>{text}</Text>
    </View>
  );
}

function Chip({ label, on, onPress, style }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={[styles.chip, on && styles.chipOn, style]}>
      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{label}</Text>
    </Pressable>
  );
}

// uri: profil fotoğrafı; yoksa adın baş harfi
function Avatar({ name, index, size = 40, active, uri }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: active ? 3 : 2, borderColor: active ? C.ink : '#fff' }}
      />
    );
  }
  return (
    <LinearGradient
      colors={AV_COLORS[index % AV_COLORS.length]}
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        borderWidth: active ? 3 : 2, borderColor: active ? C.ink : '#fff',
      }}
    >
      <Text style={{ fontFamily: F.black, color: '#fff', fontSize: size * 0.38 }}>{initial(name)}</Text>
    </LinearGradient>
  );
}

const Label = ({ children, style }) => <Text style={[styles.label, style]}>{children}</Text>;

// Yeni başlık eklerken emoji seçimi
function EmojiPick({ value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.emojiRow}>
      {CAT_EMOJIS.map(e => (
        <Pressable key={e} onPress={() => { tap(); onChange(e); }} style={[styles.emojiMini, value === e && styles.emojiBoxOn]}>
          <Text style={{ fontSize: 20 }}>{e}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Confetti({ burst }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!burst) return;
    const { width: W, height: H } = Dimensions.get('window');
    const ps = Array.from({ length: 30 }, (_, i) => ({
      id: `${burst}-${i}`,
      x: Math.random() * (W - 30),
      e: CONFETTI[i % CONFETTI.length],
      v: new Animated.Value(0),
      dur: 1400 + Math.random() * 1300,
      rot: `${Math.round(Math.random() * 720 - 360)}deg`,
      size: 16 + Math.random() * 18,
      H,
    }));
    setPieces(ps);
    Animated.parallel(ps.map(p => Animated.timing(p.v, {
      toValue: 1, duration: p.dur, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }))).start(() => setPieces([]));
  }, [burst]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map(p => (
        <Animated.Text
          key={p.id}
          style={{
            position: 'absolute', left: p.x, top: 0, fontSize: p.size, color: C.hot,
            opacity: p.v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [-60, p.H + 40] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.rot] }) },
            ],
          }}
        >{p.e}</Animated.Text>
      ))}
    </View>
  );
}

function Sheet({ visible, onClose, colors, children }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <HoloBg colors={colors}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheetTop}>
            <View style={styles.grabber} />
            <Pressable onPress={onClose} hitSlop={14} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </HoloBg>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Kayıt / giriş (Supabase: e-posta + şifre; kayıtta ad ve yaş)
// ─────────────────────────────────────────────────────────────
const AUTH_ERRORS = {
  'Invalid login credentials': 'E-posta ya da şifre hatalı 🙈',
  'User already registered': 'Bu e-posta zaten kayıtlı ✦ "Giriş yap"a geç',
  'Email not confirmed': 'E-postanı henüz onaylamadın 📩 Gelen kutuna bak',
};

// Apple ile giriş (yalnızca iOS'ta görünür). Apple adı yalnızca ilk girişte verir; profil ekranında hazır doldurulur.
const APPLE_NAME_KEY = 'talepp:appleName';

// type: continue (karşılama) | signin (giriş) | signup (kayıt). Formlarda en üstte durur, altına "ya da e-postayla" yazar
// (Apple girişi olmayan telefonda o yazı da görünmez).
const APPLE_TYPES = {
  continue: AppleAuthentication.AppleAuthenticationButtonType.CONTINUE,
  signin: AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN,
  signup: AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP,
};

function AppleButton({ type = 'continue', or }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { AppleAuthentication.isAvailableAsync().then(setOk).catch(() => {}); }, []);
  if (!ok) return null;
  const go = async () => {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      const given = cred.fullName && cred.fullName.givenName;
      if (given) await AsyncStorage.setItem(APPLE_NAME_KEY, given).catch(() => {});
      // oturum açılınca App'teki onAuthStateChange ekranı kendisi değiştirir
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
      if (error) throw error;
    } catch (e) {
      if (e && e.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple ile giriş olmadı 😵', 'Biraz sonra tekrar dener misin? Olmazsa e-postayla da kaydolabilirsin.');
    }
  };
  return (
    <>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={APPLE_TYPES[type]}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={26} style={[styles.appleBtn, or && { marginTop: 0 }]} onPress={go}
      />
      {or ? <Text style={styles.orTxt}>Ya da e-postayla</Text> : null}
    </>
  );
}

function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('welcome'); // welcome | signup | login
  const login = mode === 'login';
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setMsg('');
    const a = parseInt(age, 10);
    if (!login && !name.trim()) return setMsg('Adını yazar mısın? 🫶');
    if (!login && !(a >= 13 && a <= 120)) return setMsg('TalApp 13 yaş ve üstü için 💅 Yaşını kontrol eder misin?');
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setMsg('Geçerli bir e-posta yaz ✉️');
    if (password.length < 6) return setMsg('Şifre en az 6 karakter olmalı 🔐');
    if (!login && password !== password2) return setMsg('Şifreler aynı değil 🙈 İkisine de aynı şifreyi yaz.');
    Keyboard.dismiss();
    setBusy(true);
    const res = login
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      // app: 'talepp' → veritabanı profili talepp_profiles'a açar (proje Yumi ile ortak)
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { app: 'talepp', name: name.trim(), age: a } } });
    setBusy(false);
    if (res.error) return setMsg(AUTH_ERRORS[res.error.message] || 'Bir şeyler ters gitti 😵 İnternetini kontrol edip tekrar dener misin?');
    // oturum açıldıysa App'teki onAuthStateChange ekranı kendisi değiştirir
    if (!res.data.session) {
      setMode('login');
      setMsg('📩 E-postana onay bağlantısı gönderdik. Onaylayınca buradan giriş yap.');
    }
  };

  const go = m => { tap(); setMsg(''); setPassword2(''); setMode(m); };

  if (mode === 'welcome') {
    return (
      <Welcome
        colors={THEMES.bubblegum.colors} title="Kaydol ✦" onPress={() => setMode('signup')}
        footer={(
          <>
            <AppleButton />
            <Pressable onPress={() => go('login')} hitSlop={10}>
              <Text style={styles.restore}>Zaten hesabın var mı? Giriş yap</Text>
            </Pressable>
            <Text style={styles.gift}>💌 Davet kodun mu var? Kaydol, sonra "Kodla katıl"a bas</Text>
          </>
        )}
      />
    );
  }

  return (
    <HoloBg colors={THEMES.bubblegum.colors}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: 22, paddingBottom: insets.bottom + 30, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => go('welcome')} hitSlop={12} style={{ alignSelf: 'flex-start', marginBottom: 14 }}>
            <Text style={styles.back}>← Geri</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Sticker text={login ? '✦ Tekrar hoş geldin ✦' : '✦ Yeni nesil talep hattı ✦'} rotate="-3deg" />
            <HoloText style={styles.logo}>TalApp</HoloText>
            <Text style={styles.tagline}>{login ? 'Hesabına giriş yap 💅' : 'Önce seni tanıyalım 🫶'}</Text>
          </View>

          <View style={{ marginTop: 22 }}>
              <AppleButton type={login ? 'signin' : 'signup'} or />
              {!login ? (
                <>
                  <Label>Adın</Label>
                  <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={20} textContentType="givenName" />
                  <Label style={{ marginTop: 16 }}>Yaşın</Label>
                  <TextInput
                    value={age} onChangeText={t => setAge(t.replace(/\D/g, ''))}
                    style={styles.input} maxLength={3} keyboardType="number-pad"
                  />
                </>
              ) : null}
              <Label style={{ marginTop: login ? 0 : 16 }}>E-posta</Label>
              <TextInput
                value={email} onChangeText={setEmail}
                style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
              />
              <Label style={{ marginTop: 16 }}>{login ? 'Şifre' : 'Şifre (en az 6 karakter)'}</Label>
              <TextInput
                value={password} onChangeText={setPassword}
                style={styles.input} secureTextEntry textContentType={login ? 'password' : 'newPassword'}
              />
              {!login ? (
                <>
                  <Label style={{ marginTop: 16 }}>Şifre tekrar</Label>
                  <TextInput
                    value={password2} onChangeText={setPassword2}
                    style={[styles.input, password2 && password2 !== password && styles.inputBad]}
                    secureTextEntry textContentType="newPassword"
                  />
                </>
              ) : null}

              {msg ? <Glass style={{ marginTop: 16 }}><Text style={styles.info}>{msg}</Text></Glass> : null}

              <ChromeButton
                hot big disabled={busy} style={{ marginTop: 24 }}
                title={busy ? 'Bekle bi sn... ✦' : login ? 'Giriş yap ✦' : 'Kaydol ✦'}
                onPress={submit}
              />
              <Pressable onPress={() => go(login ? 'signup' : 'login')} hitSlop={10}>
                <Text style={styles.restore}>{login ? 'Hesabın yok mu? Kaydol' : 'Zaten hesabın var mı? Giriş yap'}</Text>
              </Pressable>
              {!login ? (
                <Text style={styles.fine}>
                  Kaydolarak{' '}
                  <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>kullanım koşullarını</Text>
                  {PRIVACY_URL ? (
                    <>
                      {' '}ve{' '}
                      <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>gizlilik politikasını</Text>
                    </>
                  ) : null}
                  {' '}kabul edersin. Uygunsuz içerik ve taciz yasaktır; bildirilen içerikler 24 saat içinde incelenir.
                </Text>
              ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </HoloBg>
  );
}

// Apple ile ilk girişte (ya da Yumi hesabıyla ilk girişte) ad ve yaş bir kez sorulur
function ProfileSetup({ initialName, onDone, onSignOut }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName || '');
  const [age, setAge] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    AsyncStorage.getItem(APPLE_NAME_KEY).then(n => { if (n) setName(x => x || n); }).catch(() => {});
  }, []);

  const submit = async () => {
    const a = parseInt(age, 10);
    if (!name.trim()) return setMsg('Adını yazar mısın? 🫶');
    if (!(a >= 13 && a <= 120)) return setMsg('TalApp 13 yaş ve üstü için 💅 Yaşını kontrol eder misin?');
    Keyboard.dismiss();
    setBusy(true);
    setMsg('');
    try {
      await onDone(name.trim(), a);
    } catch (e) {
      setBusy(false);
      setMsg('Olmadı 😵 İnternetini kontrol edip tekrar dener misin?');
    }
  };

  return (
    <HoloBg colors={THEMES.bubblegum.colors}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 22, paddingBottom: insets.bottom + 30, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center' }}>
            <Sticker text="✦ Hoş geldin ✦" rotate="-3deg" />
            <HoloText style={styles.logo}>TalApp</HoloText>
            <Text style={styles.tagline}>Son bir adım: seni tanıyalım 🫶</Text>
          </View>
          <View style={{ marginTop: 22 }}>
            <Label>Adın</Label>
            <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={20} textContentType="givenName" />
            <Label style={{ marginTop: 16 }}>Yaşın</Label>
            <TextInput value={age} onChangeText={t => setAge(t.replace(/\D/g, ''))} style={styles.input} maxLength={3} keyboardType="number-pad" />
            {msg ? <Glass style={{ marginTop: 16 }}><Text style={styles.info}>{msg}</Text></Glass> : null}
            <ChromeButton hot big disabled={busy} style={{ marginTop: 24 }} title={busy ? 'Bekle bi sn... ✦' : 'Devam ✦'} onPress={submit} />
            <Pressable onPress={onSignOut} hitSlop={10}>
              <Text style={styles.restore}>Çıkış yap</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </HoloBg>
  );
}

// Temalı menü (hesap ve hat ayarları). items: [{ e, t, onPress, danger }]; tehlikeli olanlar ayrı kutuda
function MenuSheet({ visible, onClose, colors, head, items }) {
  const group = list => (
    <Glass style={styles.menuBox}>
      {list.map((it, i) => (
        <Pressable
          key={it.t} onPress={() => { tap(); it.onPress(); }}
          style={({ pressed }) => [styles.menuRow, i > 0 && styles.histBorder, pressed && { opacity: 0.55 }]}
        >
          <View style={[styles.menuIcon, it.danger && styles.menuIconDanger]}><Text style={{ fontSize: 18 }}>{it.e}</Text></View>
          <Text style={[styles.menuTxt, it.danger && styles.menuTxtDanger]}>{it.t}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </Glass>
  );
  const safe = items.filter(it => !it.danger);
  const danger = items.filter(it => it.danger);
  return (
    <Sheet visible={visible} onClose={onClose} colors={colors}>
      <View style={{ alignItems: 'center' }}>{head}</View>
      {safe.length ? group(safe) : null}
      {danger.length ? group(danger) : null}
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Karşılama + hat kurulumu (3 kısa adım)
// ─────────────────────────────────────────────────────────────
function FloatCard({ e, t, st, rot, delay, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 1800, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, []);
  const s = STATUS[st];
  return (
    <Animated.View style={[styles.float, style, { transform: [{ rotate: rot }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }]}>
      <Text style={{ fontSize: 28 }}>{e}</Text>
      <View style={{ marginLeft: 10 }}>
        <Text style={styles.floatTitle}>{t}</Text>
        <Sticker text={`${s.e} ${s.t}`} bg={s.bg} rotate="0deg" small style={{ marginTop: 5 }} />
      </View>
    </Animated.View>
  );
}

function StepShell({ step, colors, title, sub, onBack, onNext, nextTitle, canNext, children }) {
  const insets = useSafeAreaInsets();
  return (
    <HoloBg colors={colors}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 22, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepTop}>
            <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>← Geri</Text></Pressable>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3].map(i => <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />)}
            </View>
          </View>
          <Text style={styles.stepNo}>Adım {step}/3</Text>
          <Text style={styles.stepTitle}>{title}</Text>
          {sub ? <Text style={styles.stepSub}>{sub}</Text> : null}
          <View style={{ marginTop: 22, flex: 1 }}>{children}</View>
          <ChromeButton hot big title={nextTitle} onPress={onNext} disabled={!canNext} style={{ marginTop: 26 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </HoloBg>
  );
}

// Kayıttan önceki karşılama ekranı
function Welcome({ colors, title, onPress, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <HoloBg colors={colors}>
      <View style={{ flex: 1, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 22, paddingHorizontal: 24, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center' }}>
          <Sticker text="✦ Yeni nesil talep hattı ✦" rotate="-3deg" />
          <HoloText style={styles.logo}>TalApp</HoloText>
          <Text style={styles.tagline}>Sevgilin & kankaların için{'\n'}kendi talep hattını kur 💅</Text>
        </View>
        <View style={{ height: 250 }}>
          <FloatCard e="💅" t="Nail randevusu" st="approved" rot="-6deg" delay={0} style={{ left: 0, top: 0 }} />
          <FloatCard e="🍕" t="Gece 2'de pizza" st="nego" rot="5deg" delay={500} style={{ right: 0, top: 84 }} />
          <FloatCard e="✈️" t="Hafta sonu kaçamağı" st="pending" rot="-3deg" delay={1000} style={{ left: 14, top: 168 }} />
        </View>
        <View>
          <ChromeButton hot big title={title} onPress={onPress} />
          {footer}
        </View>
      </View>
    </HoloBg>
  );
}

// Hat kurulumu "hatlarım"dan açılır; onCancel oraya döner.
// onDone sunucuda hattı açar (promise); kişiler sonra davet koduyla katılır.
function Onboarding({ onDone, onCancel, myName }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💖');
  const [theme, setTheme] = useState('bubblegum');
  const [cats, setCats] = useState(PRESET_CATS.map((c, i) => ({ ...c, on: i < 6 })));
  const [custom, setCustom] = useState('');
  const [customEmoji, setCustomEmoji] = useState('✨');
  const [me, setMe] = useState(myName || '');
  const [busy, setBusy] = useState(false);
  const colors = THEMES[theme].colors;

  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    setCats(cs => [...cs, { e: customEmoji, t, on: true }]);
    setCustom('');
    setCustomEmoji('✨');
    tap();
  };
  const finish = async () => {
    const chosen = cats.filter(c => c.on).map(({ e, t }) => ({ id: uid(), e, t }));
    setBusy(true);
    try {
      await onDone({
        name: name.trim() || 'Talep Hattım', emoji, theme,
        cats: chosen.length ? chosen : [{ id: uid(), e: '✨', t: 'Genel' }],
        memberName: me.trim() || 'Ben',
      });
      success();
    } catch (e) {
      setBusy(false);
      oops();
    }
  };

  if (step === 1) {
    return (
      <StepShell step={1} colors={colors} title="Hattına bir isim ver ✦" sub="Mesela: Diva Talep Hattı, Kızlar Meclisi, Aşk Bakanlığı 🏛️"
        onBack={onCancel} onNext={() => setStep(2)} nextTitle="Devam →" canNext>
        <TextInput
          value={name} onChangeText={setName} placeholder="Diva Talep Hattı" placeholderTextColor="#B79BCB"
          style={styles.input} maxLength={32} returnKeyType="next" onSubmitEditing={() => setStep(2)}
        />
        <Label style={{ marginTop: 22 }}>Hattının emojisi</Label>
        <View style={styles.wrap}>
          {EMOJIS.map(e => (
            <Pressable key={e} onPress={() => { tap(); setEmoji(e); }} style={[styles.emojiBox, emoji === e && styles.emojiBoxOn]}>
              <Text style={{ fontSize: 26 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
        <Glass style={styles.preview}>
          <Text style={{ fontSize: 36 }}>{emoji}</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.kicker}>Önizleme</Text>
            <Text style={styles.previewName} numberOfLines={2}>{name.trim() || 'Diva Talep Hattı'}</Text>
          </View>
        </Glass>
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell step={2} colors={colors} title="Vibe'ını seç 🎨" sub="Renkler ve talep başlıkların. Sonra da değiştirebilirsin."
        onBack={() => setStep(1)} onNext={() => setStep(3)} nextTitle="Devam →" canNext={cats.some(c => c.on)}>
        <View style={styles.themeRow}>
          {Object.entries(THEMES).map(([k, th]) => (
            <Pressable key={k} onPress={() => { tap(); setTheme(k); }} style={styles.themeCell}>
              <LinearGradient colors={th.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.swatch, theme === k && styles.swatchOn]}>
                {theme === k ? <Text style={{ fontSize: 20 }}>✦</Text> : null}
              </LinearGradient>
              <Text style={styles.swatchTxt}>{th.name}</Text>
            </Pressable>
          ))}
        </View>
        <Label style={{ marginTop: 24 }}>Talep başlıkları</Label>
        <View style={styles.wrap}>
          {cats.map((c, i) => (
            <Chip key={`${c.t}-${i}`} label={`${c.e} ${c.t}`} on={c.on}
              onPress={() => setCats(cs => cs.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
          ))}
        </View>
        <Label style={{ marginTop: 18 }}>Kendi başlığını ekle</Label>
        <View style={styles.addRow}>
          <View style={styles.emojiNow}><Text style={{ fontSize: 22 }}>{customEmoji}</Text></View>
          <TextInput
            value={custom} onChangeText={setCustom} placeholder="Örn. Boba" placeholderTextColor="#B79BCB"
            style={[styles.input, { flex: 1, marginLeft: 10 }]} maxLength={24} onSubmitEditing={addCustom} returnKeyType="done"
          />
          <ChromeButton title="+" onPress={addCustom} style={{ marginLeft: 10 }} />
        </View>
        <EmojiPick value={customEmoji} onChange={setCustomEmoji} />
      </StepShell>
    );
  }

  return (
    <StepShell step={3} colors={colors} title="Bu hatta adın ne olsun? 🫶" sub="Hattaki herkes seni bu isimle görecek."
      onBack={() => setStep(2)} onNext={finish} nextTitle={busy ? 'Hat açılıyor... ✦' : 'Hattı aç 🚀'} canNext={!busy && !!me.trim()}>
      <TextInput value={me} onChangeText={setMe} placeholder="Kerime" placeholderTextColor="#B79BCB" style={styles.input} maxLength={20} />
      <Glass style={{ marginTop: 22 }}>
        <Text style={styles.kicker}>Sırada ne var? 💌</Text>
        <Text style={styles.stepInfo}>
          Hattı açınca sana bir davet kodu vereceğiz. Sevgiline ya da kankalarına gönder; TalApp'i indirip kodu yazınca hattına katılırlar.
        </Text>
      </Glass>
    </StepShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Tanıtım turu: ekrandaki öğeleri sırayla vurgular, ne işe yaradığını anlatır
// ─────────────────────────────────────────────────────────────
const TOUR_KEY = 'talepp:tour';
const readTours = async () => {
  try {
    return JSON.parse(await AsyncStorage.getItem(TOUR_KEY)) || {};
  } catch (e) {
    return {};
  }
};
const markTour = async k => {
  const seen = await readTours();
  AsyncStorage.setItem(TOUR_KEY, JSON.stringify({ ...seen, [k]: true })).catch(() => {});
};

// Tur ekran başına bir kez gösterilir. ready false iken beklenir; değişince yeniden bakılır.
function useTour(k, ready) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (ready === false) return undefined;
    let alive = true;
    const t = setTimeout(() => readTours().then(seen => { if (alive && !seen[k]) setOn(true); }), 700);
    return () => { alive = false; clearTimeout(t); };
  }, [ready]);
  return [on, () => { setOn(false); markTour(k); }];
}

const TOUR_PAD = 6;
const TOUR_CARD = 250; // açıklama kartının yaklaşık yüksekliği

// steps: [{ ref, title, text }]; ekranda olmayan öğe atlanır
function Tour({ steps, onFinish }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const { width: W, height: H } = Dimensions.get('window');
  const step = steps[i];
  const last = i === steps.length - 1;

  useEffect(() => {
    let alive = true;
    setRect(null);
    const node = step && step.ref.current;
    if (!node) {
      if (last) onFinish();
      else setI(n => n + 1);
      return undefined;
    }
    node.measureInWindow((x, y, w, h) => { if (alive) setRect({ x, y, w, h }); });
    return () => { alive = false; };
  }, [i]);

  const next = () => { tap(); if (last) onFinish(); else setI(i + 1); };

  if (!step) return null;
  const hole = rect && { x: rect.x - TOUR_PAD, y: rect.y - TOUR_PAD, w: rect.w + TOUR_PAD * 2, h: rect.h + TOUR_PAD * 2 };
  const below = hole && hole.y + hole.h + TOUR_CARD < H;

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onFinish}>
      {hole ? (
        <>
          <View style={[styles.tourShade, { left: 0, top: 0, width: W, height: Math.max(0, hole.y) }]} />
          <View style={[styles.tourShade, { left: 0, top: hole.y + hole.h, width: W, bottom: 0 }]} />
          <View style={[styles.tourShade, { left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }]} />
          <View style={[styles.tourShade, { left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h }]} />
          <View pointerEvents="none" style={[styles.tourHole, { left: hole.x, top: hole.y, width: hole.w, height: hole.h }]} />
          <View style={[styles.tourCard, below ? { top: hole.y + hole.h + 14 } : { bottom: H - hole.y + 14 }]}>
            <Text style={styles.tourCount}>{i + 1} / {steps.length}  ✦  nasıl kullanılır?</Text>
            <Text style={styles.tourTitle}>{step.title}</Text>
            <Text style={styles.tourText}>{step.text}</Text>
            <View style={styles.tourButtons}>
              {last ? <View /> : (
                <Pressable onPress={onFinish} hitSlop={10}><Text style={styles.tourSkip}>Geç</Text></Pressable>
              )}
              <ChromeButton small hot title={last ? 'Başlayalım 💅' : 'İleri ›'} onPress={next} />
            </View>
          </View>
        </>
      ) : <View style={[styles.tourShade, { left: 0, top: 0, right: 0, bottom: 0 }]} />}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Talep kartı
// ─────────────────────────────────────────────────────────────
// tally: grup kartı (durum yerine "1/3 onayladı"); note: kartın altına ek satır
function RequestCard({ r, cat, fromName, toName, onPress, tally, note }) {
  const st = tally ? tallySticker(tally) : { t: `${STATUS[r.status].e} ${STATUS[r.status].t}`, bg: STATUS[r.status].bg };
  const urgent = r.urgency === 'acil' && OPEN.includes(r.status);
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [{ marginTop: 18, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Glass style={[styles.card, urgent && styles.cardUrgent]}>
        <View style={styles.cardEmoji}><Text style={{ fontSize: 26 }}>{cat ? cat.e : '✨'}</Text></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardCat}>{trUpper(cat ? cat.t : 'genel')}{urgent ? '  ·  🚨 ACİL' : ''}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>{r.title}</Text>
          {whenText(r) ? <Text style={styles.cardWhen} numberOfLines={1}>{whenText(r)}</Text> : null}
          <Text style={styles.cardMeta}>{fromName} → {toName} · {timeAgo(r.createdAt)}</Text>
          {tally || note ? <Text style={styles.cardTally}>{tally ? tallyText(tally) : note}</Text> : null}
        </View>
        {r.image ? <Image source={{ uri: r.image }} style={styles.cardThumb} /> : null}
      </Glass>
      <Sticker text={st.t} bg={st.bg} rotate={r.id.charCodeAt(0) % 2 ? '-5deg' : '4deg'} style={styles.cardSticker} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Takvim: geçmiş günler kapalı, ileri aylara istediğin kadar gidilir
// ─────────────────────────────────────────────────────────────
function Calendar({ value, onChange }) {
  const today = todayKey();
  const now = new Date();
  const [view, setView] = useState(() => {
    if (!value) return { y: now.getFullYear(), m: now.getMonth() };
    const [y, m] = value.split('-').map(Number);
    return { y, m: m - 1 };
  });
  const isFirst = view.y === now.getFullYear() && view.m === now.getMonth();
  const shift = n => setView(v => {
    const d = new Date(v.y, v.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // hafta pazartesi başlar
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  return (
    <Glass style={{ marginTop: 10, padding: 14 }}>
      <View style={styles.calHead}>
        <Pressable onPress={() => { if (!isFirst) { tap(); shift(-1); } }} hitSlop={10} style={[styles.calArrow, isFirst && { opacity: 0.3 }]}>
          <Text style={styles.calArrowTxt}>‹</Text>
        </Pressable>
        <Text style={styles.calTitle}>{MONTH_LONG[view.m]} {view.y}</Text>
        <Pressable onPress={() => { tap(); shift(1); }} hitSlop={10} style={styles.calArrow}>
          <Text style={styles.calArrowTxt}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calGrid}>
        {WEEK_HEAD.map(w => <Text key={w} style={styles.calWeek}>{w}</Text>)}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.calCell} />;
          const k = dayKey(new Date(view.y, view.m, d));
          const past = k < today;
          const on = k === value;
          return (
            <Pressable key={k} disabled={past} onPress={() => { tap(); onChange(k); }} style={styles.calCell}>
              <View style={[styles.calDay, k === today && styles.calToday, on && styles.calOn]}>
                <Text style={[styles.calDayTxt, past && { opacity: 0.3 }, on && { color: '#fff' }]}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────
// Yeni talep
// ─────────────────────────────────────────────────────────────
function NewRequestSheet({ visible, onClose, data, viewer, colors, onSend, onAddCat, left }) {
  const others = data.members.filter(m => m.id !== viewer.id);
  const [tos, setTos] = useState([]); // birden fazla kişi seçilirse grup talebi olur
  const [catId, setCatId] = useState(null);
  const [newCat, setNewCat] = useState(null); // null: kutu kapalı
  const [newEmoji, setNewEmoji] = useState('✨');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [urgency, setUrgency] = useState('onemli');
  const [image, setImage] = useState(null); // { uri, base64 }
  const [date, setDate] = useState(null);
  const [calOpen, setCalOpen] = useState(false);
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [busy, setBusy] = useState(false);
  const timeBad = time.length > 0 && !TIME_RE.test(time);

  useEffect(() => {
    if (!visible) return;
    setTos(others.map(m => m.id));
    setCatId(data.line.cats[0] ? data.line.cats[0].id : null);
    setNewCat(null); setNewEmoji('✨'); setTitle(''); setDesc(''); setUrgency('onemli'); setImage(null);
    setDate(null); setCalOpen(false); setTime(''); setPlace(''); setBusy(false);
  }, [visible]);

  const submit = async () => {
    setBusy(true);
    const ok = await onSend({ tos, catId, title, desc, urgency, image, date, time: time || null, place });
    if (!ok) setBusy(false);
  };

  const addCat = () => {
    const t = (newCat || '').trim();
    if (!t) return;
    setCatId(onAddCat(t, newEmoji));
    setNewCat(null);
    setNewEmoji('✨');
    tap();
  };

  const pick = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, base64: true });
      if (!res.canceled && res.assets && res.assets.length) setImage({ uri: res.assets[0].uri, base64: res.assets[0].base64 });
    } catch (e) {
      Alert.alert('Olmadı 😵', 'Görsel seçilemedi, tekrar dener misin?');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} colors={colors}>
      <HoloText style={styles.sheetTitle}>Yeni talep ✦</HoloText>
      <Text style={styles.sheetSub}>Kalan hakkın: {left === Infinity ? '∞' : left} · ikna edici ol 😌</Text>

      <Label style={{ marginTop: 20 }}>Kime?</Label>
      <View style={styles.wrap}>
        {others.length > 1 ? (
          <Chip
            label="👥 Herkes" on={tos.length === others.length}
            onPress={() => setTos(tos.length === others.length ? [] : others.map(m => m.id))}
          />
        ) : null}
        {others.map(m => {
          const on = tos.includes(m.id);
          return (
            <Pressable
              key={m.id} style={[styles.toChip, on && styles.chipOn]}
              onPress={() => { tap(); setTos(t => (on ? t.filter(x => x !== m.id) : [...t, m.id])); }}
            >
              <Avatar name={m.name} index={data.members.findIndex(x => x.id === m.id)} size={26} uri={m.avatar} />
              <Text style={[styles.chipTxt, { marginLeft: 8 }, on && styles.chipTxtOn]}>{m.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {tos.length > 1 ? (
        <Text style={styles.hint}>{tos.length} kişiye gider, herkes ayrı cevap verir 👥 Kimin onayladığını kartta görürsün. Tek hak sayılır ✦</Text>
      ) : null}

      <Label style={{ marginTop: 20 }}>Başlık</Label>
      <View style={styles.wrap}>
        {data.line.cats.map(c => <Chip key={c.id} label={`${c.e} ${c.t}`} on={catId === c.id} onPress={() => setCatId(c.id)} />)}
        <Chip label="＋ Yeni başlık" on={newCat !== null} onPress={() => setNewCat(newCat === null ? '' : null)} />
      </View>
      {newCat !== null ? (
        <>
          <View style={styles.addRow}>
            <View style={styles.emojiNow}><Text style={{ fontSize: 22 }}>{newEmoji}</Text></View>
            <TextInput
              value={newCat} onChangeText={setNewCat} placeholder="Yeni başlık (örn. Boba)" placeholderTextColor="#B79BCB"
              style={[styles.input, { flex: 1, marginLeft: 10 }]} maxLength={24} autoFocus onSubmitEditing={addCat} returnKeyType="done"
            />
            <ChromeButton title="Ekle" onPress={addCat} style={{ marginLeft: 10 }} />
          </View>
          <EmojiPick value={newEmoji} onChange={setNewEmoji} />
        </>
      ) : null}

      <Label style={{ marginTop: 20 }}>Ne istiyorsun?</Label>
      <TextInput value={title} onChangeText={setTitle} placeholder="Cumartesi sushi date 🍣" placeholderTextColor="#B79BCB" style={styles.input} maxLength={60} />

      <Label style={{ marginTop: 16 }}>Hangi gün?</Label>
      <View style={styles.addRow}>
        <Pressable onPress={() => { tap(); setCalOpen(o => !o); }} style={[styles.input, { flex: 1 }]}>
          <Text style={[styles.pickTxt, !date && { color: '#B79BCB' }]}>{date ? `📅 ${dayLabel(date)}` : '📅 Takvimden seç'}</Text>
        </Pressable>
        {date ? <ChromeButton title="✕" onPress={() => { setDate(null); setCalOpen(false); }} style={{ marginLeft: 10 }} /> : null}
      </View>
      {calOpen ? <Calendar value={date} onChange={k => { setDate(k); setCalOpen(false); }} /> : null}

      <Label style={{ marginTop: 16 }}>Saat kaçta?</Label>
      <TextInput
        value={time} onChangeText={t => setTime(fmtTime(t))} placeholder="🕗 20:30" placeholderTextColor="#B79BCB"
        keyboardType="number-pad" maxLength={5} style={styles.input}
      />
      {timeBad ? <Text style={styles.fieldNote}>Saati 20:30 gibi tamamla ⏰</Text> : null}

      <Label style={{ marginTop: 16 }}>Nerede?</Label>
      <TextInput value={place} onChangeText={setPlace} placeholder="📍 Moda sahil, Kadıköy" placeholderTextColor="#B79BCB" style={styles.input} maxLength={60} />
      <Text style={styles.hint}>Gün, saat ve konum isteğe bağlı ✦{'\n'}günü seçersen, onaylanınca takvimine eklenir 📅 ve 1 gün, 12 saat önce hatırlatılır 🔔</Text>

      <Label style={{ marginTop: 16 }}>Detaylar (ikna et bakalım)</Label>
      <TextInput
        value={desc} onChangeText={setDesc} multiline placeholder="Çünkü bu hafta çok iyi bir insandım ve bunu hak ediyorum..."
        placeholderTextColor="#B79BCB" style={[styles.input, styles.textarea]} maxLength={400}
      />

      <Label style={{ marginTop: 16 }}>Aciliyet</Label>
      <View style={styles.segment}>
        {URGENCY.map(u => (
          <Pressable key={u.k} onPress={() => { tap(); setUrgency(u.k); }} style={[styles.segBtn, urgency === u.k && styles.segOn, urgency === u.k && u.k === 'acil' && { backgroundColor: C.hot }]}>
            <Text style={[styles.segTxt, urgency === u.k && { color: '#fff' }]}>{u.t}</Text>
          </Pressable>
        ))}
      </View>

      <Label style={{ marginTop: 16 }}>Görsel / ilham</Label>
      {image ? (
        <View>
          <Image source={{ uri: image.uri }} style={styles.formImg} />
          <Pressable onPress={() => setImage(null)} style={styles.imgRemove}><Text style={{ color: '#fff', fontFamily: F.bold }}>✕</Text></Pressable>
        </View>
      ) : (
        <Pressable onPress={() => { tap(); pick(); }} style={styles.imgAdd}>
          <Text style={{ fontSize: 30 }}>🖼️</Text>
          <Text style={styles.imgAddTxt}>Görsel ekle</Text>
          <Text style={styles.hint}>İstediğin çanta, mekan, nail art... Göster ki anlasın</Text>
        </Pressable>
      )}

      <ChromeButton
        hot big title={busy ? 'Fırlatılıyor... 🚀' : 'Talebi fırlat 🚀'} disabled={busy || !title.trim() || !tos.length || timeBad}
        style={{ marginTop: 26 }} onPress={submit}
      />
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Talep detayı: onayla / reddet / pazarlık / itiraz
// ─────────────────────────────────────────────────────────────
// group: talep bir grup talebiyse gruptaki bütün satırlar; onGroup herkesin cevabını gösteren sayfayı açar
function DetailSheet({ visible, onClose, r, data, viewer, colors, act, group, onGroup }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  useEffect(() => { if (visible) { setMode(null); setText(''); } }, [visible, r && r.id]);

  const nameOf = id => (data.members.find(m => m.id === id) || { name: 'Eski üye' }).name;
  const body = () => {
    if (!r) return null;
    const cat = data.line.cats.find(c => c.id === r.catId);
    const st = STATUS[r.status];
    const isTo = r.to === viewer.id;
    const isFrom = r.from === viewer.id;
    const open = OPEN.includes(r.status);
    const appealed = r.history.some(h => h.type === 'appeal');
    const lastNego = [...r.history].reverse().find(h => h.type === 'nego');
    const urg = URGENCY.find(u => u.k === r.urgency);

    let actions = null;
    if (isTo && open) {
      if (mode === 'reject') {
        actions = (
          <Glass>
            <Label>Ret sebebi seç 💔</Label>
            <View style={styles.wrap}>
              {REJECT_REASONS.map(x => <Chip key={x} label={x} on={text === x} onPress={() => setText(x)} />)}
            </View>
            <TextInput value={text} onChangeText={setText} placeholder="Ya da kendin yaz..." placeholderTextColor="#B79BCB" style={[styles.input, { marginTop: 12 }]} maxLength={80} />
            <View style={styles.actRow}>
              <ChromeButton small title="Vazgeç" onPress={() => setMode(null)} />
              <ChromeButton small hot title="Reddet 💔" disabled={!text.trim()} onPress={() => act.reject(r, text.trim())} />
            </View>
          </Glass>
        );
      } else if (mode === 'nego') {
        actions = (
          <Glass>
            <Label>Karşı teklifin ne? 🤝</Label>
            <TextInput value={text} onChangeText={setText} placeholder="Tamam ama önce bulaşıklar 🧽" placeholderTextColor="#B79BCB" style={styles.input} maxLength={120} />
            <View style={styles.actRow}>
              <ChromeButton small title="Vazgeç" onPress={() => setMode(null)} />
              <ChromeButton small hot title="Teklifi gönder" disabled={!text.trim()} onPress={() => act.nego(r, text.trim())} />
            </View>
          </Glass>
        );
      } else {
        actions = (
          <View>
            <ChromeButton hot big title="Onayla 💖" onPress={() => act.approve(r)} />
            <View style={styles.actRow}>
              <ChromeButton title="Pazarlık 🤝" onPress={() => { setText(''); setMode('nego'); }} style={{ flex: 1 }} />
              <ChromeButton title="Reddet 💔" onPress={() => { setText(''); setMode('reject'); }} style={{ flex: 1 }} />
            </View>
          </View>
        );
      }
    } else if (isFrom && r.status === 'nego') {
      actions = (
        <View>
          <Glass style={styles.bubble}>
            <Text style={styles.kicker}>{nameOf(r.to)} diyor ki:</Text>
            <Text style={styles.bubbleTxt}>“{lastNego ? lastNego.text : ''}”</Text>
          </Glass>
          <ChromeButton hot big title="Anlaştık ✓" onPress={() => act.accept(r)} style={{ marginTop: 14 }} />
          <ChromeButton title="Talebi geri çek 🫥" onPress={() => act.withdraw(r)} style={{ marginTop: 10 }} />
        </View>
      );
    } else if (isFrom && r.status === 'pending') {
      actions = (
        <View>
          <NudgeButton rows={[r]} onPress={() => act.nudge([r])} />
          <ChromeButton title="Talebi geri çek 🫥" onPress={() => act.withdraw(r)} style={{ marginTop: 10 }} />
        </View>
      );
    } else if (isFrom && r.status === 'rejected' && !appealed) {
      actions = mode === 'appeal' ? (
        <Glass>
          <Label>İtiraz dilekçen ⚖️</Label>
          <TextInput
            value={text} onChangeText={setText} multiline placeholder="Sayın yargıç, bunu hak ediyorum çünkü..."
            placeholderTextColor="#B79BCB" style={[styles.input, styles.textarea]} maxLength={200}
          />
          <View style={styles.actRow}>
            <ChromeButton small title="Vazgeç" onPress={() => setMode(null)} />
            <ChromeButton small hot title="İtiraz et" disabled={!text.trim()} onPress={() => act.appeal(r, text.trim())} />
          </View>
        </Glass>
      ) : (
        <ChromeButton hot title="İtiraz et ⚖️ (1 hak)" onPress={() => { setText(''); setMode('appeal'); }} />
      );
    } else if (isFrom && r.status === 'appeal') {
      actions = (
        <View>
          <Text style={styles.info}>İtirazın masada ⚖️ Karar bekleniyor...</Text>
          <NudgeButton rows={[r]} onPress={() => act.nudge([r])} style={{ marginTop: 12 }} />
        </View>
      );
    } else if (!isTo && !isFrom) {
      actions = <Text style={styles.info}>Bu talep sana ait değil ama izlemek serbest 🍿</Text>;
    }

    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Sticker text={`${cat ? cat.e : '✨'} ${trUpper(cat ? cat.t : 'genel')}`} rotate="-3deg" />
          <Sticker text={`${st.e} ${st.t}`} bg={st.bg} rotate="4deg" />
        </View>
        <Text style={styles.detailTitle}>{r.title}</Text>
        <Text style={styles.detailMeta}>{nameOf(r.from)} → {nameOf(r.to)} · {timeAgo(r.createdAt)} · {urg ? urg.t : ''}</Text>

        {group && group.length > 1 ? (
          <Pressable onPress={() => { tap(); onGroup(); }}>
            <Glass style={styles.groupNote}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>👥 Grup talebi · {group.length} kişiye gitti</Text>
                <Text style={styles.cardTally}>{tallyText(tallyOf(group))}</Text>
              </View>
              <Text style={styles.aloneBtn}>Herkes ›</Text>
            </Glass>
          </Pressable>
        ) : null}

        {r.status === 'approved' ? (
          <LinearGradient colors={['#9DFFD5', '#B5DEFF', '#FFB5E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.approvedBanner}>
            <Text style={styles.approvedTxt}>💖 ONAYLANDI 💖</Text>
          </LinearGradient>
        ) : null}

        {r.date || r.time || r.place ? (
          <Glass style={{ marginTop: 16 }}>
            {r.date || r.time ? (
              <Text style={styles.whenTxt}>{[r.date && `📅 ${dayLabel(r.date)}`, r.time && `🕗 ${r.time}`].filter(Boolean).join('    ')}</Text>
            ) : null}
            {r.place ? (
              <Pressable onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(r.place)}`).catch(() => {})}>
                <Text style={[styles.whenTxt, (r.date || r.time) ? { marginTop: 8 } : null]}>
                  📍 {r.place}  <Text style={styles.mapLink}>Haritada aç ↗</Text>
                </Text>
              </Pressable>
            ) : null}
          </Glass>
        ) : null}

        {r.desc ? <Glass style={{ marginTop: 16 }}><Text style={styles.desc}>{r.desc}</Text></Glass> : null}
        {r.image ? <Image source={{ uri: r.image }} style={styles.detailImg} /> : null}

        {actions ? <View style={{ marginTop: 20 }}>{actions}</View> : null}

        <Label style={{ marginTop: 26 }}>Talep geçmişi</Label>
        <Glass>
          {r.history.map((h, i) => (
            <View key={i} style={[styles.histRow, i > 0 && styles.histBorder]}>
              <Text style={styles.histMain}>{nameOf(h.by)} {HIST[h.type]}</Text>
              {h.text ? <Text style={styles.histText}>“{h.text}”</Text> : null}
              <Text style={styles.histTime}>{timeAgo(h.at)}</Text>
            </View>
          ))}
        </Glass>

        {!isFrom ? (
          <View style={styles.safetyRow}>
            <Pressable onPress={() => act.report(r)} hitSlop={8}><Text style={styles.safetyTxt}>🚩 Şikayet et</Text></Pressable>
            <Pressable onPress={() => act.block(r.from)} hitSlop={8}><Text style={styles.safetyTxt}>🚫 {nameOf(r.from)}'i engelle</Text></Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return <Sheet visible={visible} onClose={onClose} colors={colors}>{body()}</Sheet>;
}

// Cevap vermeyenlere tekrar bildirim. Az önce hatırlatıldıysa kapalı durur ve ne zaman açılacağını yazar.
function NudgeButton({ rows, onPress, style }) {
  const waiting = rows.filter(nudgeable);
  if (!waiting.length) return null;
  const ready = waiting.filter(canNudge);
  if (!ready.length) {
    const mins = Math.max(1, Math.ceil((Math.min(...waiting.map(x => x.nudgedAt + NUDGE_GAP)) - Date.now()) / 60000));
    return <ChromeButton disabled title={`🔔 Hatırlatıldı · ${mins >= 60 ? `${Math.ceil(mins / 60)} sa` : `${mins} dk`} sonra tekrar`} style={style} />;
  }
  return (
    <ChromeButton
      hot={rows.length > 1} style={style} onPress={onPress}
      title={rows.length > 1 ? `🔔 Bekleyenlere hatırlat (${ready.length})` : '🔔 Tekrar hatırlat'}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Grup talebi: kim onayladı, kim reddetti, kim bekliyor. Bir kişiye dokununca o kişinin talebi açılır.
// ─────────────────────────────────────────────────────────────
function GroupSheet({ visible, onClose, rows, data, viewer, colors, onOpen, onNudge }) {
  const member = id => data.members.find(m => m.id === id);
  const nameOf = id => (member(id) || { name: 'Eski üye' }).name;
  const body = () => {
    if (!rows || !rows.length) return null;
    const r = rows[0];
    const cat = data.line.cats.find(c => c.id === r.catId);
    const t = tallyOf(rows);
    const st = tallySticker(t);
    const isFrom = r.from === viewer.id;
    const isTo = rows.some(x => x.to === viewer.id);
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Sticker text={`${cat ? cat.e : '✨'} ${trUpper(cat ? cat.t : 'genel')}`} rotate="-3deg" />
          <Sticker text={st.t} bg={st.bg} rotate="4deg" />
        </View>
        <Text style={styles.detailTitle}>{r.title}</Text>
        <Text style={styles.detailMeta}>{nameOf(r.from)} → {rows.length} kişi · {timeAgo(r.createdAt)}</Text>

        <Glass style={{ marginTop: 16, alignItems: 'center' }}>
          <HoloText style={styles.quotaBig}>{t.yes}/{t.total}</HoloText>
          <Text style={styles.label}>Kişi onayladı</Text>
          <Text style={[styles.cardTally, { textAlign: 'center' }]}>{tallyText(t)}</Text>
        </Glass>

        {whenText(r) ? <Glass style={{ marginTop: 16 }}><Text style={styles.whenTxt}>{whenText(r)}</Text></Glass> : null}
        {r.desc ? <Glass style={{ marginTop: 16 }}><Text style={styles.desc}>{r.desc}</Text></Glass> : null}
        {r.image ? <Image source={{ uri: r.image }} style={styles.detailImg} /> : null}

        <Label style={{ marginTop: 22 }}>Kim ne dedi?</Label>
        <Glass>
          {rows.map((x, i) => {
            const s = STATUS[x.status];
            const m = member(x.to);
            return (
              <Pressable key={x.id} onPress={() => { tap(); onOpen(x.id); }} style={[styles.groupRow, i > 0 && styles.histBorder]}>
                <Avatar name={nameOf(x.to)} index={Math.max(0, data.members.indexOf(m))} size={32} uri={m && m.avatar} />
                <Text style={styles.groupName} numberOfLines={1}>{nameOf(x.to)}{x.to === viewer.id ? ' (sen)' : ''}</Text>
                <Sticker small text={`${s.e} ${s.t}`} bg={s.bg} rotate="0deg" />
                <Text style={styles.groupArrow}>›</Text>
              </Pressable>
            );
          })}
        </Glass>

        {isFrom ? <NudgeButton rows={rows} onPress={() => onNudge(rows)} style={{ marginTop: 18 }} /> : null}
        {isFrom || isTo ? (
          <Text style={[styles.hint, { textAlign: 'center' }]}>
            {isFrom ? 'Pazarlık yapana cevap vermek ya da birinden geri çekmek için o kişiye dokun ✦' : 'Cevabını vermek için adına dokun ✦'}
          </Text>
        ) : null}
      </View>
    );
  };
  return <Sheet visible={visible} onClose={onClose} colors={colors}>{body()}</Sheet>;
}

// ─────────────────────────────────────────────────────────────
// TalApp+ (RevenueCat). Anahtar yokken: geliştirmede test aboneliği, yayında "yakında"
// ─────────────────────────────────────────────────────────────
function PaywallSheet({ visible, onClose, reason, plan, colors, onPlan }) {
  const [sel, setSel] = useState('p10');
  const [period, setPeriod] = useState('month');
  const [pkgs, setPkgs] = useState(null);
  const [busy, setBusy] = useState(false);
  const live = purchasesEnabled();

  useEffect(() => {
    if (visible && live) getPackages().then(setPkgs);
  }, [visible]);

  // RevenueCat paket adı: p10_week, p10_month, inf_week, inf_month
  const pkgOf = k => pkgs && pkgs[`${k}_${period}`];
  const priceOf = p => (pkgOf(p.k) ? pkgOf(p.k).product.priceString : p.price[period]);
  const per = PERIODS.find(x => x.k === period).per;

  const subscribe = async () => {
    if (!live) {
      if (__DEV__) onPlan(sel, true); // Expo Go'da denemek için
      else Alert.alert('Çok yakında ✦', 'Abonelik App Store sürümünde aktif olacak.');
      return;
    }
    const pkg = pkgOf(sel);
    if (!pkg) { oops(); return; }
    setBusy(true);
    try {
      onPlan(await buy(pkg));
    } catch (e) {
      if (!e.userCancelled) oops();
    }
    setBusy(false);
  };

  const restoreBuys = async () => {
    if (!live) { Alert.alert('Geri yükle', 'Abonelik App Store sürümünde aktif olacak ✦'); return; }
    setBusy(true);
    try {
      const k = await restore();
      if (k === 'free') Alert.alert('Bulunamadı', 'Bu Apple ID\'de aktif TalApp+ aboneliği yok.');
      else onPlan(k);
    } catch (e) {
      oops();
    }
    setBusy(false);
  };

  return (
    <Sheet visible={visible} onClose={onClose} colors={colors}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 58 }}>👑</Text>
        <HoloText style={styles.payTitle}>TalApp+</HoloText>
        <Text style={styles.paySub}>
          {{
            free: 'Bu haftanın 2 ücretsiz talebi bitti 😩\nPazartesiyi bekleme, divalar beklemez.',
            limit: 'Bu haftaki 10 talebin doldu 😩\nSınırsıza geç, divalar beklemez.',
          }[reason] || 'Daha çok talep, daha çok drama ✦'}
        </Text>
        <Text style={styles.sheetSub}>Abonelik tüm hatlarında geçerli ✦</Text>
      </View>

      <View style={[styles.segment, { marginTop: 22 }]}>
        {PERIODS.map(x => (
          <Pressable key={x.k} onPress={() => { tap(); setPeriod(x.k); }} style={[styles.segBtn, period === x.k && styles.segOn]}>
            <Text style={[styles.segTxt, period === x.k && { color: '#fff' }]}>{x.t}</Text>
          </Pressable>
        ))}
      </View>

      {PAID.map(p => {
        const on = sel === p.k;
        return (
          <Pressable key={p.k} onPress={() => { tap(); setSel(p.k); }} style={{ marginTop: 18 }}>
            <LinearGradient colors={on ? HOT : ['#FFFFFF', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planOuter}>
              <View style={styles.planInner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{p.t}</Text>
                  <Text style={styles.planDesc}>{p.desc}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.planPrice}>{priceOf(p)}</Text>
                  <Text style={styles.planPer}>{per}</Text>
                </View>
              </View>
            </LinearGradient>
            {p.badge ? <Sticker text={p.badge} bg={C.butter} rotate="5deg" style={styles.planBadge} /> : null}
          </Pressable>
        );
      })}

      <ChromeButton
        hot big style={{ marginTop: 26 }} disabled={busy || plan === sel}
        title={plan === sel ? 'Zaten bu plandasın ✓' : busy ? 'Bekle bi sn... ✦' : !live && __DEV__ ? 'Abone ol (test) ✦' : 'Abone ol ✦'}
        onPress={subscribe}
      />
      <Pressable onPress={restoreBuys} disabled={busy}>
        <Text style={styles.restore}>Satın alımları geri yükle</Text>
      </Pressable>
      <Text style={styles.fine}>
        Abonelik seçtiğin döneme göre haftalık ya da aylık yenilenir; ücret Apple ID'nden alınır ve dönem bitmeden en az 24 saat önce iptal edilmedikçe otomatik yenilenir.
        App Store hesap ayarlarından istediğin zaman iptal edebilirsin.
      </Text>
      <Text style={styles.fine}>
        <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>Kullanım koşulları</Text>
        {PRIVACY_URL ? (
          <>
            {'  ·  '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>Gizlilik politikası</Text>
          </>
        ) : null}
      </Text>
    </Sheet>
  );
}

// Davet: kodu ve nasıl katılınacağını tek mesajda paylaşır
function InviteSheet({ visible, onClose, line, members, colors, fresh }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (visible) setCopied(false); }, [visible]);
  const share = () => { Share.share({ message: inviteMessage(line) }).catch(() => {}); };
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(line.code);
      success();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };
  const steps = [
    ['📲', 'Aşağıdaki butonla davet mesajını gönder (WhatsApp, Instagram, SMS...)'],
    ['⬇️', 'Arkadaşın TalApp\'i indirip kaydolsun'],
    ['🔑', `"Kodla katıl"a basıp kodu yazsın: ${line.code}`],
    ['🔔', 'Hattına katılınca sana bildirim gelir, artık talep atabilirsiniz'],
  ];
  return (
    <Sheet visible={visible} onClose={onClose} colors={colors}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 60 }}>{fresh ? '🎉' : '💌'}</Text>
        <HoloText style={styles.sheetTitle}>{fresh ? 'Hattın hazır!' : 'Kişileri davet et'}</HoloText>
        <Text style={styles.paySub}>
          {fresh ? 'Şimdi talep atacağın kişileri çağır 💌' : `${line.name} hattında şu an ${members} kişi var.`}
        </Text>
        <LinearGradient colors={CHROME} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.codeBox, styles.codeRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Davet kodun</Text>
            <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit>{line.code}</Text>
          </View>
          <Pressable onPress={copy} hitSlop={8} style={[styles.copyBtn, copied && { backgroundColor: C.mint }]}>
            <Text style={styles.copyTxt}>{copied ? 'Kopyalandı ✓' : 'Kopyala'}</Text>
          </Pressable>
        </LinearGradient>
      </View>

      <Glass style={{ marginTop: 22 }}>
        {steps.map(([e, t], i) => (
          <View key={i} style={[styles.stepRow, i > 0 && styles.histBorder]}>
            <Text style={styles.stepEmoji}>{e}</Text>
            <Text style={styles.stepTxt}>{t}</Text>
          </View>
        ))}
      </Glass>

      <ChromeButton hot big title="Davet mesajını gönder 📲" onPress={share} style={{ marginTop: 22 }} />
      {fresh ? (
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.restore}>Sonra davet ederim</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

// Kodla katıl: davet kodunu yazan hatta üye olur
function JoinSheet({ visible, onClose, onJoin, myName }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState(myName || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (visible) { setCode(''); setName(myName || ''); setBusy(false); setMsg(''); } }, [visible]);

  const submit = async () => {
    setBusy(true);
    setMsg('');
    const res = await onJoin(code.trim(), name.trim() || 'Ben');
    if (res === 'notfound') setMsg('Bu kodla bir hat bulamadık 🤔 Harfleri kontrol eder misin?');
    else if (res === 'error') setMsg('Olmadı 😵 İnternetini kontrol edip tekrar dener misin?');
    if (res !== 'ok') setBusy(false);
  };

  return (
    <Sheet visible={visible} onClose={onClose} colors={THEMES.bubblegum.colors}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 60 }}>🔑</Text>
        <HoloText style={styles.sheetTitle}>Kodla katıl</HoloText>
        <Text style={styles.paySub}>Davet kodunu gir ✦</Text>
      </View>
      <Label style={{ marginTop: 22 }}>Davet kodu</Label>
      <TextInput
        value={code} onChangeText={t => setCode(t.toUpperCase())} placeholder="DIVA-7K2QX" placeholderTextColor="#B79BCB"
        style={[styles.input, styles.codeInput]} autoCapitalize="characters" autoCorrect={false} maxLength={12}
      />
      <Label style={{ marginTop: 16 }}>Hatta adın ne olsun?</Label>
      <TextInput value={name} onChangeText={setName} placeholder="Kerime" placeholderTextColor="#B79BCB" style={styles.input} maxLength={20} />
      {msg ? <Glass style={{ marginTop: 16 }}><Text style={styles.info}>{msg}</Text></Glass> : null}
      <ChromeButton
        hot big title={busy ? 'Katılıyorsun... ✦' : 'Hatta katıl 🚀'} disabled={busy || code.trim().length < 6}
        onPress={submit} style={{ marginTop: 24 }}
      />
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Ana ekran
// ─────────────────────────────────────────────────────────────
// data: açık olan hat. Plan ve ücretsiz hak hesap düzeyinde, store'da.
// Değişiklikler önce ekrana yansır, sonra sunucuya gider; sunucu reddederse reload() doğru hali getirir.
// fresh: hat yeni kuruldu, davet ekranıyla açılır. openReq: bildirimden gelindi, bu talep açılır (sonra onOpened)
function Home({ data, setData, store, onHome, onPlan, reload, fresh, openReq, onOpened }) {
  const insets = useSafeAreaInsets();
  const colors = (THEMES[data.line.theme] || THEMES.bubblegum).colors;
  const viewer = data.members.find(m => m.id === data.meId) || { id: data.meId, name: '' };
  const others = data.members.filter(m => m.id !== viewer.id);
  const isOwner = data.owner === data.meId;
  const nameOf = id => (data.members.find(m => m.id === id) || { name: 'Eski üye' }).name;

  const [tab, setTab] = useState('in');
  const [sheet, setSheet] = useState(fresh ? 'invite' : null); // 'new' | 'detail' | 'paywall' | 'invite' | 'menu'
  const [freshInvite, setFreshInvite] = useState(!!fresh);
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [paywallReason, setPaywallReason] = useState('browse');
  const [toastMsg, setToastMsg] = useState(null);
  const [burst, setBurst] = useState(0);
  const toastA = useRef(new Animated.Value(0)).current;
  const membersRef = useRef(null);
  const tabsRef = useRef(null);
  const fabRef = useRef(null);
  const navRef = useRef(null);
  // Davet ekranı açıksa kapanınca başlar
  const [touring, endTour] = useTour('home', !sheet);

  const toast = msg => {
    setToastMsg(msg);
    toastA.setValue(0);
    Animated.sequence([
      Animated.spring(toastA, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
      Animated.delay(2300),
      Animated.timing(toastA, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  // iOS'ta iki modal üst üste açılamıyor: önce kapat, animasyon bitince devam et
  const closeThen = fn => { setSheet(null); setTimeout(fn, 450); };

  // Bildirime dokunarak gelindiyse o talebin içi açılır
  useEffect(() => {
    if (!openReq || !data.requests.some(r => r.id === openReq)) return;
    onOpened();
    const show = () => { setDetailId(openReq); setSheet('detail'); };
    if (sheet) closeThen(show);
    else show();
  }, [openReq, data.requests]);
  const openPaywall = reason => {
    setPaywallReason(reason);
    if (sheet) closeThen(() => setSheet('paywall'));
    else setSheet('paywall');
  };

  const plan = store.plan;
  const { limit, used } = quotaOf(plan, myUsedWeek(store));
  const left = Math.max(0, limit - used);
  const quotaHint = quotaHintOf(plan, left, store.tester);
  const limitReason = plan === 'free' ? 'free' : 'limit';

  const celebrate = msg => { success(); setBurst(Date.now()); toast(msg); };
  const failed = () => { toast('😵 Olmadı, internetini kontrol et'); reload(); };
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  // Durum değişikliği: ekranda hemen, sunucuda arkadan (karşı tarafa bildirimi sunucu atar)
  const change = (r, type, status, text) => {
    const history = [...r.history, { type, text, by: viewer.id, at: Date.now() }];
    setData(d => ({ ...d, requests: d.requests.map(x => (x.id === r.id ? { ...x, status, history } : x)) }));
    api.updateRequest(r.id, { status, history }).catch(failed);
  };

  // Onaylanan talep telefon takvimine girer ve 1 gün / 12 saat önce hatırlatılır; sonuç kutlama mesajına eklenir
  const toCalendar = r => {
    const ok = { ...r, status: 'approved' };
    const info = { lineId: data.id, line: data.line.name, cat: data.line.cats.find(c => c.id === r.catId) };
    scheduleReminders(ok, info);
    return addToCalendar(ok, info).then(res => (res === 'added' ? ' · 📅 takvimine eklendi' : ''));
  };

  const act = {
    approve: r => {
      change(r, 'approved', 'approved');
      const cal = toCalendar(r);
      closeThen(async () => celebrate(`💖 Onaylandı! ${nameOf(r.from)} uçuyor şu an${await cal}`));
    },
    reject: (r, reason) => {
      change(r, 'rejected', 'rejected', reason);
      closeThen(() => toast('💔 Reddedildi. Acımasızsın ama haklısın'));
    },
    nego: (r, text) => {
      change(r, 'nego', 'nego', text);
      closeThen(() => toast('🤝 Karşı teklif masada'));
    },
    accept: r => {
      change(r, 'accepted', 'approved');
      const cal = toCalendar(r);
      closeThen(async () => celebrate(`✅ Anlaştınız! Talep onaylandı${await cal}`));
    },
    appeal: (r, text) => {
      change(r, 'appeal', 'appeal', text);
      closeThen(() => toast('⚖️ İtiraz edildi, mahkeme toplanıyor'));
    },
    withdraw: r => {
      setData(d => ({ ...d, requests: d.requests.filter(x => x.id !== r.id) }));
      api.deleteRequest(r.id).catch(failed);
      closeThen(() => toast('🫥 Talep geri çekildi'));
    },
    nudge: rows => {
      const ready = rows.filter(canNudge);
      if (!ready.length) return;
      const ids = ready.map(x => x.id);
      const at = Date.now();
      setData(d => ({ ...d, requests: d.requests.map(x => (ids.includes(x.id) ? { ...x, nudgedAt: at } : x)) }));
      api.nudge(ids).catch(failed);
      closeThen(() => toast(`🔔 ${ready.length === 1 ? nameOf(ready[0].to) : `${ready.length} kişi`} tekrar dürtüldü`));
    },
    report: r => Alert.alert('Neden şikayet ediyorsun? 🚩', 'Şikayetin 24 saat içinde incelenir.', [
      ...['Uygunsuz içerik', 'Taciz / zorbalık', 'spam'].map(reason => ({
        text: reason,
        onPress: () => api.reportRequest(viewer.id, r, reason)
          .then(() => closeThen(() => toast('🚩 Şikayetin alındı, teşekkürler')))
          .catch(oops),
      })),
      { text: 'Vazgeç', style: 'cancel' },
    ]),
    block: id => Alert.alert(`${nameOf(id)} engellensin mi? 🚫`, 'Sana talep atamaz, talepleri de sana görünmez.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Engelle', style: 'destructive',
        onPress: () => api.blockUser(viewer.id, id)
          .then(() => { closeThen(() => toast('🚫 Engellendi')); reload(); })
          .catch(oops),
      },
    ]),
  };

  // true dönerse form kapanır
  const send = async ({ tos, catId, title, desc, urgency, image, date, time, place }) => {
    if (left <= 0) { openPaywall(limitReason); return false; }
    try {
      const rows = await api.sendRequest(data.id, {
        from: viewer.id, tos, catId, title: title.trim(), desc: desc.trim(), urgency, date, time,
        place: place.trim() || null, day: todayKey(), history: [{ type: 'created', by: viewer.id, at: Date.now() }],
      }, image && image.base64);
      // görsel, sunucudan imzalı adres gelene kadar telefondaki dosyadan gösterilir
      setData(d => ({ ...d, requests: [...rows.map(r => ({ ...r, image: image ? image.uri : null })), ...d.requests] }));
    } catch (e) {
      oops();
      return false;
    }
    setTab('out');
    closeThen(() => { success(); toast(`🚀 Talep fırlatıldı · ${tos.length > 1 ? `${tos.length} kişi` : nameOf(tos[0])} bildirim aldı 🔔`); });
    return true;
  };

  const addCat = (t, e) => {
    const c = { id: uid(), e: e || '✨', t };
    const cats = [...data.line.cats, c];
    setData(d => ({ ...d, line: { ...d.line, cats } }));
    api.setCats(data.id, cats).catch(failed);
    return c.id;
  };

  const planChanged = k => {
    onPlan(k);
    closeThen(() => celebrate(`👑 ${planOf(k).t} aktif!`));
  };

  const onFab = () => {
    if (!others.length) setSheet('invite');
    else if (left <= 0) openPaywall(limitReason);
    else setSheet('new');
  };

  const leave = () => Alert.alert(
    isOwner ? 'Hat silinsin mi?' : 'Hattan ayrılıyor musun?',
    isOwner ? 'Hat ve içindeki tüm talepler herkes için silinir.' : 'Bu hattaki talepleri artık göremezsin. Kodla tekrar katılabilirsin.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: isOwner ? 'Hattı sil' : 'Ayrıl', style: 'destructive',
        onPress: async () => {
          try {
            if (isOwner) await api.deleteLine(data.id);
            else await api.removeMember(data.id, viewer.id);
            setData(null);
          } catch (e) {
            oops();
          }
        },
      },
    ],
  );

  const kick = () => Alert.alert('Kimi hattan çıkarmak istiyorsun?', 'Çıkan kişi bu hattaki talepleri göremez.', [
    ...others.map(m => ({
      text: m.name,
      onPress: () => Alert.alert(`${m.name} hattan çıkarılsın mı?`, 'Davet kodunu bildiği için tekrar katılabilir; istemiyorsan talebinden onu engelle.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkar', style: 'destructive', onPress: () => api.removeMember(data.id, m.id).then(reload).catch(oops) },
      ]),
    })),
    { text: 'Vazgeç', style: 'cancel' },
  ]);

  const menuItems = [
    { e: '💌', t: 'Kişileri davet et', onPress: () => closeThen(() => setSheet('invite')) },
    { e: '👑', t: 'TalApp+ planları', onPress: () => openPaywall('browse') },
    ...(isOwner && others.length ? [{ e: '🚪', t: 'Birini hattan çıkar', onPress: () => closeThen(kick) }] : []),
    { e: isOwner ? '🗑️' : '👋', t: isOwner ? 'Hattı sil' : 'Hattan ayrıl', danger: true, onPress: () => closeThen(leave) },
  ];

  // Grup talebi "giden"de (atan için) ve "tüm hat"ta tek kart olur. "Gelen"de her satır tek tek durur,
  // çünkü herkes kendi cevabını verir (pazarlık gelince talebi atan da o kişiye ayrıca cevap verir).
  const groupRows = g => (g ? data.requests.filter(x => x.group === g) : []);
  const list = [];
  const seenGroups = new Set();
  [...data.requests].sort((a, b) => b.createdAt - a.createdAt).forEach(r => {
    if (r.group && (tab === 'all' || (tab === 'out' && r.from === viewer.id))) {
      if (!seenGroups.has(r.group)) { seenGroups.add(r.group); list.push({ key: r.group, r, rows: groupRows(r.group) }); }
      return;
    }
    if (tab === 'in' ? isIncoming(r, viewer.id) : tab === 'out' ? isOutgoing(r, viewer.id) : true) list.push({ key: r.id, r });
  });
  const inPending = data.requests.filter(r => myTurn(r, viewer.id)).length;
  const detail = data.requests.find(r => r.id === detailId);
  const detailGroup = groupRows(detail && detail.group);
  const openGroup = g => { setGroupId(g); setSheet('group'); };
  const openRow = id => closeThen(() => { setDetailId(id); setSheet('detail'); });

  const EMPTY = {
    in: ['📭', 'Gelen kutun bomboş', 'Biri sana talep atınca burada parlayacak ✦'],
    out: ['🚀', 'Henüz talep atmadın', 'İlk talebini fırlat, bakalım onaylanacak mı 👀'],
    all: ['🫧', 'Hat sessiz...', 'Fırtına öncesi sessizlik bu 🌪️'],
  }[tab];

  return (
    <HoloBg colors={colors}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink} />}
      >
        <View style={styles.homeHead}>
          <View style={styles.lineEmoji}><Text style={{ fontSize: 30 }}>{data.line.emoji}</Text></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.kicker}>Talep hattı ✦</Text>
            <Text style={styles.lineName} numberOfLines={2}>{data.line.name}</Text>
          </View>
          <View ref={navRef} collapsable={false} style={{ flexDirection: 'row' }}>
            <Pressable onPress={() => { tap(); onHome(); }} hitSlop={10} style={[styles.gear, { marginRight: 8 }]}>
              <Text style={{ fontSize: 18 }}>🏠</Text>
            </Pressable>
            <Pressable onPress={() => { tap(); setSheet('menu'); }} hitSlop={10} style={styles.gear}>
              <Text style={{ fontSize: 20, color: C.ink }}>⚙︎</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Bu hatta kimler var 🫶</Text>
        <View ref={membersRef} collapsable={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
          {data.members.map((m, i) => {
            const me = m.id === viewer.id;
            return (
              <View key={m.id} style={[styles.viewerChip, me && styles.viewerChipOn]}>
                <Avatar name={m.name} index={i} size={30} active={me} uri={m.avatar} />
                <Text style={[styles.viewerName, me && { color: '#fff' }]}>{me ? `${m.name} (sen)` : m.name}</Text>
              </View>
            );
          })}
          <Pressable onPress={() => { tap(); setSheet('invite'); }} style={[styles.viewerChip, styles.inviteChip]}>
            <Text style={[styles.viewerName, { color: C.hot }]}>＋ Davet et</Text>
          </Pressable>
        </ScrollView>
        </View>

        {!others.length ? (
          <Pressable onPress={() => { tap(); setSheet('invite'); }}>
            <Glass style={styles.aloneCard}>
              <Text style={{ fontSize: 26 }}>💌</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aloneTitle}>Hattında henüz kimse yok</Text>
                <Text style={styles.aloneSub}>Talep atmak için birini davet et</Text>
              </View>
              <Text style={styles.aloneBtn}>Davet et ›</Text>
            </Glass>
          </Pressable>
        ) : null}

        <Glass style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bu haftaki talep hakkın</Text>
              <HoloText style={styles.quotaBig}>{limit === Infinity ? '∞' : `${left}/${limit}`}</HoloText>
              <Text style={styles.quotaHint}>{quotaHint}</Text>
            </View>
            {plan === 'free'
              ? <ChromeButton small hot title="TalApp+ 👑" onPress={() => openPaywall('browse')} />
              : <Pressable onPress={() => openPaywall('browse')}><Sticker text={`👑 ${planOf(plan).short}`} bg={C.butter} rotate="6deg" /></Pressable>}
          </View>
          {limit !== Infinity && limit > 0 ? (
            <View style={styles.bar}>
              <LinearGradient colors={HOT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.min(100, (used / limit) * 100)}%`, height: '100%', borderRadius: 99 }} />
            </View>
          ) : null}
        </Glass>

        <View ref={tabsRef} collapsable={false} style={styles.tabs}>
          {[['in', 'Gelen'], ['out', 'Giden'], ['all', 'Tüm hat']].map(([k, t]) => (
            <Pressable key={k} onPress={() => { tap(); setTab(k); }} style={[styles.tab, tab === k && styles.tabOn]}>
              <Text style={[styles.tabTxt, tab === k && styles.tabTxtOn]}>{t}</Text>
              {k === 'in' && inPending > 0 ? <View style={styles.badge}><Text style={styles.badgeTxt}>{inPending}</Text></View> : null}
            </Pressable>
          ))}
        </View>

        {list.length === 0 ? (
          <Glass style={{ alignItems: 'center', paddingVertical: 34, marginTop: 18 }}>
            <Text style={{ fontSize: 54 }}>{EMPTY[0]}</Text>
            <Text style={styles.emptyTitle}>{EMPTY[1]}</Text>
            <Text style={styles.emptySub}>{EMPTY[2]}</Text>
          </Glass>
        ) : list.map(({ key, r, rows }) => (
          <RequestCard
            key={key} r={r}
            cat={data.line.cats.find(c => c.id === r.catId)}
            fromName={nameOf(r.from)} toName={rows ? `${rows.length} kişi` : nameOf(r.to)}
            tally={rows ? tallyOf(rows) : null}
            note={!rows && r.group ? `👥 Grup talebi · ${tallyText(tallyOf(groupRows(r.group)))}` : null}
            onPress={() => (rows ? openGroup(r.group) : (setDetailId(r.id), setSheet('detail')))}
          />
        ))}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
        <View ref={fabRef} collapsable={false}>
          <ChromeButton hot big title={others.length ? '✦ TALEP AT ✦' : '💌 KİŞİLERİ DAVET ET'} onPress={onFab} />
        </View>
      </View>

      {toastMsg ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, {
            top: insets.top + 8, opacity: toastA,
            transform: [{ translateY: toastA.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
          }]}
        >
          <Text style={styles.toastTxt}>{toastMsg}</Text>
        </Animated.View>
      ) : null}

      <Confetti burst={burst} />

      <NewRequestSheet visible={sheet === 'new'} onClose={() => setSheet(null)} data={data} viewer={viewer} colors={colors} onSend={send} onAddCat={addCat} left={left} />
      <DetailSheet
        visible={sheet === 'detail'} onClose={() => setSheet(null)} r={detail} data={data} viewer={viewer} colors={colors} act={act}
        group={detailGroup} onGroup={() => closeThen(() => openGroup(detail.group))}
      />
      <GroupSheet
        visible={sheet === 'group'} onClose={() => setSheet(null)} rows={groupRows(groupId)} data={data} viewer={viewer} colors={colors}
        onOpen={openRow} onNudge={act.nudge}
      />
      <PaywallSheet visible={sheet === 'paywall'} onClose={() => setSheet(null)} reason={paywallReason} plan={plan} colors={colors} onPlan={planChanged} />
      <InviteSheet
        visible={sheet === 'invite'} onClose={() => { setSheet(null); setFreshInvite(false); }}
        line={data.line} members={data.members.length} colors={colors} fresh={freshInvite}
      />
      <MenuSheet
        visible={sheet === 'menu'} onClose={() => setSheet(null)} colors={colors} items={menuItems}
        head={(
          <>
            <Text style={{ fontSize: 56 }}>{data.line.emoji}</Text>
            <HoloText style={styles.sheetTitle}>{data.line.name}</HoloText>
            <Text style={styles.sheetSub}>{data.members.length} kişi · davet kodu {data.line.code}</Text>
          </>
        )}
      />
      {touring ? (
        <Tour
          onFinish={endTour}
          steps={[
            {
              ref: membersRef, title: 'Hattaki kişiler 🫶',
              text: 'Hattında kimler var burada görürsün. "＋ Davet et" ile sevgilini ya da kankalarını çağır, davet kodunu paylaş.',
            },
            {
              ref: tabsRef, title: 'Gelen · giden · tüm hat 📬',
              text: 'Sana gelen talepler, senin attıkların ve hattaki her şey. Cevap bekleyenler pembe rozetle görünür. Bir talebe dokununca onaylar, reddeder ya da pazarlık edersin 🤝',
            },
            {
              ref: fabRef, title: others.length ? 'Talep at ✦' : 'Önce birini davet et 💌',
              text: `${others.length ? 'Ne istediğini yaz' : 'Biri hattına katılınca bu buton "✦ TALEP AT ✦" olur'}; gün, saat, konum ve fotoğraf ekleyebilirsin. Talep onaylanınca gün ve saatiyle telefon takvimine otomatik eklenir 📅 ve 1 gün, 12 saat önce hatırlatılır 🔔`,
            },
            {
              ref: navRef, title: 'Ana sayfa ve ayarlar',
              text: 'Tüm hatlarına 🏠 ile dönersin. Kişileri davet etmek, TalApp+ planlarına bakmak ve hattını yönetmek için ⚙︎ butonuna bas.',
            },
          ]}
        />
      ) : null}
    </HoloBg>
  );
}

// ─────────────────────────────────────────────────────────────
// Ana sayfa: tüm hatlar
// ─────────────────────────────────────────────────────────────
function Lines({ store, userName, onOpen, onNew, onJoin, onAccount, onAvatar, onPlan, reload, tourRun }) {
  const insets = useSafeAreaInsets();
  const { limit, used } = quotaOf(store.plan, myUsedWeek(store));
  const left = Math.max(0, limit - used);
  const [joinOpen, setJoinOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const planChanged = k => {
    onPlan(k);
    setPayOpen(false);
    setTimeout(() => { success(); Alert.alert(`👑 ${planOf(k).t} aktif!`, 'Haftalık talep hakkın hemen güncellendi ✦'); }, 450);
  };
  const quotaRef = useRef(null);
  const newRef = useRef(null);
  const joinRef = useRef(null);
  const accountRef = useRef(null);
  // tourRun artınca (hesap → nasıl kullanılır?) tur yeniden gösterilir
  const [touring, endTour] = useTour('lines', tourRun);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };
  const join = async (code, name) => {
    const res = await onJoin(code, name);
    if (res === 'ok') setJoinOpen(false);
    return res;
  };
  return (
    <HoloBg colors={THEMES.bubblegum.colors}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 190 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink} />}
      >
        <View style={styles.homeHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{userName ? `Selam ${userName} 👋` : 'Ana sayfa ✦'}</Text>
            <HoloText style={styles.hubTitle}>Hatlarım</HoloText>
          </View>
          <Pressable ref={accountRef} onPress={() => { tap(); onAccount(); }} hitSlop={10} style={store.avatar ? null : styles.gear}>
            {store.avatar
              ? <Avatar name={userName} index={0} size={48} uri={store.avatar} />
              : <Text style={{ fontSize: 18 }}>👤</Text>}
          </Pressable>
        </View>
        {!store.avatar ? (
          <Pressable onPress={() => { tap(); onAvatar(); }} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={styles.avatarHint}>📸 Profil fotoğrafı ekle (isteğe bağlı)</Text>
          </Pressable>
        ) : null}

        <View ref={quotaRef} collapsable={false} style={{ marginTop: 14 }}>
          <Glass>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Bu haftaki talep hakkın</Text>
                <HoloText style={styles.quotaBig}>{limit === Infinity ? '∞' : `${left}/${limit}`}</HoloText>
                <Text style={styles.quotaHint}>{quotaHintOf(store.plan, left, store.tester)}</Text>
              </View>
              {store.plan === 'free'
                ? <ChromeButton small hot title="TalApp+ 👑" onPress={() => setPayOpen(true)} />
                : <Pressable onPress={() => setPayOpen(true)}><Sticker text={`👑 ${planOf(store.plan).short}`} bg={C.butter} rotate="6deg" /></Pressable>}
            </View>
          </Glass>
        </View>

        {store.lines.length === 0 ? (
          <Glass style={{ alignItems: 'center', paddingVertical: 34, marginTop: 18 }}>
            <Text style={{ fontSize: 54 }}>🫧</Text>
            <Text style={styles.emptyTitle}>Henüz hattın yok</Text>
            <Text style={styles.emptySub}>
              Kendi hattını kur ya da sana gelen davet koduyla bir hatta katıl ✦{'\n'}sevgilin, kankaların, ev arkadaşların...
            </Text>
          </Glass>
        ) : null}

        {store.lines.map(l => {
          const pending = l.requests.filter(r => myTurn(r, l.meId)).length;
          return (
            <Pressable key={l.id} onPress={() => { tap(); onOpen(l.id); }} style={({ pressed }) => [{ marginTop: 16, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <Glass style={styles.lineRow}>
                <View style={styles.cardEmoji}><Text style={{ fontSize: 26 }}>{l.line.emoji}</Text></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{l.line.name}</Text>
                  <Text style={styles.cardMeta}>{l.members.length} kişi · {l.requests.length} talep</Text>
                </View>
                {pending > 0 ? <View style={styles.badge}><Text style={styles.badgeTxt}>{pending}</Text></View> : null}
                <Text style={styles.chevron}>›</Text>
              </Glass>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
        <View ref={joinRef} collapsable={false} style={{ marginBottom: 12 }}>
          <ChromeButton title="🔑 Kodla katıl" onPress={() => setJoinOpen(true)} />
        </View>
        <View ref={newRef} collapsable={false}>
          <ChromeButton hot big title="＋ YENİ HAT KUR" onPress={onNew} />
        </View>
      </View>

      <JoinSheet visible={joinOpen} onClose={() => setJoinOpen(false)} onJoin={join} myName={userName} />
      <PaywallSheet
        visible={payOpen} onClose={() => setPayOpen(false)} reason="browse" plan={store.plan}
        colors={THEMES.bubblegum.colors} onPlan={planChanged}
      />
      {touring ? (
        <Tour
          onFinish={endTour}
          steps={[
            {
              ref: quotaRef, title: 'Haftalık talep hakkın 🎁',
              text: `Ücretsiz planda haftada ${PLANS[0].limit} talep atabilirsin. Hak bütün hatlarında ortak ve her pazartesi yenilenir.`,
            },
            {
              ref: newRef, title: 'Kendi hattını kur ✦',
              text: 'Sevgilin, kankaların ya da ev arkadaşların için bir talep hattı aç. Mesela "Diva Talep Hattı" 💅 İstediğin kadar hat kurabilirsin.',
            },
            {
              ref: joinRef, title: 'Kodla katıl 🔑',
              text: 'Biri seni kendi hattına çağırdıysa buraya bas ve davet kodunu gir.',
            },
            {
              ref: accountRef, title: 'Hesabın 👤',
              text: 'Profil fotoğrafı, destek, çıkış ve hesap ayarların burada. Bu rehberi de buradan tekrar izleyebilirsin.',
            },
          ]}
        />
      ) : null}
    </HoloBg>
  );
}

// ─────────────────────────────────────────────────────────────
// Kök
// ─────────────────────────────────────────────────────────────
const EMPTY_STORE = { userId: null, lines: [], activeId: null, plan: 'free' };

export default function App() {
  const [fontsLoaded] = useFonts({ Unbounded_500Medium, Unbounded_700Bold, Unbounded_900Black });
  const [store, setStore] = useState(null);
  const [adding, setAdding] = useState(false);
  const [freshId, setFreshId] = useState(null); // yeni kurulan hat davet ekranıyla açılır
  const [tourRun, setTourRun] = useState(0);
  const [menu, setMenu] = useState(false); // hesap menüsü
  const [openReq, setOpenReq] = useState(null); // bildirimden açılacak talep
  const [session, setSession] = useState(undefined); // undefined: henüz bilinmiyor
  const userId = session ? session.user.id : null;
  const userRef = useRef(null);
  userRef.current = userId;
  const loaded = store !== null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      let s = null;
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw) s = JSON.parse(raw);
      } catch (e) {}
      // uygulama her açılışta "hatlarım"dan başlar
      setStore(s ? { ...s, activeId: null } : EMPTY_STORE);
    })();
  }, []);

  useEffect(() => {
    if (store) AsyncStorage.setItem(STORE_KEY, JSON.stringify(store)).catch(() => {});
  }, [store]);

  // Sunucudaki son hali getirir; bağlantı yoksa telefondaki kopya görünmeye devam eder
  const reload = async () => {
    const id = userRef.current;
    if (!id) return;
    try {
      const res = await api.fetchAll(id);
      if (userRef.current !== id) return; // bu arada çıkış yapıldı
      setStore(s => ({
        ...s, userId: id, lines: res.lines, avatar: res.avatar, name: res.name, tester: res.tester, needsProfile: !res.hasProfile,
        activeId: res.lines.some(l => l.id === s.activeId) ? s.activeId : null,
      }));
      // başka telefonda onaylanan taleplerim takvime girer (kullanıcıya söylenir) ve hatırlatması kurulur
      syncReminders(res.lines).catch(() => {});
      syncCalendar(res.lines).then(added => {
        if (!added.length) return;
        const r = added[0];
        Alert.alert('Takvimine ekledim 📅', added.length === 1
          ? `"${r.title}" onaylandı 💖\n${dayLabel(r.date)}${r.time ? ` · ${r.time}` : ''} olarak telefon takvimine eklendi.`
          : `${added.length} onaylı talebin telefon takvimine eklendi 💖`);
      });
    } catch (e) {
      // çevrimdışı
    }
  };

  // Giriş yapılınca: veriyi çek, bildirim adresini kaydet, aboneliği öğren, canlı güncellemeyi dinle
  useEffect(() => {
    if (!userId || !loaded) return;
    // başka hesabın telefondaki kopyası görünmesin
    setStore(s => (s.userId === userId ? s : { ...EMPTY_STORE, userId }));
    reload();
    // izin alınınca iki günde bir "bir talep aç" bildirimleri de kurulur
    registerPush().then(scheduleEngage);

    let offPlan = () => {};
    initPurchases(userId).then(k => {
      if (!purchasesEnabled()) return; // anahtar yokken plan telefonda kalır (geliştirmede test aboneliği)
      setStore(s => ({ ...s, plan: k }));
      offPlan = onPlanChange(p => setStore(s => ({ ...s, plan: p })));
    });

    let timer = null;
    const offLive = api.subscribeChanges(() => { clearTimeout(timer); timer = setTimeout(reload, 400); });
    const appSub = AppState.addEventListener('change', st => { if (st === 'active') reload(); });
    const offPush = onPushOpen((lineId, reqId) => {
      setAdding(false);
      reload().then(() => {
        setOpenReq(reqId);
        setStore(s => ({ ...s, activeId: lineId }));
      });
    });
    return () => { offPlan(); offLive(); appSub.remove(); offPush(); clearTimeout(timer); };
  }, [userId, loaded]);

  if (!fontsLoaded || !store || session === undefined) return <View style={{ flex: 1, backgroundColor: '#FFC6EC' }} />;

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  const user = session.user;
  const userName = store.name || userNameOf(user);
  const active = store.lines.find(l => l.id === store.activeId);
  // Test kullanıcısı abonelik olmadan sınırsız
  const view = store.tester ? { ...store, plan: 'inf' } : store;

  const signOut = async () => {
    await clearPush();
    await clearReminders();
    await logOutPurchases();
    setStore(EMPTY_STORE);
    await supabase.auth.signOut().catch(() => {});
  };
  const deleteAccount = () => Alert.alert(
    'Hesabın silinsin mi? 🥺',
    'Hesabın, profilin ve kurduğun hatlar kalıcı olarak silinir. Aynı hesapla Yumi kullanıyorsan oradaki hesabın da silinir.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabımı sil', style: 'destructive',
        onPress: async () => {
          await api.removeAvatarFiles(user.id);
          const { error } = await supabase.rpc('delete_user');
          if (error) { oops(); return; }
          await clearReminders();
          await logOutPurchases();
          setStore(EMPTY_STORE);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        },
      },
    ],
  );
  const pickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.4, allowsEditing: true, aspect: [1, 1], base64: true,
      });
      if (res.canceled || !res.assets || !res.assets.length) return;
      const url = await api.setAvatar(user.id, res.assets[0].base64);
      setStore(s => ({ ...s, avatar: url }));
      reload();
    } catch (e) {
      oops();
    }
  };
  const removeAvatar = () => api.setAvatar(user.id, null)
    .then(() => { setStore(s => ({ ...s, avatar: null })); reload(); })
    .catch(oops);

  // E-postayla açılmış hesaba Apple'ı ekler: sonra Apple ile girince de bu hesaba gelir.
  // (Apple e-postayı gizleyebildiği için iki hesabı kendiliğinden eşleyemeyiz.)
  const appleLinked = (user.identities || []).some(i => i.provider === 'apple');
  const linkApple = async () => {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      const { error } = await supabase.auth.linkIdentity({ provider: 'apple', token: cred.identityToken });
      if (error) throw error;
      Alert.alert('Apple bağlandı 🍏', 'Artık Apple ile girince de bu hesaba gelirsin.');
    } catch (e) {
      if (e && e.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(
        'Apple bağlanamadı 😵',
        e && e.code === 'identity_already_exists'
          ? 'Bu Apple hesabıyla açılmış başka bir TalApp hesabı var. Önce onu silmen gerekiyor: Apple ile gir → Hesabımı sil, sonra e-postayla girip tekrar bağla.'
          : 'Biraz sonra tekrar dener misin?',
      );
    }
  };

  // Hesap menüsü bir sayfa; açtığı şey (galeri, uyarı) sayfa kapanınca açılır
  const closeMenuThen = fn => { setMenu(false); setTimeout(fn, 450); };
  const accountItems = [
    { e: '📸', t: store.avatar ? 'Profil fotoğrafını değiştir' : 'Profil fotoğrafı ekle', onPress: () => closeMenuThen(pickAvatar) },
    ...(store.avatar ? [{ e: '🫥', t: 'Fotoğrafı kaldır', onPress: () => closeMenuThen(removeAvatar) }] : []),
    ...(Platform.OS === 'ios' && !appleLinked ? [{ e: '🍏', t: 'Apple ile girişi bağla', onPress: () => closeMenuThen(linkApple) }] : []),
    { e: '🧭', t: 'Nasıl kullanılır?', onPress: () => closeMenuThen(() => AsyncStorage.removeItem(TOUR_KEY).catch(() => {}).then(() => setTourRun(n => n + 1))) },
    // App Store sürümünde görünmez
    ...(__DEV__ ? [{
      e: '🔔', t: 'Test bildirimi (10 sn)',
      onPress: () => closeMenuThen(() => testReminder().then(ok => Alert.alert(
        ok ? '10 saniye bekle 🔔' : 'Bildirim izni kapalı',
        ok ? 'İstersen uygulamayı arka plana al.' : 'Ayarlar → Expo Go → Bildirimler',
      ))),
    }] : []),
    { e: '✉️', t: 'Destek / iletişim', onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => Alert.alert('Destek', SUPPORT_EMAIL)) },
    { e: '🔒', t: 'Gizlilik politikası', onPress: () => Linking.openURL(PRIVACY_URL).catch(() => {}) },
    { e: '👋', t: 'Çıkış yap', danger: true, onPress: () => closeMenuThen(signOut) },
    { e: '🗑️', t: 'Hesabımı sil', danger: true, onPress: () => closeMenuThen(deleteAccount) },
  ];
  const accountMenu = (
    <MenuSheet
      visible={menu} onClose={() => setMenu(false)} colors={THEMES.bubblegum.colors} items={accountItems}
      head={(
        <>
          <Avatar name={userName} index={0} size={78} uri={store.avatar} />
          <HoloText style={styles.sheetTitle}>{userName || 'Hesabım'}</HoloText>
          <Text style={styles.sheetSub}>{user.email}</Text>
          <Sticker
            text={store.tester ? '🧪 TEST · SINIRSIZ' : `👑 ${planOf(view.plan).short}`}
            bg={C.butter} rotate="-3deg" style={{ alignSelf: 'center', marginTop: 10 }}
          />
        </>
      )}
    />
  );

  const finishProfile = async (name, age) => {
    await api.ensureProfile(name, age);
    AsyncStorage.removeItem(APPLE_NAME_KEY).catch(() => {});
    setStore(s => ({ ...s, name, needsProfile: false }));
    reload();
  };

  // Hata fırlatırsa Onboarding uyarı gösterir
  const addLine = async line => {
    const id = await api.createLine(line, makeCode);
    await reload();
    setFreshId(id);
    setStore(s => ({ ...s, activeId: id }));
    setAdding(false);
  };
  const joinLine = async (code, name) => {
    try {
      const id = await api.joinLine(code, name);
      if (!id) return 'notfound';
      await reload();
      setStore(s => ({ ...s, activeId: id }));
      return 'ok';
    } catch (e) {
      return 'error';
    }
  };
  // Home açık hattı bununla günceller; null verirse hat listeden çıkar
  const setLine = fn => setStore(s => {
    const cur = s.lines.find(l => l.id === s.activeId);
    if (!cur) return s;
    const next = typeof fn === 'function' ? fn(cur) : fn;
    if (!next) return { ...s, lines: s.lines.filter(l => l.id !== cur.id), activeId: null };
    return { ...s, lines: s.lines.map(l => (l.id === cur.id ? next : l)) };
  });

  let screen;
  if (store.needsProfile) {
    screen = <ProfileSetup initialName={userName} onDone={finishProfile} onSignOut={signOut} />;
  } else if (adding) {
    screen = <Onboarding onDone={addLine} onCancel={() => setAdding(false)} myName={userName || meName(store.lines[0])} />;
  } else if (active) {
    screen = (
      <Home
        key={active.id} data={active} setData={setLine} store={view} reload={reload}
        fresh={freshId === active.id} onPlan={k => setStore(s => ({ ...s, plan: k }))}
        onHome={() => { setFreshId(null); setStore(s => ({ ...s, activeId: null })); }}
        openReq={openReq} onOpened={() => setOpenReq(null)}
      />
    );
  } else {
    screen = (
      <Lines
        store={view} userName={userName} reload={reload} onAccount={() => setMenu(true)} onAvatar={pickAvatar} tourRun={tourRun}
        onOpen={id => setStore(s => ({ ...s, activeId: id }))} onNew={() => setAdding(true)} onJoin={joinLine}
        onPlan={k => setStore(s => ({ ...s, plan: k }))}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
      {accountMenu}
    </SafeAreaProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Stiller
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheen: {
    position: 'absolute', top: -120, left: -80, width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  holoShadow: { position: 'absolute', left: 2, top: 3, color: '#fff' },
  // iPad'de içerik bu genişlikte ortalanır
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },

  appleBtn: { width: '100%', height: 54, marginTop: 14 },
  orTxt: { fontFamily: F.med, fontSize: 12, color: C.inkSoft, textAlign: 'center', marginVertical: 12 },
  inputBad: { borderColor: '#FF6B9A' },

  menuBox: { marginTop: 18, paddingVertical: 4, paddingHorizontal: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1.5, borderColor: '#fff',
  },
  menuIconDanger: { backgroundColor: '#FFE0EA' },
  menuTxt: { flex: 1, fontFamily: F.bold, fontSize: 14, color: C.ink },
  menuTxtDanger: { color: '#D61F5B' },

  logo: { fontFamily: F.black, fontSize: 56, letterSpacing: -2, marginTop: 18 },
  tagline: { fontFamily: F.med, fontSize: 15, color: C.ink, textAlign: 'center', lineHeight: 23, marginTop: 10 },
  gift: { fontFamily: F.med, fontSize: 12, color: C.inkSoft, textAlign: 'center', marginTop: 14 },

  float: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 22, borderWidth: 2, borderColor: '#fff',
    paddingVertical: 12, paddingHorizontal: 14,
    shadowColor: C.violet, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5,
  },
  floatTitle: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  btnShadow: { shadowColor: C.violet, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4, borderRadius: 999 },
  btnShadowHot: { shadowColor: C.hot, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6, borderRadius: 999 },
  btn: {
    borderRadius: 999, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff', overflow: 'hidden',
  },
  btnBig: { paddingVertical: 20, paddingHorizontal: 30 },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 16 },
  btnShine: {
    position: 'absolute', top: 2, left: 14, right: 14, height: '45%', borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  btnText: { fontFamily: F.bold, fontSize: 14 },
  btnTextBig: { fontFamily: F.black, fontSize: 17, letterSpacing: 0.5 },
  btnTextSmall: { fontSize: 12 },

  glass: {
    backgroundColor: 'rgba(255,255,255,0.58)', borderRadius: 28, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)',
    padding: 18,
    shadowColor: C.violet, shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 3,
  },

  sticker: {
    alignSelf: 'flex-start', borderWidth: 2, borderColor: C.ink, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    shadowColor: C.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 3 }, elevation: 2,
  },
  stickerSmall: { paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1.5, borderRadius: 8 },
  stickerTxt: { fontFamily: F.bold, fontSize: 10, color: C.ink, letterSpacing: 0.5 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: '#fff',
  },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontFamily: F.med, fontSize: 12, color: C.ink },
  chipTxtOn: { color: '#fff' },
  toChip: {
    flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: '#fff',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pickTxt: { fontSize: 16, fontWeight: '600', color: C.ink },
  fieldNote: { fontFamily: F.med, fontSize: 11, color: C.hot, marginTop: 6, marginLeft: 6 },

  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  calArrowTxt: { fontFamily: F.black, fontSize: 20, color: C.ink, marginTop: -2 },
  calTitle: { fontFamily: F.black, fontSize: 15, color: C.ink },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeek: { width: '14.2857%', textAlign: 'center', fontFamily: F.med, fontSize: 10, color: C.inkSoft, marginBottom: 6 },
  calCell: { width: '14.2857%', alignItems: 'center', paddingVertical: 2 },
  calDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 1.5, borderColor: C.ink },
  calOn: { backgroundColor: C.ink },
  calDayTxt: { fontFamily: F.bold, fontSize: 13, color: C.ink },

  label: { fontFamily: F.med, fontSize: 11, color: C.inkSoft, letterSpacing: 0.6 },
  kicker: { fontFamily: F.med, fontSize: 11, color: C.inkSoft, letterSpacing: 0.6 },
  hint: { fontFamily: F.med, fontSize: 11, color: C.inkSoft, marginTop: 12, lineHeight: 17, textAlign: 'center' },
  info: { fontFamily: F.med, fontSize: 13, color: C.ink, textAlign: 'center', lineHeight: 20 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 20, borderWidth: 2, borderColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600', color: C.ink, marginTop: 10,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 14 },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },

  stepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontFamily: F.med, fontSize: 13, color: C.ink },
  dot: { width: 26, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
  dotOn: { backgroundColor: C.ink },
  stepNo: { fontFamily: F.med, fontSize: 11, color: C.inkSoft, marginTop: 26, letterSpacing: 0.6 },
  stepTitle: { fontFamily: F.black, fontSize: 28, color: C.ink, marginTop: 6, letterSpacing: -0.5, lineHeight: 36 },
  stepSub: { fontFamily: F.med, fontSize: 13, color: C.inkSoft, marginTop: 8, lineHeight: 20 },

  emojiBox: {
    width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
  },
  emojiBoxOn: { borderColor: C.ink, backgroundColor: '#fff', transform: [{ scale: 1.08 }] },
  preview: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  previewName: { fontFamily: F.black, fontSize: 18, color: C.ink, marginTop: 4 },

  themeRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  themeCell: { width: '25%', alignItems: 'center' },
  swatch: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  swatchOn: { borderColor: C.ink, transform: [{ scale: 1.08 }] },
  swatchTxt: { fontFamily: F.med, fontSize: 10, color: C.ink, marginTop: 8, textAlign: 'center' },

  homeHead: { flexDirection: 'row', alignItems: 'center' },
  lineEmoji: {
    width: 58, height: 58, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.ink, transform: [{ rotate: '-6deg' }],
    shadowColor: C.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
  },
  lineName: { fontFamily: F.black, fontSize: 21, color: C.ink, letterSpacing: -0.5, marginTop: 2 },
  hubTitle: { fontFamily: F.black, fontSize: 40, letterSpacing: -1.5, marginTop: 2 },
  lineRow: { flexDirection: 'row', alignItems: 'center' },
  chevron: { fontFamily: F.black, fontSize: 24, color: C.inkSoft, marginLeft: 10 },
  gear: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  viewerChip: {
    flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 14, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1.5, borderColor: '#fff', marginTop: 8, minHeight: 40,
  },
  viewerChipOn: { backgroundColor: C.ink, borderColor: C.ink },
  viewerName: { fontFamily: F.bold, fontSize: 12, color: C.inkSoft, marginLeft: 8 },

  quotaBig: { fontFamily: F.black, fontSize: 40, letterSpacing: -1, marginTop: 4 },
  quotaHint: { fontFamily: F.med, fontSize: 11, color: C.inkSoft, marginTop: 2 },
  bar: { height: 10, borderRadius: 99, backgroundColor: 'rgba(43,15,69,0.08)', marginTop: 14, overflow: 'hidden' },

  tabs: {
    flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 999, padding: 5,
    borderWidth: 1.5, borderColor: '#fff',
  },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 999, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  tabOn: { backgroundColor: C.ink },
  tabTxt: { fontFamily: F.bold, fontSize: 12, color: C.inkSoft },
  tabTxtOn: { color: '#fff' },
  badge: { marginLeft: 6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.hot, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeTxt: { fontFamily: F.black, fontSize: 10, color: '#fff' },

  card: { flexDirection: 'row', alignItems: 'center', paddingTop: 22 },
  cardUrgent: { borderColor: C.hot, borderWidth: 2.5, shadowColor: C.hot, shadowOpacity: 0.45 },
  cardEmoji: {
    width: 52, height: 52, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(43,15,69,0.1)',
  },
  cardCat: { fontFamily: F.med, fontSize: 9, color: C.inkSoft, letterSpacing: 1 },
  cardTitle: { fontFamily: F.bold, fontSize: 15, color: C.ink, marginTop: 3, lineHeight: 20 },
  cardMeta: { fontSize: 12, fontWeight: '600', color: C.inkSoft, marginTop: 4 },
  cardTally: { fontFamily: F.bold, fontSize: 12, color: C.ink, marginTop: 4 },
  groupNote: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  groupName: { flex: 1, marginLeft: 10, fontFamily: F.bold, fontSize: 14, color: C.ink },
  groupArrow: { fontSize: 20, color: C.inkSoft, marginLeft: 8 },
  cardWhen: { fontSize: 12, fontWeight: '700', color: C.ink, marginTop: 4 },
  cardThumb: { width: 54, height: 54, borderRadius: 14, marginLeft: 10, borderWidth: 2, borderColor: '#fff' },
  cardSticker: { position: 'absolute', top: -10, right: 14 },

  emptyTitle: { fontFamily: F.black, fontSize: 17, color: C.ink, marginTop: 10 },
  emptySub: { fontFamily: F.med, fontSize: 12, color: C.inkSoft, marginTop: 6, textAlign: 'center', lineHeight: 18 },

  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  toast: {
    position: 'absolute', left: 18, right: 18, backgroundColor: C.ink, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18,
    shadowColor: C.hot, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  toastTxt: { fontFamily: F.bold, fontSize: 13, color: '#fff', textAlign: 'center' },

  tourShade: { position: 'absolute', backgroundColor: 'rgba(43,15,69,0.62)' },
  tourHole: { position: 'absolute', borderRadius: 22, borderWidth: 2.5, borderColor: '#fff' },
  tourCard: {
    position: 'absolute', left: 18, right: 18, backgroundColor: '#fff', borderRadius: 24, padding: 18,
    shadowColor: C.hot, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  tourCount: { fontFamily: F.med, fontSize: 11, color: C.hot, letterSpacing: 0.6 },
  tourTitle: { fontFamily: F.black, fontSize: 18, color: C.ink, marginTop: 6 },
  tourText: { fontFamily: F.med, fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 20 },
  tourButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  tourSkip: { fontFamily: F.med, fontSize: 12, color: C.inkSoft, textDecorationLine: 'underline' },

  sheetTop: { alignItems: 'center', paddingTop: 10, height: 50 },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(43,15,69,0.25)' },
  closeBtn: {
    position: 'absolute', right: 16, top: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  sheetBody: { paddingHorizontal: 20, paddingBottom: 60 },
  sheetTitle: { fontFamily: F.black, fontSize: 30, letterSpacing: -1 },
  sheetSub: { fontFamily: F.med, fontSize: 12, color: C.inkSoft, marginTop: 6 },

  segment: { flexDirection: 'row', gap: 8, marginTop: 10 },
  segBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: '#fff' },
  segOn: { backgroundColor: C.ink, borderColor: C.ink },
  segTxt: { fontFamily: F.bold, fontSize: 11, color: C.ink },

  imgAdd: {
    marginTop: 10, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(43,15,69,0.3)',
    backgroundColor: 'rgba(255,255,255,0.45)', alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16,
  },
  imgAddTxt: { fontFamily: F.bold, fontSize: 13, color: C.ink, marginTop: 6 },
  formImg: { width: '100%', aspectRatio: 1, borderRadius: 24, marginTop: 10, borderWidth: 3, borderColor: '#fff' },
  imgRemove: {
    position: 'absolute', top: 22, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
  },

  detailTitle: { fontFamily: F.black, fontSize: 26, color: C.ink, marginTop: 18, letterSpacing: -0.5, lineHeight: 34 },
  detailMeta: { fontSize: 13, fontWeight: '600', color: C.inkSoft, marginTop: 6 },
  whenTxt: { fontFamily: F.bold, fontSize: 14, color: C.ink, lineHeight: 21 },
  mapLink: { fontFamily: F.med, fontSize: 11, color: C.hot },
  desc: { fontSize: 16, fontWeight: '500', color: C.ink, lineHeight: 23 },
  detailImg: { width: '100%', aspectRatio: 1, borderRadius: 26, marginTop: 16, borderWidth: 3, borderColor: '#fff' },
  approvedBanner: { marginTop: 16, borderRadius: 22, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  approvedTxt: { fontFamily: F.black, fontSize: 20, color: C.ink, letterSpacing: 1 },
  actRow: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'space-between' },
  bubble: { borderTopLeftRadius: 8 },
  bubbleTxt: { fontFamily: F.bold, fontSize: 16, color: C.ink, marginTop: 6, lineHeight: 22 },
  histRow: { paddingVertical: 10 },
  histBorder: { borderTopWidth: 1, borderTopColor: 'rgba(43,15,69,0.08)' },
  histMain: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  histText: { fontSize: 14, fontStyle: 'italic', color: C.ink, marginTop: 4 },
  histTime: { fontSize: 11, fontWeight: '600', color: C.inkSoft, marginTop: 4 },

  payTitle: { fontFamily: F.black, fontSize: 44, letterSpacing: -1.5, marginTop: 4 },
  paySub: { fontFamily: F.med, fontSize: 14, color: C.ink, textAlign: 'center', marginTop: 10, lineHeight: 21 },
  planOuter: { borderRadius: 26, padding: 2.5 },
  planInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 24, padding: 18 },
  planName: { fontFamily: F.black, fontSize: 15, color: C.ink },
  planDesc: { fontFamily: F.med, fontSize: 12, color: C.inkSoft, marginTop: 4 },
  planPrice: { fontFamily: F.black, fontSize: 18, color: C.ink },
  planPer: { fontFamily: F.med, fontSize: 10, color: C.inkSoft },
  planBadge: { position: 'absolute', top: -12, right: 16 },
  restore: { fontFamily: F.med, fontSize: 12, color: C.ink, textAlign: 'center', marginTop: 16, textDecorationLine: 'underline' },
  fine: { fontSize: 11, color: C.inkSoft, textAlign: 'center', marginTop: 14, lineHeight: 16 },
  link: { color: C.ink, fontWeight: '700', textDecorationLine: 'underline' },

  stepInfo: { fontFamily: F.med, fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  stepEmoji: { fontSize: 22, width: 36 },
  stepTxt: { flex: 1, fontFamily: F.med, fontSize: 12, color: C.ink, lineHeight: 18 },
  codeInput: { fontFamily: F.black, fontSize: 20, letterSpacing: 2, textAlign: 'center' },
  inviteChip: { paddingLeft: 14, borderStyle: 'dashed', borderColor: C.hot },
  safetyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, paddingHorizontal: 6 },
  aloneCard: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22 },
  aloneTitle: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  aloneSub: { fontFamily: F.med, fontSize: 11, color: C.inkSoft, marginTop: 2 },
  aloneBtn: { fontFamily: F.bold, fontSize: 12, color: C.hot, marginLeft: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 20 },
  copyBtn: { marginLeft: 12, backgroundColor: C.ink, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 },
  copyTxt: { fontFamily: F.bold, fontSize: 11, color: '#fff' },
  emojiRow: { gap: 8, paddingVertical: 4, marginTop: 10 },
  emojiMini: {
    width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
  },
  emojiNow: {
    width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 2, borderColor: C.ink,
  },
  avatarHint: { fontFamily: F.med, fontSize: 11, color: C.ink, marginTop: 6, textDecorationLine: 'underline' },
  safetyTxt: { fontFamily: F.med, fontSize: 11, color: C.inkSoft, textDecorationLine: 'underline' },

  codeBox: { marginTop: 22, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 30, borderWidth: 2, borderColor: C.ink },
  code: { fontFamily: F.black, fontSize: 28, color: C.ink, letterSpacing: 3 },
});
