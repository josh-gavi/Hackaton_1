-- Campos estructurados que el CRM necesita para filtrar y atender un lead
-- sin volver a interpretar la conversación completa.
alter table public.leads
  add column if not exists objective text,
  add column if not exists experience text,
  add column if not exists urgency_label text;

-- Las fechas se generan en la base para todos los registros nuevos.
alter table public.leads
  alter column created_at set default now();

alter table public.conversations
  alter column created_at set default now();

-- Permisos mínimos que requiere la ruta de servidor del prospecto.
grant usage on schema public to service_role;
grant select, insert, delete on table public.leads to service_role;
grant select, insert on table public.conversations to service_role;
