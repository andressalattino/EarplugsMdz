-- Ejecutar completo en el SQL Editor de Supabase. Se puede volver a ejecutar.
-- Auth es propio, del lado del servidor; no se crean usuarios públicos en Supabase Auth.
begin;

create table if not exists public.epm_visits (
  event_id uuid primary key,
  visited_at timestamptz not null default now(),
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  path text not null check (path = '/'),
  browser text not null check (browser in ('Chrome','Safari','Firefox','Edge','Opera','Samsung Internet','Otro')),
  country text check (country ~ '^[A-Z]{2}$')
);
create index if not exists epm_visits_date_idx on public.epm_visits (visited_at);
create index if not exists epm_visits_visitor_idx on public.epm_visits (visitor_hash, visited_at);

create table if not exists public.epm_rate_limits (
  key text primary key,
  hits integer not null default 1,
  expires_at timestamptz not null
);
create index if not exists epm_rate_limits_expiry_idx on public.epm_rate_limits (expires_at);

alter table public.epm_visits enable row level security;
alter table public.epm_visits force row level security;
alter table public.epm_rate_limits enable row level security;
alter table public.epm_rate_limits force row level security;
-- Sin policies públicas: denegación por defecto. Solo el servidor usa service_role.
revoke all on public.epm_visits, public.epm_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.epm_visits, public.epm_rate_limits to service_role;

create or replace function public.epm_rate_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_hits integer;
begin
  if length(p_key) > 200 or p_limit < 1 or p_seconds < 1 or p_seconds > 86400 then
    raise exception 'invalid rate limit';
  end if;
  -- Limpieza oportunista en cada solicitud; no requiere servidor ni cron permanente.
  delete from public.epm_rate_limits where expires_at <= now();
  insert into public.epm_rate_limits as limits(key, hits, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_seconds))
  on conflict (key) do update set
    hits = case when limits.expires_at <= now() then 1 else least(limits.hits + 1, p_limit + 1) end,
    expires_at = case when limits.expires_at <= now() then now() + make_interval(secs => p_seconds) else limits.expires_at end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

create or replace function public.epm_record_visit(p_event_id uuid, p_visitor_hash text, p_path text, p_browser text, p_country text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  insert into public.epm_visits(event_id, visitor_hash, path, browser, country)
  values (p_event_id, p_visitor_hash, p_path, p_browser, p_country)
  on conflict (event_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.epm_stats(p_range text default '7d')
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Argentina/Mendoza')::date;
  v_start date;
  v_result jsonb;
begin
  if p_range not in ('today','7d','30d','all') then raise exception 'invalid range'; end if;
  v_start := case p_range when 'today' then v_today when '7d' then v_today - 6 when '30d' then v_today - 29
    else coalesce((select min(visited_at) at time zone 'America/Argentina/Mendoza' from public.epm_visits)::date, v_today) end;

  with filtered as materialized (
    select * from public.epm_visits
    where visited_at >= (v_start::timestamp at time zone 'America/Argentina/Mendoza')
      and visited_at < ((v_today + 1)::timestamp at time zone 'America/Argentina/Mendoza')
  ), daily as (
    select (visited_at at time zone 'America/Argentina/Mendoza')::date as day,
      count(*) as views, count(distinct visitor_hash) as visitors from filtered group by 1
  ), browsers as (
    select browser as name, count(*) as count from filtered group by browser
  ), countries as (
    select coalesce(country, 'unknown') as name, count(*) as count from filtered group by country
  )
  select jsonb_build_object(
    'range', p_range, 'timezone', 'America/Argentina/Mendoza', 'startDate', v_start, 'endDate', v_today,
    'generatedAt', now(),
    'summary', (select jsonb_build_object(
      'totalViews', count(*), 'uniqueVisitors', count(distinct visitor_hash),
      'today', count(*) filter (where visited_at >= (v_today::timestamp at time zone 'America/Argentina/Mendoza')),
      'last7Days', count(*) filter (where visited_at >= ((v_today - 6)::timestamp at time zone 'America/Argentina/Mendoza')),
      'last30Days', count(*) filter (where visited_at >= ((v_today - 29)::timestamp at time zone 'America/Argentina/Mendoza'))
    ) from public.epm_visits where visited_at <= now()),
    'filtered', (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor_hash)) from filtered),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'views', coalesce(daily.views, 0), 'visitors', coalesce(daily.visitors, 0)) order by d), '[]'::jsonb)
      from generate_series(v_start::timestamp, v_today::timestamp, '1 day') as d
      left join daily on daily.day = d::date),
    'browsers', (select coalesce(jsonb_agg(to_jsonb(b) order by b.count desc, b.name), '[]'::jsonb) from browsers b),
    'countries', (select coalesce(jsonb_agg(to_jsonb(c) order by c.count desc, c.name), '[]'::jsonb) from countries c)
  ) into v_result;
  return v_result;
end;
$$;

-- Las funciones NO usan SECURITY DEFINER y no pueden ser invocadas desde el navegador.
revoke all on function public.epm_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.epm_record_visit(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.epm_stats(text) from public, anon, authenticated;
grant execute on function public.epm_rate_limit(text, integer, integer) to service_role;
grant execute on function public.epm_record_visit(uuid, text, text, text, text) to service_role;
grant execute on function public.epm_stats(text) to service_role;
commit;
