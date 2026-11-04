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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Unbounded_500Medium, Unbounded_700Bold, Unbounded_900Black } from '@expo-google-fonts/unbounded';
import { supabase } from './supabase';
import * as api from './api';
import { registerPush, clearPush, onPushOpen } from './push';
import { purchasesEnabled, initPurchases, onPlanChange, getPackages, buy, restore, logOutPurchases } from './purchases';
import { APP_STORE_URL, TERMS_URL, PRIVACY_URL } from './config';

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
};

const EMOJIS = ['💖', '🦋', '🍒', '👑', '🌙', '🧸', '🔥', '🫧', '🍓', '💅', '🐱', '🌸'];

const PRESET_CATS = [
  { e: '💅', t: 'Bakım' }, { e: '🍕', t: 'Yemek' }, { e: '🎁', t: 'Hediye' },
  { e: '✈️', t: 'Gezi' }, { e: '🎬', t: 'Film Gecesi' }, { e: '💐', t: 'Sürpriz' },
  { e: '🛍️', t: 'Alışveriş' }, { e: '🫶', t: 'İlgi & Sevgi' }, { e: '☕', t: 'Kahve' },
  { e: '🧹', t: 'Ev İşi' },
];

const URGENCY = [
  { k: 'chill', t: 'chill 🧊' },
  { k: 'onemli', t: 'önemli ✨' },
  { k: 'acil', t: 'ACİL 🚨' },
];

const REJECT_REASONS = [
  'bugün değil bebeğim 💅', 'bütçe onaylanmadı 💸', 'önce bulaşıklar 🧽',
  'bunu dün de istedin 👀', 'sistem şu an kapalı 🔌', 'sevgimle reddediyorum 💔',
];

// Ücretsiz plan: tüm hatlarda toplam 1 talep. Ücretli planlar günlük ve tüm hatlarda ortak.
// Fiyatlar şimdilik yer tutucu.
const PLANS = [
  { k: 'free', t: 'Ücretsiz', short: 'ÜCRETSİZ', desc: '1 ücretsiz talep', limit: 1 },
  { k: 'p5', t: 'Talepp+ 5', short: 'PLUS 5', desc: 'günde 5 talep', price: '₺49,99', limit: 5 },
  { k: 'p10', t: 'Talepp+ 10', short: 'PLUS 10', desc: 'günde 10 talep', price: '₺79,99', limit: 10, badge: 'en popüler 🔥' },
  { k: 'inf', t: 'Talepp Sınırsız', short: 'SINIRSIZ', desc: 'sınırsız talep', price: '₺129,99', limit: Infinity, badge: 'kraliçe modu 👑' },
];
const PAID = PLANS.filter(p => p.k !== 'free');

const STATUS = {
  pending: { t: 'BEKLEMEDE', e: '⏳', bg: '#FFF3A3' },
  approved: { t: 'ONAYLANDI', e: '💖', bg: '#9DFFD5' },
  rejected: { t: 'REDDEDİLDİ', e: '💔', bg: '#FFB3C7' },
  nego: { t: 'PAZARLIKTA', e: '🤝', bg: '#C9E6FF' },
  appeal: { t: 'İTİRAZDA', e: '⚖️', bg: '#E2C6FF' },
};
const OPEN = ['pending', 'nego', 'appeal'];

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
  if (k === dayKey(t)) return 'bugün';
  t.setDate(t.getDate() + 1);
  if (k === dayKey(t)) return 'yarın';
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
  `1) Talepp'i indir: ${APP_STORE_URL || 'App Store\'da "Talepp" diye arat'}`,
  '2) Kaydol, "kodla katıl"a bas',
  `3) Kodu yaz: ${line.code}`,
].join('\n');

const oops = () => Alert.alert('olmadı 😵', 'internetini kontrol edip tekrar dener misin?');
// toUpperCase Türkçe i/ı'yı bilmiyor
const trUpper = s => s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
const initial = name => trUpper((name || '?').trim()[0] || '?');

const planOf = k => PLANS.find(p => p.k === k) || PLANS[0];
const sentToday = (requests, id) => requests.filter(r => r.from === id && r.day === todayKey()).length;
// "ben" bütün hatlarda aynı kişi: günlük sayım tüm hatlardan toplanır
const myUsedToday = store => store.lines.reduce((n, l) => n + sentToday(l.requests, l.meId), 0);
const meName = l => ((l && l.members.find(m => m.id === l.meId)) || { name: '' }).name;
const userNameOf = user => (user && user.user_metadata && user.user_metadata.name) || '';

