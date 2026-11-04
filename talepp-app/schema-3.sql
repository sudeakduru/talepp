-- Talepp 3. adım: isteğe bağlı profil fotoğrafı
-- schema-2.sql'den sonra, Yumi projesinde bir kez çalıştırılır:
-- SQL Editor → + → Create a new snippet → bu dosyanın tamamını yapıştır → Run

-- Fotoğraf adresi profilde durur; hattaki diğer kişiler profili göremediği için üyelik satırlarına da kopyalanır
alter table public.talepp_profiles add column avatar text;
alter table public.talepp_members add column avatar text;

-- Fotoğrafı ayarlar ya da kaldırır (null); kullanıcının bütün hatlarında güncellenir
create or replace function public.talepp_set_avatar(p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'giriş gerekli'; end if;
  insert into public.talepp_profiles (id, email, avatar)
  values ((select auth.uid()), (select email from auth.users where id = (select auth.uid())), p_url)
  on conflict (id) do update set avatar = excluded.avatar;
  update public.talepp_members set avatar = p_url where user_id = (select auth.uid());
end;
$$;

revoke execute on function public.talepp_set_avatar(text) from public, anon;
grant execute on function public.talepp_set_avatar(text) to authenticated;

-- Hat kurarken ve katılırken profildeki fotoğraf üyeliğe de yazılsın
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
  insert into public.talepp_members (line_id, user_id, name, avatar)
  values (lid, (select auth.uid()), p_member_name, (select avatar from public.talepp_profiles where id = (select auth.uid())));
  return lid;
end;
$$;

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
  insert into public.talepp_members (line_id, user_id, name, avatar)
  values (lid, (select auth.uid()), p_member_name, (select avatar from public.talepp_profiles where id = (select auth.uid())))
  on conflict do nothing;
  return lid;
end;
$$;

-- Fotoğraflar "talepp-avatars" kovasında; herkes kendi klasörüne (<kullanıcı id>/...) yükler ve siler.
-- Kova açık: adresi bilen görür, adresler tahmin edilemez (kullanıcı id + zaman).
insert into storage.buckets (id, name, public) values ('talepp-avatars', 'talepp-avatars', true)
on conflict (id) do nothing;

create policy "Talepp: kendi fotoğrafını yükle" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'talepp-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Talepp: kendi fotoğraflarını listele" on storage.objects
  for select to authenticated
  using (bucket_id = 'talepp-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Talepp: kendi fotoğrafını sil" on storage.objects
  for delete to authenticated
  using (bucket_id = 'talepp-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
