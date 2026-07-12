# Roles de ejecutivos

Supabase Auth identifica a la persona. La autorización del CRM se determina en
`public.users`, relacionada con `public.profiles`.

| Perfil | ID | Uso |
| --- | --- | --- |
| `administrador` | 1 | Acceso total y configuración. |
| `executive` | 2 | Gestión y seguimiento de leads. |

## Dar acceso a una cuenta creada en Auth

1. Crea o invita la cuenta desde **Authentication → Users** en Supabase.
2. Copia su UUID.
3. Inserta una fila en `public.users` con el mismo UUID como `id`, el perfil
   elegido en `profile_id` y `is_active = true`.

```sql
insert into public.users (
  id,
  profile_id,
  full_name,
  email,
  is_active,
  created_at,
  updated_at
)
values (
  'UUID-DE-AUTH-AQUI',
  2,
  'Nombre del ejecutivo',
  'correo@empresa.com',
  true,
  now(),
  now()
);
```

Usa `profile_id = 1` para un administrador. Para retirar acceso, conserva el
historial y cambia `is_active` a `false`.

La ruta `GET /api/auth/session` verifica tanto la sesión de Supabase Auth como
esta fila interna antes de permitir entrar al CRM.
