# Nexo Futuro

Nexo Futuro es un prototipo web local creado con Next.js que convierte una conversación inicial en aprendizaje, contexto comercial y una acción para revisar por un ejecutivo.

## Qué incluye

- Orientación guiada para prospectos B2C o B2B.
- Perfil y prioridad comercial explicable.
- Futuro Academy con lección, fuente, quiz y consentimiento.
- CRM de ejemplo con resumen, objeción y decisión humana sobre la siguiente acción.
- Ruta pública `/orientacion` con conversación, captura de perfil y puntuación explicable.

## Ejecutarlo en tu computador

### 1. Instala Node.js

Descarga e instala la versión LTS de Node.js desde [nodejs.org](https://nodejs.org/). Después de instalarlo, cierra y vuelve a abrir la terminal.

### 2. Abre una terminal en esta carpeta

En Windows puedes abrir la carpeta `Hackatoon`, hacer clic derecho y seleccionar **Abrir en Terminal**.

### 3. Instala las dependencias

```bash
npm install
```

### 4. Inicia la aplicación

```bash
npm run dev
```

### 5. Ábrela en el navegador

Visita:

```text
http://localhost:3000
```

La aplicación se ejecuta solo en tu computador. Para detenerla, vuelve a la terminal y presiona `Ctrl + C`.

## Conectar el flujo del prospecto

El chat funciona en modo guiado aun sin llaves, para poder demostrarlo localmente.
Para activar la conversación con Groq y guardar los leads en Supabase, copia
`.env.example` como `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

La llave de servicio de Supabase y la de Groq solo se usan desde rutas del
servidor; no deben subirse a GitHub ni copiarse a componentes del navegador.
Al terminar la orientación, el servidor crea el lead y guarda el resumen y el
historial en `conversations`. El ejecutivo se asigna después desde el flujo
interno, por lo que esta ruta no modifica el login ni los usuarios.

## Estructura principal

```text
app/page.tsx                  Inicio, Academy y CRM de demostración
app/orientacion/page.tsx      Vista pública del prospecto
app/api/prospect/chat/route.ts API segura para la conversación
components/prospect-chat.tsx  Interfaz del chat
lib/prospect/                 Puntuación, IA y persistencia del prospecto
lib/supabase/                 Cliente de conexión con Supabase
```

## Próximos pasos opcionales

Cuando quieras convertir el prototipo en un producto real, puedes agregar:

1. Conectar Futuro Academy con contenido aprobado y reutilizar sus respuestas.
2. Completar Supabase Auth y las políticas para administrador y ejecutivo.
3. Asignar leads y seguimientos desde el CRM interno.
4. Integrar un CRM externo si el equipo lo necesita.
