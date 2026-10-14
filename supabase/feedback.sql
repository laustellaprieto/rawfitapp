-- ════════════════════════════════════════════════════════════════════
--  RawFit App · Opiniones de testers (feedback)
--  Pega TODO este archivo en Supabase → SQL Editor → Run.
--  Se puede correr varias veces sin problema.
-- ════════════════════════════════════════════════════════════════════

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
