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

export function getQuestion(stage: ProspectStage): string {
  const questions: Record<ProspectStage, string> = {
    name: "¡Hola! Soy Nexo. Para comenzar, ¿cómo te llamas?",
    lead_type: "¿Esta orientación es para ti o para una empresa?",
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
      if (/\bb2b\b|empresa|equipo|organizaci(?:ón|on)/i.test(answer)) {
        profile.leadType = "b2b";
      } else if (/\bb2c\b|para m[ií]|personal|persona|consumidor/i.test(answer)) {
        profile.leadType = "b2c";
      } else {
        return { profile: current, accepted: false };
      }
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

function inferInterestLevel(objective: string): number {
  return /crecer|invert|jubil|ahorr|educación|educacion|casa|vivienda|domicilio|hogar|auto|vehículo|vehiculo|finanzas|dinero/i.test(objective)
    ? 25
    : 18;
}

function inferUrgencyScore(label: string): number {
  const normalized = label.toLowerCase();
  if (normalized.includes("este mes") || normalized.includes("ahora") || normalized.includes("semana")) return 25;
  if (normalized.includes("próximo") || normalized.includes("proximo")) return 20;
  if (normalized.includes("no sé") || normalized.includes("no se") || normalized.includes("aún") || normalized.includes("aun")) return 5;
  return 12;
}

function validScore(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(25, value))
    : undefined;
}

export function mergeProspectProfile(
  current: ProspectProfile,
  extracted: Partial<ProspectProfile>
): ProspectProfile {
  const profile = { ...current };

  // El nombre se confirma una sola vez. Así un mensaje posterior no puede
  // convertir una palabra común en un nuevo nombre del prospecto.
  if (!profile.fullName && extracted.fullName && typeof extracted.fullName === "string") {
    const cleanName = extracted.fullName.trim();
    if (cleanName.length >= 2 && !/\d/.test(cleanName)) {
      profile.fullName = cleanName;
    }
  }

  // 2. Validar email
  if (extracted.email && typeof extracted.email === "string") {
    const cleanEmail = extracted.email.toLowerCase().trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      profile.email = cleanEmail;
    }
  }

  // 3. Validar leadType
  if (extracted.leadType === "b2b" || extracted.leadType === "b2c") {
    profile.leadType = extracted.leadType;
  }

  // 4. Strings básicos (Company, Objective, Experience, Labels)
  if (extracted.company && typeof extracted.company === "string") {
    profile.company = extracted.company.trim();
  }

  if (extracted.objective && typeof extracted.objective === "string") {
    profile.objective = extracted.objective.trim();
  }

  if (extracted.experience && typeof extracted.experience === "string") {
    profile.experience = extracted.experience.trim();
  }

  if (extracted.budgetLabel && typeof extracted.budgetLabel === "string") {
    profile.budgetLabel = extracted.budgetLabel.trim();
  }

  if (extracted.urgencyLabel && typeof extracted.urgencyLabel === "string") {
    profile.urgencyLabel = extracted.urgencyLabel.trim();
  }

  // 5. Validar números
  if (typeof extracted.budgetValue === "number" && extracted.budgetValue >= 0) {
    profile.budgetValue = extracted.budgetValue;
  }

  const urgencyScore = validScore(extracted.urgencyScore);
  if (urgencyScore !== undefined) {
    profile.urgencyScore = urgencyScore;
  } else if (extracted.urgencyLabel && typeof extracted.urgencyLabel === "string") {
    profile.urgencyScore = inferUrgencyScore(extracted.urgencyLabel);
  }

  const interestLevel = validScore(extracted.interestLevel);
  if (interestLevel !== undefined) {
    profile.interestLevel = interestLevel;
  } else if (extracted.objective && typeof extracted.objective === "string") {
    profile.interestLevel = inferInterestLevel(extracted.objective);
  }

  return profile;
}
