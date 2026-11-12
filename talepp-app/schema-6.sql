-- TalApp 6. adım: birden fazla kişiye giden grup talepleri ve bekleyenlere hatırlatma
-- schema-5.sql'den sonra, Yumi projesinde bir kez çalıştırılır:
-- SQL Editor → + → Create a new snippet → bu dosyanın tamamını yapıştır → Run

-- ─────────────────────────────────────────────────────────────
-- Grup talebi: her alıcıya ayrı satır gider (herkes kendi onayını, pazarlığını, itirazını yapar),
-- aynı group_id'yi taşıyan satırlar uygulamada tek kart olarak görünür: "3 kişiden 1'i onayladı".
-- Tek kişiye giden talepte group_id boş kalır.
-- ─────────────────────────────────────────────────────────────
alter table public.talepp_requests add column if not exists group_id uuid;
create index if not exists talepp_requests_group_idx on public.talepp_requests (group_id) where group_id is not null;

-- Son hatırlatmanın zamanı: aynı kişi 3 saatte bir en fazla bir kez dürtülür
alter table public.talepp_requests add column if not exists nudged_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- Hatırlat: talebi atan, cevap vermeyenlere (beklemede ya da itirazda) tekrar bildirim atar.
-- Kaç kişiye gittiğini döner; 3 saat dolmamış olanlar atlanır.
-- ─────────────────────────────────────────────────────────────
create or replace function public.talepp_nudge(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  q record;
  actor_name text;
  cat_emoji text;
  n int := 0;
begin
  if auth.uid() is null then return 0; end if;
  for q in
    select r.* from public.talepp_requests r
    where r.id = any(p_ids)
      and r.from_id = auth.uid()
      and r.status in ('pending', 'appeal')
      and (r.nudged_at is null or r.nudged_at < now() - interval '3 hours')
      and not exists (select 1 from public.talepp_blocks b where b.blocker = r.to_id and b.blocked = r.from_id)
  loop
    update public.talepp_requests set nudged_at = now() where id = q.id;
    select name into actor_name from public.talepp_members where line_id = q.line_id and user_id = q.from_id;
    select (select c ->> 'e' from jsonb_array_elements(l.cats) c where c ->> 'id' = q.cat_id limit 1)
      into cat_emoji
      from public.talepp_lines l where l.id = q.line_id;
    perform public.talepp_push(
      q.to_id,
      '🔔 ' || coalesce(nullif(actor_name, ''), 'Biri') || ' cevabını bekliyor',
      coalesce(cat_emoji || ' ', '') || q.title,
      jsonb_build_object('line', q.line_id, 'request', q.id)
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.talepp_nudge(uuid[]) from public, anon;
grant execute on function public.talepp_nudge(uuid[]) to authenticated;
