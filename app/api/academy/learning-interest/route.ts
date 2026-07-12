import { NextRequest, NextResponse } from "next/server";

import { academyModules } from "@/lib/academy/approved-content";
import { saveLearningInterest } from "@/lib/academy/persistence";

export async function POST(request: NextRequest) {
  let body: { leadId?: unknown; moduleId?: unknown; quizScore?: unknown; consent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const academyModule = typeof body.moduleId === "string" ? academyModules.find((item) => item.id === body.moduleId) : undefined;
  const quizScore = typeof body.quizScore === "number" ? Math.max(0, Math.min(3, body.quizScore)) : null;
  if (!leadId || !academyModule || quizScore === null || body.consent !== true) {
    return NextResponse.json({ error: "No se pudo registrar el interés educativo." }, { status: 400 });
  }

  try {
    await saveLearningInterest({ leadId, topic: academyModule.title, quizScore });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el interés educativo." }, { status: 500 });
  }
}
