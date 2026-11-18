-- =====================================================================
--  URUETA DERMATOLOGÍA · PWA PAMEC
--  Esquema completo para Supabase (PostgreSQL)
--  Ejecutar en: Supabase > SQL Editor > New query > Run
--  Es idempotente: puede volver a ejecutarse sin borrar datos.
--
--  AUTENTICACIÓN PROPIA (sin Supabase Auth):
--   * El correo/usuario y la contraseña (cifrada con bcrypt) viven en
--     public.profiles. El administrador asigna la contraseña inicial y
--     cada persona puede cambiarla luego desde Ajustes.
--   * Al iniciar sesión, la función app_login() entrega un token. La app
--     lo envía en el encabezado "x-app-token" y las políticas RLS lo
--     validan con public.current_uid().
--   * Si ya tenías la versión anterior instalada, este script migra los
--     perfiles y conserva las contraseñas existentes.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 0. MIGRACIÓN: desconectar de Supabase Auth (versión anterior)
-- ---------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- Quita toda llave foránea de public.* que apunte a auth.users
do $$ declare r record; begin
  for r in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel      on rel.oid = con.conrelid
    join pg_namespace n    on n.oid = rel.relnamespace
    join pg_class ref      on ref.oid = con.confrelid
    join pg_namespace rn   on rn.oid = ref.relnamespace
    where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'auth'
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
  end loop;
end $$;

-- Ya no hay auto-registro: las invitaciones dejan de existir
drop table if exists public.invitations cascade;

-- ---------------------------------------------------------------------
-- 1. PERFILES (usuarios de la app) Y SESIONES
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  full_name       text,
  cargo           text,
  phone           text,
  role            text not null default 'ejecutor' check (role in ('admin','ejecutor')),
  active          boolean not null default true,
  funciones       text,                       -- funciones individuales asignadas por el admin
  password_hash   text,                       -- bcrypt; nunca se expone a la app
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now()
);
-- Columnas nuevas si la tabla venía de la versión anterior
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists password_hash   text;
alter table public.profiles add column if not exists failed_attempts int not null default 0;
alter table public.profiles add column if not exists locked_until    timestamptz;
alter table public.profiles add column if not exists last_login_at   timestamptz;
update public.profiles set email = lower(trim(email)) where email is not null and email <> lower(trim(email));
create unique index if not exists profiles_email_key on public.profiles (lower(email));

-- Conserva las contraseñas que ya existían en Supabase Auth (mismo formato bcrypt)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    update public.profiles p
       set password_hash = u.encrypted_password
      from auth.users u
     where u.id = p.id and p.password_hash is null and u.encrypted_password like '$2%';
  end if;
end $$;

-- Sesiones: se guarda solo el hash SHA-256 del token
create table if not exists public.app_sessions (
  token_hash  text primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);
create index if not exists app_sessions_profile_idx on public.app_sessions(profile_id);

-- Usuario de la petición actual (según el encabezado x-app-token)
create or replace function public.request_token() returns text
language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-app-token', '');
$$;

create or replace function public.current_uid() returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select s.profile_id
    from public.app_sessions s
   where s.token_hash = encode(extensions.digest(public.request_token(), 'sha256'), 'hex')
     and s.expires_at > now()
   limit 1;
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = public.current_uid() and role = 'admin' and active);
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = public.current_uid() and active);
$$;

