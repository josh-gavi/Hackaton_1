"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";

import { getQuestion } from "@/lib/prospect/scoring";
import type {
  ChatMessage,
  ChatResponse,
  ProspectProfile,
  ProspectStage,
} from "@/lib/prospect/types";

const INITIAL_STAGE: ProspectStage = "name";

function profileProgress(profile: ProspectProfile): { completed: number; total: number } {
  const values = [
    profile.fullName,
    profile.leadType,
    profile.objective,
    profile.experience,
    profile.budgetValue,
    profile.urgencyScore,
    profile.email,
  ];
  if (profile.leadType === "b2b") values.splice(2, 0, profile.company);
  return { completed: values.filter((value) => value !== undefined && value !== "").length, total: values.length };
}

export function ProspectChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: getQuestion(INITIAL_STAGE) },
  ]);
  const [profile, setProfile] = useState<ProspectProfile>({});
  const [stage, setStage] = useState<ProspectStage>(INITIAL_STAGE);
  const [options, setOptions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResponse | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const progress = useMemo(() => profileProgress(profile), [profile]);
  const completed = result?.completed ?? false;

  async function sendMessage(answer: string) {
    const content = answer.trim();
    if (!content || loading || completed) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/prospect/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, profile, stage }),
      });
      const data = (await response.json()) as ChatResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos procesar tu respuesta.");

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.assistantMessage },
      ]);
      setProfile(data.profile);
      setStage(data.stage);
      setOptions(data.options);
      setResult(data);
      requestAnimationFrame(() => messageEndRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos continuar. Intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function reset() {
    if (messages.length > 1 && !window.confirm("Se borrará esta orientación y tendrás que empezar de nuevo. ¿Deseas continuar?")) {
      return;
    }

    setMessages([{ role: "assistant", content: getQuestion(INITIAL_STAGE) }]);
    setProfile({});
    setStage(INITIAL_STAGE);
    setOptions([]);
    setInput("");
    setError(null);
    setResult(null);
  }

  return (
    <div className="prospect-chat-layout">
      <article className="prospect-conversation">
        <header className="prospect-conversation-head">
          <div className="prospect-agent">
            <span className="prospect-agent-mark">N</span>
            <div>
              <strong>Nexo, tu guía</strong>
              <small><i /> Disponible ahora</small>
            </div>
          </div>
          <button type="button" className="prospect-reset" onClick={reset}>Reiniciar</button>
        </header>

        <div className="prospect-messages" aria-live="polite">
          <div className="date-pill">HOY</div>
          {messages.map((message, index) => (
            <div className={`prospect-message ${message.role}`} key={`${index}-${message.content}`}>
              {message.role === "assistant" && <span className="prospect-agent-mark small">N</span>}
              <p>{message.content}</p>
            </div>
          ))}
          {loading && (
            <div className="prospect-message assistant">
              <span className="prospect-agent-mark small">N</span>
              <p className="typing" aria-label="Nexo está escribiendo"><i /><i /><i /></p>
            </div>
          )}
          {error && <p className="prospect-error" role="alert">{error}</p>}
          <div ref={messageEndRef} />
        </div>

        {!completed && options.length > 0 && (
          <div className="prospect-options" aria-label="Respuestas sugeridas">
            {options.map((option) => (
              <button type="button" key={option} onClick={() => void sendMessage(option)} disabled={loading}>
                {option}
              </button>
            ))}
          </div>
        )}

        {!completed ? (
          <form className="prospect-input" onSubmit={submit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu respuesta…"
              maxLength={500}
              disabled={loading}
              aria-label="Mensaje para Nexo"
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar mensaje">↑</button>
          </form>
        ) : (
          <div className="prospect-complete-actions">
            <Link className="primary-button" href={result?.persistence.leadId ? `/academy?lead_id=${encodeURIComponent(result.persistence.leadId)}` : "/academy"}>
              Continuar con Futuro Academy <span>→</span>
            </Link>
          </div>
        )}
      </article>

      <aside className="prospect-profile">
        <div className="prospect-profile-head">
          <div>
            <p className="eyebrow">TU ORIENTACIÓN</p>
            <h2>{completed ? "Perfil completado" : "Perfil en progreso"}</h2>
          </div>
          <span>{progress.completed}/{progress.total}</span>
        </div>
        <div className="prospect-progress">
          <i style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
        </div>

        <ProfileRow label="Nombre" value={profile.fullName} />
        <ProfileRow label="Tipo" value={profile.leadType ? profile.leadType.toUpperCase() : undefined} />
        {profile.leadType === "b2b" && <ProfileRow label="Empresa" value={profile.company} />}
        <ProfileRow label="Objetivo" value={profile.objective} />
        <ProfileRow label="Experiencia" value={profile.experience} />
        <ProfileRow label="Presupuesto" value={profile.budgetLabel} />
        <ProfileRow label="Momento" value={profile.urgencyLabel} />
        <ProfileRow label="Contacto" value={profile.email} />

        {completed ? (
          <div className="prospect-ready">
            <span>✓</span>
            <div>
              <strong>Orientación preparada</strong>
              <p>El equipo podrá continuar sin pedirte que repitas la conversación.</p>
            </div>
          </div>
        ) : (
          <div className="prospect-privacy">
            <span>⌁</span>
            <p>Tus respuestas se utilizan para preparar una orientación relevante.</p>
          </div>
        )}

        {completed && result?.persistence.reason === "not_configured" && (
          <p className="prospect-demo-note">Modo local: falta conectar las llaves de Supabase para guardar la sesión.</p>
        )}
        {completed && result?.persistence.reason === "database_error" && (
          <p className="prospect-demo-note error">La orientación terminó, pero no pudo guardarse en Supabase.</p>
        )}
      </aside>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className={`prospect-profile-row ${value ? "filled" : ""}`}>
      <span>{value ? "✓" : "·"}</span>
      <div>
        <small>{label}</small>
        <p>{value || "Por definir"}</p>
      </div>
    </div>
  );
}
