-- Talepp 2. adım: gerçek hatlar, davet kodu, bildirimler, engelle / şikayet, görseller
-- schema.sql'den sonra, Yumi projesinde bir kez çalıştırılır:
-- SQL Editor → + → Create a new snippet → bu dosyanın tamamını yapıştır → Run
-- Yumi'nin tablolarına dokunmaz; Talepp'in her şeyi "talepp_" ile başlar.

-- ─────────────────────────────────────────────────────────────
-- Profil: ücretsiz hak ve bildirim adresi
-- ─────────────────────────────────────────────────────────────
alter table public.talepp_profiles add column free_used boolean not null default false;
alter table public.talepp_profiles add column push_token text;

-- Kullanıcı kendi profilinde yalnızca adını değiştirebilir; ücretsiz hakkı sunucu işaretler
revoke insert, update on public.talepp_profiles from anon, authenticated;
grant update (name) on public.talepp_profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Tablolar
-- ─────────────────────────────────────────────────────────────
create table public.talepp_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '💖',
  theme text not null default 'bubblegum',
  cats jsonb not null default '[]',
  code text not null unique,
  owner uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table public.talepp_members (
  line_id uuid not null references public.talepp_lines on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (line_id, user_id)
);
create index talepp_members_user_idx on public.talepp_members (user_id);

create table public.talepp_requests (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.talepp_lines on delete cascade,
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  cat_id text,
  title text not null,
  descr text not null default '',
  urgency text not null default 'onemli',
  image_path text,
  date text,
  time text,
  place text,
  status text not null default 'pending',
  history jsonb not null default '[]',
  day text not null,  -- gönderenin telefonundaki gün; günlük hak sayımı için
  created_at timestamptz not null default now()
);
create index talepp_requests_line_idx on public.talepp_requests (line_id, created_at desc);

-- Engellenen kişi engelleyene talep atamaz, talepleri de ona görünmez
create table public.talepp_blocks (
  blocker uuid not null references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

-- Şikayetler: Supabase panelinde Table Editor → talepp_reports'tan takip edilir
create table public.talepp_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references auth.users on delete cascade,
  reported uuid references auth.users on delete set null,
  request_id uuid references public.talepp_requests on delete set null,
  reason text not null default '',
  snapshot jsonb,  -- talep sonradan silinse de içerik görülebilsin
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Yardımcı kontroller (RLS kurallarının birbirini döngüye sokmaması için security definer)
-- ─────────────────────────────────────────────────────────────
create or replace function public.talepp_is_member(l uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.talepp_members where line_id = l and user_id = (select auth.uid()));
$$;

-- Görsel yolları "<hat id>/<dosya>" biçiminde; klasör adını metin olarak karşılaştırır
create or replace function public.talepp_is_member_path(folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.talepp_members where line_id::text = folder and user_id = (select auth.uid()));
$$;

-- Talep atılabilir mi: ikisi de hatta, kendine değil ve alıcı göndereni engellememiş
create or replace function public.talepp_can_send(l uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target <> (select auth.uid())
    and exists (select 1 from public.talepp_members where line_id = l and user_id = (select auth.uid()))
    and exists (select 1 from public.talepp_members where line_id = l and user_id = target)
    and not exists (select 1 from public.talepp_blocks where blocker = target and blocked = (select auth.uid()));
$$;

-- ─────────────────────────────────────────────────────────────
-- Güvenlik kuralları
-- ─────────────────────────────────────────────────────────────
alter table public.talepp_lines enable row level security;
alter table public.talepp_members enable row level security;
alter table public.talepp_requests enable row level security;
alter table public.talepp_blocks enable row level security;
alter table public.talepp_reports enable row level security;

-- Hat kurma ve katılma aşağıdaki fonksiyonlarla yapılır, doğrudan ekleme yok
create policy "Talepp: üye olduğu hatları gör" on public.talepp_lines
  for select using (public.talepp_is_member(id));
create policy "Talepp: üyeler hattı günceller" on public.talepp_lines
  for update using (public.talepp_is_member(id));
create policy "Talepp: sahibi hattı siler" on public.talepp_lines
  for delete using ((select auth.uid()) = owner);
-- üyeler hattın yalnızca başlıklarını değiştirebilir (yeni başlık ekleme)
revoke insert, update on public.talepp_lines from anon, authenticated;
grant update (cats) on public.talepp_lines to authenticated;

create policy "Talepp: hattaki üyeleri gör" on public.talepp_members
  for select using (public.talepp_is_member(line_id));
create policy "Talepp: hattan ayrıl ya da sahibi çıkarır" on public.talepp_members
  for delete using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.talepp_lines l where l.id = line_id and l.owner = (select auth.uid()))
  );

