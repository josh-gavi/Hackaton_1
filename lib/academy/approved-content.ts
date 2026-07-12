import type { AcademyModule } from "./types";

// Versión estructurada del material revisado por el equipo para la demo de Futuro Academy.
// No contiene recomendaciones personalizadas ni productos financieros.

const source = (section: string) => ({
  title: "Futuro Academy — Fundamentos financieros v1",
  section,
  status: "approved_demo" as const,
});

export const academyModules: AcademyModule[] = [
  {
    id: "ahorro-invertir",
    title: "Ahorrar e invertir",
    level: "Principiante",
    duration: "5 min",
    objective: "Distinguir el ahorro de la inversión y entender que cumplen funciones diferentes.",
    explanation:
      "Ahorrar significa apartar una parte del dinero para necesidades futuras, imprevistos o metas específicas. Suele priorizar que el dinero esté disponible cuando se necesite. Invertir significa destinar dinero con la expectativa de que pueda generar valor con el tiempo. A diferencia del ahorro, invertir implica algún nivel de riesgo: el valor puede subir o bajar. Por eso, ahorro e inversión no son lo mismo ni garantizan resultados. Entender la diferencia ayuda a organizar el dinero de acuerdo con metas y plazos, sin sustituir una evaluación financiera personal.",
    keyIdeas: [
      "El ahorro busca disponibilidad para metas cercanas o imprevistos.",
      "La inversión busca crecimiento posible con el tiempo.",
      "Invertir implica riesgo y no garantiza resultados.",
      "Las decisiones dependen de metas y plazos personales.",
    ],
    boundaries: [
      "No explica qué producto o entidad elegir.",
      "No calcula rendimientos ni recomienda inversiones.",
      "No reemplaza asesoría financiera profesional.",
    ],
    coverageQuestions: ["diferencia entre ahorrar e invertir", "propósito del ahorro", "riesgo de invertir"],
    keywords: ["ahorro", "ahorrar", "invertir", "inversión", "inversion", "riesgo"],
    source: source("Módulo 1 · Sección 1"),
    quiz: [
      { question: "¿Cuál es el propósito principal del ahorro?", options: ["Generar ganancias garantizadas", "Tener dinero disponible para necesidades cercanas o imprevistos", "Eliminar todo riesgo financiero"], correctIndex: 1, explanation: "El ahorro busca disponibilidad; no garantiza ganancias." },
      { question: "¿Qué distingue generalmente a la inversión?", options: ["No requiere decisiones", "Implica asumir cierto nivel de riesgo", "Siempre es de corto plazo"], correctIndex: 1, explanation: "El valor puede variar con el tiempo." },
      { question: "¿Por qué es útil diferenciar ahorro e inversión?", options: ["Porque son lo mismo", "Porque ayuda a organizar dinero según metas y plazos", "Porque solo una es válida"], correctIndex: 1, explanation: "Cumplen funciones distintas y complementarias." },
    ],
  },
  {
    id: "riesgo-horizonte",
    title: "Riesgo y horizonte de tiempo",
    level: "Principiante",
    duration: "5 min",
    objective: "Entender el riesgo financiero y su relación general con el tiempo disponible para una meta.",
    explanation:
      "El riesgo financiero es la posibilidad de que el valor del dinero destinado a una meta cambie de forma distinta a lo esperado. El horizonte de tiempo es el período antes de necesitar ese dinero. En términos generales, una meta con más tiempo puede tener más margen para afrontar variaciones antes de que el dinero sea necesario; una meta cercana suele priorizar estabilidad porque hay menos tiempo para afrontar cambios. Es un principio educativo general, no una regla igual para todas las personas. La tolerancia a las variaciones y la situación individual también importan.",
    keyIdeas: [
      "El riesgo describe posibles variaciones, no ganancias garantizadas.",
      "El horizonte es el plazo antes de necesitar el dinero.",
      "Un plazo más largo puede dar más margen ante variaciones.",
      "La tolerancia al riesgo no es igual para todas las personas.",
    ],
    boundaries: ["No mide el riesgo de un producto específico.", "No indica cuánto riesgo debe asumir una persona.", "No recomienda inversiones."],
    coverageQuestions: ["qué es riesgo financiero", "qué es horizonte de tiempo", "relación entre riesgo y plazo"],
    keywords: ["riesgo", "horizonte", "plazo", "tiempo", "variación", "variacion", "corto plazo", "largo plazo"],
    source: source("Módulo 2 · Sección 2"),
    quiz: [
      { question: "¿Qué describe mejor el riesgo financiero?", options: ["Ganancias garantizadas", "La posibilidad de variaciones distintas a lo esperado", "La eliminación de la incertidumbre"], correctIndex: 1, explanation: "El riesgo se refiere a posibles variaciones." },
      { question: "¿Qué es el horizonte de tiempo?", options: ["El monto disponible", "El período antes de necesitar el dinero", "La institución donde se guarda el dinero"], correctIndex: 1, explanation: "Es el plazo asociado con una meta." },
      { question: "¿Qué puede ofrecer un horizonte más largo?", options: ["Eliminar el riesgo", "Más margen para afrontar variaciones", "Resultados garantizados"], correctIndex: 1, explanation: "No elimina el riesgo, pero puede dar más margen." },
    ],
  },
  {
    id: "objetivos-financieros",
    title: "Objetivos financieros",
    level: "Principiante",
    duration: "5 min",
    objective: "Identificar objetivos financieros claros y clasificarlos según su plazo.",
    explanation:
      "Un objetivo financiero es una meta concreta relacionada con el uso del dinero que se busca alcanzar en un período determinado. Definir objetivos ayuda a organizar decisiones sobre ahorrar, gastar o planificar. Pueden ser de corto, mediano o largo plazo. Para que una meta sea más clara, ayuda que indique qué se quiere lograr, que pueda medirse y que tenga un plazo. Definir una meta es un primer paso educativo: no determina por sí solo qué producto, monto o decisión específica debe tomar una persona.",
    keyIdeas: ["Un objetivo financiero es una meta concreta.", "Puede ser de corto, mediano o largo plazo.", "Una meta clara suele ser específica, medible y con plazo.", "Los objetivos dependen del contexto de cada persona."],
    boundaries: ["No decide si una meta personal es realista.", "No recomienda estrategias ni productos.", "No establece montos ni plazos personales."],
    coverageQuestions: ["qué es un objetivo financiero", "tipos de objetivos", "cómo hacer una meta clara"],
    keywords: ["objetivo", "meta", "metas", "planificar", "planificación", "planificacion"],
    source: source("Módulo 3 · Sección 3"),
    quiz: [
      { question: "¿Qué es un objetivo financiero?", options: ["Una idea sin plazo", "Una meta concreta relacionada con dinero y tiempo", "Un producto financiero"], correctIndex: 1, explanation: "Una meta financiera debe poder describirse en el tiempo." },
      { question: "¿Cómo se clasifican comúnmente según su plazo?", options: ["Fáciles y difíciles", "Corto, mediano y largo", "Nacionales e internacionales"], correctIndex: 1, explanation: "La clasificación se relaciona con el tiempo esperado." },
      { question: "¿Qué hace más clara una meta?", options: ["Que no tenga plazo", "Que sea específica, medible y con plazo", "Que dependa de la suerte"], correctIndex: 1, explanation: "Estos elementos ayudan a organizarla." },
    ],
  },
  {
    id: "presupuesto-emergencia",
    title: "Presupuesto y fondo de emergencia",
    level: "Principiante",
    duration: "5 min",
    objective: "Comprender qué es un presupuesto y para qué sirve un fondo de emergencia.",
    explanation:
      "Un presupuesto es una herramienta para organizar ingresos y gastos durante un período, por ejemplo un mes. Ayuda a comprender cuánto dinero entra, cuánto se utiliza y en qué categorías. Un fondo de emergencia es dinero reservado para gastos inesperados, como una reparación urgente o un imprevisto de salud. Se mantiene separado de gastos habituales para que esté disponible cuando se necesite. Son conceptos básicos de organización financiera; la forma de aplicarlos, los montos y los plazos dependen de la situación de cada persona.",
    keyIdeas: ["El presupuesto organiza ingresos y gastos.", "Un fondo de emergencia cubre imprevistos.", "Mantenerlo separado ayuda a disponer de él cuando se necesita.", "No existe un monto universal para todas las personas."],
    boundaries: ["No indica cuánto ahorrar.", "No recomienda dónde guardar un fondo.", "No diseña presupuestos personales."],
    coverageQuestions: ["qué es presupuesto", "para qué sirve fondo de emergencia", "por qué mantenerlo separado"],
    keywords: ["presupuesto", "gasto", "ingreso", "emergencia", "imprevisto", "fondo"],
    source: source("Módulo 4 · Sección 4"),
    quiz: [
      { question: "¿Qué es un presupuesto?", options: ["Solo gastos fijos", "Una herramienta para organizar ingresos y gastos", "Un producto financiero"], correctIndex: 1, explanation: "Considera ingresos y gastos de un período." },
      { question: "¿Cuál es el propósito de un fondo de emergencia?", options: ["Generar ganancias", "Cubrir gastos inesperados", "Reemplazar ingresos"], correctIndex: 1, explanation: "Está pensado para imprevistos." },
      { question: "¿Por qué se mantiene separado?", options: ["Para disponer de él sin afectar otras metas", "Porque es obligatorio por ley", "Porque no tiene función"], correctIndex: 0, explanation: "Ayuda a que esté disponible al necesitarlo." },
    ],
  },
];

export const tutorOutOfCoverageMessage =
  "No encontré información aprobada suficiente sobre este tema. Puedo derivar tu consulta para que un especialista continúe ayudándote.";
