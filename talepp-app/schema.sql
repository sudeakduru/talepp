-- Talepp veritabanı şeması
-- Supabase panelinde: SQL Editor → New query → bu dosyanın tamamını yapıştır → Run

-- Kullanıcı profili: kayıtta girilen ad, yaş ve e-posta (her kullanıcıya bir satır)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text not null default '',
  age int check (age between 13 and 120),
  created_at timestamptz not null default now()
);

-- Kayıt olunca profil satırı otomatik açılır. Ad ve yaş, uygulamanın signUp sırasında
-- gönderdiği bilgilerden (user metadata) alınır; e-posta onayı beklenirken de çalışır.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, age)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'age', '')::int
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Güvenlik: herkes yalnızca kendi profilini görebilir ve değiştirebilir
alter table public.profiles enable row level security;

create policy "Kendi profilini oku" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "Kendi profilini güncelle" on public.profiles
  for update using ((select auth.uid()) = id);

-- "Hesabımı sil" (App Store kuralı): kullanıcı yalnızca kendi hesabını siler, profil de otomatik silinir
create or replace function public.delete_user()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
