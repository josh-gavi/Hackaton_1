-- Datos adicionales para calificar oportunidades B2B sin mezclar esta
-- información con la conversación libre.
alter table public.leads
  add column if not exists company_size text,
  add column if not exists decision_role text;

grant insert, update on table public.leads to service_role;
