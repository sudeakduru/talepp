// Supabase bağlantısı
// Panelde: üstteki "Connect" butonu (ya da Project Settings → API Keys) → Project URL ve publishable key.
// Buraya yalnızca public / publishable anahtar konur. service_role ya da secret key ASLA buraya yazılmaz.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = '';
export const SUPABASE_KEY = '';

// Anahtarlar boşken null: kayıt ekranı uyarı gösterir ve "demo olarak devam et" sunar
export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  })
  : null;
