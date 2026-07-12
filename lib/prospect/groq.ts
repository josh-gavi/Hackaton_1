import type { ChatMessage, ProspectProfile, ProspectStage } from "./types";
import { getQuestion } from "./scoring";

type GroqCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function requestGroq(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string,
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.35,
        max_completion_tokens: 180,
      }),
      signal: AbortSignal.timeout(7_000),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as GroqCompletion;
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * La IA puede acompañar la conversación, pero el orden de preguntas pertenece
 * al flujo de producto. Así una respuesta creativa nunca cambia de etapa.
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
  profile,
  nextStage,
  accepted,
}: {
  transcript: ChatMessage[];
  profile: ProspectProfile;
  nextStage: ProspectStage;
  accepted: boolean;
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

  const requiredQuestion = getQuestion(nextStage, profile.fullName);
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
    process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant",
  );

  return {
    content: composeAssistantMessage(content, requiredQuestion),
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
          "Resume en español y en máximo 70 palabras el contexto comercial del prospecto. Incluye objetivo, experiencia, presupuesto, plazo y puntuación. No inventes datos, no recomiendes inversiones y no uses Markdown.",
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