function quotaOf(plan, freeUsed, usedToday) {
  if (plan === 'free') return { limit: 1, used: freeUsed ? 1 : 0 };
  return { limit: planOf(plan).limit, used: usedToday };
}
function quotaHintOf(plan, left) {
  if (plan === 'free') return left > 0 ? '🎁 1 talep bizden · tüm hatlarında geçerli' : 'ücretsiz hakkını kullandın 💅 devam için Talepp+';
  const p = planOf(plan);
  return p.limit === Infinity ? 'kraliçe modu açık 👑 · tüm hatlarda' : `${p.desc} · tüm hatlarda ortak · her gece yenilenir`;
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
      {children}
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

function Avatar({ name, index, size = 40, active }) {
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
  'Invalid login credentials': 'e-posta ya da şifre hatalı 🙈',
  'User already registered': 'bu e-posta zaten kayıtlı ✦ "giriş yap"a geç',
  'Email not confirmed': 'e-postanı henüz onaylamadın 📩 gelen kutuna bak',
};

function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('welcome'); // welcome | signup | login
  const login = mode === 'login';
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setMsg('');
    const a = parseInt(age, 10);
    if (!login && !name.trim()) return setMsg('adını yazar mısın? 🫶');
    if (!login && !(a >= 13 && a <= 120)) return setMsg('Talepp 13 yaş ve üstü için 💅 yaşını kontrol eder misin?');
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setMsg('geçerli bir e-posta yaz ✉️');
    if (password.length < 6) return setMsg('şifre en az 6 karakter olmalı 🔐');
    Keyboard.dismiss();
    setBusy(true);
    const res = login
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      // app: 'talepp' → veritabanı profili talepp_profiles'a açar (proje Yumi ile ortak)
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { app: 'talepp', name: name.trim(), age: a } } });
    setBusy(false);
    if (res.error) return setMsg(AUTH_ERRORS[res.error.message] || 'bir şeyler ters gitti 😵 internetini kontrol edip tekrar dener misin?');
    // oturum açıldıysa App'teki onAuthStateChange ekranı kendisi değiştirir
    if (!res.data.session) {
      setMode('login');
      setMsg('📩 e-postana onay bağlantısı gönderdik. onaylayınca buradan giriş yap.');
    }
  };

  const go = m => { tap(); setMsg(''); setMode(m); };

  if (mode === 'welcome') {
    return (
      <Welcome
        colors={THEMES.bubblegum.colors} title="kaydol ✦" onPress={() => setMode('signup')}
        footer={(
          <>
            <Pressable onPress={() => go('login')} hitSlop={10}>
              <Text style={styles.restore}>zaten hesabın var mı? giriş yap</Text>
            </Pressable>
            <Text style={styles.gift}>💌 davet kodun mu var? kaydol, sonra "kodla katıl"a bas</Text>
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
            <Text style={styles.back}>← geri</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Sticker text={login ? '✦ tekrar hoş geldin ✦' : '✦ yeni nesil talep hattı ✦'} rotate="-3deg" />
            <HoloText style={styles.logo}>Talepp</HoloText>
            <Text style={styles.tagline}>{login ? 'hesabına giriş yap 💅' : 'önce seni tanıyalım 🫶'}</Text>
          </View>

          <View style={{ marginTop: 22 }}>
              {!login ? (
                <>
                  <Label>adın</Label>
                  <TextInput
                    value={name} onChangeText={setName} placeholder="Kerime" placeholderTextColor="#B79BCB"
                    style={styles.input} maxLength={20} textContentType="givenName"
                  />
                  <Label style={{ marginTop: 16 }}>yaşın</Label>
                  <TextInput
                    value={age} onChangeText={t => setAge(t.replace(/\D/g, ''))} placeholder="22" placeholderTextColor="#B79BCB"
                    style={styles.input} maxLength={3} keyboardType="number-pad"
                  />
                </>
              ) : null}
              <Label style={{ marginTop: login ? 0 : 16 }}>e-posta</Label>
              <TextInput
                value={email} onChangeText={setEmail} placeholder="kerime@mail.com" placeholderTextColor="#B79BCB"
                style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
              />
              <Label style={{ marginTop: 16 }}>şifre</Label>
              <TextInput
                value={password} onChangeText={setPassword} placeholder="en az 6 karakter" placeholderTextColor="#B79BCB"
                style={styles.input} secureTextEntry textContentType={login ? 'password' : 'newPassword'}
              />

              {msg ? <Glass style={{ marginTop: 16 }}><Text style={styles.info}>{msg}</Text></Glass> : null}

              <ChromeButton
                hot big disabled={busy} style={{ marginTop: 24 }}
                title={busy ? 'bekle bi sn... ✦' : login ? 'giriş yap ✦' : 'kaydol ✦'}
                onPress={submit}
              />
              <Pressable onPress={() => go(login ? 'signup' : 'login')} hitSlop={10}>
                <Text style={styles.restore}>{login ? 'hesabın yok mu? kaydol' : 'zaten hesabın var mı? giriş yap'}</Text>
              </Pressable>
              {!login ? (
                <Text style={styles.fine}>
                  kaydolarak{' '}
                  <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>kullanım koşullarını</Text>
                  {PRIVACY_URL ? (
                    <>
                      {' '}ve{' '}
                      <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>gizlilik politikasını</Text>
                    </>
                  ) : null}
                  {' '}kabul edersin. uygunsuz içerik ve taciz yasaktır; bildirilen içerikler 24 saat içinde incelenir.
                </Text>
              ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </HoloBg>
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
            <Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>← geri</Text></Pressable>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3].map(i => <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />)}
            </View>
          </View>
          <Text style={styles.stepNo}>adım {step}/3</Text>
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
          <Sticker text="✦ yeni nesil talep hattı ✦" rotate="-3deg" />
          <HoloText style={styles.logo}>Talepp</HoloText>
          <Text style={styles.tagline}>sevgilin & kankaların için{'\n'}kendi talep hattını kur 💅</Text>
        </View>
        <View style={{ height: 250 }}>
          <FloatCard e="💅" t="nail randevusu" st="approved" rot="-6deg" delay={0} style={{ left: 0, top: 0 }} />
          <FloatCard e="🍕" t="gece 2'de pizza" st="nego" rot="5deg" delay={500} style={{ right: 0, top: 84 }} />
          <FloatCard e="✈️" t="hafta sonu kaçamağı" st="pending" rot="-3deg" delay={1000} style={{ left: 14, top: 168 }} />
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
  const [me, setMe] = useState(myName || '');
  const [busy, setBusy] = useState(false);
  const colors = THEMES[theme].colors;

  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    setCats(cs => [...cs, { e: '✨', t, on: true }]);
    setCustom('');
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
      <StepShell step={1} colors={colors} title="hattına bir isim ver ✦" sub="mesela: Susu Talep Hattı, Kızlar Meclisi, Aşk Bakanlığı 🏛️"
        onBack={onCancel} onNext={() => setStep(2)} nextTitle="devam →" canNext>
        <TextInput
          value={name} onChangeText={setName} placeholder="Susu Talep Hattı" placeholderTextColor="#B79BCB"
          style={styles.input} maxLength={32} returnKeyType="next" onSubmitEditing={() => setStep(2)}
        />
        <Label style={{ marginTop: 22 }}>hattının emojisi</Label>
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
            <Text style={styles.kicker}>önizleme</Text>
            <Text style={styles.previewName} numberOfLines={2}>{name.trim() || 'Susu Talep Hattı'}</Text>
          </View>
        </Glass>
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell step={2} colors={colors} title="vibe'ını seç 🎨" sub="renkler ve talep başlıkların. sonra da değiştirebilirsin."
        onBack={() => setStep(1)} onNext={() => setStep(3)} nextTitle="devam →" canNext={cats.some(c => c.on)}>
        <View style={styles.themeRow}>
          {Object.entries(THEMES).map(([k, th]) => (
            <Pressable key={k} onPress={() => { tap(); setTheme(k); }} style={{ alignItems: 'center', flex: 1 }}>
              <LinearGradient colors={th.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.swatch, theme === k && styles.swatchOn]}>
                {theme === k ? <Text style={{ fontSize: 20 }}>✦</Text> : null}
              </LinearGradient>
              <Text style={styles.swatchTxt}>{th.name}</Text>
            </Pressable>
          ))}
        </View>
        <Label style={{ marginTop: 24 }}>talep başlıkları</Label>
        <View style={styles.wrap}>
          {cats.map((c, i) => (
            <Chip key={`${c.t}-${i}`} label={`${c.e} ${c.t}`} on={c.on}
              onPress={() => setCats(cs => cs.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            value={custom} onChangeText={setCustom} placeholder="kendi başlığın (örn. Boba 🧋)" placeholderTextColor="#B79BCB"
            style={[styles.input, { flex: 1 }]} maxLength={24} onSubmitEditing={addCustom} returnKeyType="done"
          />
          <ChromeButton title="+" onPress={addCustom} style={{ marginLeft: 10 }} />
        </View>
      </StepShell>
    );
  }

  return (
    <StepShell step={3} colors={colors} title="bu hatta adın ne olsun? 🫶" sub="hattaki herkes seni bu isimle görecek."
      onBack={() => setStep(2)} onNext={finish} nextTitle={busy ? 'hat açılıyor... ✦' : 'hattı aç 🚀'} canNext={!busy && !!me.trim()}>
      <TextInput value={me} onChangeText={setMe} placeholder="Kerime" placeholderTextColor="#B79BCB" style={styles.input} maxLength={20} />
      <Glass style={{ marginTop: 22 }}>
        <Text style={styles.kicker}>sırada ne var? 💌</Text>
        <Text style={styles.stepInfo}>
          hattı açınca sana bir davet kodu vereceğiz. sevgiline ya da kankalarına gönder; Talepp'i indirip kodu yazınca hattına katılırlar.
        </Text>
      </Glass>
    </StepShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Talep kartı
// ─────────────────────────────────────────────────────────────
function RequestCard({ r, cat, fromName, toName, onPress }) {
  const st = STATUS[r.status];
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
        </View>
        {r.image ? <Image source={{ uri: r.image }} style={styles.cardThumb} /> : null}
      </Glass>
      <Sticker text={`${st.e} ${st.t}`} bg={st.bg} rotate={r.id.charCodeAt(0) % 2 ? '-5deg' : '4deg'} style={styles.cardSticker} />
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
  const [to, setTo] = useState(null);
  const [catId, setCatId] = useState(null);
  const [newCat, setNewCat] = useState(null); // null: kutu kapalı
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
    setTo(others[0] ? others[0].id : null);
    setCatId(data.line.cats[0] ? data.line.cats[0].id : null);
    setNewCat(null); setTitle(''); setDesc(''); setUrgency('onemli'); setImage(null);
    setDate(null); setCalOpen(false); setTime(''); setPlace(''); setBusy(false);
  }, [visible]);

  const submit = async () => {
    setBusy(true);
    const ok = await onSend({ to, catId, title, desc, urgency, image, date, time: time || null, place });
    if (!ok) setBusy(false);
  };

  const addCat = () => {
    const t = (newCat || '').trim();
    if (!t) return;
    setCatId(onAddCat(t));
    setNewCat(null);
    tap();
  };

  const pick = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, base64: true });
      if (!res.canceled && res.assets && res.assets.length) setImage({ uri: res.assets[0].uri, base64: res.assets[0].base64 });
    } catch (e) {
      Alert.alert('olmadı 😵', 'görsel seçilemedi, tekrar dener misin?');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} colors={colors}>
      <HoloText style={styles.sheetTitle}>yeni talep ✦</HoloText>
      <Text style={styles.sheetSub}>kalan hakkın: {left === Infinity ? '∞' : left} · ikna edici ol 😌</Text>

      <Label style={{ marginTop: 20 }}>kime?</Label>
      <View style={styles.wrap}>
        {others.map(m => (
          <Pressable key={m.id} onPress={() => { tap(); setTo(m.id); }} style={[styles.toChip, to === m.id && styles.chipOn]}>
            <Avatar name={m.name} index={data.members.findIndex(x => x.id === m.id)} size={26} />
            <Text style={[styles.chipTxt, { marginLeft: 8 }, to === m.id && styles.chipTxtOn]}>{m.name}</Text>
          </Pressable>
        ))}
      </View>

      <Label style={{ marginTop: 20 }}>başlık</Label>
      <View style={styles.wrap}>
        {data.line.cats.map(c => <Chip key={c.id} label={`${c.e} ${c.t}`} on={catId === c.id} onPress={() => setCatId(c.id)} />)}
        <Chip label="＋ yeni başlık" on={newCat !== null} onPress={() => setNewCat(newCat === null ? '' : null)} />
      </View>
      {newCat !== null ? (
        <View style={styles.addRow}>
          <TextInput
            value={newCat} onChangeText={setNewCat} placeholder="yeni başlık (örn. Boba 🧋)" placeholderTextColor="#B79BCB"
            style={[styles.input, { flex: 1 }]} maxLength={24} autoFocus onSubmitEditing={addCat} returnKeyType="done"
          />
          <ChromeButton title="ekle" onPress={addCat} style={{ marginLeft: 10 }} />
        </View>
      ) : null}

      <Label style={{ marginTop: 20 }}>ne istiyorsun?</Label>
      <TextInput value={title} onChangeText={setTitle} placeholder="cumartesi sushi date 🍣" placeholderTextColor="#B79BCB" style={styles.input} maxLength={60} />

      <Label style={{ marginTop: 16 }}>hangi gün?</Label>
      <View style={styles.addRow}>
        <Pressable onPress={() => { tap(); setCalOpen(o => !o); }} style={[styles.input, { flex: 1 }]}>
          <Text style={[styles.pickTxt, !date && { color: '#B79BCB' }]}>{date ? `📅 ${dayLabel(date)}` : '📅 takvimden seç'}</Text>
        </Pressable>
        {date ? <ChromeButton title="✕" onPress={() => { setDate(null); setCalOpen(false); }} style={{ marginLeft: 10 }} /> : null}
      </View>
      {calOpen ? <Calendar value={date} onChange={k => { setDate(k); setCalOpen(false); }} /> : null}

      <Label style={{ marginTop: 16 }}>saat kaçta?</Label>
      <TextInput
        value={time} onChangeText={t => setTime(fmtTime(t))} placeholder="🕗 20:30" placeholderTextColor="#B79BCB"
        keyboardType="number-pad" maxLength={5} style={styles.input}
      />
      {timeBad ? <Text style={styles.fieldNote}>saati 20:30 gibi tamamla ⏰</Text> : null}

      <Label style={{ marginTop: 16 }}>nerede?</Label>
      <TextInput value={place} onChangeText={setPlace} placeholder="📍 Moda sahil, Kadıköy" placeholderTextColor="#B79BCB" style={styles.input} maxLength={60} />
      <Text style={styles.hint}>gün, saat ve konum isteğe bağlı ✦</Text>

      <Label style={{ marginTop: 16 }}>detaylar (ikna et bakalım)</Label>
      <TextInput
        value={desc} onChangeText={setDesc} multiline placeholder="çünkü bu hafta çok iyi bir insandım ve bunu hak ediyorum..."
        placeholderTextColor="#B79BCB" style={[styles.input, styles.textarea]} maxLength={400}
      />

      <Label style={{ marginTop: 16 }}>aciliyet</Label>
      <View style={styles.segment}>
        {URGENCY.map(u => (
          <Pressable key={u.k} onPress={() => { tap(); setUrgency(u.k); }} style={[styles.segBtn, urgency === u.k && styles.segOn, urgency === u.k && u.k === 'acil' && { backgroundColor: C.hot }]}>
            <Text style={[styles.segTxt, urgency === u.k && { color: '#fff' }]}>{u.t}</Text>
          </Pressable>
        ))}
      </View>

      <Label style={{ marginTop: 16 }}>görsel / ilham</Label>
      {image ? (
        <View>
          <Image source={{ uri: image.uri }} style={styles.formImg} />
          <Pressable onPress={() => setImage(null)} style={styles.imgRemove}><Text style={{ color: '#fff', fontFamily: F.bold }}>✕</Text></Pressable>
        </View>
      ) : (
        <Pressable onPress={() => { tap(); pick(); }} style={styles.imgAdd}>
          <Text style={{ fontSize: 30 }}>🖼️</Text>
          <Text style={styles.imgAddTxt}>görsel ekle</Text>
          <Text style={styles.hint}>istediğin çanta, mekan, nail art... göster ki anlasın</Text>
        </Pressable>
      )}

      <ChromeButton
        hot big title={busy ? 'fırlatılıyor... 🚀' : 'talebi fırlat 🚀'} disabled={busy || !title.trim() || !to || timeBad}
        style={{ marginTop: 26 }} onPress={submit}
      />
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Talep detayı: onayla / reddet / pazarlık / itiraz
// ─────────────────────────────────────────────────────────────
function DetailSheet({ visible, onClose, r, data, viewer, colors, act }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  useEffect(() => { if (visible) { setMode(null); setText(''); } }, [visible, r && r.id]);

  const nameOf = id => (data.members.find(m => m.id === id) || { name: 'eski üye' }).name;
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
            <Label>ret sebebi seç 💔</Label>
            <View style={styles.wrap}>
              {REJECT_REASONS.map(x => <Chip key={x} label={x} on={text === x} onPress={() => setText(x)} />)}
            </View>
            <TextInput value={text} onChangeText={setText} placeholder="ya da kendin yaz..." placeholderTextColor="#B79BCB" style={[styles.input, { marginTop: 12 }]} maxLength={80} />
            <View style={styles.actRow}>
              <ChromeButton small title="vazgeç" onPress={() => setMode(null)} />
              <ChromeButton small hot title="reddet 💔" disabled={!text.trim()} onPress={() => act.reject(r, text.trim())} />
            </View>
          </Glass>
        );
      } else if (mode === 'nego') {
        actions = (
          <Glass>
            <Label>karşı teklifin ne? 🤝</Label>
            <TextInput value={text} onChangeText={setText} placeholder="tamam ama önce bulaşıklar 🧽" placeholderTextColor="#B79BCB" style={styles.input} maxLength={120} />
            <View style={styles.actRow}>
              <ChromeButton small title="vazgeç" onPress={() => setMode(null)} />
              <ChromeButton small hot title="teklifi gönder" disabled={!text.trim()} onPress={() => act.nego(r, text.trim())} />
            </View>
          </Glass>
        );
      } else {
        actions = (
          <View>
            <ChromeButton hot big title="onayla 💖" onPress={() => act.approve(r)} />
            <View style={styles.actRow}>
              <ChromeButton title="pazarlık 🤝" onPress={() => { setText(''); setMode('nego'); }} style={{ flex: 1 }} />
              <ChromeButton title="reddet 💔" onPress={() => { setText(''); setMode('reject'); }} style={{ flex: 1 }} />
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
          <ChromeButton hot big title="anlaştık ✓" onPress={() => act.accept(r)} style={{ marginTop: 14 }} />
          <ChromeButton title="talebi geri çek 🫥" onPress={() => act.withdraw(r)} style={{ marginTop: 10 }} />
        </View>
      );
    } else if (isFrom && r.status === 'pending') {
      actions = <ChromeButton title="talebi geri çek 🫥" onPress={() => act.withdraw(r)} />;
    } else if (isFrom && r.status === 'rejected' && !appealed) {
      actions = mode === 'appeal' ? (
        <Glass>
          <Label>itiraz dilekçen ⚖️</Label>
          <TextInput
            value={text} onChangeText={setText} multiline placeholder="sayın yargıç, bunu hak ediyorum çünkü..."
            placeholderTextColor="#B79BCB" style={[styles.input, styles.textarea]} maxLength={200}
          />
          <View style={styles.actRow}>
            <ChromeButton small title="vazgeç" onPress={() => setMode(null)} />
            <ChromeButton small hot title="itiraz et" disabled={!text.trim()} onPress={() => act.appeal(r, text.trim())} />
          </View>
        </Glass>
      ) : (
        <ChromeButton hot title="itiraz et ⚖️ (1 hak)" onPress={() => { setText(''); setMode('appeal'); }} />
      );
    } else if (isFrom && r.status === 'appeal') {
      actions = <Text style={styles.info}>itirazın masada ⚖️ karar bekleniyor...</Text>;
    } else if (!isTo && !isFrom) {
      actions = <Text style={styles.info}>bu talep sana ait değil ama izlemek serbest 🍿</Text>;
    }

    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Sticker text={`${cat ? cat.e : '✨'} ${trUpper(cat ? cat.t : 'genel')}`} rotate="-3deg" />
          <Sticker text={`${st.e} ${st.t}`} bg={st.bg} rotate="4deg" />
        </View>
        <Text style={styles.detailTitle}>{r.title}</Text>
        <Text style={styles.detailMeta}>{nameOf(r.from)} → {nameOf(r.to)} · {timeAgo(r.createdAt)} · {urg ? urg.t : ''}</Text>

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
                  📍 {r.place}  <Text style={styles.mapLink}>haritada aç ↗</Text>
                </Text>
              </Pressable>
            ) : null}
          </Glass>
        ) : null}

        {r.desc ? <Glass style={{ marginTop: 16 }}><Text style={styles.desc}>{r.desc}</Text></Glass> : null}
        {r.image ? <Image source={{ uri: r.image }} style={styles.detailImg} /> : null}

        {actions ? <View style={{ marginTop: 20 }}>{actions}</View> : null}

        <Label style={{ marginTop: 26 }}>talep geçmişi</Label>
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
            <Pressable onPress={() => act.report(r)} hitSlop={8}><Text style={styles.safetyTxt}>🚩 şikayet et</Text></Pressable>
            <Pressable onPress={() => act.block(r.from)} hitSlop={8}><Text style={styles.safetyTxt}>🚫 {nameOf(r.from)}'i engelle</Text></Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return <Sheet visible={visible} onClose={onClose} colors={colors}>{body()}</Sheet>;
}