-- ---------------------------------------------------------------------
-- 2. DATOS DE LA IPS
-- ---------------------------------------------------------------------
create table if not exists public.ips_settings (
  id                    int primary key default 1 check (id = 1),
  nombre                text default 'Urueta Dermatología IPS',
  nit                   text,
  codigo_habilitacion   text,
  direccion             text,
  municipio             text default 'San Andrés',
  departamento          text default 'Archipiélago de San Andrés, Providencia y Santa Catalina',
  codigo_dane           text default '88001',
  representante_legal   text,
  lider_calidad         text,
  email_calidad         text,
  telefono              text,
  responsable_plan      text,
  servicios             text default 'Consulta externa de dermatología; procedimientos dermatológicos menores',
  fecha_meta_auditoria  date,
  vigencia              int default extract(year from now())::int,
  updated_at            timestamptz default now()
);
insert into public.ips_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. REQUISITOS (CHECKLIST)
-- ---------------------------------------------------------------------
create table if not exists public.requirements (
  id            uuid primary key default gen_random_uuid(),
  code          text unique,
  category      text not null,
  title         text not null,
  description   text,
  norma         text,
  evidence      text,                 -- documentos / evidencias que se exigen
  phase         int check (phase between 1 and 9), -- paso de la ruta crítica PAMEC (opcional)
  priority      text default 'media' check (priority in ('alta','media','baja')),
  periodicity   text,
  status        text not null default 'pendiente'
                check (status in ('pendiente','en_proceso','cumplido','no_aplica')),
  assigned_to   uuid references public.profiles(id) on delete set null,
  due_date      date,
  notes         text,
  ai_status     text not null default 'sin_revisar'
                check (ai_status in ('sin_revisar','aprobado','observaciones','rechazado')),
  ai_feedback   text,
  sort          int default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists requirements_category_idx on public.requirements(category);
create index if not exists requirements_assigned_idx on public.requirements(assigned_to);

-- ---------------------------------------------------------------------
-- 4. CRONOGRAMA DE ACTIVIDADES
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  phase           int check (phase between 1 and 9),
  requirement_id  uuid references public.requirements(id) on delete set null,
  responsible     uuid references public.profiles(id) on delete set null,
  start_date      date,
  end_date        date,
  status          text not null default 'pendiente'
                  check (status in ('pendiente','en_proceso','completada','retrasada','cancelada')),
  progress        int not null default 0 check (progress between 0 and 100),
  sort            int default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. PROGRAMA DE CAPACITACIONES
-- ---------------------------------------------------------------------
create table if not exists public.trainings (
  id               uuid primary key default gen_random_uuid(),
  topic            text not null,
  description      text,
  norma            text,
  audience         text,
  facilitator      text,
  responsible      uuid references public.profiles(id) on delete set null,
  scheduled_date   date,
  duration_hours   numeric(5,1) default 1,
  modality         text default 'presencial',
  status           text not null default 'programada'
                   check (status in ('programada','realizada','reprogramada','cancelada')),
  expected_attendees int default 0,
  attendees        int default 0,
  evaluation_score numeric(5,1),           -- promedio evaluación de adherencia (0-100)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. METAS / OBJETIVOS POR PERSONA
-- ---------------------------------------------------------------------
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  assigned_to   uuid references public.profiles(id) on delete set null,
  category      text,
  target_value  numeric default 100,
  current_value numeric default 0,
  unit          text default '%',
  due_date      date,
  status        text not null default 'activa' check (status in ('activa','cumplida','vencida','cancelada')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. DOCUMENTOS (evidencias) + REVISIÓN IA
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  requirement_id  uuid references public.requirements(id) on delete cascade,
  activity_id     uuid references public.activities(id) on delete cascade,
  training_id     uuid references public.trainings(id) on delete cascade,
  file_path       text not null,
  file_name       text,
  mime_type       text,
  size_bytes      bigint,
  version         int default 1,
  expires_on      date,                    -- vigencia (pólizas, certificados, etc.)
  uploaded_by     uuid references public.profiles(id) on delete set null,
  ai_verdict      text default 'sin_revisar'
                  check (ai_verdict in ('sin_revisar','aprobado','observaciones','rechazado')),
  ai_score        int,
  ai_feedback     jsonb,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists documents_req_idx on public.documents(requirement_id);

-- ---------------------------------------------------------------------
-- 8. CHAT CON EL AUDITOR IA Y BITÁCORA
-- ---------------------------------------------------------------------
create table if not exists public.ai_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade default public.current_uid(),
  role        text not null check (role in ('user','model')),
  content     text not null,
  attachment  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete set null default public.current_uid(),
  action      text not null,
  entity      text,
  entity_id   text,
  detail      text,
  created_at  timestamptz not null default now()
);

-- Migración de tablas existentes: usuario por defecto y llaves hacia profiles
alter table public.ai_messages alter column user_id set default public.current_uid();
alter table public.audit_log   alter column user_id set default public.current_uid();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ai_messages_user_id_fkey') then
    alter table public.ai_messages add constraint ai_messages_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_log_user_id_fkey') then
    alter table public.audit_log add constraint audit_log_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete set null not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. INICIO DE SESIÓN Y CONTRASEÑAS (funciones RPC)
-- ---------------------------------------------------------------------
-- Datos públicos de un perfil (sin hash ni contadores)
create or replace function public.profile_json(p public.profiles) returns json
language sql stable as $$
  select json_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name, 'cargo', p.cargo,
    'phone', p.phone, 'role', p.role, 'active', p.active, 'funciones', p.funciones,
    'created_at', p.created_at, 'last_login_at', p.last_login_at);
$$;

-- Iniciar sesión. Devuelve { ok, token, profile } o { ok:false, error }
-- (no lanza excepción para que el contador de intentos fallidos se guarde)
create or replace function public.app_login(p_email text, p_password text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  p   public.profiles%rowtype;
  tok text;
begin
  select * into p from public.profiles where lower(email) = lower(trim(p_email));
  if not found or p.password_hash is null then
    perform pg_sleep(0.4);
    return json_build_object('ok', false, 'error', 'Usuario o contraseña incorrectos');
  end if;
  if p.locked_until is not null and p.locked_until > now() then
    return json_build_object('ok', false, 'error', 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.');
  end if;
  if p.password_hash <> extensions.crypt(coalesce(p_password, ''), p.password_hash) then
    update public.profiles
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' end
     where id = p.id;
    perform pg_sleep(0.4);
    return json_build_object('ok', false, 'error', 'Usuario o contraseña incorrectos');
  end if;
  if not p.active then
    return json_build_object('ok', false, 'error', 'Tu perfil está inactivo. Pide al administrador que lo active.');
  end if;

  update public.profiles set failed_attempts = 0, locked_until = null, last_login_at = now() where id = p.id;
  delete from public.app_sessions where expires_at < now();
  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.app_sessions (token_hash, profile_id)
  values (encode(extensions.digest(tok, 'sha256'), 'hex'), p.id);
  return json_build_object('ok', true, 'token', tok, 'profile', public.profile_json(p));
end $$;

-- Perfil de la sesión actual (null si el token no es válido o venció)
create or replace function public.app_me() returns json
language sql stable security definer set search_path = public as $$
  select public.profile_json(p) from public.profiles p where p.id = public.current_uid();
$$;

-- Cerrar sesión
create or replace function public.app_logout() returns void
language sql security definer set search_path = public, extensions as $$
  delete from public.app_sessions
   where token_hash = encode(extensions.digest(public.request_token(), 'sha256'), 'hex');
$$;

-- Cada persona cambia su propia contraseña (requiere la actual)
create or replace function public.change_my_password(p_current text, p_new text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := public.current_uid();
  h   text;
begin
  if uid is null then raise exception 'Sesión no válida. Vuelve a iniciar sesión.'; end if;
  if length(coalesce(p_new, '')) < 6 then raise exception 'La nueva contraseña debe tener mínimo 6 caracteres.'; end if;
  select password_hash into h from public.profiles where id = uid;
  if h is null or h <> extensions.crypt(coalesce(p_current, ''), h) then
    raise exception 'La contraseña actual no es correcta.';
  end if;
  update public.profiles set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where id = uid;
  -- Cierra las demás sesiones abiertas de esta persona
  delete from public.app_sessions
   where profile_id = uid
     and token_hash <> encode(extensions.digest(public.request_token(), 'sha256'), 'hex');
end $$;

-- El admin crea un perfil con su contraseña inicial
create or replace function public.admin_create_profile(
  p_email text, p_password text, p_full_name text,
  p_cargo text default null, p_phone text default null,
  p_role text default 'ejecutor', p_funciones text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede crear perfiles.'; end if;
  if coalesce(trim(p_email), '') = '' then raise exception 'Falta el usuario o correo.'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'La contraseña debe tener mínimo 6 caracteres.'; end if;
  if exists (select 1 from public.profiles where lower(email) = lower(trim(p_email))) then
    raise exception 'Ya existe un perfil con ese usuario o correo.';
  end if;
  insert into public.profiles (email, full_name, cargo, phone, role, active, funciones, password_hash)
  values (lower(trim(p_email)), p_full_name, p_cargo, p_phone,
          case when p_role = 'admin' then 'admin' else 'ejecutor' end, true, p_funciones,
          extensions.crypt(p_password, extensions.gen_salt('bf')))
  returning id into new_id;
  return new_id;
end $$;

-- El admin asigna una contraseña nueva a cualquier perfil (y cierra sus sesiones)
create or replace function public.admin_set_password(p_profile_id uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede asignar contraseñas.'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'La contraseña debe tener mínimo 6 caracteres.'; end if;
  update public.profiles
     set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
         failed_attempts = 0, locked_until = null
   where id = p_profile_id;
  if not found then raise exception 'Perfil no encontrado.'; end if;
  delete from public.app_sessions where profile_id = p_profile_id;
end $$;

-- ---------------------------------------------------------------------
-- 10. TRIGGERS DE PROTECCIÓN
-- ---------------------------------------------------------------------
-- Desde la app, un no-admin no puede cambiarse rol, estado, funciones ni usuario.
-- (Desde el SQL Editor o desde funciones internas no aplica.)
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if session_user in ('anon', 'authenticator', 'authenticated') and not public.is_admin() then
    new.role := old.role;
    new.active := old.active;
    new.funciones := old.funciones;
    new.email := old.email;
  end if;
  new.email := lower(trim(new.email));
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Un ejecutor solo puede actualizar campos operativos de lo que tiene asignado
create or replace function public.protect_requirement_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if session_user in ('anon', 'authenticator', 'authenticated') and not public.is_admin() then
    new.code := old.code; new.category := old.category; new.title := old.title;
    new.description := old.description; new.norma := old.norma; new.evidence := old.evidence;
    new.assigned_to := old.assigned_to; new.due_date := old.due_date; new.priority := old.priority;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists protect_requirement on public.requirements;
create trigger protect_requirement before update on public.requirements
  for each row execute function public.protect_requirement_fields();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['activities','trainings','goals','ips_settings'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 11. PERMISOS Y SEGURIDAD A NIVEL DE FILA (RLS)
--     La app usa la llave pública (rol anon); quién es cada persona lo
--     decide current_uid() a partir del token de sesión.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.ips_settings, public.requirements, public.activities, public.trainings,
  public.goals, public.documents, public.ai_messages
  to anon, authenticated;
grant select, insert on public.audit_log to anon, authenticated;

-- profiles: la app NUNCA puede leer ni escribir el hash de la contraseña
revoke all on public.profiles from anon, authenticated;
grant select (id, email, full_name, cargo, phone, role, active, funciones, created_at, last_login_at)
  on public.profiles to anon, authenticated;
grant update (email, full_name, cargo, phone, role, active, funciones)
  on public.profiles to anon, authenticated;
grant delete on public.profiles to anon, authenticated;

-- sesiones: solo accesibles por las funciones internas
revoke all on public.app_sessions from anon, authenticated;

-- funciones que la app puede llamar
grant execute on function public.app_login(text, text)              to anon, authenticated;
grant execute on function public.app_me()                           to anon, authenticated;
grant execute on function public.app_logout()                       to anon, authenticated;
grant execute on function public.change_my_password(text, text)     to anon, authenticated;
grant execute on function public.admin_create_profile(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_set_password(uuid, text)     to anon, authenticated;

alter table public.profiles     enable row level security;
alter table public.app_sessions enable row level security;
alter table public.ips_settings enable row level security;
alter table public.requirements enable row level security;
alter table public.activities   enable row level security;
alter table public.trainings    enable row level security;
alter table public.goals        enable row level security;
alter table public.documents    enable row level security;
alter table public.ai_messages  enable row level security;
alter table public.audit_log    enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles','app_sessions','ips_settings','requirements','activities','trainings','goals','documents','ai_messages','audit_log')
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

-- profiles (cada quien edita su perfil; el admin edita todos)
create policy profiles_select on public.profiles for select
  using (id = public.current_uid() or public.is_member());
create policy profiles_update on public.profiles for update
  using (id = public.current_uid() or public.is_admin())
  with check (id = public.current_uid() or public.is_admin());
create policy profiles_delete on public.profiles for delete using (public.is_admin());

-- app_sessions: sin políticas = nadie desde la API

-- ips_settings
create policy settings_select on public.ips_settings for select using (public.is_member());
create policy settings_admin  on public.ips_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- requirements
create policy req_select on public.requirements for select using (public.is_member());
create policy req_insert on public.requirements for insert with check (public.is_admin());
create policy req_delete on public.requirements for delete using (public.is_admin());
create policy req_update on public.requirements for update
  using (public.is_admin() or (public.is_member() and assigned_to = public.current_uid()))
  with check (public.is_admin() or (public.is_member() and assigned_to = public.current_uid()));

-- activities / trainings (el responsable puede actualizar)
create policy act_select on public.activities for select using (public.is_member());
create policy act_admin  on public.activities for all using (public.is_admin()) with check (public.is_admin());
create policy act_update on public.activities for update
  using (public.is_member() and responsible = public.current_uid())
  with check (public.is_member() and responsible = public.current_uid());

create policy tr_select on public.trainings for select using (public.is_member());
create policy tr_admin  on public.trainings for all using (public.is_admin()) with check (public.is_admin());
create policy tr_update on public.trainings for update
  using (public.is_member() and responsible = public.current_uid())
  with check (public.is_member() and responsible = public.current_uid());

-- goals
create policy goals_select on public.goals for select using (public.is_member());
create policy goals_admin  on public.goals for all using (public.is_admin()) with check (public.is_admin());
create policy goals_update on public.goals for update
  using (public.is_member() and assigned_to = public.current_uid())
  with check (public.is_member() and assigned_to = public.current_uid());

-- documents
create policy docs_select on public.documents for select using (public.is_member());
create policy docs_insert on public.documents for insert
  with check (public.is_member() and uploaded_by = public.current_uid());
create policy docs_update on public.documents for update
  using (public.is_admin() or (public.is_member() and uploaded_by = public.current_uid()))
  with check (public.is_admin() or (public.is_member() and uploaded_by = public.current_uid()));
create policy docs_delete on public.documents for delete
  using (public.is_admin() or (public.is_member() and uploaded_by = public.current_uid()));

-- ai_messages (cada usuario ve su conversación)
create policy ai_own on public.ai_messages for all
  using (public.is_member() and user_id = public.current_uid())
  with check (public.is_member() and user_id = public.current_uid());

-- audit_log
create policy log_select on public.audit_log for select using (public.is_member());
create policy log_insert on public.audit_log for insert
  with check (public.is_member() and user_id = public.current_uid());

-- ---------------------------------------------------------------------
-- 12. STORAGE: bucket privado para evidencias
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('pamec-docs', 'pamec-docs', false, 20971520)
on conflict (id) do nothing;

drop policy if exists pamec_docs_select on storage.objects;
drop policy if exists pamec_docs_insert on storage.objects;
drop policy if exists pamec_docs_delete on storage.objects;
create policy pamec_docs_select on storage.objects for select
  using (bucket_id = 'pamec-docs' and public.is_member());
create policy pamec_docs_insert on storage.objects for insert
  with check (bucket_id = 'pamec-docs' and public.is_member());
create policy pamec_docs_delete on storage.objects for delete
  using (bucket_id = 'pamec-docs' and (
    public.is_admin() or exists (
      select 1 from public.documents d
       where d.file_path = storage.objects.name and d.uploaded_by = public.current_uid())));

-- ---------------------------------------------------------------------
-- 13. VISTA DE AVANCE POR CATEGORÍA (útil para reportes)
-- ---------------------------------------------------------------------
create or replace view public.v_avance_categoria with (security_invoker = true) as
select category,
       count(*) filter (where status <> 'no_aplica')                 as aplicables,
       count(*) filter (where status = 'cumplido')                   as cumplidos,
       count(*) filter (where status = 'en_proceso')                 as en_proceso,
       count(*) filter (where status = 'pendiente')                  as pendientes,
       round(100.0 * count(*) filter (where status = 'cumplido')
             / nullif(count(*) filter (where status <> 'no_aplica'), 0), 1) as porcentaje
from public.requirements group by category;

grant select on public.v_avance_categoria to anon, authenticated;

-- ---------------------------------------------------------------------
-- 14. AGENTE IA (GEMINI) ACTIVABLE DESDE AJUSTES
-- ---------------------------------------------------------------------
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
