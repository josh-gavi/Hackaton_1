import "server-only";

import type { AcademyLeadContext, AcademyModule } from "./types";

export async function generateTutorAnswer({ module, question, lead }: { module: AcademyModule; question: string; lead: AcademyLeadContext | null }) {
  const fallback = module.explanation;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { content: fallback, provider: "approved_content" as const };

  const context = lead
    ? `La persona se llama ${lead.fullName ?? "la persona"}, su objetivo es ${lead.objective ?? "no indicado"} y su experiencia es ${lead.experience ?? "no indicada"}.`
    : "No hay contexto comercial disponible.";
  const prompt = `Eres el Tutor de Futuro Academy. Responde en español simple, máximo 120 palabras. ${context}

Usa exclusivamente este contenido aprobado:
${module.explanation}

Ideas clave: ${module.keyIdeas.join(" | ")}
Límites: ${module.boundaries.join(" | ")}

Pregunta: ${question}

No recomiendes productos, bancos, instrumentos, montos ni rendimientos. No inventes información. No menciones fuentes: la interfaz las muestra.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_TUTOR_MODEL || process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [{ role: "system", content: prompt }],
      }),
    });
    if (!response.ok) throw new Error("Groq no respondió");
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    return { content: content || fallback, provider: "groq" as const };
  } catch {
    return { content: fallback, provider: "approved_content" as const };
  }
}
