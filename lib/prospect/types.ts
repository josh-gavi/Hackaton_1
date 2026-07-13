export type ChatRole = "assistant" | "user";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ProspectStage =
  | "name"
  | "lead_type"
  | "company"
  | "company_size"
  | "decision_role"
  | "objective"
  | "experience"
  | "budget"
  | "urgency"
  | "email"
  | "complete";

export type ProspectProfile = {
  fullName?: string;
  email?: string;
  leadType?: "b2b" | "b2c";
  company?: string;
  companySize?: string;
  decisionRole?: string;
  objective?: string;
  experience?: string;
  budgetLabel?: string;
  budgetValue?: number;
  urgencyLabel?: string;
  urgencyScore?: number;
  interestLevel?: number;
};

export type ScoreBreakdown = {
  interest: number;
  budget: number;
  profileFit: number;
  urgency: number;
  total: number;
  priority: "Baja" | "Media" | "Alta";
  explanation: string;
};

export type ChatResponse = {
  assistantMessage: string;
  profile: ProspectProfile;
  stage: ProspectStage;
  options: string[];
  completed: boolean;
  cancelled?: boolean;
  score: ScoreBreakdown | null;
  summary: string | null;
  persistence: {
    saved: boolean;
    leadId?: string;
    reason?: "not_configured" | "database_error";
  };
  aiProvider: "groq" | "guided";
};
