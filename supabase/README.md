# Supabase: esquema compartido

La base de Supabase existente es la fuente de verdad. No hay una migración para
crear tablas en esta rama, porque el equipo ya creó el modelo comercial remoto.

## Inventario actual

| Tabla | Responsabilidad |
| --- | --- |
| `profiles` | Catálogo de perfiles internos, por ejemplo administrador o ejecutivo. |
| `users` | Usuarios internos y su perfil. |
| `leads` | Prospectos asignados a un usuario interno. |
| `conversations` | Resumen y conversación completa en `conversation_json`. |
| `learning_interests` | Tema, resultado del quiz y consentimiento. |
| `opportunities` | Etapa, probabilidad y valor estimado. |
| `followups` | Resumen de IA, objeciones y siguiente acción recomendada. |
| `commercial_actions` | Acciones ejecutadas por un usuario sobre un lead. |

Los valores de estado acordados para `leads.status` son: `nuevo`,
`calificado`, `en_seguimiento`, `interesado`, `cliente` y `descartado`.

## Conectar la aplicación local

1. Copia `.env.example` como `.env.local` en la raíz del proyecto.
2. En Supabase abre **Connect** o **Project settings > API**.
3. Pega la URL del proyecto en `NEXT_PUBLIC_SUPABASE_URL` y la clave publicable
   en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Mantén `SUPABASE_SERVICE_ROLE_KEY` exclusivamente para rutas de servidor.
   Nunca la copies a un componente con `"use client"` ni la subas a GitHub.

Las tablas tienen RLS activo y todavía no contienen políticas. Esto evita que la
aplicación exponga datos antes de que la rama de login defina quién es
administrador o ejecutivo y qué leads puede consultar.

## Relación con la autenticación

Las relaciones existentes conectan `users` con `profiles`, `leads` con el
usuario asignado y las entidades comerciales con su lead. El equipo acordó usar
Supabase Auth para el login. La rama de autenticación será responsable de
vincular `public.users` con `auth.users` y de no guardar contraseñas en
`public.users.password_hash`; esta rama no modifica esa implementación.

También se acordó que cada acción comercial pertenecerá a un seguimiento
específico. La relación `commercial_actions` → `followups` se incorporará cuando
el responsable del esquema confirme el ajuste remoto. Los estados de los leads
seguirán siendo texto y se validarán desde la aplicación.
