# Documento técnico — Nexo Futuro AI

**Versión:** 1.0  
**Estado:** MVP funcional para demostración  
**Rama de referencia:** `main`  
**Última revisión técnica:** 12 de julio de 2026

## 1. Propósito

Nexo Futuro AI es una aplicación web que conecta orientación comercial, educación financiera y seguimiento humano en un mismo recorrido. El producto no busca sustituir a un asesor: organiza el contexto de cada prospecto para que un ejecutivo pueda atenderlo con información suficiente y tomar la decisión final sobre la siguiente acción.

El sistema resuelve cuatro necesidades:

1. Capturar prospectos B2C y B2B mediante una conversación en lenguaje natural.
2. Convertir lo conversado en datos estructurados y una prioridad comercial explicable.
3. Ofrecer una ruta educativa basada en contenido aprobado antes de una posible asesoría.
4. Entregar al ejecutivo o administrador un CRM con contexto, seguimiento y control humano de las acciones.

## 2. Alcance funcional

El MVP incluye los siguientes recorridos:

```text
Prospecto
  → Orientación con Nexo
  → Calificación y registro del lead
  → Futuro Academy
  → Quiz y consentimiento
  → Cuenta de seguimiento opcional

Ejecutivo
  → Inicio de sesión
  → Visualización de leads asignados
  → Cambio de estado y decisión sobre acción sugerida
  → Publicación de novedades al prospecto

Administrador
  → Inicio de sesión
  → Visión de todos los leads y métricas
  → Reasignación de leads
  → Configuración de preguntas B2B y umbrales de prioridad
```

Las acciones comerciales se registran en el sistema, pero no se conectan todavía a un calendario, proveedor de correo o CRM externo. Esta decisión permite demostrar el flujo completo sin ejecutar comunicaciones reales sin aprobación humana.

## 3. Arquitectura

```text
┌──────────────────────────────────────────────────────┐
│                     Navegador web                     │
│  Prospecto · Ejecutivo · Administrador                │
└───────────────────────┬──────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼──────────────────────────────┐
│                    Next.js 16                         │
│  Pantallas React + API Routes del servidor            │
│                                                       │
│  /orientacion       /academy        /mi-cuenta        │
│  /api/prospect/*    /api/academy/*  /api/crm/*        │
└───────────────┬───────────────────────┬──────────────┘
                │                       │
                │                       │
┌───────────────▼────────────┐  ┌───────▼──────────────┐
│          Supabase          │  │         Groq          │
│ PostgreSQL · Auth · RLS    │  │ Extracción, resumen,  │
│ Leads y seguimiento        │  │ conversación y tutor  │
└────────────────────────────┘  └──────────────────────┘
```

### 3.1 Tecnologías

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| Aplicación web | Next.js 16, React 19, TypeScript | Interfaz, rutas y API del servidor. |
| Estilos | CSS propio | Diseño de orientación, Academy y CRM. |
| Autenticación | Supabase Auth | Sesión de ejecutivos, administradores y prospectos. |
| Base de datos | Supabase PostgreSQL | Datos comerciales, educativos y de seguimiento. |
| IA | Groq API | Extracción de datos, respuestas, resúmenes y tutor. |
| Despliegue recomendado | Vercel | Hospedaje de la aplicación Next.js. |

## 4. Rutas principales

| Ruta | Tipo de usuario | Propósito |
| --- | --- | --- |
| `/` | Público e interno | Inicio, acceso a orientación e inicio de sesión interno. |
| `/orientacion` | Prospecto | Conversación con Nexo y creación del lead. |
| `/academy?lead_id=...` | Prospecto con lead | Ruta educativa de Futuro Academy. |
| `/crear-cuenta?lead_id=...` | Prospecto | Creación de una cuenta de seguimiento opcional. |
| `/mi-cuenta` | Prospecto autenticado | Consulta de estado, asesor asignado y novedades. |
| `/api/prospect/chat` | Servidor | Orquestación de orientación, IA, puntuación y persistencia. |
| `/api/academy/context` | Servidor | Contexto del lead y módulos educativos. |
| `/api/academy/tutor` | Servidor | Respuesta del tutor solo desde contenido aprobado. |
| `/api/academy/learning-interest` | Servidor | Consentimiento, resultado del quiz y revocación. |
| `/api/auth/session` | Servidor | Verificación de sesión y rol interno. |
| `/api/crm/dashboard` | Servidor | Datos del CRM, cambios de estado, reasignaciones y decisiones. |
| `/api/crm/client-updates` | Servidor | Novedades visibles para un prospecto. |
| `/api/crm/potential-users` | Servidor | Lista de prospectos con cuenta para seguimiento. |
| `/api/crm/qualification-config` | Servidor | Configuración exclusiva de administración. |

