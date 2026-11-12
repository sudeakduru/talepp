// Sunucudaki hatlar, üyeler ve talepler (Supabase). Ekranlar veritabanına bu dosya dışında dokunmaz.
// Tablolar ve güvenlik kuralları schema-2.sql'de.
import { supabase } from './supabase';

const BUCKET = 'talepp';

// Sunucu satırı → ekranların kullandığı talep biçimi
const toReq = (r, urls = {}) => ({
  id: r.id, from: r.from_id, to: r.to_id, catId: r.cat_id, title: r.title, desc: r.descr, urgency: r.urgency,
  image: r.image_path ? urls[r.image_path] || null : null, imagePath: r.image_path,
  date: r.date, time: r.time, place: r.place, status: r.status, history: r.history, day: r.day,
  createdAt: new Date(r.created_at).getTime(),
});

// Kullanıcının bütün hatları, üyeleri ve talepleri tek seferde
export async function fetchAll(userId) {
  const { data: lines, error } = await supabase.from('talepp_lines').select('*').order('created_at');
  if (error) throw error;
  const ids = lines.map(l => l.id);
  const [mem, req, blk, prof] = await Promise.all([
    ids.length ? supabase.from('talepp_members').select('*').in('line_id', ids).order('joined_at') : { data: [] },
    ids.length ? supabase.from('talepp_requests').select('*').in('line_id', ids).order('created_at', { ascending: false }) : { data: [] },
    supabase.from('talepp_blocks').select('blocked'),
    // '*': schema-4.sql çalıştırılmadan önce de (tester sütunu yokken) hata vermesin
    supabase.from('talepp_profiles').select('*').eq('id', userId).maybeSingle(),
  ]);
  const failed = [mem, req, blk, prof].find(r => r.error);
  if (failed) throw failed.error;

  const blocked = blk.data.map(b => b.blocked);
  const reqs = req.data.filter(r => !blocked.includes(r.from_id));

  // Görseller gizli kovada; 1 saatlik imzalı adreslerle gösterilir
  const paths = reqs.filter(r => r.image_path).map(r => r.image_path);
  const urls = {};
  if (paths.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    (data || []).forEach(u => { if (u.signedUrl) urls[u.path] = u.signedUrl; });
  }

  return {
    // profil yoksa ya da yaşı boşsa (Apple ile ilk giriş, Yumi hesabı) ad ve yaş istenir
    hasProfile: !!(prof.data && prof.data.age),
    name: (prof.data && prof.data.name) || '',
    tester: !!(prof.data && prof.data.tester),
    freeUsed: !!(prof.data && prof.data.free_used),
    avatar: (prof.data && prof.data.avatar) || null,
    lines: lines.map(l => ({
      id: l.id,
      owner: l.owner,
      meId: userId,
      line: { name: l.name, emoji: l.emoji, theme: l.theme, cats: l.cats, code: l.code },
      members: mem.data.filter(m => m.line_id === l.id).map(m => ({ id: m.user_id, name: m.name, avatar: m.avatar })),
      requests: reqs.filter(r => r.line_id === l.id).map(r => toReq(r, urls)),
    })),
  };
}

// Apple ile girişte (ya da Yumi hesabıyla ilk girişte) TalApp profilini açar
export async function ensureProfile(name, age) {
  const { error } = await supabase.rpc('talepp_ensure_profile', { p_name: name, p_age: age });
  if (error) throw error;
  await supabase.auth.updateUser({ data: { name } }).catch(() => {});
}

// Kod çakışırsa (çok nadir) yeni kodla tekrar dener
export async function createLine({ name, emoji, theme, cats, memberName }, makeCode) {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase.rpc('talepp_create_line', {
      p_name: name, p_emoji: emoji, p_theme: theme, p_cats: cats, p_code: makeCode(name), p_member_name: memberName,
    });
    if (!error) return data;
    if (error.code !== '23505') throw error;
  }
  throw new Error('kod üretilemedi');
}

// Kod yanlışsa null
export async function joinLine(code, memberName) {
  const { data, error } = await supabase.rpc('talepp_join_line', { p_code: code, p_member_name: memberName });
  if (error) throw error;
  return data;
}

