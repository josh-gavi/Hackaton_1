import type {
  ProspectProfile,
  ProspectStage,
  ScoreBreakdown,
} from "./types";

const OPTIONS: Partial<Record<ProspectStage, string[]>> = {
  lead_type: ["Es para mí", "Es para una empresa"],
  company_size: ["1 a 20 personas", "21 a 100 personas", "Más de 100 personas"],
  decision_role: ["Tomo la decisión", "Participo en la decisión", "Solo estoy investigando"],
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
  if (profile.leadType === "b2b" && !profile.companySize) return "company_size";
  if (profile.leadType === "b2b" && !profile.decisionRole) return "decision_role";
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

export function getQuestion(stage: ProspectStage, configuredQuestions?: Partial<Record<ProspectStage, string>>): string {
  const questions: Record<ProspectStage, string> = {
    name: "¡Hola! Soy Nexo. Para comenzar, ¿cómo te llamas?",
    lead_type: "¿Esta orientación es para ti o para una empresa?",
    company: "¿Cuál es el nombre de la empresa?",
    company_size: "¿Aproximadamente cuántas personas trabajan en la empresa?",
    decision_role: "¿Cuál es tu participación en la decisión de contratar una solución?",
    objective: "¿Cuál es el principal objetivo que te gustaría alcanzar?",
    experience: "¿Qué experiencia tienes actualmente con inversiones?",
    budget: "¿Qué monto aproximado considerarías utilizar?",
    urgency: "¿Cuándo te gustaría comenzar?",
    email: "¿A qué correo podemos enviarte el resumen de tu orientación?",
    complete:
      "Gracias. Tu orientación está lista y ya puede continuar con el contexto correcto.",
  };

  return configuredQuestions?.[stage] || questions[stage];
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
    return { label: answer, score: 12 };
  }
  if (normalized.includes("semana")) return { label: answer, score: 25 };
  if (normalized.includes("no") || normalized.includes("aún") || normalized.includes("aun")) {
    return { label: answer, score: 0 };
  }
  return { label: answer, score: 6 };
}

function normalizeForScore(value?: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreInterest(objective?: string): number {
  const normalized = normalizeForScore(objective);
  if (!normalized) return 0;
  if (/solo.*(explor|investig)|curios|informacion|todavia no se|aun no se/.test(normalized)) return 8;
  if (/aprender|educacion|entender|conocer/.test(normalized)) return 12;
  if (/invert|crecer|rentab|portafolio|generar ingresos/.test(normalized)) return 20;
  if (/jubil|casa|vivienda|auto|vehiculo|ahorr/.test(normalized)) return 16;
  return 10;
}

function scoreBudget(value?: number): number {
  if (!value || value <= 0) return 0;
  if (value > 1000) return 25;
  if (value >= 500) return 14;
  return 5;
}

function scoreExperience(experience?: string): number {
  const normalized = normalizeForScore(experience);
  if (!normalized) return 0;
  if (/nunca|sin experiencia|principiante/.test(normalized)) return 2;
  if (/algo de experiencia|algo relacionado|intermedio/.test(normalized)) return 6;
  if (/ya invierto|invierto actualmente|avanzad|experiencia/.test(normalized)) return 10;
  return 4;
}

function scoreCompanySize(companySize?: string): number {
  const normalized = normalizeForScore(companySize);
  if (/mas de 100|100\+|cientos/.test(normalized)) return 5;
  if (/21\s*(a|-)?\s*100|mediana/.test(normalized)) return 3;
  if (normalized) return 1;
  return 0;
}

function scoreDecisionRole(decisionRole?: string): number {
  const normalized = normalizeForScore(decisionRole);
  if (/solo.*investig|solo.*inform|no.*decid/.test(normalized)) return 1;
  if (/particip/.test(normalized)) return 6;
  if (/tomo|decid/.test(normalized)) return 10;
  return 0;
}

function scoreProfileFit(profile: ProspectProfile): number {
  const base = profile.leadType ? 5 : 0;
  const experience = scoreExperience(profile.experience);
  if (profile.leadType !== "b2b") return Math.min(25, base + experience);

  return Math.min(
    25,
    base + experience + scoreCompanySize(profile.companySize) + scoreDecisionRole(profile.decisionRole),
  );
}

function scoreUrgency(label?: string): number {
  const normalized = normalizeForScore(label);
  if (!normalized) return 0;
  if (/este mes|ahora|semana/.test(normalized)) return 25;
  if (/proximo/.test(normalized)) return 12;
  if (/no se|aun|todavia|no estoy seguro/.test(normalized)) return 0;
  return 6;
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
    case "company_size":
      profile.companySize = answer;
      break;
    case "decision_role":
      profile.decisionRole = answer;
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

export function calculateScore(profile: ProspectProfile, thresholds: { highPriorityThreshold: number; mediumPriorityThreshold: number } = { highPriorityThreshold: 70, mediumPriorityThreshold: 40 }): ScoreBreakdown {
  // Los cuatro factores se derivan de las respuestas estructuradas, no de un
  // valor que el modelo de IA pueda sobrestimar. Esto mantiene la prioridad
  // consistente y deja espacio real para leads de prioridad baja y media.
  const interest = scoreInterest(profile.objective);
  const budget = scoreBudget(profile.budgetValue);
  const profileFit = scoreProfileFit(profile);
  const urgency = scoreUrgency(profile.urgencyLabel);
  const total = interest + budget + profileFit + urgency;
  const priority = total >= thresholds.highPriorityThreshold ? "Alta" : total >= thresholds.mediumPriorityThreshold ? "Media" : "Baja";

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
  if (normalized.includes("próximo") || normalized.includes("proximo")) return 12;
  if (normalized.includes("no sé") || normalized.includes("no se") || normalized.includes("aún") || normalized.includes("aun")) return 0;
  return 6;
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

  if (extracted.companySize && typeof extracted.companySize === "string") {
    profile.companySize = extracted.companySize.trim();
  }

  if (extracted.decisionRole && typeof extracted.decisionRole === "string") {
    profile.decisionRole = extracted.decisionRole.trim();
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
