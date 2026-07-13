"use client";

import { FormEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export function QualificationSettings() {
  const [high, setHigh] = useState(70);
  const [medium, setMedium] = useState(40);
  const [companyQuestion, setCompanyQuestion] = useState("¿Aproximadamente cuántas personas trabajan en la empresa?");
  const [decisionQuestion, setDecisionQuestion] = useState("¿Cuál es tu participación en la decisión de contratar una solución?");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/crm/qualification-config", { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json() as { highPriorityThreshold?: number; mediumPriorityThreshold?: number; questions?: { company_size?: string; decision_role?: string } };
        if (response.ok) {
          setHigh(data.highPriorityThreshold ?? 70);
          setMedium(data.mediumPriorityThreshold ?? 40);
          setCompanyQuestion((current) => data.questions?.company_size ?? current);
          setDecisionQuestion((current) => data.questions?.decision_role ?? current);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró.");
      const response = await fetch("/api/crm/qualification-config", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ highPriorityThreshold: high, mediumPriorityThreshold: medium, companySizeQuestion: companyQuestion, decisionRoleQuestion: decisionQuestion }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la configuración.");
      setMessage("Configuración guardada. Las siguientes orientaciones usarán estos valores.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return <details className="qualification-settings"><summary>Configurar calificación y preguntas B2B</summary><form onSubmit={save}><label>Prioridad alta desde<input type="number" min="1" max="100" value={high} onChange={(event) => setHigh(Number(event.target.value))} /></label><label>Prioridad media desde<input type="number" min="0" max="99" value={medium} onChange={(event) => setMedium(Number(event.target.value))} /></label><label>Pregunta sobre tamaño de empresa<textarea value={companyQuestion} onChange={(event) => setCompanyQuestion(event.target.value)} maxLength={240} /></label><label>Pregunta sobre participación en la decisión<textarea value={decisionQuestion} onChange={(event) => setDecisionQuestion(event.target.value)} maxLength={240} /></label>{message && <p className={message.startsWith("Configuración") ? "client-update-success" : "auth-error"}>{message}</p>}<button className="primary-button" disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</button></form></details>;
}
