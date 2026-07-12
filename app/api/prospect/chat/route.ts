import { NextResponse } from "next/server";

import { generateAssistantReply, generateLeadSummary } from "@/lib/prospect/groq";
import {
  applyAnswer,
  calculateScore,
  getNextStage,
  getOptions,
} from "@/lib/prospect/scoring";
import { persistProspect } from "@/lib/prospect/persistence";
import type { ChatMessage, ProspectProfile, ProspectStage } from "@/lib/prospect/types";

export const runtime = "nodejs";

function validMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length <= 30 &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as ChatMessage).role !== undefined &&
        ["assistant", "user"].includes((item as ChatMessage).role) &&
        typeof (item as ChatMessage).content === "string" &&
        (item as ChatMessage).content.length <= 500,
    )
  );
}

function safeProfile(value: unknown): ProspectProfile {
  if (typeof value !== "object" || value === null) return {};
  const input = value as ProspectProfile;
  return {
    fullName: typeof input.fullName === "string" ? input.fullName.slice(0, 120) : undefined,
    email: typeof input.email === "string" ? input.email.slice(0, 180) : undefined,
    leadType: input.leadType === "b2b" || input.leadType === "b2c" ? input.leadType : undefined,
    company: typeof input.company === "string" ? input.company.slice(0, 160) : undefined,
    objective: typeof input.objective === "string" ? input.objective.slice(0, 240) : undefined,
    experience: typeof input.experience === "string" ? input.experience.slice(0, 180) : undefined,
    budgetLabel: typeof input.budgetLabel === "string" ? input.budgetLabel.slice(0, 120) : undefined,
    budgetValue: typeof input.budgetValue === "number" ? Math.max(0, Math.min(input.budgetValue, 1_000_000_000)) : undefined,
    urgencyLabel: typeof input.urgencyLabel === "string" ? input.urgencyLabel.slice(0, 120) : undefined,
    urgencyScore: typeof input.urgencyScore === "number" ? Math.max(0, Math.min(input.urgencyScore, 25)) : undefined,
    interestLevel: typeof input.interestLevel === "number" ? Math.max(0, Math.min(input.interestLevel, 25)) : undefined,
  };
}

export async function POST(request: Request) {
  let body: { messages?: unknown; profile?: unknown; stage?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  if (!validMessages(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "La conversación no es válida." }, { status: 400 });
  }

  const currentStage = body.stage as ProspectStage;
  const allowedStages: ProspectStage[] = [
    "name",
    "lead_type",
    "company",
    "objective",
    "experience",
    "budget",
    "urgency",
    "email",
  ];
  if (!allowedStages.includes(currentStage)) {
    return NextResponse.json({ error: "La etapa de conversación no es válida." }, { status: 400 });
  }

  const currentProfile = safeProfile(body.profile);
  const lastMessage = body.messages.at(-1);
  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json({ error: "Falta el mensaje del prospecto." }, { status: 400 });
  }

  const result = applyAnswer(currentProfile, currentStage, lastMessage.content);
  const nextStage = result.accepted ? getNextStage(result.profile) : currentStage;
  const completed = nextStage === "complete";
  const reply = await generateAssistantReply({
    transcript: body.messages,
    profile: result.profile,
    nextStage,
    accepted: result.accepted,
  });

  let score = null;
  let summary = null;
  let persistence: {
    saved: boolean;
    leadId?: string;
    reason?: "not_configured" | "database_error";
  } = { saved: false, reason: "not_configured" };
  let provider = reply.provider;

  if (completed) {
    score = calculateScore(result.profile);
    const generatedSummary = await generateLeadSummary(
      [...body.messages, { role: "assistant", content: reply.content }],
      result.profile,
      score.total,
    );
    summary = generatedSummary.content;
    if (generatedSummary.provider === "groq") provider = "groq";
    persistence = await persistProspect({
      messages: [...body.messages, { role: "assistant", content: reply.content }],
      profile: result.profile,
      score,
      summary,
    });
  }

  return NextResponse.json({
    assistantMessage: reply.content,
    profile: result.profile,
    stage: nextStage,
    options: getOptions(nextStage),
    completed,
    score,
    summary,
    persistence,
    aiProvider: provider,
  });
}
