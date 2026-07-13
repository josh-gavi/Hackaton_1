# Nexo Futuro AI

Nexo Futuro AI es una aplicación web que transforma una conversación inicial en contexto comercial, educación financiera y seguimiento humano. El sistema ayuda a prospectos B2C y B2B, y entrega a ejecutivos y administradores un CRM con información estructurada para tomar decisiones.

## Flujo del producto

```text
Orientación con Nexo
  → Calificación del lead
  → Futuro Academy
  → Quiz y consentimiento
  → CRM con seguimiento humano
  → Novedades visibles para el prospecto
```

## Funcionalidades

- Conversación libre para prospectos B2C y B2B, asistida por Groq.
- Extracción de datos, prioridad explicable y resumen comercial.
- Registro de leads y conversaciones en Supabase.
- Futuro Academy con contenido aprobado, fuentes, ruta guiada, quiz y consentimiento.
- Cuenta opcional de prospecto para ver estado, asesor y novedades.
- Dashboard de ejecutivo con leads asignados, seguimiento y decisión humana.
- Dashboard de administrador con métricas, reasignación de leads y configuración B2B.
- Historial de cambios, decisiones y novedades publicadas.

## Tecnologías

- Next.js 16, React 19 y TypeScript.
- Supabase: PostgreSQL, Auth y Row Level Security.
- Groq: conversación, extracción estructurada, resumen y tutor.
- Vercel: despliegue recomendado.

## Ejecutar localmente

### Requisitos

- Node.js 22.13 o superior.
- Proyecto Supabase configurado.
- Clave de Groq.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` como `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GROQ_API_KEY=
GROQ_CHAT_MODEL=llama-3.1-8b-instant
GROQ_SUMMARY_MODEL=llama-3.3-70b-versatile
GROQ_TUTOR_MODEL=llama-3.1-8b-instant
```

No subas `.env.local` a GitHub. `SUPABASE_SERVICE_ROLE_KEY` y `GROQ_API_KEY` son secretos y nunca deben utilizar el prefijo `NEXT_PUBLIC_`.

### 3. Aplicar migraciones

En **Supabase → SQL Editor**, aplica en orden los archivos de `supabase/migrations/`:

1. `202607120003_strengthen_prospect_records.sql`
2. `202607120004_link_auth_roles.sql`
3. `202607120005_add_prospect_accounts.sql`
4. `202607130006_enable_dashboard_updates.sql`
5. `202607130007_add_b2b_lead_details.sql`
6. `202607130008_add_qualification_settings.sql`

La última migración debe ejecutarse con Row Level Security habilitado.

### 4. Iniciar la aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 5. Comprobar calidad

```bash
npm run lint
npm test
```

## Roles internos

Supabase Auth valida la identidad. El acceso al CRM también requiere una fila activa en `public.users` con el mismo UUID de Auth.

| Rol | Perfil | Acceso |
| --- | --- | --- |
| Administrador | `administrador` | Todos los leads, métricas, reasignación y configuración. |
| Ejecutivo | `executive` | Leads asignados, seguimiento, decisiones y novedades. |
| Prospecto | `prospect` | Su cuenta, estado, asesor y novedades. |

Consulta [docs/auth-roles.md](docs/auth-roles.md) para crear usuarios internos.

## Despliegue

1. Importa el repositorio en Vercel y selecciona Next.js.
2. Configura las mismas variables de `.env.local` en Vercel.
3. Usa `main` como rama de producción.
4. En Supabase, configura la URL pública en **Authentication → URL Configuration**.
5. Agrega como Redirect URL: `https://tu-dominio/mi-cuenta`.

## Documentación

- [Documento técnico completo](docs/documento-tecnico.md)
- [Roles internos](docs/auth-roles.md)
- [Flujo original del Tutor](docs/tutor-flow.md)

## Estructura relevante

```text
app/orientacion/              Orientación del prospecto
app/academy/                  Futuro Academy
app/mi-cuenta/                Cuenta y novedades del prospecto
app/api/prospect/             Chat, IA, scoring y persistencia
app/api/academy/              Contexto, tutor y consentimiento
app/api/crm/                  Dashboard, acciones y configuración
components/                   Interfaces de chat, Academy y CRM
lib/prospect/                 Reglas de calificación e integración Groq
lib/academy/                  Contenido educativo aprobado y recuperación
lib/supabase/                 Clientes de Supabase
supabase/migrations/          Migraciones SQL
docs/                         Documentación técnica
```

## Alcance actual

La aplicación registra y audita las acciones comerciales, pero no envía correos ni agenda reuniones automáticamente. Ese límite es intencional: la IA propone y un ejecutivo o administrador aprueba, edita o rechaza antes de cualquier integración externa.
