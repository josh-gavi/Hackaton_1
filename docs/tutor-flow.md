# Preparación para Futuro Academy

El flujo comercial ya entrega un perfil confirmado (`nombre`, tipo B2C/B2B,
objetivo, experiencia, presupuesto, urgencia y correo) y un `lead_id` en
Supabase. El Tutor debe reutilizar ese contexto, sin volver a pedirlo.

## Recorrido a implementar

1. El prospecto termina la orientación y entra a Academy con su contexto.
2. Selecciona o pregunta por un tema educativo.
3. El Tutor responde únicamente desde contenido aprobado e indica la fuente.
4. Ofrece un quiz breve de tres preguntas.
5. Solicita consentimiento antes de guardar el tema y resultado.
6. Si acepta, se registra en `learning_interests` usando `lead_id`.

## Datos que ya existen

- `leads`: contexto comercial estructurado.
- `conversations`: resumen e historial del chat.
- `learning_interests`: `lead_id`, tema, resultado del quiz, consentimiento y fecha.

## Límites del Tutor

- No recomienda productos ni rendimientos de inversión.
- No inventa respuestas si el contenido aprobado no cubre la pregunta.
- Muestra siempre la fuente del contenido usado.
- La información educativa solo se usa comercialmente con consentimiento.

## Primera entrega del Tutor

- Ruta `/academy` o una vista dedicada.
- Un archivo local con el contenido aprobado y sus fuentes.
- Explicación con fuente, quiz, consentimiento y persistencia en Supabase.
