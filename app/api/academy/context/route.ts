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
      .select("id, full_name, objective, experience")
      .eq("id", leadId)
      .maybeSingle();
    if (error || !lead) return NextResponse.json({ modules, lead: null });
    return NextResponse.json({ modules, lead });
  } catch {
    return NextResponse.json({ modules, lead: null });
  }
}
