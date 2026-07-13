-- Configuración editable por administración para mantener transparentes las
-- reglas de calificación y las preguntas B2B del flujo comercial.
create table if not exists public.qualification_settings (
  id integer primary key check (id = 1),
  high_priority_threshold integer not null default 70 check (high_priority_threshold between 1 and 100),
  medium_priority_threshold integer not null default 40 check (medium_priority_threshold between 0 and 99),
  b2b_company_size_question text not null default '¿Aproximadamente cuántas personas trabajan en la empresa?',
  b2b_decision_role_question text not null default '¿Cuál es tu participación en la decisión de contratar una solución?',
  updated_at timestamptz not null default now()
);

insert into public.qualification_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.qualification_settings enable row level security;

-- No hay políticas para clientes: las rutas del servidor validan que el
-- solicitante sea administrador y la clave de servicio omite RLS.
grant select, update on table public.qualification_settings to service_role;
