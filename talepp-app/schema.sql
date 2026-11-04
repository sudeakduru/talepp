-- Talepp veritabanı şeması (Yumi ile ortak Supabase projesinde)
-- Supabase panelinde Yumi projesini aç: SQL Editor → New query → bu dosyanın tamamını yapıştır → Run
-- Yumi'nin tablolarına dokunmaz; Talepp'in her şeyi "talepp_" ile başlar.

-- Kullanıcı profili: kayıtta girilen ad, yaş ve e-posta (her Talepp kullanıcısına bir satır)
create table public.talepp_profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text not null default '',
  age int check (age between 13 and 120),
  created_at timestamptz not null default now()
);

-- Talepp'ten kayıt olunca profil satırı otomatik açılır. Uygulama signUp sırasında
-- app = 'talepp' gönderir; Yumi'den gelen kayıtlar bu yüzden etkilenmez.
-- E-posta onayı beklenirken de çalışır.
create or replace function public.talepp_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'app' = 'talepp' then
    insert into public.talepp_profiles (id, email, name, age)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'age', '')::int
    );
  end if;
  return new;
end;
$$;

create trigger on_talepp_user_created
  after insert on auth.users
  for each row execute function public.talepp_handle_new_user();

-- Güvenlik: herkes yalnızca kendi profilini görebilir ve değiştirebilir
alter table public.talepp_profiles enable row level security;

create policy "Talepp: kendi profilini oku" on public.talepp_profiles
  for select using ((select auth.uid()) = id);
create policy "Talepp: kendi profilini güncelle" on public.talepp_profiles
  for update using ((select auth.uid()) = id);

-- "Hesabımı sil" için Yumi'nin public.delete_user() fonksiyonu kullanılır (Yumi'nin schema.sql'inde var).
-- Hesaplar ortak olduğu için silinen hesap iki uygulamadan da silinir.