export async function setCats(lineId, cats) {
  const { error } = await supabase.from('talepp_lines').update({ cats }).eq('id', lineId);
  if (error) throw error;
}

export async function deleteLine(lineId) {
  const { error } = await supabase.from('talepp_lines').delete().eq('id', lineId);
  if (error) throw error;
}

// Hattan ayrılmak da birini çıkarmak da aynı: üyelik satırını sil
export async function removeMember(lineId, userId) {
  const { error } = await supabase.from('talepp_members').delete().eq('line_id', lineId).eq('user_id', userId);
  if (error) throw error;
}

const toBytes = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

async function uploadImage(lineId, base64) {
  const path = `${lineId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, toBytes(base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

// Profil fotoğrafı: açık kovada <kullanıcı id>/<zaman>.jpg; eski fotoğraflar silinir
const AVATARS = 'talepp-avatars';

async function clearAvatarFiles(userId) {
  const { data } = await supabase.storage.from(AVATARS).list(userId);
  if (data && data.length) await supabase.storage.from(AVATARS).remove(data.map(f => `${userId}/${f.name}`));
}

// base64 null ise fotoğraf kaldırılır; yeni adresi (ya da null) döner
export async function setAvatar(userId, base64) {
  let url = null;
  if (base64) {
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(AVATARS).upload(path, toBytes(base64), { contentType: 'image/jpeg' });
    if (error) throw error;
    url = supabase.storage.from(AVATARS).getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supabase.rpc('talepp_set_avatar', { p_url: url });
  if (error) throw error;
  // eskileri temizle (yenisi hariç); başarısız olursa önemli değil
  try {
    const { data } = await supabase.storage.from(AVATARS).list(userId);
    const old = (data || []).filter(f => !url || !url.endsWith(`/${f.name}`)).map(f => `${userId}/${f.name}`);
    if (old.length) await supabase.storage.from(AVATARS).remove(old);
  } catch (e) {}
  return url;
}

// Hesap silinmeden önce: fotoğraflar kovada sahipsiz kalmasın
export async function removeAvatarFiles(userId) {
  try { await clearAvatarFiles(userId); } catch (e) {}
}

// r: { from, to, catId, title, desc, urgency, date, time, place, day, history }; imageB64 varsa önce görsel yüklenir
export async function sendRequest(lineId, r, imageB64) {
  const imagePath = imageB64 ? await uploadImage(lineId, imageB64) : null;
  const { data, error } = await supabase.from('talepp_requests').insert({
    line_id: lineId, from_id: r.from, to_id: r.to, cat_id: r.catId, title: r.title, descr: r.desc, urgency: r.urgency,
    image_path: imagePath, date: r.date, time: r.time, place: r.place, day: r.day, history: r.history,
  }).select().single();
  if (error) throw error;
  return toReq(data);
}

export async function updateRequest(id, { status, history }) {
  const { error } = await supabase.from('talepp_requests').update({ status, history }).eq('id', id);
  if (error) throw error;
}

export async function deleteRequest(id) {
  const { error } = await supabase.from('talepp_requests').delete().eq('id', id);
  if (error) throw error;
}

export async function blockUser(blockerId, userId) {
  const { error } = await supabase.from('talepp_blocks').insert({ blocker: blockerId, blocked: userId });
  if (error && error.code !== '23505') throw error;
}

export async function reportRequest(reporterId, r, reason) {
  const { error } = await supabase.from('talepp_reports').insert({
    reporter: reporterId, reported: r.from, request_id: r.id, reason,
    snapshot: { title: r.title, desc: r.desc, place: r.place, imagePath: r.imagePath },
  });
  if (error) throw error;
}

// Hatlardaki her değişiklikte cb çağrılır (uygulama açıkken)
export function subscribeChanges(cb) {
  const ch = supabase.channel('talepp-changes');
  ['talepp_requests', 'talepp_members', 'talepp_lines'].forEach(table => {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, cb);
  });
  ch.subscribe();
  return () => { supabase.removeChannel(ch); };
}
