import { NextRequest, NextResponse } from "next/server";

import { defaultQualificationSettings, getQualificationSettings } from "@/lib/prospect/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function isAdministrator(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const supabase = createSupabaseAdminClient();
  const { data: authData } = await supabase.auth.getUser(token);
  if (!authData.user) return false;
  const { data: user } = await supabase.from("users").select("is_active, profiles(nombre)").eq("id", authData.user.id).maybeSingle();
  const profile = Array.isArray(user?.profiles) ? user?.profiles[0] : user?.profiles;
  return user?.is_active && profile && typeof profile === "object" && "nombre" in profile && profile.nombre === "administrador";
}

export async function GET(request: NextRequest) {
  if (!(await isAdministrator(request))) return NextResponse.json({ error: "Solo administración puede ver esta configuración." }, { status: 403 });
  return NextResponse.json(await getQualificationSettings());
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdministrator(request))) return NextResponse.json({ error: "Solo administración puede cambiar esta configuración." }, { status: 403 });
  let body: { highPriorityThreshold?: unknown; mediumPriorityThreshold?: unknown; companySizeQuestion?: unknown; decisionRoleQuestion?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const high = typeof body.highPriorityThreshold === "number" ? Math.round(body.highPriorityThreshold) : defaultQualificationSettings.highPriorityThreshold;
  const medium = typeof body.mediumPriorityThreshold === "number" ? Math.round(body.mediumPriorityThreshold) : defaultQualificationSettings.mediumPriorityThreshold;
  const companyQuestion = typeof body.companySizeQuestion === "string" ? body.companySizeQuestion.trim().slice(0, 240) : defaultQualificationSettings.questions.company_size!;
  const roleQuestion = typeof body.decisionRoleQuestion === "string" ? body.decisionRoleQuestion.trim().slice(0, 240) : defaultQualificationSettings.questions.decision_role!;
  if (medium < 0 || high > 100 || medium >= high || !companyQuestion || !roleQuestion) return NextResponse.json({ error: "Revisa los puntajes y las preguntas configuradas." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("qualification_settings").upsert({ id: 1, high_priority_threshold: high, medium_priority_threshold: medium, b2b_company_size_question: companyQuestion, b2b_decision_role_question: roleQuestion, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "No se pudo guardar la configuración." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
