# Nexo Futuro

Prototipo de una experiencia comercial y educativa que convierte una primera conversación en contexto útil para un ejecutivo, con consentimiento y decisión humana antes de actuar.

## Recorrido del producto

```text
Prospecto
  → Orientación guiada
  → Perfil y puntuación de prioridad
  → Futuro Academy + quiz
  → Consentimiento para registrar interés
  → CRM del ejecutivo
  → Acción recomendada y aprobación humana
```

## Vistas incluidas en el prototipo

| Vista | Propósito | Ejemplo que muestra |
| --- | --- | --- |
| Inicio | Explica el valor de Nexo Futuro y orienta a cada tipo de usuario. | La conversación se transforma en aprendizaje y una oportunidad. |
| Orientación | El prospecto responde preguntas sin completar un formulario tradicional. | Tipo B2C/B2B, objetivo, experiencia, presupuesto y momento para comenzar. |
| Futuro Academy | Enseña con contenido aprobado, fuente, quiz y solicitud de consentimiento. | Diferencia entre ahorrar e invertir. |
| CRM | Permite al ejecutivo priorizar, comprender y decidir. | Carlos Mendoza, prioridad 80/100 y propuesta de reunión. |

## Diseño del producto final

El prototipo usa la navegación interna para recorrer todo el flujo. Al convertirlo en MVP, cada vista se separará en estas rutas:

```text
/                 Página principal
/orientacion      Conversación para prospectos
/academy          Tutor y ruta educativa
/login            Acceso del ejecutivo
/crm              Panel privado de oportunidades
/crm/leads/[id]   Ficha individual del lead
```

## Modelo de datos propuesto

```text
leads
  id, nombre, tipo, objetivo, experiencia, presupuesto, urgencia,
  puntaje, prioridad, etapa, creado_en

conversations
  id, lead_id, autor, mensaje, creado_en

learning_interests
  id, lead_id, tema, resultado_quiz, consentimiento, creado_en

recommended_actions
  id, lead_id, propuesta, justificacion, estado, decision_ejecutivo
```

## Principios de negocio ya representados

- Una sola aplicación con vista pública para el prospecto y vista privada para el ejecutivo.
- La puntuación es explicable: interés, perfil y plazo producen una prioridad visible para el ejecutivo.
- El tutor muestra una fuente, realiza un quiz y no guarda el interés educativo sin consentimiento.
- La IA recomienda una siguiente acción, pero el ejecutivo puede aprobarla, editarla o rechazarla.
- La demostración usa a Carlos Mendoza como caso B2C de punta a punta.

## Siguiente implementación técnica

1. Separar las vistas en las rutas indicadas.
2. Persistir los datos con Supabase o Cloudflare D1.
3. Proteger `/crm` con autenticación y roles de ejecutivo.
4. Conectar el orquestador de IA para interpretar texto libre, generar el resumen y detectar objeciones.
5. Guardar el historial de decisiones y crear la integración real o simulada de reuniones.

## GitHub

El proyecto ya está preparado como repositorio local. Cuando exista el repositorio remoto, se puede enlazar desde este directorio y publicar la rama principal. El nombre sugerido es `nexo-futuro`.

```bash
git remote add origin https://github.com/TU-USUARIO/nexo-futuro.git
git branch -M main
git push -u origin main
```

## Desarrollo local

Requiere Node.js 22.13 o superior.

```bash
npm install
npm run dev
```
