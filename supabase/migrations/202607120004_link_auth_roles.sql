-- Los roles existentes viven en public.profiles:
-- 1 = administrador, 2 = executive.
-- El mismo UUID se usa en auth.users y public.users para enlazar identidad y permisos.
-- La creación de cada fila interna es deliberadamente manual: crear una cuenta
-- en Auth no debe conceder acceso automático al CRM.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_auth_user_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_auth_user_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

-- Para asignar un usuario, un administrador debe crear manualmente su fila en
-- public.users usando el UUID de Auth como id y profile_id 1 o 2.