create policy "Talepp: hattaki talepleri gör" on public.talepp_requests
  for select using (public.talepp_is_member(line_id));
create policy "Talepp: talep at" on public.talepp_requests
  for insert with check ((select auth.uid()) = from_id and public.talepp_can_send(line_id, to_id));
create policy "Talepp: talebin iki tarafı günceller" on public.talepp_requests
  for update using (public.talepp_is_member(line_id) and (select auth.uid()) in (from_id, to_id));
create policy "Talepp: gönderen geri çeker" on public.talepp_requests
  for delete using ((select auth.uid()) = from_id);

create policy "Talepp: kendi engellerini gör" on public.talepp_blocks
  for select using ((select auth.uid()) = blocker);
create policy "Talepp: engelle" on public.talepp_blocks
  for insert with check ((select auth.uid()) = blocker);
create policy "Talepp: engeli kaldır" on public.talepp_blocks
  for delete using ((select auth.uid()) = blocker);

create policy "Talepp: şikayet et" on public.talepp_reports
  for insert with check ((select auth.uid()) = reporter);

-- ─────────────────────────────────────────────────────────────
-- Uygulamanın çağırdığı fonksiyonlar
-- ─────────────────────────────────────────────────────────────
create or replace function public.talepp_create_line(
  p_name text, p_emoji text, p_theme text, p_cats jsonb, p_code text, p_member_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  lid uuid;
begin
  if (select auth.uid()) is null then raise exception 'giriş gerekli'; end if;
  insert into public.talepp_lines (name, emoji, theme, cats, code, owner)
  values (p_name, p_emoji, p_theme, p_cats, upper(p_code), (select auth.uid()))
  returning id into lid;
  insert into public.talepp_members (line_id, user_id, name) values (lid, (select auth.uid()), p_member_name);
  return lid;
end;
$$;

-- Kod yanlışsa null döner
create or replace function public.talepp_join_line(p_code text, p_member_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  lid uuid;
begin
  if (select auth.uid()) is null then raise exception 'giriş gerekli'; end if;
  select id into lid from public.talepp_lines where code = upper(trim(p_code));
  if lid is null then return null; end if;
  insert into public.talepp_members (line_id, user_id, name)
  values (lid, (select auth.uid()), p_member_name)
  on conflict do nothing;
  return lid;
end;
$$;

-- Telefonun bildirim adresini kaydeder (null: çıkış yaparken siler).
-- Aynı telefon başka hesapla açılırsa adres eski hesaptan alınır.
create or replace function public.talepp_save_push_token(token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then return; end if;
  if token is not null then
    update public.talepp_profiles set push_token = null where push_token = token and id <> (select auth.uid());
  end if;
  insert into public.talepp_profiles (id, email, push_token)
  values ((select auth.uid()), (select email from auth.users where id = (select auth.uid())), token)
  on conflict (id) do update set push_token = excluded.push_token;
end;
$$;

revoke execute on function public.talepp_create_line(text, text, text, jsonb, text, text) from public, anon;
revoke execute on function public.talepp_join_line(text, text) from public, anon;
revoke execute on function public.talepp_save_push_token(text) from public, anon;
grant execute on function public.talepp_create_line(text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.talepp_join_line(text, text) to authenticated;
grant execute on function public.talepp_save_push_token(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Ücretsiz hak: ilk talep atılınca sunucu işaretler (uygulama silinip kurulsa da geri gelmez)
-- ─────────────────────────────────────────────────────────────
create or replace function public.talepp_mark_free_used()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.talepp_profiles (id, free_used) values (new.from_id, true)
  on conflict (id) do update set free_used = true;
  return new;
end;
$$;

create trigger talepp_request_free_used
  after insert on public.talepp_requests
  for each row execute function public.talepp_mark_free_used();

-- ─────────────────────────────────────────────────────────────
-- Bildirimler: Expo'nun ücretsiz push servisine sunucudan gönderilir
-- ─────────────────────────────────────────────────────────────
create extension if not exists pg_net;

create or replace function public.talepp_push(target uuid, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tok text;
begin
  select push_token into tok from public.talepp_profiles where id = target;
  if tok is null then return; end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := jsonb_build_object('to', tok, 'title', p_title, 'body', p_body, 'sound', 'default', 'data', p_data),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
end;
$$;

-- Kullanıcılar bunu doğrudan çağıramaz (yoksa herkese bildirim atabilirlerdi); yalnızca tetikleyiciler kullanır
revoke execute on function public.talepp_push(uuid, text, text, jsonb) from public, anon, authenticated;

-- Yeni talep, onay, ret, pazarlık, kabul, itiraz: işlemi yapanın karşısındakine bildirim
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
  msg text;
begin
  if tg_op = 'UPDATE' and jsonb_array_length(new.history) = jsonb_array_length(old.history) then
    return new;
  end if;
  actor := coalesce((last ->> 'by')::uuid, new.from_id);
  target := case when actor = new.from_id then new.to_id else new.from_id end;
  select name into actor_name from public.talepp_members where line_id = new.line_id and user_id = actor;
  select name into line_name from public.talepp_lines where id = new.line_id;
  msg := case coalesce(last ->> 'type', 'created')
    when 'created' then '🚀 sana talep attı'
    when 'approved' then '💖 talebini onayladı'
    when 'rejected' then '💔 talebini reddetti'
    when 'nego' then '🤝 karşı teklif verdi'
    when 'accepted' then '✅ teklifini kabul etti'
    when 'appeal' then '⚖️ itiraz etti'
    else 'talebi güncelledi'
  end;
  perform public.talepp_push(
    target,
    coalesce(line_name, 'Talepp'),
    coalesce(nullif(actor_name, ''), 'biri') || ' ' || msg || ': ' || new.title,
    jsonb_build_object('line', new.line_id, 'request', new.id)
  );
  return new;
end;
$$;

create trigger talepp_request_notify
  after insert or update on public.talepp_requests
  for each row execute function public.talepp_request_notify();

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
      coalesce(line_name, 'Talepp'),
      '🫶 ' || coalesce(nullif(new.name, ''), 'biri') || ' hattına katıldı!',
      jsonb_build_object('line', new.line_id)
    );
  end loop;
  return new;
end;
$$;

create trigger talepp_member_notify
  after insert on public.talepp_members
  for each row execute function public.talepp_member_notify();

-- ─────────────────────────────────────────────────────────────
-- Canlı güncelleme: uygulama açıkken talepler anında düşsün
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.talepp_requests, public.talepp_members, public.talepp_lines;

-- ─────────────────────────────────────────────────────────────
-- Görseller: gizli "talepp" kovası, yalnızca hattın üyeleri yükler ve görür
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('talepp', 'talepp', false)
on conflict (id) do nothing;

create policy "Talepp: hat üyeleri görsel yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'talepp' and public.talepp_is_member_path((storage.foldername(name))[1]));
create policy "Talepp: hat üyeleri görselleri görür" on storage.objects
  for select to authenticated
  using (bucket_id = 'talepp' and public.talepp_is_member_path((storage.foldername(name))[1]));
