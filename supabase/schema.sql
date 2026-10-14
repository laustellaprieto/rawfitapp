-- ════════════════════════════════════════════════════════════════════
--  RawFit App · Esquema de Supabase
--  Cómo usarlo: Supabase → SQL Editor → New query → pega TODO este
--  archivo → Run. Se puede volver a ejecutar sin romper nada.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────── Perfiles (uno por cuenta) ───────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  nombre text not null default '',
  rol text not null default 'cliente' check (rol in ('cliente', 'coach')),
  -- ninguno → pendiente (pidió ser cliente) → aceptado / rechazado (lo decide la coach)
  estado text not null default 'ninguno' check (estado in ('ninguno', 'pendiente', 'aceptado', 'rechazado')),
  compartir_fotos boolean not null default false,
  solicitado_en timestamptz,
  creado_en timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Crea el perfil automáticamente al registrarse.
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'nombre', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- ¿La persona que hace la consulta es coach?
create or replace function public.es_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and rol = 'coach');
$$;

-- ¿La persona que consulta es coach y `cliente` es su cliente aceptado?
create or replace function public.es_mi_cliente(cliente text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_coach() and exists (
    select 1 from public.profiles where id::text = cliente and estado = 'aceptado'
  );
$$;

-- ¿El cliente comparte sus fotos?
create or replace function public.comparte_fotos(cliente text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id::text = cliente and compartir_fotos);
$$;

drop policy if exists "ver perfil" on public.profiles;
create policy "ver perfil" on public.profiles for select
  using (id = auth.uid() or public.es_coach());

drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Cada quien solo puede cambiar su nombre y si comparte fotos.
-- El rol y el estado de cliente cambian únicamente con las funciones de abajo.
revoke update on public.profiles from authenticated, anon;
grant update (nombre, compartir_fotos) on public.profiles to authenticated;

-- El cliente pide ser cliente de la coach.
create or replace function public.solicitar_coach()
returns void language sql security definer set search_path = public as $$
  update public.profiles set estado = 'pendiente', solicitado_en = now()
  where id = auth.uid() and estado in ('ninguno', 'rechazado');
$$;

-- El cliente cancela su solicitud o deja de ser cliente.
create or replace function public.dejar_coach()
returns void language sql security definer set search_path = public as $$
  update public.profiles set estado = 'ninguno', solicitado_en = null where id = auth.uid();
$$;

-- La coach acepta o rechaza (o quita) a un cliente.
create or replace function public.responder_solicitud(cliente uuid, aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_coach() then
    raise exception 'Solo la coach puede responder solicitudes';
  end if;
  update public.profiles
     set estado = case when aceptar then 'aceptado' else 'rechazado' end
   where id = cliente and rol = 'cliente';
end $$;

-- ─────────────── Datos sincronizados ───────────────
-- Una fila por registro de la app (hábito, medición, sesión…).
-- `tabla` dice de qué tipo es y `data` guarda el registro completo.
create table if not exists public.datos (
  user_id uuid not null references auth.users (id) on delete cascade,
  tabla text not null,
  uid text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (user_id, tabla, uid)
);

create index if not exists datos_user_updated on public.datos (user_id, updated_at);

-- La hora de cambio la pone el servidor (así no importa la hora del celular).
create or replace function public.marcar_cambio()
returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists datos_marcar_cambio on public.datos;
create trigger datos_marcar_cambio before insert or update on public.datos
  for each row execute function public.marcar_cambio();

alter table public.datos enable row level security;

-- Tablas que solo escribe la coach (el cliente solo las lee).
-- habitos: la coach también puede agregar hábitos a sus clientes.
drop policy if exists "ver datos" on public.datos;
create policy "ver datos" on public.datos for select
  using (
    user_id = auth.uid()
    or (public.es_mi_cliente(user_id::text) and (tabla <> 'fotos' or public.comparte_fotos(user_id::text)))
  );

drop policy if exists "crear datos" on public.datos;
create policy "crear datos" on public.datos for insert
  with check (
    (user_id = auth.uid() and tabla not in ('rutinas', 'nutricion'))
    or (public.es_mi_cliente(user_id::text) and tabla in ('habitos', 'rutinas', 'nutricion'))
  );

drop policy if exists "editar datos" on public.datos;
create policy "editar datos" on public.datos for update
  using (
    (user_id = auth.uid() and tabla not in ('rutinas', 'nutricion'))
    or (public.es_mi_cliente(user_id::text) and tabla in ('habitos', 'rutinas', 'nutricion'))
  )
  with check (
    (user_id = auth.uid() and tabla not in ('rutinas', 'nutricion'))
    or (public.es_mi_cliente(user_id::text) and tabla in ('habitos', 'rutinas', 'nutricion'))
  );

-- ─────────────── Archivos (fotos y PDF de nutrición) ───────────────
-- Ruta de cada archivo: <id del cliente>/<nombre>.  Ej.: 7f3c…/foto-123.jpg
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false), ('nutricion', 'nutricion', false)
on conflict (id) do nothing;

drop policy if exists "fotos: ver" on storage.objects;
create policy "fotos: ver" on storage.objects for select
  using (
    bucket_id = 'fotos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (public.es_mi_cliente((storage.foldername(name))[1]) and public.comparte_fotos((storage.foldername(name))[1]))
    )
  );

