-- El dashboard usa rutas de servidor con la clave de servicio. Estos permisos
-- permiten actualizar el estado de un lead y registrar el cambio en su historial.
grant update on table public.leads to service_role;
grant select, insert on table public.commercial_actions to service_role;
