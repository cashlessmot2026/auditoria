-- =====================================================================
-- Configuración del Agente IA (Gemini): interruptor + llave API
-- Pegar completo en Supabase > SQL Editor > Run (se puede repetir sin problema)
-- =====================================================================
create table if not exists public.ai_config (
  id              int primary key default 1 check (id = 1),
  gemini_enabled  boolean not null default false,
  gemini_api_key  text,
  updated_at      timestamptz default now()
);
insert into public.ai_config (id) values (1) on conflict (id) do nothing;

alter table public.ai_config enable row level security;
grant select, insert, update on public.ai_config to anon, authenticated;

drop policy if exists ai_config_admin on public.ai_config;
create policy ai_config_admin on public.ai_config for all
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists touch_ai_config on public.ai_config;
create trigger touch_ai_config before update on public.ai_config
  for each row execute function public.touch_updated_at();

-- Los miembros activos solo reciben la llave cuando el agente está ACTIVADO
create or replace function public.ai_get_config() returns json
language sql stable security definer set search_path = public as $$
  select case when not public.is_member() then null
    else json_build_object(
      'enabled', (c.gemini_enabled and coalesce(c.gemini_api_key, '') <> ''),
      'api_key', case when c.gemini_enabled then c.gemini_api_key else null end)
  end
  from public.ai_config c where c.id = 1;
$$;
grant execute on function public.ai_get_config() to anon, authenticated;
