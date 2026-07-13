import { NextRequest, NextResponse } from "next/server";

import { academyModules } from "@/lib/academy/approved-content";
import { revokeLearningInterest, saveLearningInterest } from "@/lib/academy/persistence";

export async function POST(request: NextRequest) {
  let body: { leadId?: unknown; moduleId?: unknown; learningPath?: unknown; quizScore?: unknown; consent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const academyModule = typeof body.moduleId === "string" ? academyModules.find((item) => item.id === body.moduleId) : undefined;
  const isInitialRoute = body.learningPath === "fundamentos-inversion";
  const quizScore = typeof body.quizScore === "number" ? Math.max(0, Math.min(3, body.quizScore)) : null;
  if (!leadId || (!academyModule && !isInitialRoute) || typeof body.consent !== "boolean") {
    return NextResponse.json({ error: "No se pudo registrar el interés educativo." }, { status: 400 });
  }

  const topic = isInitialRoute ? "Ruta guiada: Fundamentos de inversión" : academyModule!.title;

  try {
    if (body.consent) {
      if (quizScore === null) return NextResponse.json({ error: "No se pudo registrar el resultado educativo." }, { status: 400 });
      await saveLearningInterest({ leadId, topic, quizScore });
      return NextResponse.json({ saved: true });
    }

    await revokeLearningInterest({ leadId, topic });
    return NextResponse.json({ revoked: true });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el interés educativo." }, { status: 500 });
  }
}
