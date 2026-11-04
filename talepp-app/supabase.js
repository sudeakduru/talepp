// Supabase bağlantısı: Yumi ile ortak proje (ücretsiz planda 2 proje sınırı yüzünden).
// Talepp'in tabloları "talepp_" ile başlar; kullanıcı hesapları (auth) iki uygulamada ortaktır.
// Buraya yalnızca public / publishable anahtar konur. service_role ya da secret key ASLA buraya yazılmaz.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zlnebapkjrcdnctnsdbo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_zAo4y0eTMLlLwigepSN_Gg_1pid6sN5';

// Anahtarlar boşken null: kayıt ekranı uyarı gösterir ve "demo olarak devam et" sunar
export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  })
  : null;
