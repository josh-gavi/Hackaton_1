import type {
  ProspectProfile,
  ProspectStage,
  ScoreBreakdown,
} from "./types";

const OPTIONS: Partial<Record<ProspectStage, string[]>> = {
  lead_type: ["Es para mí", "Es para una empresa"],
  objective: [
    "Hacer crecer mis ahorros",
    "Aprender sobre inversiones",
    "Prepararme para la jubilación",
  ],
  experience: [
    "Soy principiante",
    "Tengo algo de experiencia",
    "Ya invierto actualmente",
  ],
  budget: ["Menos de $500", "$500 a $1.000", "Más de $1.000"],
  urgency: ["Este mes", "El próximo mes", "Aún no lo sé"],
};

export function getNextStage(profile: ProspectProfile): ProspectStage {
  if (!profile.fullName) return "name";
  if (!profile.leadType) return "lead_type";
  if (profile.leadType === "b2b" && !profile.company) return "company";
  if (!profile.objective) return "objective";
  if (!profile.experience) return "experience";
  if (profile.budgetValue === undefined) return "budget";
  if (profile.urgencyScore === undefined) return "urgency";
  if (!profile.email) return "email";
  return "complete";
}

export function getOptions(stage: ProspectStage): string[] {
  return OPTIONS[stage] ?? [];
}

export function getQuestion(stage: ProspectStage, name?: string): string {
  const firstName = name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `${firstName}, ` : "";

  const questions: Record<ProspectStage, string> = {
    name: "¡Hola! Soy Nexo. Para comenzar, ¿cómo te llamas?",
    lead_type: `${greeting}¿esta orientación es para ti o para una empresa?`,
    company: "¿Cuál es el nombre de la empresa?",
    objective: "¿Cuál es el principal objetivo que te gustaría alcanzar?",
    experience: "¿Qué experiencia tienes actualmente con inversiones?",
    budget: "¿Qué monto aproximado considerarías utilizar?",
    urgency: "¿Cuándo te gustaría comenzar?",
    email: "¿A qué correo podemos enviarte el resumen de tu orientación?",
    complete:
      "Gracias. Tu orientación está lista y ya puede continuar con el contexto correcto.",
  };

  return questions[stage];
}

function cleanText(value: string, maxLength = 180): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseBudget(answer: string): { label: string; value: number } | null {
  const normalized = answer.toLowerCase().replace(/\s/g, "");
  const amounts = [...normalized.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) =>
    Number(match[0].replace(".", "").replace(",", ".")),
  );

  if (normalized.includes("menos")) return { label: answer, value: 250 };
  if (normalized.includes("más") || normalized.includes("mas")) {
    return { label: answer, value: amounts[0] && amounts[0] > 1000 ? amounts[0] : 1500 };
  }
  if (amounts.length >= 2) {
    return { label: answer, value: Math.round((amounts[0] + amounts[1]) / 2) };
  }
  if (amounts.length === 1 && Number.isFinite(amounts[0])) {
    return { label: answer, value: amounts[0] };
  }
  return null;
}

function parseUrgency(answer: string): { label: string; score: number } {
  const normalized = answer.toLowerCase();
  if (normalized.includes("este mes") || normalized.includes("ahora")) {
    return { label: answer, score: 25 };
  }
  if (normalized.includes("próximo") || normalized.includes("proximo")) {
    return { label: answer, score: 20 };
  }
  if (normalized.includes("semana")) return { label: answer, score: 25 };
  if (normalized.includes("no") || normalized.includes("aún") || normalized.includes("aun")) {
    return { label: answer, score: 5 };
  }
  return { label: answer, score: 12 };
}

export function applyAnswer(
  current: ProspectProfile,
  stage: ProspectStage,
  rawAnswer: string,
): { profile: ProspectProfile; accepted: boolean } {
  const answer = cleanText(rawAnswer);
  if (!answer) return { profile: current, accepted: false };

  const profile = { ...current };

  switch (stage) {
    case "name":
      if (answer.length < 2 || /\d/.test(answer)) return { profile: current, accepted: false };
      profile.fullName = answer;
      break;
    case "lead_type":
      profile.leadType = /empresa|equipo|organización|organizacion|b2b/i.test(answer)
        ? "b2b"
        : "b2c";
      break;
    case "company":
      profile.company = answer;
      break;
    case "objective":
      profile.objective = answer;
      profile.interestLevel = /crecer|invert|jubil|ahorr|educación|educacion/i.test(answer)
        ? 25
        : 18;
      break;
    case "experience":
      profile.experience = answer;
      break;
    case "budget": {
      const budget = parseBudget(answer);
      if (!budget) return { profile: current, accepted: false };
      profile.budgetLabel = budget.label;
      profile.budgetValue = budget.value;
      break;
    }
    case "urgency": {
      const urgency = parseUrgency(answer);
      profile.urgencyLabel = urgency.label;
      profile.urgencyScore = urgency.score;
      break;
    }
    case "email": {
      const email = answer.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { profile: current, accepted: false };
      }
      profile.email = email;
      break;
    }
    case "complete":
      break;
  }

  return { profile, accepted: true };
}

export function calculateScore(profile: ProspectProfile): ScoreBreakdown {
  const interest = Math.min(25, Math.max(0, profile.interestLevel ?? 0));
  const budgetValue = profile.budgetValue ?? 0;
  const budget = budgetValue > 1000 ? 25 : budgetValue >= 500 ? 18 : budgetValue > 0 ? 10 : 0;
  const profileFit =
    (profile.leadType ? 8 : 0) +
    (profile.objective ? 10 : 0) +
    (profile.experience ? 7 : 0);
  const urgency = Math.min(25, Math.max(0, profile.urgencyScore ?? 0));
  const total = interest + budget + profileFit + urgency;
  const priority = total >= 70 ? "Alta" : total >= 40 ? "Media" : "Baja";

  return {
    interest,
    budget,
    profileFit,
    urgency,
    total,
    priority,
    explanation: `Interés ${interest}/25, presupuesto ${budget}/25, afinidad ${profileFit}/25 y urgencia ${urgency}/25.`,
  };
}
