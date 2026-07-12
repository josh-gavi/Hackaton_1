"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ModuleSummary = {
  id: string;
  title: string;
  level: string;
  duration: string;
  objective: string;
  source: { title: string; section: string };
};

type QuizQuestion = { question: string; options: string[]; correctIndex: number; explanation: string };
type TutorResult = {
  covered: boolean;
  answer: string;
  module?: ModuleSummary & { quiz: QuizQuestion[] };
};

export function AcademyTutor({ leadId }: { leadId: string | null }) {
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [lead, setLead] = useState<{ full_name: string | null; objective: string | null; experience: string | null } | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<TutorResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [quizIndex, setQuizIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [consent, setConsent] = useState<"pending" | "accepted" | "declined">("pending");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const params = leadId ? `?lead_id=${encodeURIComponent(leadId)}` : "";
    fetch(`/api/academy/context${params}`)
      .then((response) => response.json())
      .then((data: { modules: ModuleSummary[]; lead: typeof lead }) => {
        setModules(data.modules);
        setLead(data.lead);
        setSelectedId(data.modules[0]?.id ?? "");
      })
      .catch(() => setSaveError("No pudimos cargar el contenido de Academy."))
      .finally(() => setLoading(false));
  }, [leadId]);

  const activeModule = useMemo(() => result?.module, [result]);
  const score = activeModule ? answers.reduce((total, answer, index) => total + (answer === activeModule.quiz[index]?.correctIndex ? 1 : 0), 0) : 0;
  const quizComplete = Boolean(activeModule && answers.length === activeModule.quiz.length);

  async function ask(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = question.trim() || modules.find((module) => module.id === selectedId)?.objective || "Explícame este tema.";
    if (!content || asking) return;
    setAsking(true);
    setSaveError(null);
    setQuizIndex(null);
    setAnswers([]);
    setConsent("pending");
    try {
      const response = await fetch("/api/academy/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content, moduleId: selectedId, leadId }),
      });
      const data = (await response.json()) as TutorResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos responder esa consulta.");
      setResult(data);
      if (data.module) setSelectedId(data.module.id);
      setQuestion("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No pudimos continuar.");
    } finally {
      setAsking(false);
    }
  }

  function answerQuiz(option: number) {
    if (quizIndex === null || !activeModule || answers[quizIndex] !== undefined) return;
    setAnswers((current) => [...current, option]);
    if (quizIndex < activeModule.quiz.length - 1) setQuizIndex(quizIndex + 1);
  }

  async function saveConsent(accepted: boolean) {
    setConsent(accepted ? "accepted" : "declined");
    setSaveError(null);
    if (!accepted || !activeModule || !leadId) return;

    try {
      const response = await fetch("/api/academy/learning-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, moduleId: activeModule.id, quizScore: score, consent: true }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar tu preferencia.");
    } catch (error) {
      setConsent("pending");
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar tu preferencia.");
    }
  }

  if (loading) return <main className="academy-real-screen"><p>Cargando Futuro Academy…</p></main>;

  return (
    <main className="academy-real-screen">
      <header className="academy-real-hero">
        <a href="/orientacion" className="back-button">← Volver a orientación</a>
        <p className="eyebrow">FUTURO ACADEMY · CONTENIDO APROBADO PARA DEMO</p>
        <h1>{lead?.full_name ? `Hola, ${lead.full_name.split(" ")[0]}. Aprendamos a tu ritmo.` : "Aprende antes de dar el siguiente paso."}</h1>
        <p>{lead?.experience ? `Adaptaremos las explicaciones a un nivel ${lead.experience.toLowerCase()}.` : "Explicaciones simples, fuentes claras y sin recomendaciones personalizadas."}</p>
      </header>

      <div className="academy-real-layout">
        <aside className="academy-module-list">
          <p className="eyebrow">BIBLIOTECA APROBADA</p>
          {modules.map((module) => <button key={module.id} className={selectedId === module.id ? "active" : ""} onClick={() => { setSelectedId(module.id); setQuestion(""); }}><b>{module.title}</b><small>{module.duration} · {module.level}</small></button>)}
        </aside>

        <section className="academy-tutor-card">
          {!result && <><p className="eyebrow">ELIGE UN TEMA O HAZ UNA PREGUNTA</p><h2>{modules.find((module) => module.id === selectedId)?.title || "Fundamentos financieros"}</h2><p>El Tutor responderá solo desde el material educativo aprobado y mostrará la fuente usada.</p></>}
          <form className="academy-question-form" onSubmit={ask}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} placeholder="Ejemplo: ¿qué diferencia hay entre ahorrar e invertir?" />
            <button className="primary-button" disabled={asking}>{asking ? "Consultando…" : "Preguntar"}</button>
          </form>
          {saveError && <p className="academy-error">{saveError}</p>}

          {result && !result.covered && <div className="academy-answer"><p>{result.answer}</p></div>}
          {result?.covered && activeModule && <>
            <article className="academy-answer"><p className="eyebrow">RESPUESTA DEL TUTOR</p><p>{result.answer}</p><div className="academy-source"><span>⌑</span><div><small>FUENTE UTILIZADA</small><b>{activeModule.source.title}</b><p>{activeModule.source.section}</p></div><span className="verified">✓ Contenido aprobado</span></div></article>

            {quizIndex === null && !quizComplete && <button className="primary-button" onClick={() => setQuizIndex(0)}>Comprobar lo aprendido <span>→</span></button>}
            {quizIndex !== null && !quizComplete && <div className="academy-quiz"><p className="eyebrow">QUIZ · {quizIndex + 1} DE 3</p><h3>{activeModule.quiz[quizIndex].question}</h3>{activeModule.quiz[quizIndex].options.map((option, index) => <button key={option} onClick={() => answerQuiz(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>}
            {quizComplete && consent === "pending" && <div className="academy-consent"><p className="eyebrow">QUIZ COMPLETADO · {score}/3</p><h3>¿Autorizas guardar este tema como interés educativo?</h3><p>Solo con tu autorización se registrará “{activeModule.title}” para que el equipo continúe con el contexto correcto.</p><button className="primary-button" onClick={() => void saveConsent(true)}>Sí, autorizo</button><button className="outline-button" onClick={() => void saveConsent(false)}>No guardar</button></div>}
            {quizComplete && consent !== "pending" && <div className="academy-consent success"><p className="eyebrow">{consent === "accepted" ? "CONSENTIMIENTO OTORGADO" : "PREFERENCIA RESPETADA"}</p><h3>{consent === "accepted" ? "Tu interés educativo fue guardado." : "No guardaremos este interés educativo."}</h3><p>Tu equipo podrá continuar la orientación sin pedirte que repitas el contexto.</p></div>}
          </>}
        </section>
      </div>
    </main>
  );
}