drop policy if exists "fotos: subir" on storage.objects;
create policy "fotos: subir" on storage.objects for insert
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos: cambiar" on storage.objects;
create policy "fotos: cambiar" on storage.objects for update
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos: borrar" on storage.objects;
create policy "fotos: borrar" on storage.objects for delete
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "nutricion: ver" on storage.objects;
create policy "nutricion: ver" on storage.objects for select
  using (
    bucket_id = 'nutricion' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.es_mi_cliente((storage.foldername(name))[1])
    )
  );

drop policy if exists "nutricion: subir" on storage.objects;
create policy "nutricion: subir" on storage.objects for insert
  with check (bucket_id = 'nutricion' and public.es_mi_cliente((storage.foldername(name))[1]));

drop policy if exists "nutricion: borrar" on storage.objects;
create policy "nutricion: borrar" on storage.objects for delete
  using (
    bucket_id = 'nutricion' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.es_mi_cliente((storage.foldername(name))[1])
    )
  );

-- ─────────────── Eliminar mi cuenta ───────────────
-- Borra la cuenta y todos sus datos (los archivos se borran antes desde la app).
create or replace function public.eliminar_mi_cuenta()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.eliminar_mi_cuenta() from anon;
revoke execute on function public.responder_solicitud(uuid, boolean) from anon;
revoke execute on function public.solicitar_coach() from anon;
revoke execute on function public.dejar_coach() from anon;

-- ─────────────── Opiniones de testers (feedback) ───────────────
-- (Lo mismo está en supabase/feedback.sql para agregarlo a una instalación existente.)

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null, -- vacío si no tiene cuenta
  nombre text check (char_length(nombre) <= 80),
  tipo text not null check (tipo in ('me_gusto', 'me_confundio', 'error', 'sugerencia')),
  estrellas int not null check (estrellas between 1 and 5),
  texto text not null check (char_length(texto) between 1 and 1000),
  imagen_path text check (char_length(imagen_path) <= 200),
  pantalla text check (char_length(pantalla) <= 80),
  version text check (char_length(version) <= 40),
  navegador text check (char_length(navegador) <= 300),
  estado text not null default 'nueva' check (estado in ('nueva', 'revisada', 'implementada')),
  creado_en timestamptz not null default now()
);
create index if not exists feedback_creado on public.feedback (creado_en desc);
alter table public.feedback enable row level security;

-- Cualquiera puede enviar (con o sin cuenta), pero solo a su nombre y siempre como "nueva".
drop policy if exists "feedback: enviar" on public.feedback;
create policy "feedback: enviar" on public.feedback for insert to anon, authenticated
  with check (
    estado = 'nueva'
    and (user_id is null or user_id = auth.uid())
    and (imagen_path is null or (storage.foldername(imagen_path))[1] = coalesce(auth.uid()::text, 'anonimo'))
  );

-- Solo la coach las lee y les cambia el estado.
drop policy if exists "feedback: ver" on public.feedback;
create policy "feedback: ver" on public.feedback for select using (public.es_coach());
drop policy if exists "feedback: cambiar estado" on public.feedback;
create policy "feedback: cambiar estado" on public.feedback for update
  using (public.es_coach()) with check (public.es_coach());
-- De una opinión solo se puede cambiar el estado (el texto queda como lo escribió la persona).
revoke update on public.feedback from anon, authenticated;
grant update (estado) on public.feedback to authenticated;
grant insert on public.feedback to anon, authenticated;
grant select on public.feedback to authenticated;

-- Capturas de pantalla: carpeta privada, máximo 5 MB, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "feedback: subir captura" on storage.objects;
create policy "feedback: subir captura" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = coalesce(auth.uid()::text, 'anonimo'));

drop policy if exists "feedback: ver capturas" on storage.objects;
create policy "feedback: ver capturas" on storage.objects for select
  using (bucket_id = 'feedback' and public.es_coach());

-- ════════════════════════════════════════════════════════════════════
--  ÚLTIMO PASO (solo una vez): hacerte coach.
--  1) Crea tu cuenta en la app (Ajustes → Cuenta) con tu correo.
--  2) Vuelve aquí, cambia el correo de abajo por el tuyo, selecciona
--     SOLO esa línea y toca Run:
--
--  update public.profiles set rol = 'coach' where email = 'TU_CORREO@ejemplo.com';
-- ════════════════════════════════════════════════════════════════════
