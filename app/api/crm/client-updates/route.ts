import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function profileName(profile: unknown) {
  const item = Array.isArray(profile) ? profile[0] : profile;
  return item && typeof item === "object" && "nombre" in item && typeof item.nombre === "string"
    ? item.nombre
    : null;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sesión no encontrada." }, { status: 401 });

  let body: { leadId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (typeof body.leadId !== "string" || !message || message.length > 2000) {
    return NextResponse.json({ error: "Escribe una novedad de hasta 2000 caracteres." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authResult.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const { data: internalUser } = await supabase
    .from("users")
    .select("id, is_active, profiles(nombre)")
    .eq("id", authResult.user.id)
    .maybeSingle();
  const role = profileName(internalUser?.profiles);
  if (!internalUser?.is_active || (role !== "administrador" && role !== "executive")) {
    return NextResponse.json({ error: "No tienes permiso para publicar novedades." }, { status: 403 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, assigned_user_id")
    .eq("id", body.leadId)
    .maybeSingle();
  if (!lead || (role === "executive" && lead.assigned_user_id !== internalUser.id)) {
    return NextResponse.json({ error: "No puedes publicar novedades para este prospecto." }, { status: 403 });
  }

  const { error } = await supabase.from("client_updates").insert({
    lead_id: lead.id,
    created_by: internalUser.id,
    message,
  });
  if (error) return NextResponse.json({ error: "No pudimos publicar la novedad." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
