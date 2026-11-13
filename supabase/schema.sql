-- =====================================================================
--  URUETA DERMATOLOGÍA · PWA PAMEC
--  Esquema completo para Supabase (PostgreSQL)
--  Ejecutar UNA vez en: Supabase > SQL Editor > New query > Run
--  Es idempotente: puede volver a ejecutarse sin borrar datos.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PERFILES E INVITACIONES
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  cargo       text,
  phone       text,
  role        text not null default 'ejecutor' check (role in ('admin','ejecutor')),
  active      boolean not null default false,
  funciones   text,                       -- funciones individuales asignadas por el admin
  created_at  timestamptz not null default now()
);

-- El admin registra aquí a quien podrá crear cuenta (control de acceso)
create table if not exists public.invitations (
  email       text primary key,
  full_name   text,
  cargo       text,
  phone       text,
  funciones   text,
  role        text not null default 'ejecutor' check (role in ('admin','ejecutor')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

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
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role        text not null check (role in ('user','model')),
  content     text not null,
  attachment  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null default auth.uid(),
  action      text not null,
  entity      text,
  entity_id   text,
  detail      text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. FUNCIONES AUXILIARES Y TRIGGERS
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

-- Alta automática de perfil al registrarse:
--   * el PRIMER usuario registrado queda como ADMIN activo
--   * los demás quedan activos solo si el admin los invitó (tabla invitations)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invitations%rowtype;
  n   int;
begin
  select count(*) into n from public.profiles;
  if n = 0 then
    insert into public.profiles (id, email, full_name, role, active)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'admin', true);
  else
    select * into inv from public.invitations where lower(email) = lower(new.email);
    if found then
      insert into public.profiles (id, email, full_name, cargo, phone, funciones, role, active)
      values (new.id, new.email, coalesce(inv.full_name, new.raw_user_meta_data->>'full_name'),
              inv.cargo, inv.phone, inv.funciones, inv.role, true);
      delete from public.invitations where lower(email) = lower(new.email);
    else
      insert into public.profiles (id, email, full_name, role, active)
      values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'ejecutor', false);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un usuario no admin no puede cambiarse el rol ni activarse
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.active := old.active;
    new.funciones := old.funciones;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Un ejecutor solo puede actualizar campos operativos de lo que tiene asignado
create or replace function public.protect_requirement_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
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
-- 10. SEGURIDAD A NIVEL DE FILA (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.invitations  enable row level security;
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
    and tablename in ('profiles','invitations','ips_settings','requirements','activities','trainings','goals','documents','ai_messages','audit_log')
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_member());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_admin());

-- invitations
create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ips_settings
create policy settings_select on public.ips_settings for select to authenticated using (public.is_member());
create policy settings_admin  on public.ips_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- requirements
create policy req_select on public.requirements for select to authenticated using (public.is_member());
create policy req_insert on public.requirements for insert to authenticated with check (public.is_admin());
create policy req_delete on public.requirements for delete to authenticated using (public.is_admin());
create policy req_update on public.requirements for update to authenticated
  using (public.is_admin() or assigned_to = auth.uid())
  with check (public.is_admin() or assigned_to = auth.uid());

-- activities / trainings (responsable puede actualizar)
create policy act_select on public.activities for select to authenticated using (public.is_member());
create policy act_admin  on public.activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy act_update on public.activities for update to authenticated
  using (responsible = auth.uid()) with check (responsible = auth.uid());

create policy tr_select on public.trainings for select to authenticated using (public.is_member());
create policy tr_admin  on public.trainings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tr_update on public.trainings for update to authenticated
  using (responsible = auth.uid()) with check (responsible = auth.uid());

-- goals
create policy goals_select on public.goals for select to authenticated using (public.is_member());
create policy goals_admin  on public.goals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy goals_update on public.goals for update to authenticated
  using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());

-- documents
create policy docs_select on public.documents for select to authenticated using (public.is_member());
create policy docs_insert on public.documents for insert to authenticated
  with check (public.is_member() and uploaded_by = auth.uid());
create policy docs_update on public.documents for update to authenticated
  using (public.is_admin() or uploaded_by = auth.uid()) with check (public.is_admin() or uploaded_by = auth.uid());
create policy docs_delete on public.documents for delete to authenticated
  using (public.is_admin() or uploaded_by = auth.uid());

-- ai_messages (cada usuario ve su conversación)
create policy ai_own on public.ai_messages for all to authenticated
  using (user_id = auth.uid() and public.is_member()) with check (user_id = auth.uid() and public.is_member());

-- audit_log
create policy log_select on public.audit_log for select to authenticated using (public.is_member());
create policy log_insert on public.audit_log for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 11. STORAGE: bucket privado para evidencias
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('pamec-docs', 'pamec-docs', false, 20971520)
on conflict (id) do nothing;

drop policy if exists pamec_docs_select on storage.objects;
drop policy if exists pamec_docs_insert on storage.objects;
drop policy if exists pamec_docs_delete on storage.objects;
create policy pamec_docs_select on storage.objects for select to authenticated
  using (bucket_id = 'pamec-docs' and public.is_member());
create policy pamec_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pamec-docs' and public.is_member());
create policy pamec_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pamec-docs' and (public.is_admin() or owner = auth.uid()));

-- ---------------------------------------------------------------------
-- 12. VISTA DE AVANCE POR CATEGORÍA (útil para reportes)
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

grant select on public.v_avance_categoria to authenticated;
