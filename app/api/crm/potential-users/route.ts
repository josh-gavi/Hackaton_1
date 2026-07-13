import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type InternalRole = "administrador" | "executive";

function profileName(profile: unknown) {
  const item = Array.isArray(profile) ? profile[0] : profile;
  return item && typeof item === "object" && "nombre" in item && typeof item.nombre === "string"
    ? item.nombre
    : null;
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sesión no encontrada." }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authResult.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const { data: internalUser } = await supabase
    .from("users")
    .select("id, is_active, profiles(nombre)")
    .eq("id", authResult.user.id)
    .maybeSingle();
  const role = profileName(internalUser?.profiles) as InternalRole | null;
  if (!internalUser?.is_active || (role !== "administrador" && role !== "executive")) {
    return NextResponse.json({ error: "No tienes acceso a esta información." }, { status: 403 });
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("prospect_accounts")
    .select("id, lead_id, email, status, created_at")
    .order("created_at", { ascending: false });
  if (accountsError) return NextResponse.json({ error: "No pudimos cargar los usuarios potenciales." }, { status: 500 });

  const leadIds = (accounts ?? []).map((account) => account.lead_id);
  const { data: leads } = leadIds.length
    ? await supabase
      .from("leads")
      .select("id, full_name, status, assigned_user_id")
      .in("id", leadIds)
    : { data: [] as Array<{ id: string; full_name: string | null; status: string | null; assigned_user_id: string | null }> };

  const visibleLeads = (leads ?? []).filter(
    (lead) => role === "administrador" || lead.assigned_user_id === internalUser.id,
  );
  const visibleLeadIds = new Set(visibleLeads.map((lead) => lead.id));
  const advisorIds = [...new Set(visibleLeads.map((lead) => lead.assigned_user_id).filter(Boolean))] as string[];
  const { data: advisors } = advisorIds.length
    ? await supabase.from("users").select("id, full_name").in("id", advisorIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };
  const advisorNames = new Map((advisors ?? []).map((advisor) => [advisor.id, advisor.full_name]));
  const leadById = new Map(visibleLeads.map((lead) => [lead.id, lead]));

  return NextResponse.json({
    accounts: (accounts ?? [])
      .filter((account) => visibleLeadIds.has(account.lead_id))
      .map((account) => {
        const lead = leadById.get(account.lead_id)!;
        return {
          id: account.id,
          leadId: account.lead_id,
          email: account.email,
          accountStatus: account.status,
          createdAt: account.created_at,
          leadName: lead.full_name,
          leadStatus: lead.status,
          advisorName: lead.assigned_user_id ? advisorNames.get(lead.assigned_user_id) ?? null : null,
        };
      }),
  });
}
