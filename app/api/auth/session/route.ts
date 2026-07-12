import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ExecutiveRole = "administrador" | "executive";

function getProfileName(profile: unknown): string | null {
  const item = Array.isArray(profile) ? profile[0] : profile;
  if (!item || typeof item !== "object" || !("nombre" in item)) return null;

  const name = item.nombre;
  return typeof name === "string" ? name : null;
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Sesión no encontrada." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const { data: internalUser, error: userError } = await supabase
    .from("users")
    .select("id, full_name, is_active, profiles(nombre)")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: "No se pudo comprobar el acceso." }, { status: 500 });
  }

  const role = getProfileName(internalUser?.profiles);
  const isAllowedRole = role === "administrador" || role === "executive";
  if (!internalUser || !internalUser.is_active || !isAllowedRole) {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso al CRM." }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: internalUser.id,
      fullName: internalUser.full_name || authData.user.email?.split("@")[0] || "Ejecutivo",
      role: role as ExecutiveRole,
    },
  });
}