## 5. Roles y control de acceso

Supabase Auth identifica a la persona; la tabla `users`, relacionada con `profiles`, define la autorización interna.

| Rol | Perfil en base de datos | Permisos |
| --- | --- | --- |
| Administrador | `administrador` | Ve todos los leads, métricas, reasigna leads y configura calificación. |
| Ejecutivo | `executive` | Ve solo los leads asignados, cambia su estado, registra decisiones y publica novedades para ellos. |
| Prospecto | `prospect` | Solo ve su cuenta, estado, asesor asignado y novedades publicadas para su lead. |

Un registro en Supabase Auth no concede por sí solo acceso al CRM. Para un usuario interno, debe existir una fila activa en `public.users` con el mismo UUID de Auth y el `profile_id` correspondiente. Esta separación evita que una cuenta de prospecto obtenga acceso a funciones internas.

## 6. Flujo de orientación y calificación

### 6.1 Conversación

La ruta `/orientacion` usa el componente `prospect-chat`. La conversación puede recibir respuestas libres, pero conserva una estructura de etapas para asegurar que el lead llegue al CRM con los datos mínimos requeridos.

Etapas compartidas:

```text
nombre → tipo de lead → objetivo → experiencia → presupuesto
→ plazo/urgencia → correo → registro del lead
```

Etapas exclusivas B2B:

```text
nombre → B2B → empresa → tamaño de empresa → rol en decisión
→ objetivo → experiencia → presupuesto → urgencia → correo
```

El tipo B2C o B2B se pregunta de forma explícita. La IA no debe asumir B2C únicamente porque una persona escribió su nombre.

### 6.2 Uso de IA y validaciones

La API `/api/prospect/chat` realiza los siguientes pasos:

1. Valida tamaño, forma y orden básico de los mensajes recibidos.
2. Envía el historial y el perfil parcial a Groq para extraer datos en formato JSON estructurado.
3. Fusiona únicamente datos válidos: nombre, correo, tipo, empresa, objetivo, experiencia, presupuesto, urgencia y campos B2B.
4. Si Groq no responde o falla, utiliza reglas deterministas como respaldo.
5. Genera una frase conversacional breve y formula la siguiente pregunta obligatoria.
6. Cuando todos los datos están completos, calcula la puntuación, genera el resumen y persiste el lead.

El flujo se cancela sin guardar información si el objetivo expresado es ilícito o si la persona rechaza entregar el correo requerido para registrar el lead.

### 6.3 Puntuación de prioridad

La puntuación se calcula con reglas transparentes; no depende de una respuesta opaca del modelo de IA.

| Factor | Rango | Criterio principal |
| --- | ---: | --- |
| Interés | 0–25 | Afinidad del objetivo con ahorro, inversión, metas o educación. |
| Presupuesto | 0–25 | Monto aproximado indicado. |
| Afinidad de perfil | 0–25 | Tipo de lead, objetivo y experiencia disponibles. |
| Urgencia | 0–25 | Plazo declarado para comenzar. |
| **Total** | **0–100** | Suma de los cuatro factores. |

Los umbrales iniciales son prioridad alta desde 70 y media desde 40. Un administrador puede ajustar estos valores y las dos preguntas B2B desde el CRM. La explicación del puntaje se muestra en términos de sus cuatro componentes.

### 6.4 Persistencia del lead

Al completar el flujo, el servidor:

