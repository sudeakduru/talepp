-- TalApp 5. adım: bir hesap birden fazla cihazda (telefon + iPad) bildirim alır; bildirimler öncelikli gider
-- schema-4.sql'den sonra, Yumi projesinde bir kez çalıştırılır:
-- SQL Editor → + → Create a new snippet → bu dosyanın tamamını yapıştır → Run

-- ─────────────────────────────────────────────────────────────
-- Cihaz başına bir bildirim adresi (önceden hesap başına tekti: son giren cihaz diğerini siliyordu)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.talepp_push_tokens (
  token text primary key,
  user_id uuid not null references auth.users on delete cascade,
  updated_at timestamptz not null default now()
);
create index if not exists talepp_push_tokens_user on public.talepp_push_tokens (user_id);

-- Kimse doğrudan okuyup yazamaz; yalnızca aşağıdaki fonksiyonlar kullanır
alter table public.talepp_push_tokens enable row level security;
revoke all on public.talepp_push_tokens from anon, authenticated;

-- Profillerdeki eski tek adresleri taşı
insert into public.talepp_push_tokens (token, user_id)
select push_token, id from public.talepp_profiles where push_token is not null
on conflict (token) do nothing;

-- Cihazın adresini kaydeder; aynı cihaz başka hesapla açılırsa adres yeni hesaba geçer.
-- Artık profil satırı açmaz (Apple ile ilk girişte ad ve yaş ekranı bu yüzden atlanıyordu).
-- token null: eski sürümler çıkışta böyle çağırır, bir şey yapmaz.
create or replace function public.talepp_save_push_token(token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is null or talepp_save_push_token.token is null then return; end if;
  insert into public.talepp_push_tokens (token, user_id) values (talepp_save_push_token.token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end;
$$;

-- Çıkış yaparken: yalnızca bu cihazın adresi silinir, diğer cihazlar bildirim almaya devam eder
create or replace function public.talepp_remove_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.talepp_push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.talepp_remove_push_token(text) from public, anon;
grant execute on function public.talepp_remove_push_token(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Gönderim: kişinin bütün cihazlarına, yüksek öncelikle
-- ─────────────────────────────────────────────────────────────
create or replace function public.talepp_push(target uuid, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  for t in select token from public.talepp_push_tokens where user_id = target loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object(
        'to', t.token, 'title', p_title, 'body', p_body, 'data', p_data,
        'sound', 'default', 'priority', 'high'
      ),
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end loop;
end;
$$;

revoke execute on function public.talepp_push(uuid, text, text, jsonb) from public, anon, authenticated;