// ─────────────────────────────────────────────────────────────
// Talepp+ (RevenueCat). Anahtar yokken: geliştirmede test aboneliği, yayında "yakında"
// ─────────────────────────────────────────────────────────────
function PaywallSheet({ visible, onClose, reason, plan, colors, onPlan }) {
  const [sel, setSel] = useState('p10');
  const [pkgs, setPkgs] = useState(null);
  const [busy, setBusy] = useState(false);
  const live = purchasesEnabled();

  useEffect(() => {
    if (visible && live) getPackages().then(setPkgs);
  }, [visible]);

  const priceOf = p => (pkgs && pkgs[p.k] ? pkgs[p.k].product.priceString : p.price);

  const subscribe = async () => {
    if (!live) {
      if (__DEV__) onPlan(sel, true); // Expo Go'da denemek için
      else Alert.alert('çok yakında ✦', 'abonelik App Store sürümünde aktif olacak.');
      return;
    }
    const pkg = pkgs && pkgs[sel];
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
    if (!live) { Alert.alert('geri yükle', 'abonelik App Store sürümünde aktif olacak ✦'); return; }
    setBusy(true);
    try {
      const k = await restore();
      if (k === 'free') Alert.alert('bulunamadı', 'bu Apple ID\'de aktif Talepp+ aboneliği yok.');
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
        <HoloText style={styles.payTitle}>Talepp+</HoloText>
        <Text style={styles.paySub}>
          {{
            free: 'ücretsiz talep hakkını kullandın 😩\nama kraliçeler beklemez.',
            limit: 'bugünlük talep hakkın doldu 😩\nama kraliçeler beklemez.',
          }[reason] || 'daha çok talep, daha çok drama ✦'}
        </Text>
        <Text style={styles.sheetSub}>abonelik tüm hatlarında geçerli ✦</Text>
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
                  <Text style={styles.planPer}>/ ay</Text>
                </View>
              </View>
            </LinearGradient>
            {p.badge ? <Sticker text={p.badge} bg={C.butter} rotate="5deg" style={styles.planBadge} /> : null}
          </Pressable>
        );
      })}

      <ChromeButton
        hot big style={{ marginTop: 26 }} disabled={busy || plan === sel}
        title={plan === sel ? 'zaten bu plandasın ✓' : busy ? 'bekle bi sn... ✦' : !live && __DEV__ ? 'abone ol (test) ✦' : 'abone ol ✦'}
        onPress={subscribe}
      />
      <Pressable onPress={restoreBuys} disabled={busy}>
        <Text style={styles.restore}>satın alımları geri yükle</Text>
      </Pressable>
      <Text style={styles.fine}>
        abonelik aylıktır; ücret Apple ID'nden alınır ve dönem bitmeden en az 24 saat önce iptal edilmedikçe otomatik yenilenir.
        App Store hesap ayarlarından istediğin zaman iptal edebilirsin.
      </Text>
      <Text style={styles.fine}>
        <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>kullanım koşulları</Text>
        {PRIVACY_URL ? (
          <>
            {'  ·  '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>gizlilik politikası</Text>
          </>
        ) : null}
      </Text>
    </Sheet>
  );
}

