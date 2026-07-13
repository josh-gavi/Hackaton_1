"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

type QuizQuestion = { question: string; options: string[]; correctIndex: number; explanation: string };
type AcademyModule = {
  id: string;
  title: string;
  level: string;
  duration: string;
  objective: string;
  explanation: string;
  keyIdeas: string[];
  boundaries: string[];
  source: { title: string; section: string };
  quiz: QuizQuestion[];
};
type TutorResult = { covered: boolean; answer: string; module?: { source: AcademyModule["source"] } };
type Phase = "intro" | "lesson" | "quiz" | "complete";

type AcademyLead = {
  id: string;
  full_name: string | null;
  email: string | null;
  objective: string | null;
  experience: string | null;
  assigned_user_id: string | null;
  assignedAdvisorName: string | null;
};

export function AcademyTutor({ leadId }: { leadId: string | null }) {
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [lead, setLead] = useState<AcademyLead | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [showQuestion, setShowQuestion] = useState(false);
  const [result, setResult] = useState<TutorResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [consent, setConsent] = useState<"pending" | "accepted" | "declined">("pending");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordConfirmation, setAccountPasswordConfirmation] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);

  useEffect(() => {
    const params = leadId ? `?lead_id=${encodeURIComponent(leadId)}` : "";
    fetch(`/api/academy/context${params}`)
      .then((response) => response.json())
      .then((data: { modules: AcademyModule[]; lead: AcademyLead | null }) => {
        setModules(data.modules);
        setLead(data.lead);
      })
      .catch(() => setSaveError("No pudimos cargar el contenido de Academy."))
      .finally(() => setLoading(false));
  }, [leadId]);

  const routeModules = useMemo(() => modules.slice(0, 3), [modules]);
  const currentLesson = routeModules[lessonIndex];
  const finalQuiz = useMemo(() => routeModules.map((module) => module.quiz[0]).filter(Boolean), [routeModules]);
  const score = answers.reduce((total, answer, index) => total + (answer === finalQuiz[index]?.correctIndex ? 1 : 0), 0);
  const quizPassed = score >= 2;

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = question.trim();
    if (!content || asking || !currentLesson) return;
    setAsking(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/academy/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content, moduleId: currentLesson.id, leadId }),
      });
      const data = (await response.json()) as TutorResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos responder esa consulta.");
      setResult(data);
      setQuestion("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No pudimos continuar.");
    } finally {
      setAsking(false);
    }
  }

  function continueRoute() {
    setResult(null);
    setShowQuestion(false);
    setQuestion("");
    if (lessonIndex < routeModules.length - 1) setLessonIndex((current) => current + 1);
    else setPhase("quiz");
  }

  function answerQuiz(option: number) {
    if (answers[quizIndex] !== undefined) return;
    setAnswers((current) => [...current, option]);
    if (quizIndex < finalQuiz.length - 1) setQuizIndex((current) => current + 1);
  }

  function reviewRoute() {
    setAnswers([]);
    setQuizIndex(0);
    setLessonIndex(0);
    setConsent("pending");
    setPhase("lesson");
  }

  async function saveConsent(accepted: boolean) {
    setSaveError(null);
    if (!accepted) {
      if (!leadId) {
        setConsent("declined");
        setPhase("complete");
        return;
      }
      try {
        const response = await fetch("/api/academy/learning-interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, learningPath: "fundamentos-inversion", consent: false }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error || "No se pudo retirar tu autorización.");
        setConsent("declined");
        setPhase("complete");
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "No se pudo retirar tu autorización.");
      }
      return;
    }
    if (!leadId) {
      setSaveError("Para guardar tu progreso, primero completa la orientación inicial.");
      return;
    }
    try {
      const response = await fetch("/api/academy/learning-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, learningPath: "fundamentos-inversion", quizScore: score, consent: true }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar tu preferencia.");
      setConsent("accepted");
      setPhase("complete");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar tu preferencia.");
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead || !leadId || accountLoading) return;
    if (accountPassword.length < 8) {
      setAccountMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (accountPassword !== accountPasswordConfirmation) {
      setAccountMessage("Las contraseñas no coinciden.");
      return;
    }

    setAccountLoading(true);
    setAccountMessage(null);
    setAccountAlreadyExists(false);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: lead.email ?? "",
        password: accountPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/mi-cuenta`,
          data: { lead_id: leadId, role: "prospect", full_name: lead.full_name },
        },
      });
      if (error || !data.user) throw new Error(error?.message || "No pudimos crear tu cuenta.");
      if (data.user.identities && data.user.identities.length === 0) {
        setAccountAlreadyExists(true);
        setAccountMessage("Ya existe una cuenta con este correo. Inicia sesión para revisar tu seguimiento.");
        return;
      }

      const registration = await fetch("/api/prospect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, authUserId: data.user.id }),
      });
      const registrationData = (await registration.json()) as { error?: string; needsEmailConfirmation?: boolean };
      if (!registration.ok) throw new Error(registrationData.error || "No pudimos vincular tu cuenta.");

      if (data.session) {
        window.location.assign("/mi-cuenta");
        return;
      }
      setAccountMessage("Revisa tu correo y confirma tu cuenta. Después podrás iniciar sesión en Mi cuenta.");
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "No pudimos crear tu cuenta.");
    } finally {
      setAccountLoading(false);
    }
  }

  if (loading) return <main className="academy-real-screen"><p>Cargando Futuro Academy…</p></main>;

  if (!leadId || !lead) {
    return (
      <main className="academy-real-screen">
        <header className="academy-real-hero">
          <p className="eyebrow">FUTURO ACADEMY</p>
          <h1>Primero necesitamos tu orientación.</h1>
          <p>Esta ruta se conecta al prospecto que completó la orientación para conservar su objetivo, resultado y consentimiento.</p>
          <Link className="primary-button" href="/orientacion">Iniciar orientación <span>→</span></Link>
        </header>
      </main>
    );
  }

  return (
    <main className="academy-real-screen">
      <header className="academy-real-hero">
        <Link href="/orientacion" className="back-button">← Volver a orientación</Link>
        <p className="eyebrow">FUTURO ACADEMY · RUTA GUIADA</p>
        <h1>{lead?.full_name ? `Hola, ${lead.full_name.split(" ")[0]}.` : "Antes de conversar con un asesor,"} fortalece tus bases.</h1>
        <p>Revisarás conceptos esenciales de inversión en pocos minutos. Al final validarás lo aprendido con un quiz breve.</p>
      </header>

      <div className="academy-real-layout">
        <aside className="academy-module-list academy-route-list">
          <p className="eyebrow">TU RUTA</p>
          {routeModules.map((module, index) => <div key={module.id} className={index === lessonIndex && phase === "lesson" ? "active" : index < lessonIndex || phase === "quiz" || phase === "complete" ? "completed" : ""}><span>{index < lessonIndex || phase === "quiz" || phase === "complete" ? "✓" : `0${index + 1}`}</span><div><b>{module.title}</b><small>{module.duration} · {module.level}</small></div></div>)}
          <div className={phase === "quiz" || phase === "complete" ? "active" : ""}><span>Q</span><div><b>Quiz final</b><small>3 preguntas</small></div></div>
        </aside>

        <section className="academy-tutor-card">
          {phase === "intro" && <div className="academy-route-intro"><p className="eyebrow">PREPARACIÓN PARA TU ASESORÍA</p><h2>Antes de continuar, conoce los conceptos esenciales.</h2><p>{lead?.objective ? `Tu objetivo es “${lead.objective}”. Esta ruta te dará una base para conversar sobre él con mayor claridad.` : "Esta ruta te ayudará a comprender ahorro, riesgo y metas antes de continuar."}</p><div className="academy-source"><span>⌑</span><div><small>CONTENIDO DE LA RUTA</small><b>Futuro Academy — Fundamentos financieros v1</b><p>3 lecciones · contenido aprobado para demo</p></div></div><button className="primary-button" onClick={() => setPhase("lesson")}>Comenzar ruta guiada <span>→</span></button></div>}

          {phase === "lesson" && currentLesson && <div className="academy-lesson"><p className="eyebrow">LECCIÓN {lessonIndex + 1} DE {routeModules.length}</p><h2>{currentLesson.title}</h2><p className="academy-lesson-objective">{currentLesson.objective}</p><p className="academy-lesson-copy">{currentLesson.explanation}</p><h3>Ideas clave</h3><ul>{currentLesson.keyIdeas.map((idea) => <li key={idea}>{idea}</li>)}</ul><div className="academy-source"><span>⌑</span><div><small>FUENTE UTILIZADA</small><b>{currentLesson.source.title}</b><p>{currentLesson.source.section}</p></div><span className="verified">✓ Contenido aprobado</span></div><p className="academy-boundary">Este contenido es educativo: {currentLesson.boundaries[0]}</p>{showQuestion ? <form className="academy-question-form" onSubmit={ask}><input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} placeholder="Escribe una duda sobre esta lección" /><button className="primary-button" disabled={asking}>{asking ? "Consultando…" : "Preguntar"}</button></form> : <button className="outline-button" onClick={() => setShowQuestion(true)}>Tengo una duda</button>}{saveError && <p className="academy-error">{saveError}</p>}{result && <article className="academy-answer"><p className="eyebrow">RESPUESTA DEL TUTOR</p><p>{result.answer}</p>{result.covered && <div className="academy-source"><span>⌑</span><div><small>FUENTE UTILIZADA</small><b>{currentLesson.source.title}</b><p>{currentLesson.source.section}</p></div></div>}</article>}<button className="primary-button academy-continue" onClick={continueRoute}>{lessonIndex === routeModules.length - 1 ? "Ir al quiz final" : "Entendí, continuar"}<span>→</span></button></div>}

          {phase === "quiz" && finalQuiz.length > 0 && (
            <div className="academy-quiz academy-final-quiz">
              {answers.length < finalQuiz.length ? (
                <>
                  <p className="eyebrow">VALIDACIÓN FINAL · {quizIndex + 1} DE {finalQuiz.length}</p>
                  <h2>Comprueba lo aprendido</h2>
                  <h3>{finalQuiz[quizIndex].question}</h3>
                  {finalQuiz[quizIndex].options.map((option, index) => (
                    <button key={option} onClick={() => answerQuiz(index)}>
                      <span>{String.fromCharCode(65 + index)}</span>{option}
                    </button>
                  ))}
                </>
              ) : !quizPassed ? (
                <div className="academy-consent">
                  <p className="eyebrow">REPASO RECOMENDADO · {score}/{finalQuiz.length}</p>
                  <h2>Repasemos antes de continuar.</h2>
                  <p>Para cerrar esta ruta necesitas responder al menos 2 de las 3 preguntas correctamente. Vuelve a las lecciones y después intenta el quiz otra vez.</p>
                  <button className="primary-button" onClick={reviewRoute}>Volver a las lecciones <span>→</span></button>
                </div>
              ) : (
                <div className="academy-consent">
                  <p className="eyebrow">RUTA COMPLETADA · {score}/{finalQuiz.length}</p>
                  <h2>Ya tienes una base para conversar con un asesor.</h2>
                  <p>¿Autorizas guardar esta ruta educativa y tu resultado para que el equipo continúe sin pedirte que repitas el contexto?</p>
                  {saveError && <p className="academy-error">{saveError}</p>}
                  <button className="primary-button" onClick={() => void saveConsent(true)}>Sí, autorizo</button>
                  <button className="outline-button" onClick={() => void saveConsent(false)}>No guardar</button>
                </div>
              )}
            </div>
          )}

          {phase === "complete" && (
            <div className="academy-consent success">
              <p className="eyebrow">{consent === "accepted" ? "CONSENTIMIENTO OTORGADO" : "PREFERENCIA RESPETADA"}</p>
              <h2>{consent === "accepted" ? "Tu ruta educativa fue guardada." : "No guardaremos tu actividad educativa."}</h2>
              <p>{lead.assignedAdvisorName ? `${lead.assignedAdvisorName} es tu asesor asignado.` : "Un asesor de Futuro fue asignado a tu orientación."} Se pondrá en contacto contigo mediante <b>{lead.email}</b>.</p>

              {!showAccountForm ? (
                <>
                  <p>Si deseas revisar futuras novedades desde una cuenta personal, puedes crearla ahora con el mismo correo.</p>
                  <button className="primary-button" onClick={() => setShowAccountForm(true)}>Crear mi cuenta de seguimiento <span>→</span></button>
                  <Link className="outline-button" href="/">Volver al inicio</Link>
                </>
              ) : (
                <form className="academy-account-form" onSubmit={createAccount}>
                  <label>Correo de la orientación<input value={lead.email ?? ""} readOnly /></label>
                  <label>Contraseña<input type="password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></label>
                  <label>Confirmar contraseña<input type="password" value={accountPasswordConfirmation} onChange={(event) => setAccountPasswordConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required /></label>
                  {accountMessage && <p className="academy-error">{accountMessage}</p>}
                  {accountAlreadyExists && <Link className="outline-button" href="/mi-cuenta">Ir a Mi cuenta</Link>}
                  <button className="primary-button" disabled={accountLoading || !lead.email}>{accountLoading ? "Creando cuenta…" : "Crear cuenta"}</button>
                  <button type="button" className="outline-button" onClick={() => setShowAccountForm(false)}>Ahora no</button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
