# Nexo Futuro

Nexo Futuro es un prototipo web local que convierte una conversación inicial en aprendizaje, contexto comercial y una acción para revisar por un ejecutivo.

## Qué incluye

- Orientación guiada para prospectos B2C o B2B.
- Perfil y prioridad comercial explicable.
- Futuro Academy con lección, fuente, quiz y consentimiento.
- CRM de ejemplo con resumen, objeción y decisión humana sobre la siguiente acción.

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

## Estructura principal

```text
app/page.tsx       Interfaz y flujo interactivo
app/globals.css    Estilos visuales
app/layout.tsx     Metadatos generales
public/og.png      Imagen para vista previa al compartir
```

## Próximos pasos opcionales

Cuando quieras convertir el prototipo en un producto real, puedes agregar:

1. Rutas separadas para orientación, Academy y CRM.
2. Una base de datos para leads, conversaciones y decisiones.
3. Autenticación propia para ejecutivos.
4. Integración con un modelo de IA o con un CRM externo.