1. Crea una fila en `leads` con el perfil estructurado, puntaje y estado `nuevo`.
2. Asigna el lead al primer ejecutivo activo disponible.
3. Guarda en `conversations` el historial de mensajes y el resumen generado.

La asignación posterior puede ser modificada por un administrador desde el dashboard.

## 7. Futuro Academy y Tutor

### 7.1 Principio de contenido aprobado

Academy no utiliza información financiera abierta ni recomienda productos. Los módulos educativos viven en `lib/academy/approved-content.ts` y contienen explicación, ideas clave, límites, fuente y preguntas de quiz.

Los temas implementados son:

1. Ahorrar e invertir.
2. Riesgo y horizonte de tiempo.
3. Objetivos financieros.
4. Presupuesto y fondo de emergencia.

Cada respuesta muestra la fuente `Futuro Academy — Fundamentos financieros v1` y la sección correspondiente. Si la pregunta no coincide con contenido autorizado, el tutor informa que no tiene información suficiente y propone derivar a un especialista.

### 7.2 Ruta guiada

Academy conserva el `lead_id` de la orientación para no volver a pedir información comercial. La persona primero recorre los módulos, luego responde el quiz final y únicamente después puede registrar su actividad educativa.

```text
Orientación terminada
  → Academy con lead_id
  → Lectura de módulos
  → Quiz breve
  → Resultado
  → Solicitud de consentimiento
```

El quiz usa tres preguntas y se considera aprobado con al menos dos respuestas correctas. El resultado se muestra tanto al prospecto como al CRM cuando existe consentimiento.

### 7.3 Consentimiento y revocación

El interés educativo se almacena en `learning_interests` solo cuando el prospecto acepta. Se registra tema, puntaje del quiz, consentimiento y fecha.

Si selecciona “No guardar” o posteriormente retira su autorización, la aplicación revoca el interés educativo correspondiente. Las actividades educativas no deben utilizarse como señal comercial sin ese permiso explícito.

## 8. CRM, seguimiento y decisión humana

El componente `CrmDashboard` obtiene información desde `/api/crm/dashboard` después de validar la sesión y el rol interno.

### 8.1 Dashboard del ejecutivo

El ejecutivo ve exclusivamente leads con `assigned_user_id` igual a su propio usuario. Para cada lead puede consultar:

- Resumen de IA y contexto comercial.
- Objetivo, experiencia, urgencia y prioridad.
- Progreso de Academy y resultado del quiz cuando existe consentimiento.
- Historial de acciones.
- Estado actual del seguimiento.

Puede cambiar el estado y registrar la decisión sobre la acción sugerida: aprobar, editar o rechazar. Cada cambio crea una fila en `commercial_actions`.

### 8.2 Dashboard del administrador

El administrador ve todos los leads, métricas del equipo, ejecutivos activos y cuentas potenciales. Además de las acciones del ejecutivo, puede reasignar un lead a otro ejecutivo activo y cambiar la configuración de calificación.

### 8.3 Estados del lead

```text
nuevo → calificado → en_seguimiento → interesado → cliente
                                              ↘ descartado
```

Los estados se validan en la API, se actualizan en `leads` y se auditan mediante un registro en `commercial_actions`. No se depende de que el usuario escriba un estado arbitrario en la base de datos.

### 8.4 Acciones sugeridas

La recomendación se calcula con reglas según estado, puntaje y participación en Academy. Ejemplos:

| Situación | Acción sugerida |
| --- | --- |
| Lead nuevo | Revisar la información y calificar el lead. |
| Lead calificado sin Academy | Invitar a completar Futuro Academy. |
| Lead calificado con Academy | Iniciar seguimiento con el prospecto. |
| En seguimiento | Registrar el próximo contacto o reunión. |
| Interesado | Agendar una reunión introductoria. |

La IA puede sugerir, pero no ejecuta comunicaciones ni agenda reuniones por su cuenta. El ejecutivo o administrador tiene la decisión final y el sistema conserva el historial de dicha decisión.

## 9. Cuenta y novedades del prospecto

