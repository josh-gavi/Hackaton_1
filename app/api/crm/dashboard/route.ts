import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const LEAD_STATUSES = ["nuevo", "calificado", "en_seguimiento", "interesado", "cliente", "descartado"] as const;
type InternalRole = "administrador" | "executive";

function getProfileName(profile: unknown): string | null {
  const item = Array.isArray(profile) ? profile[0] : profile;
  return item && typeof item === "object" && "nombre" in item && typeof item.nombre === "string"
    ? item.nombre
    : null;
}

async function getInternalAccess(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Sesión no encontrada.", status: 401 as const };

  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return { error: "Sesión no válida.", status: 401 as const };

  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, is_active, profiles(nombre)")
    .eq("id", authData.user.id)
    .maybeSingle();
  const role = getProfileName(user?.profiles) as InternalRole | null;
  if (!user?.is_active || (role !== "administrador" && role !== "executive")) {
    return { error: "No tienes acceso al CRM.", status: 403 as const };
  }

  return { supabase, user: { id: user.id as string, fullName: user.full_name as string | null, role } };
}

function recommendation(score: number | null, academyCompleted: boolean, status: string | null) {
  if (status === "nuevo") return "Revisar la información y calificar el lead";
  if (status === "calificado") return academyCompleted ? "Iniciar seguimiento con el prospecto" : "Invitar a completar Futuro Academy";
  if (status === "en_seguimiento") return "Registrar el próximo contacto o una reunión";
  if (status === "interesado") return "Agendar una reunión introductoria";
  if (status === "cliente") return "Acompañar la incorporación del cliente";
  if (status === "descartado") return "No se requieren nuevas acciones";
  if ((score ?? 0) >= 70 && academyCompleted) return "Agendar una reunión introductoria";
  return "Enviar material educativo";
}

