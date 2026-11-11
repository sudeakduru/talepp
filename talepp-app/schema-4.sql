-- TalApp 4. adım: test kullanıcıları, Apple ile giriş profili, daha net bildirimler
-- schema-3.sql'den sonra, Yumi projesinde bir kez çalıştırılır:
-- SQL Editor → + → Create a new snippet → bu dosyanın tamamını yapıştır → Run

-- ─────────────────────────────────────────────────────────────
-- Test kullanıcıları: sınırsız talep, abonelik gerekmez
-- Kullanıcı kendisi değiştiremez (profilde yalnızca adını güncelleyebilir).
-- Birini test kullanıcısı yapmak için (e-postayı değiştir):
--   update public.talepp_profiles set tester = true where email = 'ornek@mail.com';
-- ─────────────────────────────────────────────────────────────
alter table public.talepp_profiles add column if not exists tester boolean not null default false;

-- ─────────────────────────────────────────────────────────────
-- Apple ile giriş: e-posta kaydındaki tetikleyici çalışmadığı için profil uygulamadan açılır.
-- Yumi hesabıyla TalApp'e giren eski kullanıcılar da bununla profil açar.
-- ─────────────────────────────────────────────────────────────
create or replace function public.talepp_ensure_profile(p_name text, p_age int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'giriş gerekli'; end if;
  if p_age is null or p_age < 13 or p_age > 120 then raise exception 'yaş 13-120 arası olmalı'; end if;
  insert into public.talepp_profiles (id, email, name, age)
  select u.id, u.email, left(coalesce(trim(p_name), ''), 20), p_age from auth.users u where u.id = auth.uid()
  on conflict (id) do update set name = excluded.name, age = excluded.age;
end;
$$;

revoke execute on function public.talepp_ensure_profile(text, int) from public, anon;
grant execute on function public.talepp_ensure_profile(text, int) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Bildirimler: başlıkta kim ne yaptı, altında talebin başlığı, üstte hattın adı.
-- Bildirime dokununca uygulama doğrudan o talebi açar (data.request).
-- ─────────────────────────────────────────────────────────────
create or replace function public.talepp_request_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last jsonb := new.history -> -1;
  actor uuid;
  target uuid;
  actor_name text;
  line_name text;
  cat_emoji text;
  head text;
begin
  if tg_op = 'UPDATE' and jsonb_array_length(new.history) = jsonb_array_length(old.history) then
    return new;
  end if;
  actor := coalesce((last ->> 'by')::uuid, new.from_id);
  target := case when actor = new.from_id then new.to_id else new.from_id end;
  select name into actor_name from public.talepp_members where line_id = new.line_id and user_id = actor;
  actor_name := coalesce(nullif(actor_name, ''), 'Biri');
  select l.name, (select c ->> 'e' from jsonb_array_elements(l.cats) c where c ->> 'id' = new.cat_id limit 1)
    into line_name, cat_emoji
    from public.talepp_lines l where l.id = new.line_id;
  head := case coalesce(last ->> 'type', 'created')
    when 'created' then '💌 ' || actor_name || ' sana talep attı'
    when 'approved' then '💖 ' || actor_name || ' talebini onayladı'
    when 'rejected' then '💔 ' || actor_name || ' talebini reddetti'
    when 'nego' then '🤝 ' || actor_name || ' karşı teklif verdi'
    when 'accepted' then '✅ ' || actor_name || ' teklifini kabul etti'
    when 'appeal' then '⚖️ ' || actor_name || ' itiraz etti'
    else '✦ ' || actor_name || ' talebi güncelledi'
  end;
  perform public.talepp_push(
    target,
    head,
    coalesce(cat_emoji || ' ', '') || new.title,
    jsonb_build_object('line', new.line_id, 'request', new.id)
  );
  return new;
end;
$$;

-- Hatta biri katılınca diğer üyelere haber ver
create or replace function public.talepp_member_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
  line_name text;
begin
  select name into line_name from public.talepp_lines where id = new.line_id;
  for m in select user_id from public.talepp_members where line_id = new.line_id and user_id <> new.user_id loop
    perform public.talepp_push(
      m.user_id,
      '🫶 ' || coalesce(nullif(new.name, ''), 'Biri') || ' hattına katıldı!',
      'Artık ' || coalesce(line_name, 'hattında') || ' içinde birbirinize talep atabilirsiniz ✦',
      jsonb_build_object('line', new.line_id)
    );
  end loop;
  return new;
end;
$$;
