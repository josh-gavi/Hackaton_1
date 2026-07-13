"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type AccountData = {
  account: { email: string; status: string };
  lead: { full_name: string | null; objective: string | null; status: string | null; advisorName: string | null };
  updates: Array<{ id: number; message: string; created_at: string }>;
};

const prospectStatusLabels: Record<string, string> = {
  nuevo: "recibida",
  calificado: "revisada por el equipo",
  en_seguimiento: "en seguimiento",
  interesado: "avanzando con tu asesor",
  cliente: "en proceso de incorporación",
  descartado: "cerrada por ahora",
};

export default function MyAccountPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAccount() {
    setLoading(true);
    setMessage(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setData(null);
      setLoading(false);
      return;
    }

    const response = await fetch("/api/prospect-account", { headers: { Authorization: `Bearer ${token}` } });
    const payload = (await response.json()) as AccountData & { error?: string };
    if (!response.ok) {
      setData(null);
      setMessage(payload.error || "No pudimos cargar tu seguimiento.");
    } else {
      setData(payload);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAccount(), 0);
    const interval = window.setInterval(() => void loadAccount(), 20_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("No pudimos iniciar sesión. Revisa tus credenciales o confirma tu correo.");
      setLoading(false);
      return;
    }
    await loadAccount();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setData(null);
    setEmail("");
    setPassword("");
  }

  return (
    <main className="account-screen">
      <header className="account-header">
        <Link className="brand" href="/"><span className="brand-mark">N</span><span>Nexo <b>Futuro</b></span></Link>
        {data && <div className="account-header-actions"><button className="outline-button" onClick={() => void loadAccount()}>Actualizar</button><button className="outline-button" onClick={() => void signOut()}>Cerrar sesión</button></div>}
      </header>

      {loading ? <p>Cargando tu seguimiento…</p> : data ? (
        <section className="account-card">
          <p className="eyebrow">MI SEGUIMIENTO</p>
          <h1>Hola, {data.lead.full_name?.split(" ")[0] || ""}.</h1>
          <p>Tu orientación está <b>{prospectStatusLabels[data.lead.status ?? "nuevo"] ?? "en revisión"}</b>. {data.lead.advisorName ? `${data.lead.advisorName} es tu asesor asignado.` : "Un asesor revisará tu caso."}</p>
          {data.account.status !== "active" && <p className="account-note">Confirma tu correo para activar por completo esta cuenta.</p>}
          <div className="account-summary"><small>OBJETIVO</small><p>{data.lead.objective || "Por definir"}</p></div>
          <h2>Novedades de tu asesoría</h2>
          {data.updates.length ? <div className="account-updates">{data.updates.map((update) => <article key={update.id}><time>{new Date(update.created_at).toLocaleDateString("es-EC")}</time><p>{update.message}</p></article>)}</div> : <p className="account-note">Aún no hay novedades publicadas. Tu asesor te contactará por correo.</p>}
        </section>
      ) : (
        <section className="account-card account-login-card">
          <p className="eyebrow">CUENTA DE SEGUIMIENTO</p>
          <h1>Consulta las novedades de tu asesoría.</h1>
          <p>Usa el correo y la contraseña que registraste al finalizar Futuro Academy.</p>
          <form onSubmit={signIn} className="academy-account-form">
            <label>Correo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {message && <p className="academy-error">{message}</p>}
            <button className="primary-button">Iniciar sesión</button>
          </form>
          <Link href="/orientacion" className="outline-button">Quiero iniciar una orientación</Link>
        </section>
      )}
    </main>
  );
}
