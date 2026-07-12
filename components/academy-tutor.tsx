"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

export function AcademyTutor({ leadId }: { leadId: string | null }) {
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [lead, setLead] = useState<{ full_name: string | null; objective: string | null; experience: string | null } | null>(null);
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

  useEffect(() => {
    const params = leadId ? `?lead_id=${encodeURIComponent(leadId)}` : "";
    fetch(`/api/academy/context${params}`)
      .then((response) => response.json())
      .then((data: { modules: AcademyModule[]; lead: typeof lead }) => {
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

  async function saveConsent(accepted: boolean) {
    setSaveError(null);
    if (!accepted) {
      setConsent("declined");
      setPhase("complete");
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

  if (loading) return <main className="academy-real-screen"><p>Cargando Futuro Academy…</p></main>;

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

          {phase === "quiz" && finalQuiz.length > 0 && <div className="academy-quiz academy-final-quiz">{answers.length < finalQuiz.length ? <><p className="eyebrow">VALIDACIÓN FINAL · {quizIndex + 1} DE {finalQuiz.length}</p><h2>Comprueba lo aprendido</h2><h3>{finalQuiz[quizIndex].question}</h3>{finalQuiz[quizIndex].options.map((option, index) => <button key={option} onClick={() => answerQuiz(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</> : <div className="academy-consent"><p className="eyebrow">RUTA COMPLETADA · {score}/{finalQuiz.length}</p><h2>Ya tienes una base para conversar con un asesor.</h2><p>¿Autorizas guardar esta ruta educativa y tu resultado para que el equipo continúe sin pedirte que repitas el contexto?</p>{saveError && <p className="academy-error">{saveError}</p>}<button className="primary-button" onClick={() => void saveConsent(true)}>Sí, autorizo</button><button className="outline-button" onClick={() => void saveConsent(false)}>No guardar</button></div>}</div>}

          {phase === "complete" && <div className="academy-consent success"><p className="eyebrow">{consent === "accepted" ? "CONSENTIMIENTO OTORGADO" : "PREFERENCIA RESPETADA"}</p><h2>{consent === "accepted" ? "Tu ruta educativa fue guardada." : "No guardaremos tu actividad educativa."}</h2><p>Tu asesor podrá continuar contigo con el contexto correcto.</p><Link className="primary-button" href="/?screen=crm">Continuar con mi asesor <span>→</span></Link></div>}
        </section>
      </div>
    </main>
  );
}
