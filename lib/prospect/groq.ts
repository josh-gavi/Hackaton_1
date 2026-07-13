import type { ChatMessage, ProspectProfile, ProspectStage } from "./types";
import { getQuestion } from "./scoring";

type GroqCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function requestGroq(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string,
  jsonMode: boolean = false
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  type GroqRequestBody = {
    model: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature: number;
    max_completion_tokens: number;
    response_format?: { type: "json_object" };
  };

  const body: GroqRequestBody = {
    model,
    messages,
    temperature: 0.35,
    max_completion_tokens: jsonMode ? 350 : 180,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(jsonMode ? 10_000 : 7_000), // Damos un poco más de tiempo para JSON
    });

    if (!response.ok) return null;
    const data = (await response.json()) as GroqCompletion;
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function extractProspectData({
  transcript,
  profile,
  stage,
}: {
  transcript: ChatMessage[];
  profile: ProspectProfile;
  stage: ProspectStage;
}): Promise<Partial<ProspectProfile> | null> {
  // Filtramos solo los mensajes del usuario para evitar que Groq se confunda con sus propias preguntas
  const userMessages = transcript.filter((msg) => msg.role === "user");
  const recentTranscript = userMessages.slice(-4);

  const systemPrompt = `Extrae únicamente los datos que el prospecto haya mencionado.
No inventes nada. Devuelve solamente JSON con esta estructura exacta:
{
  "fullName": null,
  "email": null,
  "leadType": null,
  "company": null,
  "companySize": null,
  "decisionRole": null,
  "objective": null,
  "experience": null,
  "budgetLabel": null,
  "budgetValue": null,
  "urgencyLabel": null,
  "urgencyScore": null,
  "interestLevel": null
}

Reglas:
- "me llamo Joshua Mero" o "Soy Joshua" -> fullName: "Joshua Mero" o "Joshua".
- Solo asigna leadType si el prospecto expresó claramente "es para mí", "para una empresa", "para mi negocio", "para mi equipo" o una idea equivalente. Nunca asumas B2C solo porque escribió su nombre o habla como una persona.
- Consulta explícita para sí mismo, familiar o persona -> leadType: "b2c".
- Consulta explícita para empresa, negocio, organización o equipo -> leadType: "b2b".
- Para B2B, extrae companySize cuando mencione el tamaño, empleados o colaboradores de la empresa.
- Para B2B, extrae decisionRole cuando indique si decide, participa en la decisión o solo investiga.
- "unos 400 dólares" -> budgetLabel: "$400", budgetValue: 400.
- "nunca he invertido" -> experience: "Sin experiencia".
- Deja interestLevel en null. La aplicación calcula ese puntaje de forma determinista a partir del objetivo confirmado.
- "el próximo mes" -> urgencyLabel: "El próximo mes", urgencyScore: 12.
- "aún no sé", "aun no se", "no sé cuándo podría", "todavía no lo sé" o "no estoy seguro" -> urgencyLabel: "Aún no lo sé", urgencyScore: 0.
- Si un dato no aparece explícitamente, usa null.
- Los datos ya confirmados no deben cambiarse. Solo devuelve fullName si aún no existe en el perfil o si el último mensaje dice explícitamente que está corrigiendo su nombre.

Etapa actual: ${stage}
Perfil ya confirmado: ${JSON.stringify(profile)}`;

  const content = await requestGroq(
    [
      { role: "system", content: systemPrompt },
      ...recentTranscript,
    ],
    process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant",
    true // Activamos jsonMode
  );

  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    // Si Groq falla en entregar un JSON válido, devolvemos null para que actúe el fallback
    return null;
  }
}

/**
 * La IA puede acompañar la conversación...
 */
export function composeAssistantMessage(
  acknowledgement: string | null,
  requiredQuestion: string,
): string {
  const cleanAcknowledgement = acknowledgement
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  if (!cleanAcknowledgement || /[¿?]/.test(cleanAcknowledgement)) {
    return requiredQuestion;
  }

  return `${cleanAcknowledgement} ${requiredQuestion}`;
}

export async function generateAssistantReply({
  transcript,
  nextStage,
  accepted,
  requiredQuestion,
}: {
  transcript: ChatMessage[];
  nextStage: ProspectStage;
  accepted: boolean;
  requiredQuestion?: string;
}): Promise<{ content: string; provider: "groq" | "guided" }> {
  if (!accepted) {
    const correction =
      nextStage === "email"
        ? "Ese correo no parece completo. Escríbelo con un formato como nombre@correo.com."
        : nextStage === "budget"
          ? "No logré identificar el monto. Puedes escribir una cifra aproximada o elegir uno de los rangos."
          : "No logré entender esa respuesta. ¿Puedes escribirla nuevamente?";
    return { content: correction, provider: "guided" };
  }

  const nextQuestion = requiredQuestion || getQuestion(nextStage);
  const recentTranscript = transcript.slice(-8);
  const content = await requestGroq(
    [
      {
        role: "system",
        content:
          "Eres Nexo, un orientador comercial financiero amable. Responde en español claro, sin recomendar productos ni dar asesoría de inversión. Devuelve SOLO una frase corta de reconocimiento de la última respuesta del prospecto. No hagas preguntas, no pidas datos, no propongas pasos y no uses Markdown.",
      },
      ...recentTranscript,
      {
        role: "user",
        content: "Escribe únicamente la frase breve de reconocimiento.",
      },
    ],
    process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant"
  );

  return {
    content: composeAssistantMessage(content, nextQuestion),
    provider: content ? "groq" : "guided",
  };
}

export async function generateLeadSummary(
  transcript: ChatMessage[],
  profile: ProspectProfile,
  totalScore: number,
): Promise<{ content: string; provider: "groq" | "guided" }> {
  const content = await requestGroq(
    [
      {
        role: "system",
        content:
          "Resume en español y en máximo 70 palabras el contexto comercial del prospecto. El objeto profile es la única fuente de verdad para objetivo, experiencia, presupuesto, plazo y puntuación: copia esos datos sin reinterpretarlos ni cambiarlos. No inventes datos, no recomiendes inversiones y no uses Markdown.",
      },
      {
        role: "user",
        content: JSON.stringify({ profile, totalScore, transcript }),
      },
    ],
    process.env.GROQ_SUMMARY_MODEL || "llama-3.3-70b-versatile",
  );

  if (content) return { content, provider: "groq" };

  return {
    provider: "guided",
    content: `${profile.fullName} busca ${profile.objective?.toLowerCase()}. Indica que ${profile.experience?.toLowerCase()}, considera ${profile.budgetLabel?.toLowerCase()} y desea comenzar ${profile.urgencyLabel?.toLowerCase()}. Obtuvo ${totalScore}/100 en la puntuación de prioridad.`,
  };
}
