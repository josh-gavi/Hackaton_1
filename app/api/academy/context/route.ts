import { NextRequest, NextResponse } from "next/server";

import { academyModules } from "@/lib/academy/approved-content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get("lead_id");
  const modules = academyModules;

  if (!leadId) return NextResponse.json({ modules, lead: null });

  try {
    const supabase = createSupabaseAdminClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, full_name, email, objective, experience, assigned_user_id")
      .eq("id", leadId)
      .maybeSingle();
    if (error || !lead) return NextResponse.json({ modules, lead: null });

    let assignedAdvisorName: string | null = null;
    if (lead.assigned_user_id) {
      const { data: advisor } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", lead.assigned_user_id)
        .maybeSingle();
      assignedAdvisorName = advisor?.full_name ?? null;
    }

    return NextResponse.json({ modules, lead: { ...lead, assignedAdvisorName } });
  } catch {
    return NextResponse.json({ modules, lead: null });
  }
}