Al terminar Academy o desde el enlace de creación de cuenta, el prospecto puede crear una cuenta asociada a su `lead_id`. Esta cuenta se almacena en `prospect_accounts` y utiliza Supabase Auth con el perfil `prospect`.

Desde `/mi-cuenta`, el prospecto puede ver:

- Estado actual de su orientación.
- Nombre de su asesor asignado, cuando existe.
- Novedades que un ejecutivo o administrador publicó deliberadamente.

Las novedades se guardan en `client_updates`. No se muestran notas internas, historial completo del CRM ni información de otros leads.

## 10. Modelo de datos

| Tabla | Uso en el sistema |
| --- | --- |
| `profiles` | Catálogo de roles: administrador, executive y prospect. |
| `users` | Usuarios internos, rol, identidad y estado activo. |
| `leads` | Prospectos B2C/B2B, contacto, contexto comercial, prioridad, estado y ejecutivo asignado. |
| `conversations` | Historial del chat y resumen generado de cada lead. |
| `learning_interests` | Tema educativo, resultado del quiz, consentimiento y fecha. |
| `commercial_actions` | Auditoría de estados, reasignaciones y decisiones humanas. |
| `prospect_accounts` | Vínculo entre un lead y una cuenta de Supabase Auth. |
| `client_updates` | Mensajes publicados para la cuenta de un prospecto. |
| `qualification_settings` | Umbrales de prioridad y preguntas configurables B2B. |
| `opportunities` / `followups` | Entidades disponibles para ampliaciones futuras del CRM. |

Campos relevantes de `leads`:

```text
id, assigned_user_id, full_name, email, phone, company,
company_size, decision_role, lead_type, objective, experience,
budget, urgency_label, interest_level, urgency, lead_score,
status, created_at, updated_at
```

## 11. Seguridad y privacidad

1. **Claves privadas:** `SUPABASE_SERVICE_ROLE_KEY` y `GROQ_API_KEY` se usan solo en rutas de servidor. Nunca deben iniciar con `NEXT_PUBLIC_`, incluirse en el repositorio ni aparecer en el navegador.
2. **Autorización:** cada API del CRM valida el token de Supabase Auth y comprueba rol y estado activo en `users`.
3. **Separación de datos:** un ejecutivo solo puede modificar leads asignados a él; un administrador puede ver y reasignar el conjunto completo.
4. **RLS:** `prospect_accounts`, `client_updates` y `qualification_settings` tienen Row Level Security habilitado. El acceso se realiza mediante rutas servidor con clave de servicio y validaciones previas de identidad.
5. **Consentimiento:** los datos educativos se almacenan únicamente después de aceptar; se ofrece revocación.
6. **Tutor seguro:** el contenido aprobado excluye recomendaciones de productos, rendimientos o asesoría financiera personalizada.

## 12. Migraciones de Supabase

Las migraciones incluidas complementan el esquema inicial que ya contiene `users`, `profiles`, `leads`, `conversations`, `learning_interests`, `opportunities`, `followups` y `commercial_actions`.

Aplicar en este orden desde **Supabase → SQL Editor**:

1. `202607120003_strengthen_prospect_records.sql`
2. `202607120004_link_auth_roles.sql`
3. `202607120005_add_prospect_accounts.sql`
4. `202607130006_enable_dashboard_updates.sql`
5. `202607130007_add_b2b_lead_details.sql`
6. `202607130008_add_qualification_settings.sql`

En la última migración debe mantenerse habilitado **Row Level Security**. No se deben crear políticas públicas para `qualification_settings`; la API valida que el solicitante sea administrador antes de acceder con la clave de servicio.

## 13. Configuración local

### 13.1 Requisitos

- Node.js 22.13 o superior.
- Proyecto de Supabase con las tablas y migraciones aplicadas.
- Clave de Groq válida para las capacidades de IA.

### 13.2 Variables de entorno

Crear `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GROQ_API_KEY=
GROQ_CHAT_MODEL=llama-3.1-8b-instant
GROQ_SUMMARY_MODEL=llama-3.3-70b-versatile
GROQ_TUTOR_MODEL=llama-3.1-8b-instant
```

