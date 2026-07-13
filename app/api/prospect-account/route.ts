import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getBearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function POST(request: NextRequest) {
  let body: { leadId?: unknown; authUserId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  if (typeof body.leadId !== "string" || typeof body.authUserId !== "string") {
    return NextResponse.json({ error: "Faltan los datos de la cuenta." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(body.authUserId);
  const authUser = authResult.user;
  if (authError || !authUser) {
    return NextResponse.json({ error: "No pudimos validar la cuenta creada." }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, email")
    .eq("id", body.leadId)
    .maybeSingle();

  const claimedLeadId = authUser.user_metadata?.lead_id;
  const sameEmail = lead?.email?.toLowerCase() === authUser.email?.toLowerCase();
  if (leadError || !lead || claimedLeadId !== body.leadId || !sameEmail) {
    return NextResponse.json({ error: "La cuenta debe usar el correo registrado en la orientación." }, { status: 403 });
  }

  const { error: accountError } = await supabase
    .from("prospect_accounts")
    .upsert(
      {
        lead_id: lead.id,
        auth_user_id: authUser.id,
        email: lead.email,
        status: authUser.email_confirmed_at ? "active" : "pending_verification",
      },
      { onConflict: "lead_id" },
    );

  if (accountError) {
    return NextResponse.json({ error: "No pudimos registrar tu cuenta de seguimiento." }, { status: 500 });
  }

  await supabase.auth.admin.updateUserById(authUser.id, {
    app_metadata: { ...authUser.app_metadata, role: "prospect" },
  });

  return NextResponse.json({ ok: true, needsEmailConfirmation: !authUser.email_confirmed_at });
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: "Inicia sesión para ver tu seguimiento." }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser(token);
  const authUser = authResult.user;
  if (authError || !authUser) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const { data: account, error: accountError } = await supabase
    .from("prospect_accounts")
    .select("lead_id, email, status, created_at")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (accountError || !account) return NextResponse.json({ error: "No encontramos una cuenta de seguimiento vinculada." }, { status: 404 });

  if (authUser.email_confirmed_at && account.status !== "active") {
    await supabase.from("prospect_accounts").update({ status: "active" }).eq("lead_id", account.lead_id);
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, full_name, objective, status, assigned_user_id")
    .eq("id", account.lead_id)
    .maybeSingle();
  if (leadError || !lead) return NextResponse.json({ error: "No encontramos tu orientación." }, { status: 404 });

  let advisorName: string | null = null;
  if (lead.assigned_user_id) {
    const { data: advisor } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", lead.assigned_user_id)
      .maybeSingle();
    advisorName = advisor?.full_name ?? null;
  }

  const { data: updates } = await supabase
    .from("client_updates")
    .select("id, message, created_at")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    account: { ...account, status: authUser.email_confirmed_at ? "active" : account.status },
    lead: { ...lead, advisorName },
    updates: updates ?? [],
  });
}
