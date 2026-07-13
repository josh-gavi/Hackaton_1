import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProspectStage } from "./types";

export type QualificationSettings = {
  highPriorityThreshold: number;
  mediumPriorityThreshold: number;
  questions: Partial<Record<ProspectStage, string>>;
};

export const defaultQualificationSettings: QualificationSettings = {
  highPriorityThreshold: 70,
  mediumPriorityThreshold: 40,
  questions: {
    company_size: "¿Aproximadamente cuántas personas trabajan en la empresa?",
    decision_role: "¿Cuál es tu participación en la decisión de contratar una solución?",
  },
};

export async function getQualificationSettings(): Promise<QualificationSettings> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("qualification_settings")
      .select("high_priority_threshold, medium_priority_threshold, b2b_company_size_question, b2b_decision_role_question")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data || data.medium_priority_threshold >= data.high_priority_threshold) return defaultQualificationSettings;
    return {
      highPriorityThreshold: data.high_priority_threshold,
      mediumPriorityThreshold: data.medium_priority_threshold,
      questions: {
        company_size: data.b2b_company_size_question,
        decision_role: data.b2b_decision_role_question,
      },
    };
  } catch {
    return defaultQualificationSettings;
  }
}
