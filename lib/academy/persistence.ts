import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function saveLearningInterest({ leadId, topic, quizScore }: { leadId: string; topic: string; quizScore: number }) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("learning_interests")
    .select("id")
    .eq("lead_id", leadId)
    .eq("topic", topic)
    .order("created_at", { ascending: false });
  if (lookupError) throw new Error("No se pudo consultar el interés educativo.");

  const now = new Date().toISOString();
  const { error } = existing?.length
    ? await supabase
      .from("learning_interests")
      .update({ quiz_score: quizScore, consent: true, created_at: now })
      .eq("id", existing[0].id)
    : await supabase.from("learning_interests").insert({
      lead_id: leadId,
      topic,
      quiz_score: quizScore,
      consent: true,
      created_at: now,
    });
  if (error) throw new Error("No se pudo guardar el interés educativo.");

  if (existing && existing.length > 1) {
    const duplicateIds = existing.slice(1).map((record) => record.id);
    const { error: duplicateError } = await supabase.from("learning_interests").delete().in("id", duplicateIds);
    if (duplicateError) throw new Error("No se pudieron limpiar registros educativos duplicados.");
  }
}

export async function revokeLearningInterest({ leadId, topic }: { leadId: string; topic: string }) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("learning_interests")
    .delete()
    .eq("lead_id", leadId)
    .eq("topic", topic);
  if (error) throw new Error("No se pudo retirar la autorización educativa.");
}
