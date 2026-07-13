"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type LeadContext = { id: string; full_name: string | null; email: string | null; assignedAdvisorName: string | null };

export default function CreateProspectAccountPage() {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadContext | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLeadId(new URLSearchParams(window.location.search).get("lead_id")), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leadId) {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
    void fetch(`/api/academy/context?lead_id=${encodeURIComponent(leadId)}`)
      .then((response) => response.json())
      .then((data: { lead: LeadContext | null }) => setLead(data.lead))
      .catch(() => setMessage("No pudimos recuperar tu orientación."))
      .finally(() => setLoading(false));
  }, [leadId]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead || !leadId || saving) return;
    if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirmation) return setMessage("Las contraseñas no coinciden.");

    setSaving(true);
    setMessage(null);
    setAccountExists(false);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: lead.email ?? "",
        password,
        options: { emailRedirectTo: `${window.location.origin}/mi-cuenta`, data: { lead_id: leadId, role: "prospect", full_name: lead.full_name } },
      });
      if (error || !data.user) throw new Error(error?.message || "No pudimos crear tu cuenta.");
      if (data.user.identities && data.user.identities.length === 0) {
        setAccountExists(true);
        setMessage("Ya existe una cuenta con este correo. Inicia sesión para ver tu seguimiento.");
        return;
      }

      const registration = await fetch("/api/prospect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, authUserId: data.user.id }),
      });
      const result = await registration.json() as { error?: string };
      if (!registration.ok) throw new Error(result.error || "No pudimos vincular tu cuenta.");
      if (data.session) {
        window.location.assign("/mi-cuenta");
        return;
      }
      setMessage("Revisa tu correo y confirma la cuenta. Luego podrás iniciar sesión en Mi cuenta.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "No pudimos crear tu cuenta.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="account-screen"><header className="account-header"><Link className="brand" href="/"><span className="brand-mark">N</span><span>Nexo <b>Futuro</b></span></Link><Link className="outline-button" href="/mi-cuenta">Mi cuenta</Link></header>{loading ? <p>Cargando tu orientación…</p> : lead ? <section className="account-card account-login-card"><p className="eyebrow">CUENTA DE SEGUIMIENTO</p><h1>{lead.full_name?.split(" ")[0] || "Hola"}, mantente al tanto.</h1><p>Crea una cuenta para consultar el estado de tu orientación y las novedades que publique tu asesor. No necesitas completar Academy para usarla.</p><form className="academy-account-form" onSubmit={createAccount}><label>Correo de la orientación<input value={lead.email ?? ""} readOnly /></label><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></label><label>Confirmar contraseña<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required /></label>{message && <p className="academy-error">{message}</p>}{accountExists && <Link className="outline-button" href="/mi-cuenta">Ir a Mi cuenta</Link>}<button className="primary-button" disabled={saving || !lead.email}>{saving ? "Creando cuenta…" : "Crear cuenta"}</button></form></section> : <section className="account-card"><h1>Primero completa tu orientación.</h1><p>Necesitamos una orientación registrada para vincular tu cuenta de seguimiento.</p><Link className="primary-button" href="/orientacion">Iniciar orientación</Link></section>}</main>;
}
