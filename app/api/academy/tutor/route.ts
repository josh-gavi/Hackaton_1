import { NextRequest, NextResponse } from "next/server";

import { tutorOutOfCoverageMessage } from "@/lib/academy/approved-content";
import { generateTutorAnswer } from "@/lib/academy/groq";
import { findAcademyModule } from "@/lib/academy/retrieval";
import type { AcademyLeadContext } from "@/lib/academy/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function getLead(leadId?: string): Promise<AcademyLeadContext | null> {
  if (!leadId) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("leads")
      .select("id, full_name, objective, experience")
      .eq("id", leadId)
      .maybeSingle();
    return data
      ? {
          id: data.id,
          fullName: data.full_name,
          objective: data.objective,
          experience: data.experience,
        }
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: { question?: unknown; moduleId?: unknown; leadId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const moduleId = typeof body.moduleId === "string" ? body.moduleId : undefined;
  const leadId = typeof body.leadId === "string" ? body.leadId : undefined;
  if (!question) return NextResponse.json({ error: "Escribe una pregunta para continuar." }, { status: 400 });

  const academyModule = findAcademyModule(question, moduleId);
  if (!academyModule) {
    return NextResponse.json({ covered: false, answer: tutorOutOfCoverageMessage });
  }

  const lead = await getLead(leadId);
  const answer = await generateTutorAnswer({ module: academyModule, question, lead });
  return NextResponse.json({
    covered: true,
    answer: answer.content,
    provider: answer.provider,
    module: { id: academyModule.id, title: academyModule.title, source: academyModule.source, quiz: academyModule.quiz },
  });
}