`SUPABASE_SERVICE_ROLE_KEY` y `GROQ_API_KEY` son secretos. `.env.local` está excluido por `.gitignore` y no debe subirse a GitHub.

### 13.3 Comandos

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

Para comprobaciones técnicas:

```bash
npm run lint
npm test
```

`npm test` ejecuta el build de producción y las pruebas de flujo fuente.

## 14. Despliegue recomendado

La alternativa recomendada es Vercel conectado al repositorio de GitHub.

1. Importar el repositorio y seleccionar Next.js.
2. Usar `main` como rama de producción.
3. Configurar las variables de entorno de la sección 13.2 en los entornos Production, Preview y Development.
4. Desplegar y copiar la URL pública.
5. En Supabase, abrir **Authentication → URL Configuration** y configurar:

```text
Site URL: https://tu-proyecto.vercel.app
Redirect URL: https://tu-proyecto.vercel.app/mi-cuenta
Redirect URL local: http://localhost:3000/**
```

La configuración de redirección es necesaria para que las confirmaciones de correo de prospectos vuelvan a la aplicación desplegada y no a `localhost`.

## 15. Pruebas de aceptación para demo

Antes de presentar, comprobar el recorrido completo:

1. Realizar una orientación B2C y verificar que se crea el lead y su conversación.
2. Realizar una orientación B2B y confirmar empresa, tamaño y rol de decisión en `leads`.
3. Entrar a Academy desde una orientación, terminar la ruta, responder el quiz y aceptar el consentimiento.
4. Repetir la acción educativa y rechazar o revocar el consentimiento para verificar que no queda interés activo.
5. Crear una cuenta de prospecto y confirmar que `/mi-cuenta` muestra su estado.
6. Iniciar sesión como ejecutivo y comprobar que solo aparecen sus leads asignados.
7. Cambiar el estado de un lead y aprobar, editar o rechazar una acción sugerida.
8. Iniciar sesión como administrador, reasignar un lead y modificar la configuración B2B.
9. Publicar una novedad y verificarla desde la cuenta del prospecto.
10. Ejecutar `npm run lint` y `npm test` antes de la entrega.

## 16. Limitaciones conocidas y evolución

| Área | Estado actual | Evolución sugerida |
| --- | --- | --- |
| Asignación inicial | Primer ejecutivo activo. | Reglas de carga, especialidad o territorio. |
| Acciones comerciales | Se registran como decisión interna. | Integración con correo y calendario tras aprobación. |
| Contenido Academy | Cuatro módulos locales aprobados. | Panel editorial, más módulos y versionado de fuentes. |
| Tutor | Recuperación simple basada en módulos autorizados. | Búsqueda semántica/RAG sobre documentos aprobados. |
| IA | Depende de Groq y de su cuota disponible. | Proveedor alternativo y manejo de cuotas. |
| Métricas | Métricas operativas del CRM. | Reportes por periodo, embudo y conversión. |

## 17. Trazabilidad con los criterios del reto

| Criterio | Implementación |
| --- | --- |
| Identificar B2B/B2C | Etapa explícita del chat y campos estructurados B2B. |
| Calificar prospectos | Puntaje 0–100 con explicación y umbrales configurables. |
| Conservar contexto comercial | `leads`, `conversations`, resumen y asignación. |
| Tutor con fuentes | Módulos aprobados, fuente visible y límite de cobertura. |
| Ruta educativa y quiz | Academy guiada, quiz final y resultado. |
| Consentimiento | Registro explícito en `learning_interests` y revocación. |
| CRM para ejecutivos | Dashboard, estados, métricas e historial. |
| Supervisión humana | Aprobar, editar o rechazar acciones sugeridas. |
| Integración de punta a punta | Prospecto → Academy → CRM → actualización al prospecto. |

---

Este documento describe el comportamiento implementado del MVP. Cualquier integración externa nueva debe conservar los principios de consentimiento, acceso por rol, contenido educativo aprobado y aprobación humana previa a comunicaciones comerciales.
