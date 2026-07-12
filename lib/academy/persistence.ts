import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function saveLearningInterest({ leadId, topic, quizScore }: { leadId: string; topic: string; quizScore: number }) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("learning_interests").insert({
    lead_id: leadId,
    topic,
    quiz_score: quizScore,
    consent: true,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error("No se pudo guardar el interés educativo.");
}