export async function GET(request: NextRequest) {
  const access = await getInternalAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let leadsQuery = access.supabase
    .from("leads")
    .select("id, assigned_user_id, full_name, email, company, company_size, decision_role, lead_type, objective, experience, budget, urgency_label, lead_score, status, created_at")
    .order("lead_score", { ascending: false })
    .order("created_at", { ascending: false });
  if (access.user.role === "executive") leadsQuery = leadsQuery.eq("assigned_user_id", access.user.id);

  const [leadsResult, executivesResult] = await Promise.all([
    leadsQuery,
    access.supabase.from("users").select("id, full_name, is_active, profiles(nombre)").eq("is_active", true),
  ]);
  if (leadsResult.error) return NextResponse.json({ error: "No pudimos cargar los leads." }, { status: 500 });

  const leads = leadsResult.data ?? [];
  const leadIds = leads.map((lead) => lead.id);
  const [conversationsResult, interestsResult, actionsResult] = leadIds.length
    ? await Promise.all([
      access.supabase.from("conversations").select("lead_id, summary, created_at").in("lead_id", leadIds).order("created_at", { ascending: false }),
      access.supabase.from("learning_interests").select("lead_id, topic, quiz_score, consent, created_at").in("lead_id", leadIds).eq("consent", true).order("created_at", { ascending: false }),
      access.supabase.from("commercial_actions").select("lead_id, action_type, description, executed_at").in("lead_id", leadIds).order("executed_at", { ascending: false }),
    ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const summaryByLead = new Map<string, string>();
  for (const conversation of conversationsResult.data ?? []) {
    if (!summaryByLead.has(conversation.lead_id)) summaryByLead.set(conversation.lead_id, conversation.summary ?? "");
  }
  const academyByLead = new Map<string, { topic: string | null; quizScore: number | null; completedAt: string | null }>();
  for (const interest of interestsResult.data ?? []) {
    if (!academyByLead.has(interest.lead_id)) {
      academyByLead.set(interest.lead_id, { topic: interest.topic, quizScore: interest.quiz_score, completedAt: interest.created_at });
    }
  }
  const actionsByLead = new Map<string, Array<{ actionType: string | null; description: string | null; executedAt: string | null }>>();
  for (const action of actionsResult.data ?? []) {
    const current = actionsByLead.get(action.lead_id) ?? [];
    current.push({ actionType: action.action_type, description: action.description, executedAt: action.executed_at });
    actionsByLead.set(action.lead_id, current);
  }

  const executives = (executivesResult.data ?? [])
    .filter((user) => getProfileName(user.profiles) === "executive")
    .map((user) => ({ id: user.id, fullName: user.full_name || "Ejecutivo" }));
  const dashboardLeads = leads.map((lead) => {
    const academy = academyByLead.get(lead.id);
    return {
      ...lead,
      summary: summaryByLead.get(lead.id) ?? "Sin resumen disponible.",
      academy,
      actions: actionsByLead.get(lead.id) ?? [],
      recommendedAction: recommendation(lead.lead_score, Boolean(academy), lead.status),
    };
  });
  const academyCompleted = dashboardLeads.filter((lead) => lead.academy).length;
  const metrics = {
    totalLeads: dashboardLeads.length,
    highPriority: dashboardLeads.filter((lead) => (lead.lead_score ?? 0) >= 70).length,
    inFollowUp: dashboardLeads.filter((lead) => lead.status === "en_seguimiento").length,
    newLeads: dashboardLeads.filter((lead) => lead.status === "nuevo").length,
    academyCompleted,
    academyRate: dashboardLeads.length ? Math.round((academyCompleted / dashboardLeads.length) * 100) : 0,
    activeExecutives: executives.length,
  };

  return NextResponse.json({ role: access.user.role, leads: dashboardLeads, executives, metrics });
}

export async function PATCH(request: NextRequest) {
  const access = await getInternalAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: { leadId?: unknown; status?: unknown; assignedUserId?: unknown; decision?: unknown; decisionNote?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  if (typeof body.leadId !== "string") return NextResponse.json({ error: "Selecciona un lead válido." }, { status: 400 });

  const { data: lead } = await access.supabase
    .from("leads")
    .select("id, assigned_user_id, status")
    .eq("id", body.leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead no encontrado." }, { status: 404 });
  if (access.user.role === "executive" && lead.assigned_user_id !== access.user.id) {
    return NextResponse.json({ error: "Solo puedes actualizar tus propios leads." }, { status: 403 });
  }

  if (body.decision === "approved" || body.decision === "rejected" || body.decision === "edited") {
    const note = typeof body.decisionNote === "string" ? body.decisionNote.trim().slice(0, 500) : "";
    if (body.decision === "edited" && !note) {
      return NextResponse.json({ error: "Escribe la acción modificada antes de guardarla." }, { status: 400 });
    }
    const labels = { approved: "Acción sugerida aprobada", rejected: "Acción sugerida rechazada", edited: "Acción sugerida editada" };
    const { error } = await access.supabase.from("commercial_actions").insert({
      lead_id: lead.id,
      user_id: access.user.id,
      action_type: "decisión humana",
      description: `${labels[body.decision]}${note ? `: ${note}` : "."}`,
    });
    if (error) return NextResponse.json({ error: "No se pudo guardar la decisión." }, { status: 500 });
    return NextResponse.json({ ok: true, action: "decision" });
  }

  if (typeof body.status === "string") {
    if (!LEAD_STATUSES.includes(body.status as (typeof LEAD_STATUSES)[number])) {
      return NextResponse.json({ error: "Estado no permitido." }, { status: 400 });
    }
    const { error } = await access.supabase.from("leads").update({ status: body.status }).eq("id", lead.id);
    if (error) return NextResponse.json({ error: "No se pudo actualizar el seguimiento." }, { status: 500 });
    await access.supabase.from("commercial_actions").insert({
      lead_id: lead.id,
      user_id: access.user.id,
      action_type: "actualización de seguimiento",
      description: `Estado cambiado de ${lead.status ?? "sin estado"} a ${body.status}.`,
    });
    return NextResponse.json({ ok: true, action: "status" });
  }

  if (typeof body.assignedUserId === "string") {
    if (access.user.role !== "administrador") {
      return NextResponse.json({ error: "Solo un administrador puede reasignar leads." }, { status: 403 });
    }
    const { data: executive } = await access.supabase
      .from("users")
      .select("id, is_active, profiles(nombre)")
      .eq("id", body.assignedUserId)
      .maybeSingle();
    if (!executive?.is_active || getProfileName(executive.profiles) !== "executive") {
      return NextResponse.json({ error: "Selecciona un ejecutivo activo." }, { status: 400 });
    }
    const { error } = await access.supabase.from("leads").update({ assigned_user_id: executive.id }).eq("id", lead.id);
    if (error) return NextResponse.json({ error: "No se pudo reasignar el lead." }, { status: 500 });
    await access.supabase.from("commercial_actions").insert({
      lead_id: lead.id,
      user_id: access.user.id,
      action_type: "reasignación",
      description: "Lead reasignado a un ejecutivo activo.",
    });
    return NextResponse.json({ ok: true, action: "assignment" });
  }

  return NextResponse.json({ error: "Indica un cambio de estado o una reasignación." }, { status: 400 });
}
