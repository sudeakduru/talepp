// Bildirimler: talep gelince, onay / ret / pazarlık / itiraz olunca ve hatta biri katılınca.
// Gönderimi sunucu yapar (schema-2.sql'deki tetikleyiciler); burada izin alınır ve telefonun adresi kaydedilir.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Uygulama açıkken gelen bildirim de üstte görünsün
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Her cihazın kendi adresi var; hesap telefonda da iPad'de de açıksa ikisine de gider (schema-5.sql)
async function deviceToken() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

export async function registerPush() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Talepler',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) ({ granted } = await Notifications.requestPermissionsAsync());
    if (!granted) return;
    await supabase.rpc('talepp_save_push_token', { token: await deviceToken() });
  } catch (e) {
    // Expo Go'da ya da EAS projectId yokken adres alınamayabilir; uygulama bildirimsiz çalışır
  }
}

// Çıkış yaparken: yalnızca bu cihaza artık o hesabın bildirimleri gelmesin
export async function clearPush() {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (granted) await supabase.rpc('talepp_remove_push_token', { p_token: await deviceToken() });
  } catch (e) {
    // bağlantı yoksa sorun değil; cihaz başka hesapla girince adres zaten taşınır
  }
}

// Bildirime dokununca cb(hat id, talep id) çağrılır (uygulama kapalıyken açıldıysa da); talep id olmayabilir
export function onPushOpen(cb) {
  const handle = r => {
    const d = (r && r.notification.request.content.data) || {};
    if (d.line) cb(d.line, d.request || null);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
