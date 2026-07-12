import { academyModules } from "./approved-content";
import type { AcademyModule } from "./types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function findAcademyModule(question: string, requestedId?: string): AcademyModule | null {
  const normalizedQuestion = normalize(question);
  const outOfCoverage = /\b(banco|entidad|producto|plataforma|criptomoneda|accion|acciones|fondo|rendimiento|ganar|recomiend|cuanto debo|cuanto invertir|donde guardar)\b/;
  if (outOfCoverage.test(normalizedQuestion)) return null;

  const ranked = academyModules
    .map((module) => ({
      module,
      score: module.keywords.reduce(
        (total, keyword) => total + (normalizedQuestion.includes(normalize(keyword)) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0]?.score) return ranked[0].module;

  const selected = requestedId ? academyModules.find((module) => module.id === requestedId) : undefined;
  const isGeneralLearningRequest = /\b(explica|explicame|ensen|aprend|introduccion|tema)\b/.test(normalizedQuestion);
  return selected && isGeneralLearningRequest ? selected : null;
}
