"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AcademyTutor } from "@/components/academy-tutor";

export default function AcademyPage() {
  return <Suspense fallback={<main className="academy-real-screen"><p>Cargando Futuro Academy…</p></main>}><AcademyPageContent /></Suspense>;
}

function AcademyPageContent() {
  const searchParams = useSearchParams();
  return <AcademyTutor leadId={searchParams.get("lead_id")} />;
}
