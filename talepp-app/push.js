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
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await supabase.rpc('talepp_save_push_token', { token: data });
  } catch (e) {
    // Expo Go'da ya da EAS projectId yokken adres alınamayabilir; uygulama bildirimsiz çalışır
  }
}

// Çıkış yaparken: bu telefona artık o hesabın bildirimleri gelmesin
export async function clearPush() {
  try {
    await supabase.rpc('talepp_save_push_token', { token: null });
  } catch (e) {
    // bağlantı yoksa sorun değil; telefon başka hesapla girince adres zaten taşınır
  }
}

// Bildirime dokununca ilgili hattın id'siyle cb çağrılır (uygulama kapalıyken açıldıysa da)
export function onPushOpen(cb) {
  const handle = r => {
    const d = (r && r.notification.request.content.data) || {};
    if (d.line) cb(d.line);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