// Davet: kodu ve nasıl katılınacağını tek mesajda paylaşır
function InviteSheet({ visible, onClose, line, members, colors, fresh }) {
  const share = () => { Share.share({ message: inviteMessage(line) }).catch(() => {}); };
  const steps = [
    ['📲', 'aşağıdaki butonla davet mesajını gönder (WhatsApp, Instagram, SMS...)'],
    ['⬇️', 'arkadaşın Talepp\'i indirip kaydolsun'],
    ['🔑', `"kodla katıl"a basıp kodu yazsın: ${line.code}`],
    ['🔔', 'hattına katılınca sana bildirim gelir, artık talep atabilirsiniz'],
  ];
  return (
    <Sheet visible={visible} onClose={onClose} colors={colors}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 60 }}>{fresh ? '🎉' : '💌'}</Text>
        <HoloText style={styles.sheetTitle}>{fresh ? 'hattın hazır!' : 'kişileri davet et'}</HoloText>
        <Text style={styles.paySub}>
          {fresh ? 'şimdi talep atacağın kişileri çağır 💌' : `${line.name} hattında şu an ${members} kişi var.`}
        </Text>
        <LinearGradient colors={CHROME} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.codeBox}>
          <Text style={styles.kicker}>davet kodun</Text>
          <Text style={styles.code}>{line.code}</Text>
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

      <ChromeButton hot big title="davet mesajını gönder 📲" onPress={share} style={{ marginTop: 22 }} />
      {fresh ? (
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.restore}>sonra davet ederim</Text>
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
    if (res === 'notfound') setMsg('bu kodla bir hat bulamadık 🤔 harfleri kontrol eder misin?');
    else if (res === 'error') setMsg('olmadı 😵 internetini kontrol edip tekrar dener misin?');
    if (res !== 'ok') setBusy(false);
  };

  return (
    <Sheet visible={visible} onClose={onClose} colors={THEMES.bubblegum.colors}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 60 }}>🔑</Text>
        <HoloText style={styles.sheetTitle}>kodla katıl</HoloText>
        <Text style={styles.paySub}>sana gelen davet mesajındaki kodu yaz,{'\n'}o hatta hemen katıl ✦</Text>
      </View>
      <Label style={{ marginTop: 22 }}>davet kodu</Label>
      <TextInput
        value={code} onChangeText={t => setCode(t.toUpperCase())} placeholder="SUSU-7K2QX" placeholderTextColor="#B79BCB"
        style={[styles.input, styles.codeInput]} autoCapitalize="characters" autoCorrect={false} maxLength={12}
      />
      <Label style={{ marginTop: 16 }}>hatta adın ne olsun?</Label>
      <TextInput value={name} onChangeText={setName} placeholder="Kerime" placeholderTextColor="#B79BCB" style={styles.input} maxLength={20} />
      {msg ? <Glass style={{ marginTop: 16 }}><Text style={styles.info}>{msg}</Text></Glass> : null}
      <ChromeButton
        hot big title={busy ? 'katılıyorsun... ✦' : 'hatta katıl 🚀'} disabled={busy || code.trim().length < 6}
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
// fresh: hat yeni kuruldu, davet ekranıyla açılır
function Home({ data, setData, store, setStore, onHome, onPlan, reload, fresh }) {
  const insets = useSafeAreaInsets();
  const colors = (THEMES[data.line.theme] || THEMES.bubblegum).colors;
  const viewer = data.members.find(m => m.id === data.meId) || { id: data.meId, name: '' };
  const others = data.members.filter(m => m.id !== viewer.id);
  const isOwner = data.owner === data.meId;
  const nameOf = id => (data.members.find(m => m.id === id) || { name: 'eski üye' }).name;

  const [tab, setTab] = useState('in');
  const [sheet, setSheet] = useState(fresh ? 'invite' : null); // 'new' | 'detail' | 'paywall' | 'invite'
  const [freshInvite, setFreshInvite] = useState(!!fresh);
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [paywallReason, setPaywallReason] = useState('browse');
  const [toastMsg, setToastMsg] = useState(null);
  const [burst, setBurst] = useState(0);
  const toastA = useRef(new Animated.Value(0)).current;

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
  const openPaywall = reason => {
    setPaywallReason(reason);
    if (sheet) closeThen(() => setSheet('paywall'));
    else setSheet('paywall');
  };

  const plan = store.plan;
  const { limit, used } = quotaOf(plan, store.freeUsed, myUsedToday(store));
  const left = Math.max(0, limit - used);
  const quotaHint = quotaHintOf(plan, left);
  const limitReason = plan === 'free' ? 'free' : 'limit';

  const celebrate = msg => { success(); setBurst(Date.now()); toast(msg); };
  const failed = () => { toast('😵 olmadı, internetini kontrol et'); reload(); };
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  // Durum değişikliği: ekranda hemen, sunucuda arkadan (karşı tarafa bildirimi sunucu atar)
  const change = (r, type, status, text) => {
    const history = [...r.history, { type, text, by: viewer.id, at: Date.now() }];
    setData(d => ({ ...d, requests: d.requests.map(x => (x.id === r.id ? { ...x, status, history } : x)) }));
    api.updateRequest(r.id, { status, history }).catch(failed);
  };

  const act = {
    approve: r => {
      change(r, 'approved', 'approved');
      closeThen(() => celebrate(`💖 onaylandı! ${nameOf(r.from)} uçuyor şu an`));
    },
    reject: (r, reason) => {
      change(r, 'rejected', 'rejected', reason);
      closeThen(() => toast('💔 reddedildi. acımasızsın ama haklısın'));
    },
    nego: (r, text) => {
      change(r, 'nego', 'nego', text);
      closeThen(() => toast('🤝 karşı teklif masada'));
    },
    accept: r => {
      change(r, 'accepted', 'approved');
      closeThen(() => celebrate('✅ anlaştınız! talep onaylandı'));
    },
    appeal: (r, text) => {
      change(r, 'appeal', 'appeal', text);
      closeThen(() => toast('⚖️ itiraz edildi, mahkeme toplanıyor'));
    },
    withdraw: r => {
      setData(d => ({ ...d, requests: d.requests.filter(x => x.id !== r.id) }));
      api.deleteRequest(r.id).catch(failed);
      closeThen(() => toast('🫥 talep geri çekildi'));
    },
    report: r => Alert.alert('neden şikayet ediyorsun? 🚩', 'şikayetin 24 saat içinde incelenir.', [
      ...['uygunsuz içerik', 'taciz / zorbalık', 'spam'].map(reason => ({
        text: reason,
        onPress: () => api.reportRequest(viewer.id, r, reason)
          .then(() => closeThen(() => toast('🚩 şikayetin alındı, teşekkürler')))
          .catch(oops),
      })),
      { text: 'vazgeç', style: 'cancel' },
    ]),
    block: id => Alert.alert(`${nameOf(id)} engellensin mi? 🚫`, 'sana talep atamaz, talepleri de sana görünmez.', [
      { text: 'vazgeç', style: 'cancel' },
      {
        text: 'engelle', style: 'destructive',
        onPress: () => api.blockUser(viewer.id, id)
          .then(() => { closeThen(() => toast('🚫 engellendi')); reload(); })
          .catch(oops),
      },
    ]),
  };

  // true dönerse form kapanır
  const send = async ({ to, catId, title, desc, urgency, image, date, time, place }) => {
    if (left <= 0) { openPaywall(limitReason); return false; }
    try {
      const r = await api.sendRequest(data.id, {
        from: viewer.id, to, catId, title: title.trim(), desc: desc.trim(), urgency, date, time,
        place: place.trim() || null, day: todayKey(), history: [{ type: 'created', by: viewer.id, at: Date.now() }],
      }, image && image.base64);
      // görsel, sunucudan imzalı adres gelene kadar telefondaki dosyadan gösterilir
      setData(d => ({ ...d, requests: [{ ...r, image: image ? image.uri : null }, ...d.requests] }));
      // ücretsiz hak bir kez harcanınca talep geri çekilse de geri gelmez (sunucu da işaretler)
      setStore(s => ({ ...s, freeUsed: true }));
    } catch (e) {
      oops();
      return false;
    }
    setTab('out');
    closeThen(() => { success(); toast(`🚀 talep fırlatıldı · ${nameOf(to)} bildirim aldı 🔔`); });
    return true;
  };

  const addCat = t => {
    const c = { id: uid(), e: '✨', t };
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
    isOwner ? 'hat silinsin mi?' : 'hattan ayrılıyor musun?',
    isOwner ? 'hat ve içindeki tüm talepler herkes için silinir.' : 'bu hattaki talepleri artık göremezsin. kodla tekrar katılabilirsin.',
    [
      { text: 'vazgeç', style: 'cancel' },
      {
        text: isOwner ? 'hattı sil' : 'ayrıl', style: 'destructive',
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

  const kick = () => Alert.alert('kimi hattan çıkarmak istiyorsun?', 'çıkan kişi bu hattaki talepleri göremez.', [
    ...others.map(m => ({
      text: m.name,
      onPress: () => Alert.alert(`${m.name} hattan çıkarılsın mı?`, 'davet kodunu bildiği için tekrar katılabilir; istemiyorsan talebinden onu engelle.', [
        { text: 'vazgeç', style: 'cancel' },
        { text: 'çıkar', style: 'destructive', onPress: () => api.removeMember(data.id, m.id).then(reload).catch(oops) },
      ]),
    })),
    { text: 'vazgeç', style: 'cancel' },
  ]);

  const settings = () => {
    Alert.alert(`${data.line.emoji} ${data.line.name}`, 'ne yapmak istersin?', [
      { text: 'kişileri davet et 💌', onPress: () => setSheet('invite') },
      { text: 'Talepp+ planları 👑', onPress: () => openPaywall('browse') },
      ...(isOwner && others.length ? [{ text: 'birini hattan çıkar', onPress: kick }] : []),
      { text: isOwner ? 'hattı sil' : 'hattan ayrıl', style: 'destructive', onPress: leave },
      { text: 'kapat', style: 'cancel' },
    ]);
  };

  const list = data.requests
    .filter(r => (tab === 'in' ? r.to === viewer.id : tab === 'out' ? r.from === viewer.id : true))
    .sort((a, b) => b.createdAt - a.createdAt);
  const inPending = data.requests.filter(r => r.to === viewer.id && OPEN.includes(r.status)).length;
  const detail = data.requests.find(r => r.id === detailId);

  const EMPTY = {
    in: ['📭', 'gelen kutun bomboş', 'biri sana talep atınca burada parlayacak ✦'],
    out: ['🚀', 'henüz talep atmadın', 'ilk talebini fırlat, bakalım onaylanacak mı 👀'],
    all: ['🫧', 'hat sessiz...', 'fırtına öncesi sessizlik bu 🌪️'],
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
            <Text style={styles.kicker}>talep hattı ✦</Text>
            <Text style={styles.lineName} numberOfLines={2}>{data.line.name}</Text>
          </View>
          <Pressable onPress={() => { tap(); onHome(); }} hitSlop={10} style={[styles.gear, { marginRight: 8 }]}>
            <Text style={{ fontSize: 18 }}>🏠</Text>
          </Pressable>
          <Pressable onPress={() => { tap(); settings(); }} hitSlop={10} style={styles.gear}>
            <Text style={{ fontSize: 20, color: C.ink }}>⚙︎</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>bu hatta kimler var 🫶</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
          {data.members.map((m, i) => {
            const me = m.id === viewer.id;
            return (
              <View key={m.id} style={[styles.viewerChip, me && styles.viewerChipOn]}>
                <Avatar name={m.name} index={i} size={30} active={me} />
                <Text style={[styles.viewerName, me && { color: '#fff' }]}>{me ? `${m.name} (sen)` : m.name}</Text>
              </View>
            );
          })}
          <Pressable onPress={() => { tap(); setSheet('invite'); }} style={[styles.viewerChip, styles.inviteChip]}>
            <Text style={[styles.viewerName, { color: C.hot }]}>＋ davet et</Text>
          </Pressable>
        </ScrollView>

        {!others.length ? (
          <Glass style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>💌</Text>
            <Text style={styles.emptyTitle}>hattında henüz kimse yok</Text>
            <Text style={styles.emptySub}>
              talep atabilmek için en az bir kişiyi davet et. kodu alan kişi Talepp'i indirip "kodla katıl"a yazınca burada görünür.
            </Text>
            <ChromeButton hot title="💌 kişileri davet et" onPress={() => setSheet('invite')} style={{ marginTop: 16 }} />
          </Glass>
        ) : null}

        <Glass style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{plan === 'free' ? 'talep hakkın' : 'bugünkü talep hakkın'}</Text>
              <HoloText style={styles.quotaBig}>{limit === Infinity ? '∞' : `${left}/${limit}`}</HoloText>
              <Text style={styles.quotaHint}>{quotaHint}</Text>
            </View>
            {plan === 'free'
              ? <ChromeButton small hot title="Talepp+ 👑" onPress={() => openPaywall('browse')} />
              : <Pressable onPress={() => openPaywall('browse')}><Sticker text={`👑 ${planOf(plan).short}`} bg={C.butter} rotate="6deg" /></Pressable>}
          </View>
          {limit !== Infinity && limit > 0 ? (
            <View style={styles.bar}>
              <LinearGradient colors={HOT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.min(100, (used / limit) * 100)}%`, height: '100%', borderRadius: 99 }} />
            </View>
          ) : null}
        </Glass>

        <View style={styles.tabs}>
          {[['in', 'gelen'], ['out', 'giden'], ['all', 'tüm hat']].map(([k, t]) => (
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
        ) : list.map(r => (
          <RequestCard
            key={r.id} r={r}
            cat={data.line.cats.find(c => c.id === r.catId)}
            fromName={nameOf(r.from)} toName={nameOf(r.to)}
            onPress={() => { setDetailId(r.id); setSheet('detail'); }}
          />
        ))}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
        <ChromeButton hot big title={others.length ? '✦ TALEP AT ✦' : '💌 KİŞİLERİ DAVET ET'} onPress={onFab} />
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
      <DetailSheet visible={sheet === 'detail'} onClose={() => setSheet(null)} r={detail} data={data} viewer={viewer} colors={colors} act={act} />
      <PaywallSheet visible={sheet === 'paywall'} onClose={() => setSheet(null)} reason={paywallReason} plan={plan} colors={colors} onPlan={planChanged} />
      <InviteSheet
        visible={sheet === 'invite'} onClose={() => { setSheet(null); setFreshInvite(false); }}
        line={data.line} members={data.members.length} colors={colors} fresh={freshInvite}
      />
    </HoloBg>
  );
}

// ─────────────────────────────────────────────────────────────
// Ana sayfa: tüm hatlar
// ─────────────────────────────────────────────────────────────
function Lines({ store, userName, onOpen, onNew, onJoin, onAccount, reload }) {
  const insets = useSafeAreaInsets();
  const { limit, used } = quotaOf(store.plan, store.freeUsed, myUsedToday(store));
  const left = Math.max(0, limit - used);
  const [joinOpen, setJoinOpen] = useState(false);
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
            <Text style={styles.kicker}>{userName ? `selam ${userName} 👋` : 'ana sayfa ✦'}</Text>
            <HoloText style={styles.hubTitle}>hatlarım</HoloText>
          </View>
          <Pressable onPress={() => { tap(); onAccount(); }} hitSlop={10} style={styles.gear}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </Pressable>
        </View>

        <Glass style={{ marginTop: 14 }}>
          <Text style={styles.label}>{store.plan === 'free' ? 'talep hakkın' : 'bugünkü talep hakkın'}</Text>
          <HoloText style={styles.quotaBig}>{limit === Infinity ? '∞' : `${left}/${limit}`}</HoloText>
          <Text style={styles.quotaHint}>{quotaHintOf(store.plan, left)}</Text>
        </Glass>

        {store.lines.length === 0 ? (
          <Glass style={{ alignItems: 'center', paddingVertical: 34, marginTop: 18 }}>
            <Text style={{ fontSize: 54 }}>🫧</Text>
            <Text style={styles.emptyTitle}>henüz hattın yok</Text>
            <Text style={styles.emptySub}>
              kendi hattını kur ya da sana gelen davet koduyla bir hatta katıl ✦{'\n'}sevgilin, kankaların, ev arkadaşların...
            </Text>
          </Glass>
        ) : null}

        {store.lines.map(l => {
          const pending = l.requests.filter(r => r.to === l.meId && OPEN.includes(r.status)).length;
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
        <ChromeButton title="🔑 davet kodum var · kodla katıl" onPress={() => setJoinOpen(true)} style={{ marginBottom: 12 }} />
        <ChromeButton hot big title="＋ YENİ HAT KUR" onPress={onNew} />
      </View>

      <JoinSheet visible={joinOpen} onClose={() => setJoinOpen(false)} onJoin={join} myName={userName} />
    </HoloBg>
  );
}

// ─────────────────────────────────────────────────────────────
// Kök
// ─────────────────────────────────────────────────────────────
const EMPTY_STORE = { lines: [], activeId: null, plan: 'free', freeUsed: false };

// v1 tek hat tutuyordu ve plan kişi başınaydı; v2'de birden çok hat ve hesap düzeyinde plan var
function migrate(old) {
  const id = uid();
  const me = old.members.find(m => m.id === old.meId);
  return {
    lines: [{ ...old, id }],
    activeId: id,
    plan: me ? me.plan : 'free',
    freeUsed: old.requests.some(r => r.from === old.meId),
  };
}

export default function App() {
  const [fontsLoaded] = useFonts({ Unbounded_500Medium, Unbounded_700Bold, Unbounded_900Black });
  const [store, setStore] = useState(null);
  const [adding, setAdding] = useState(false);
  const [session, setSession] = useState(supabase ? undefined : null); // undefined: henüz bilinmiyor
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    if (!supabase) return;
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
        else {
          const old = await AsyncStorage.getItem(OLD_KEY);
          if (old) s = migrate(JSON.parse(old));
        }
      } catch (e) {}
      // uygulama her açılışta "hatlarım"dan başlar
      setStore(s ? { ...s, activeId: null } : EMPTY_STORE);
    })();
  }, []);

  useEffect(() => {
    if (store) AsyncStorage.setItem(STORE_KEY, JSON.stringify(store)).catch(() => {});
  }, [store]);

  if (!fontsLoaded || !store || session === undefined) return <View style={{ flex: 1, backgroundColor: '#FFC6EC' }} />;

  if (!session && !demo) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthScreen onDemo={() => setDemo(true)} />
      </SafeAreaProvider>
    );
  }

  const user = session && session.user;
  const active = store.lines.find(l => l.id === store.activeId);

  // Hatlar şimdilik sadece bu telefonda; çıkış yapınca duruyorlar, hesap silinince temizleniyor
  const deleteAccount = () => Alert.alert('hesabın silinsin mi? 🥺', 'hesabın ve profil bilgilerin kalıcı olarak silinir, bu telefondaki hatlar da temizlenir. aynı hesapla Yumi kullanıyorsan oradaki hesabın da silinir.', [
    { text: 'vazgeç', style: 'cancel' },
    {
      text: 'hesabımı sil', style: 'destructive',
      onPress: async () => {
        const { error } = await supabase.rpc('delete_user');
        if (error) { Alert.alert('olmadı 😵', 'hesap silinemedi, internetini kontrol edip tekrar dener misin?'); return; }
        setStore(EMPTY_STORE);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      },
    },
  ]);
  const account = () => Alert.alert((user.user_metadata && user.user_metadata.name) || 'hesabım', user.email, [
    { text: 'çıkış yap', onPress: () => supabase.auth.signOut().catch(() => {}) },
    { text: 'hesabımı sil', style: 'destructive', onPress: deleteAccount },
    { text: 'kapat', style: 'cancel' },
  ]);

  const addLine = line => {
    const id = uid();
    setStore(s => ({ ...s, lines: [...s.lines, { ...line, id }], activeId: id }));
    setAdding(false);
  };
  // Home açık hattı bununla günceller; null verirse hat silinir
  const setLine = fn => setStore(s => {
    const cur = s.lines.find(l => l.id === s.activeId);
    if (!cur) return s;
    const next = typeof fn === 'function' ? fn(cur) : fn;
    if (!next) return { ...s, lines: s.lines.filter(l => l.id !== cur.id), activeId: null };
    return { ...s, lines: s.lines.map(l => (l.id === cur.id ? next : l)) };
  });

  const userName = (user && user.user_metadata && user.user_metadata.name) || '';

  let screen;
  if (adding) {
    screen = <Onboarding onDone={addLine} onCancel={() => setAdding(false)} myName={meName(store.lines[0]) || userName} />;
  } else if (active) {
    screen = (
      <Home
        key={active.id} data={active} setData={setLine} store={store} setStore={setStore}
        onHome={() => setStore(s => ({ ...s, activeId: null }))}
      />
    );
  } else {
    screen = (
      <Lines
        store={store} userName={userName} onOpen={id => setStore(s => ({ ...s, activeId: id }))} onNew={() => setAdding(true)}
        onAccount={user ? account : null}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
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

  themeRow: { flexDirection: 'row', gap: 8 },
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

  codeBox: { marginTop: 22, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 30, borderWidth: 2, borderColor: C.ink },
  code: { fontFamily: F.black, fontSize: 28, color: C.ink, letterSpacing: 3 },
});
