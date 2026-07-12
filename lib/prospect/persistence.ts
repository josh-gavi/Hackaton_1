import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ChatMessage, ProspectProfile, ScoreBreakdown } from "./types";

export async function persistProspect({
  messages,
  profile,
  score,
  summary,
}: {
  messages: ChatMessage[];
  profile: ProspectProfile;
  score: ScoreBreakdown;
  summary: string;
}): Promise<{ saved: boolean; leadId?: string; reason?: "not_configured" | "database_error" }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { saved: false, reason: "not_configured" };
  }

  const supabase = createSupabaseAdminClient();
  const status = score.total >= 70 ? "calificado" : score.total >= 40 ? "interesado" : "nuevo";

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      assigned_user_id: null,
      full_name: profile.fullName,
      email: profile.email,
      company: profile.company ?? null,
      lead_type: profile.leadType,
      budget: profile.budgetValue,
      urgency: score.urgency,
      interest_level: score.interest,
      lead_score: score.total,
      status,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("No se pudo guardar el lead en Supabase.", leadError?.message);
    return { saved: false, reason: "database_error" };
  }

  const { error: conversationError } = await supabase.from("conversations").insert({
    lead_id: lead.id,
    summary,
    conversation_json: messages,
  });

  if (conversationError) {
    console.error("No se pudo guardar la conversación en Supabase.", conversationError.message);
    await supabase.from("leads").delete().eq("id", lead.id);
    return { saved: false, reason: "database_error" };
  }

  return { saved: true, leadId: lead.id };
}
