export type LeadStatus =
  | "nuevo"
  | "calificado"
  | "en_seguimiento"
  | "interesado"
  | "cliente"
  | "descartado";

export type LeadPriority = "baja" | "media" | "alta";
export type LeadType = "b2b" | "b2c";

export type Lead = {
  id: string;
  assigned_user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  lead_type: LeadType | null;
  budget: number | null;
  urgency: number | null;
  interest_level: number | null;
  lead_score: number | null;
  status: LeadStatus | null;
  created_at: string;
  updated_at: string;
};

/** Esquema actual: una conversación completa se guarda como JSONB. */
export type Conversation = {
  id: string;
  lead_id: string;
  summary: string | null;
  conversation_json: unknown | null;
  created_at: string | null;
};

export type LearningInterest = {
  id: number;
  lead_id: string;
  topic: string | null;
  quiz_score: number | null;
  consent: boolean | null;
  created_at: string | null;
};

export type Opportunity = {
  id: number;
  lead_id: string;
  stage: string | null;
  probability: number | null;
  estimated_value: number | null;
  created_at: string | null;
};

export type FollowUp = {
  id: number;
  lead_id: string | null;
  reviewed_by: string | null;
  ai_summary: string | null;
  objections: string | null;
  recommended_action: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

export type CommercialAction = {
  id: number;
  lead_id: string | null;
  user_id: string | null;
  action_type: string | null;
  description: string | null;
  executed_at: string;
};
