"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Screen = "inicio" | "chat" | "academy" | "login" | "crm";

const chatQuestions = [
  {
    assistant: "Hola, soy Nexo. Para orientar mejor tu consulta, ¿es para ti o para una empresa?",
    options: ["Para mí", "Para una empresa"],
  },
  {
    assistant: "Perfecto. ¿Cuál es tu principal objetivo?",
    options: [
      "Hacer crecer mis ahorros",
      "Aprender sobre inversiones",
      "Prepararme para mi jubilación",
    ],
  },
  {
    assistant: "¿Tienes experiencia previa invirtiendo?",
    options: ["Soy principiante", "Tengo algo de experiencia", "Ya invierto"],
  },
  {
    assistant: "¿Qué monto aproximado considerarías utilizar?",
    options: ["Menos de $500", "$500 a $1.000", "Más de $1.000"],
  },
  {
    assistant: "¿Cuándo te gustaría comenzar?",
    options: ["Este mes", "El próximo mes", "Aún no lo sé"],
  },
];

const quiz = [
  {
    question: "¿Cuál describe mejor la diferencia entre ahorrar e invertir?",
    answers: [
      "Son exactamente lo mismo",
      "Ahorrar guarda dinero; invertir busca crecimiento y puede tener riesgo",
      "Invertir no requiere aprender nada",
    ],
    correct: 1,
  },
  {
    question: "¿Qué aspecto es importante considerar antes de invertir?",
    answers: ["El nivel de riesgo", "Solo el color de la aplicación", "Nada"],
    correct: 0,
  },
  {
    question: "¿Para qué sirve definir un objetivo financiero?",
    answers: ["Para decidir con más claridad", "Para evitar ahorrar", "No sirve"],
    correct: 0,
  },
];

function Icon({ children }: { children: string }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("inicio");
  const [chatStep, setChatStep] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [quizStep, setQuizStep] = useState(-1);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [consent, setConsent] = useState<"pending" | "accepted" | "declined">("pending");
  const [actionStatus, setActionStatus] = useState<"Pendiente" | "Aprobada" | "Rechazada">("Pendiente");
  const [showAllLeads, setShowAllLeads] = useState(false);

  const score = useMemo(() => (responses.length >= 5 ? 80 : 0), [responses]);
  const completedQuiz = quizAnswers.length === quiz.length;

  const goTo = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectChatOption = (answer: string) => {
    setResponses((current) => [...current, answer]);
    setChatStep((current) => current + 1);
  };

  const selectQuizAnswer = (answer: number) => {
    setQuizAnswers((current) => [...current, answer]);
    if (quizStep < quiz.length - 1) setQuizStep((current) => current + 1);
  };

  const resetDemo = () => {
    setChatStep(0);
    setResponses([]);
    setQuizStep(-1);
    setQuizAnswers([]);
    setConsent("pending");
    setActionStatus("Pendiente");
    setShowAllLeads(false);
    goTo("inicio");
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setAuthLoading(false);

    if (error) {
      setAuthError("Correo o contraseña incorrectos.");
      return;
    }

    setEmail("");
    setPassword("");
    goTo("crm");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    goTo("inicio");
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main>
      <nav className="topbar" aria-label="Navegación principal">
        <button className="brand" onClick={() => goTo("inicio")} aria-label="Ir al inicio de Nexo Futuro">
          <span className="brand-mark">N</span>
          <span>Nexo <b>Futuro</b></span>
        </button>
        <div className="nav-links">
          <button className={screen === "inicio" ? "active" : ""} onClick={() => goTo("inicio")}>Inicio</button>
          <button className={screen === "chat" ? "active" : ""} onClick={() => goTo("chat")}>Orientación</button>
          <button className={screen === "academy" ? "active" : ""} onClick={() => goTo("academy")}>Academy</button>
        </div>
        <button
          className="small-cta"
          onClick={() => goTo(user ? "crm" : "login")}
        >
          <Icon>▦</Icon>
          {user ? "Ir al CRM" : "Acceso ejecutivo"}
        </button>
      </nav>

      {screen === "inicio" && (
        <section className="home-screen">
          <div className="hero-copy">
            <p className="eyebrow"><span className="pulse" /> ORIENTACIÓN FINANCIERA CON CONTEXTO</p>
            <h1>Una conversación que <span>abre oportunidades.</span></h1>
            <p className="hero-text">Nexo Futuro acompaña a cada persona desde su primera pregunta hasta la orientación adecuada, sin perder el contexto en el camino.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => goTo("chat")}>Comenzar mi orientación <span>→</span></button>
              <button className="text-button" onClick={() => goTo(user ? "crm" : "login")}>Ver CRM de ejemplo <span>↗</span></button>
            </div>
            <div className="trust-row">
              <div className="avatars"><i>J</i><i>M</i><i>A</i><i>R</i></div>
              <p><b>+1.200 personas</b><br />ya comenzaron a aprender</p>
            </div>
          </div>
          <div className="hero-visual" aria-label="Vista previa del recorrido de una persona">
            <div className="floating-tag tag-top"><span className="tag-icon blue">↗</span><div><small>PRIORIDAD</small><b>Alta · 80/100</b></div></div>
            <div className="assistant-window">
              <div className="window-header"><div className="dot-group"><i /><i /><i /></div><span>nexofuturo.app/orientación</span><span className="secure">● Protegido</span></div>
              <div className="window-body">
                <div className="mini-brand"><span className="brand-mark">N</span> Nexo <b>Futuro</b></div>
                <div className="date-pill">HOY, 10:24</div>
                <div className="chat-line bot"><span className="bot-avatar">N</span><p>Hola, Carlos. ¿Qué te gustaría conseguir con tus ahorros?</p></div>
                <div className="chat-line person"><p>Quiero que crezcan, pero no sé por dónde comenzar.</p></div>
                <div className="chat-line bot"><span className="bot-avatar">N</span><p>Estoy aquí para orientarte. Primero, aprendamos lo esencial.</p></div>
                <div className="learning-card"><span>📚</span><div><b>Introducción a las inversiones</b><small>Ruta sugerida para ti · 5 min</small></div><button onClick={() => goTo("academy")}>→</button></div>
              </div>
            </div>
            <div className="floating-tag tag-bottom"><span className="tag-icon green">✓</span><div><small>INTERÉS EDUCATIVO</small><b>Consentimiento otorgado</b></div></div>
          </div>
        </section>
      )}

      {screen === "chat" && (
        <section className="app-shell">
          <header className="section-intro compact">
            <div><p className="eyebrow">VISTA DEL PROSPECTO</p><h2>Encuentra una ruta para comenzar</h2></div>
            <div className="session-status"><span className="live-dot" /> Sesión segura</div>
          </header>
          <div className="chat-layout">
            <article className="conversation-card">
              <div className="conversation-head"><div className="agent-title"><span className="bot-avatar large">N</span><div><b>Nexo, tu guía</b><small><span className="live-dot" /> Disponible ahora</small></div></div><button className="more-button" aria-label="Más opciones">•••</button></div>
              <div className="conversation-body">
                <div className="date-pill">HOY</div>
                <div className="chat-line bot"><span className="bot-avatar">N</span><p>¡Hola! Me alegra que estés aquí. Puedo ayudarte a aprender y encontrar la orientación adecuada.</p></div>
                {responses.map((answer, index) => (
                  <div className="message-pair" key={`${answer}-${index}`}>
                    <div className="chat-line person"><p>{answer}</p></div>
                    {index < chatQuestions.length - 1 && <div className="chat-line bot"><span className="bot-avatar">N</span><p>{chatQuestions[index + 1].assistant}</p></div>}
                  </div>
                ))}
                {chatStep < chatQuestions.length ? (
                  <div className="next-question">
                    {chatStep === 0 && <div className="chat-line bot"><span className="bot-avatar">N</span><p>{chatQuestions[0].assistant}</p></div>}
                    <div className="quick-options">
                      {chatQuestions[chatStep].options.map((option) => <button key={option} onClick={() => selectChatOption(option)}>{option}</button>)}
                    </div>
                  </div>
                ) : (
                  <div className="qualification-result">
                    <div className="result-icon">✦</div>
                    <p className="result-kicker">ORIENTACIÓN PREPARADA</p>
                    <h3>Tu perfil tiene prioridad alta</h3>
                    <p>Veo que quieres comenzar pronto y estás buscando aprender antes de decidir. Te recomiendo una introducción breve.</p>
                    <button className="primary-button" onClick={() => goTo("academy")}>Aprender con Futuro Academy <span>→</span></button>
                  </div>
                )}
              </div>
              <div className="message-input"><span>Escribe un mensaje…</span><button aria-label="Enviar mensaje">↑</button></div>
            </article>
            <aside className="profile-panel">
              <div className="panel-head"><div><p className="eyebrow">TU ORIENTACIÓN</p><h3>Perfil en progreso</h3></div><span className="step-count">{Math.min(chatStep, 5)} / 5</span></div>
              <div className="progress-track"><span style={{ width: `${Math.min(chatStep, 5) * 20}%` }} /></div>
              <div className="profile-items">
                <ProfileItem icon="◉" label="Tipo" value={responses[0] === "Para una empresa" ? "B2B · Empresa" : responses[0] ? "B2C · Personal" : "Por definir"} filled={Boolean(responses[0])} />
                <ProfileItem icon="◎" label="Objetivo" value={responses[1] || "Aún no indicado"} filled={Boolean(responses[1])} />
                <ProfileItem icon="⌁" label="Experiencia" value={responses[2] || "Aún no indicada"} filled={Boolean(responses[2])} />
                <ProfileItem icon="$" label="Presupuesto" value={responses[3] || "Aún no indicado"} filled={Boolean(responses[3])} />
                <ProfileItem icon="◷" label="Momento" value={responses[4] || "Aún no indicado"} filled={Boolean(responses[4])} />
              </div>
              {score > 0 ? <div className="score-card"><div><small>PUNTUACIÓN DE PRIORIDAD</small><b>{score}<em>/100</em></b></div><span>Alta<br /><i>●</i></span><p>Interés definido, plazo cercano y perfil adecuado.</p></div> : <div className="privacy-note"><span>⌁</span><p>Tus respuestas se usan solo para crear una orientación más relevante.</p></div>}
            </aside>
          </div>
        </section>
      )}

      {screen === "academy" && (
        <section className="academy-screen">
          <div className="academy-hero"><button className="back-button" onClick={() => goTo("chat")}>← Volver a orientación</button><p className="eyebrow">FUTURO ACADEMY</p><h2>Aprende antes de dar el siguiente paso.</h2><p>Un espacio de educación simple, aprobado y pensado para tu nivel.</p></div>
          <div className="academy-layout">
            <aside className="lesson-list"><p className="eyebrow">TU RUTA</p><h3>Primeros pasos</h3><Lesson number="01" title="Entender tu objetivo" state="completed" /><Lesson number="02" title="Ahorrar e invertir" state="current" /><Lesson number="03" title="Riesgo y horizonte" state="locked" /><Lesson number="04" title="Tu siguiente paso" state="locked" /></aside>
            <article className="lesson-card">
              <div className="lesson-top"><span className="lesson-number">02</span><span className="duration">◷ 5 MIN</span></div>
              {quizStep === -1 && <><p className="eyebrow">LECCIÓN ACTUAL</p><h1>Ahorrar e invertir: no son lo mismo.</h1><p className="lesson-copy">Ahorrar es separar y conservar dinero para usarlo después. Invertir es usar recursos buscando que crezcan con el tiempo, teniendo en cuenta que el resultado puede variar.</p><div className="source-box"><span className="source-icon">⌑</span><div><small>CONTENIDO APROBADO</small><b>Introducción a las inversiones</b><p>Futuro Academy · Página 3</p></div><span className="verified">✓ Fuente verificada</span></div><button className="primary-button" onClick={() => setQuizStep(0)}>Comprobar lo aprendido <span>→</span></button></>}
              {quizStep >= 0 && !completedQuiz && <div className="quiz-box"><div className="quiz-progress"><span>QUIZ · {quizStep + 1} DE 3</span><div><i style={{ width: `${((quizStep + 1) / 3) * 100}%` }} /></div></div><h3>{quiz[quizStep].question}</h3><div className="answer-list">{quiz[quizStep].answers.map((answer, index) => <button key={answer} onClick={() => selectQuizAnswer(index)}><span>{String.fromCharCode(65 + index)}</span>{answer}</button>)}</div></div>}
              {completedQuiz && consent === "pending" && <div className="consent-box"><span className="celebrate">✦</span><p className="eyebrow">QUIZ COMPLETADO</p><h3>¡Muy bien! Completaste tu introducción.</h3><p>¿Autorizas guardar <b>“Introducción a las inversiones”</b> como un interés en tu perfil para ofrecerte contenido más relevante?</p><div><button className="primary-button" onClick={() => setConsent("accepted")}>Sí, autorizo</button><button className="outline-button" onClick={() => setConsent("declined")}>No guardar</button></div></div>}
              {completedQuiz && consent !== "pending" && <div className="consent-box success"><span className="celebrate">✓</span><p className="eyebrow">{consent === "accepted" ? "CONSENTIMIENTO OTORGADO" : "PREFERENCIA RESPETADA"}</p><h3>{consent === "accepted" ? "Tu interés fue guardado de forma segura." : "No guardaremos este tema en tu perfil."}</h3><p>Tu orientación ya está lista para que un asesor pueda continuar contigo con el contexto correcto.</p><button className="primary-button" onClick={() => goTo(user ? "crm" : "login")}>Ver cómo llega al CRM <span>→</span></button></div>}
            </article>
          </div>
        </section>
      )}

      {screen === "login" && (
        <section className="login-screen">
          <div className="login-card">
            <p className="eyebrow">Portal ejecutivo</p>
            <h2>Acceso privado</h2>
            <p>Ingresa con tu correo y contraseña para ver el CRM ejecutivo.</p>
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                Correo
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              {authError && <p className="auth-error">{authError}</p>}
              <button className="primary-button" type="submit" disabled={authLoading}>
                {authLoading ? "Ingresando..." : "Iniciar sesión"}
              </button>
              <button type="button" className="text-button" onClick={() => goTo("inicio")}>
                Volver al inicio
              </button>
            </form>
          </div>
        </section>
      )}

      {screen === "crm" && !user && (
        <section className="login-screen">
          <div className="login-card">
            <p className="eyebrow">Acceso restringido</p>
            <h2>Debe iniciar sesión</h2>
            <p>Para acceder al CRM ejecutivo necesitas iniciar sesión con tu cuenta.</p>
            <button className="primary-button" onClick={() => goTo("login")}>Iniciar sesión</button>
          </div>
        </section>
      )}

      {screen === "crm" && user && (
        <section className="crm-screen">
          <header className="crm-header" style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"16px", flexWrap:"wrap", marginBottom:"18px"}}><div><p className="eyebrow">VISTA PRIVADA · CRM</p><h1 style={{margin:"4px 0 6px", fontSize:"2rem", lineHeight:1.15, color:"#111827"}}>Tu tablero de oportunidades</h1><p style={{margin:0, maxWidth:"620px", color:"#4b5563"}}>Buenos días, Valeria. Estas son las conversaciones que más necesitan tu atención hoy.</p></div><div className="crm-actions" style={{display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap"}}><button className="search-button" style={{background:"#f3f4f6", border:"1px solid #e5e7eb", color:"#111827"}}>⌕ Buscar</button><button className="search-button" onClick={handleLogout} style={{background:"#f3f4f6", border:"1px solid #e5e7eb", color:"#111827"}}>Cerrar sesión</button><button className="profile-avatar" style={{background:"linear-gradient(135deg, #5b45ff, #8c7dff)", color:"#fff", border:"none"}}>VR</button></div></header>
          <div className="metric-grid" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))", gap:"14px", marginBottom:"18px"}}><div style={{background:"linear-gradient(135deg, #ffffff 0%, #f6f3ff 100%)", border:"1px solid #e8e1ff", borderRadius:"18px", padding:"14px 16px", boxShadow:"0 10px 28px rgba(17,24,39,0.05)"}}><Metric value="12" label="Leads nuevos" trend="+3 esta semana" /></div><div style={{background:"linear-gradient(135deg, #fffaf4 0%, #ffffff 100%)", border:"1px solid #ffe4c9", borderRadius:"18px", padding:"14px 16px", boxShadow:"0 10px 28px rgba(17,24,39,0.05)"}}><Metric value="4" label="Prioridad alta" trend="Requieren atención" accent="orange" /></div><div style={{background:"linear-gradient(135deg, #f4f9ff 0%, #ffffff 100%)", border:"1px solid #dce9ff", borderRadius:"18px", padding:"14px 16px", boxShadow:"0 10px 28px rgba(17,24,39,0.05)"}}><Metric value="3" label="Acciones pendientes" trend="Por revisar hoy" accent="blue" /></div><div style={{background:"linear-gradient(135deg, #f1fdf6 0%, #ffffff 100%)", border:"1px solid #d6f3df", borderRadius:"18px", padding:"14px 16px", boxShadow:"0 10px 28px rgba(17,24,39,0.05)"}}><Metric value="68%" label="Ruta educativa" trend="Tasa de finalización" accent="green" /></div></div>
          <div className="crm-layout">
            <div className="leads-area" style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"24px", padding:"18px", boxShadow:"0 16px 45px rgba(15,23,42,0.05)"}}><div className="leads-heading" style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", marginBottom:"12px"}}><div><h2 style={{margin:"0 0 4px", color:"#111827"}}>Mis oportunidades</h2><p style={{margin:0, color:"#6b7280"}}>Actualizado hace un momento</p></div><button className="filter-button" style={{background:"#f8fafc", border:"1px solid #e5e7eb", color:"#374151"}}>☷ Filtrar</button></div><div className="pipeline-tabs" style={{display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px"}}><button className="active" style={{background:"#5b45ff", color:"#fff", border:"none", borderRadius:"999px", padding:"8px 12px"}}>Todos <span style={{marginLeft:"6px", opacity:0.9}}>12</span></button><button style={{background:"#f5f7ff", color:"#4b5563", border:"1px solid #e5e7eb", borderRadius:"999px", padding:"8px 12px"}}>Nuevos <span style={{marginLeft:"6px", opacity:0.8}}>5</span></button><button style={{background:"#f5f7ff", color:"#4b5563", border:"1px solid #e5e7eb", borderRadius:"999px", padding:"8px 12px"}}>Calificados <span style={{marginLeft:"6px", opacity:0.8}}>4</span></button><button style={{background:"#f5f7ff", color:"#4b5563", border:"1px solid #e5e7eb", borderRadius:"999px", padding:"8px 12px"}}>En seguimiento <span style={{marginLeft:"6px", opacity:0.8}}>3</span></button></div><div className="lead-list" style={{display:"grid", gap:"10px"}}><LeadRow selected name="Carlos Mendoza" initials="CM" type="B2C · Personal" priority="Alta" score="80" activity="Completó la ruta educativa" time="Hace 4 min" /><LeadRow name="Andrea López" initials="AL" type="B2B · Empresa" priority="Media" score="58" activity="Solicitó información para su equipo" time="Hace 21 min" /><LeadRow name="Empresa Nova" initials="EN" type="B2B · 200 colaboradores" priority="Alta" score="85" activity="Pendiente de contacto" time="Hace 45 min" /><LeadRow name="Sofía Ramírez" initials="SR" type="B2C · Personal" priority="Media" score="62" activity="Leyó material educativo" time="Ayer" /></div>{showAllLeads ? <p className="more-leads" style={{marginTop:"12px", color:"#4b5563"}}>Mostrando 12 oportunidades activas.</p> : <button className="see-more" onClick={() => setShowAllLeads(true)} style={{marginTop:"12px", width:"100%", border:"1px solid #e5e7eb", background:"#f8fafc", color:"#111827", borderRadius:"999px", padding:"10px 12px", cursor:"pointer"}}>Ver todas las oportunidades <span style={{marginLeft:"6px"}}>→</span></button>}</div>
            <aside className="lead-detail" style={{background:"linear-gradient(180deg, #f8f7ff 0%, #ffffff 100%)", border:"1px solid #e7e2ff", borderRadius:"24px", padding:"18px", boxShadow:"0 18px 45px rgba(17,24,39,0.06)"}}><div className="detail-head" style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px", marginBottom:"14px"}}><div className="detail-person" style={{display:"flex", alignItems:"center", gap:"12px"}}><span className="avatar large-avatar" style={{background:"linear-gradient(135deg, #5b45ff, #8c7dff)", color:"#fff", width:"48px", height:"48px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%"}}>CM</span><div><h2 style={{margin:"0 0 3px", color:"#111827"}}>Carlos Mendoza</h2><p style={{margin:0, color:"#6b7280"}}>Lead B2C · Creado hoy, 10:24</p></div></div><button className="more-button" style={{background:"#f5f3ff", border:"1px solid #e7e2ff", borderRadius:"999px", color:"#5b45ff"}}>•••</button></div><div className="priority-banner" style={{display:"flex", alignItems:"flex-start", gap:"10px", background:"#fff", border:"1px solid #e8e3ff", borderRadius:"16px", padding:"12px 14px", marginBottom:"12px"}}><span style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:"30px", height:"30px", borderRadius:"999px", background:"#f5f3ff", color:"#5b45ff"}}>✦</span><div><small style={{display:"block", color:"#5b45ff", fontWeight:700, letterSpacing:"0.08em"}}>PRIORIDAD ALTA · 80/100</small><p style={{margin:"4px 0 0", color:"#4b5563"}}>Interés definido, plazo cercano y perfil adecuado.</p></div><button style={{marginLeft:"auto", border:"1px solid #e5e7eb", background:"#f8fafc", borderRadius:"999px", padding:"6px 10px", color:"#374151"}}>¿Por qué?</button></div><div className="detail-section" style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"14px", marginBottom:"12px"}}><div className="detail-label" style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", marginBottom:"8px"}}><h3 style={{margin:0, color:"#111827"}}>Resumen de IA</h3><span style={{color:"#5b45ff", fontSize:"0.82rem", fontWeight:700}}>✦ Generado hace 1 min</span></div><p style={{margin:0, color:"#4b5563"}}>Carlos quiere hacer crecer sus ahorros y desea comenzar el próximo mes. Es principiante, completó la introducción educativa y su principal preocupación es el riesgo.</p></div><div className="detail-grid" style={{display:"grid", gridTemplateColumns:"repeat(2, minmax(0, 1fr))", gap:"10px", marginBottom:"12px"}}><div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"10px 12px"}}><small style={{display:"block", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.08em"}}>Objetivo</small><p style={{margin:0, color:"#111827", fontWeight:600}}>Hacer crecer sus ahorros</p></div><div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"10px 12px"}}><small style={{display:"block", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.08em"}}>Experiencia</small><p style={{margin:0, color:"#111827", fontWeight:600}}>Principiante</p></div><div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"10px 12px"}}><small style={{display:"block", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.08em"}}>Interés educativo</small><p style={{margin:0, color:"#111827", fontWeight:600}}>{consent === "accepted" ? "Introducción a inversiones" : "No registrado"}</p></div><div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"10px 12px"}}><small style={{display:"block", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.08em"}}>Objeción</small><p style={{margin:0, color:"#111827", fontWeight:600}}>Temor al riesgo</p></div></div><div className="next-action" style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"14px", marginBottom:"12px"}}><div style={{display:"flex", gap:"10px", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap"}}><div style={{display:"flex", gap:"10px", alignItems:"flex-start"}}><span className="action-icon" style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:"34px", height:"34px", borderRadius:"999px", background:"#eef2ff", color:"#5b45ff"}}>↗</span><div><small style={{display:"block", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.08em"}}>Siguiente acción recomendada</small><h3 style={{margin:"0 0 4px", color:"#111827"}}>Agendar una reunión introductoria</h3><p style={{margin:0, color:"#4b5563"}}>El lead tiene alta intención y ya completó la ruta educativa.</p></div></div>{actionStatus === "Pendiente" ? <div className="approval-actions" style={{display:"flex", gap:"8px", flexWrap:"wrap"}}><button className="approve" onClick={() => setActionStatus("Aprobada")} style={{background:"#e8f9ef", color:"#157f46", border:"1px solid #cdeed7", borderRadius:"999px", padding:"8px 12px", fontWeight:700}}>✓ Aprobar</button><button className="edit" style={{background:"#f8fafc", color:"#374151", border:"1px solid #e5e7eb", borderRadius:"999px", padding:"8px 12px", fontWeight:700}}>Editar</button><button className="reject" onClick={() => setActionStatus("Rechazada")} style={{background:"#fef2f2", color:"#b91c1c", border:"1px solid #fecaca", borderRadius:"999px", padding:"8px 12px", fontWeight:700}}>Rechazar</button></div> : <div className={`action-state ${actionStatus === "Aprobada" ? "approved" : "rejected"}`} style={{padding:"8px 12px", borderRadius:"999px", fontWeight:700, background: actionStatus === "Aprobada" ? "#e8f9ef" : "#fef2f2", color: actionStatus === "Aprobada" ? "#157f46" : "#b91c1c", border: actionStatus === "Aprobada" ? "1px solid #cdeed7" : "1px solid #fecaca"}}><span>{actionStatus === "Aprobada" ? "✓" : "×"}</span> Acción {actionStatus.toLowerCase()}</div>}</div></div><div className="timeline" style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"14px"}}><h3 style={{margin:"0 0 10px", color:"#111827"}}>Seguimiento reciente</h3><Timeline time="10:24" text="Inició una conversación con Nexo" /><Timeline time="10:28" text="Completó la ruta educativa" /><Timeline time="10:31" text="Se generó una acción recomendada" active /></div></aside>
          </div>
        </section>
      )}

      <footer><span>© 2026 Nexo Futuro</span><span>Educación clara. Decisiones acompañadas.</span>{screen !== "inicio" && <button onClick={resetDemo}>Reiniciar demo</button>}</footer>
    </main>
  );
}

function ProfileItem({ icon, label, value, filled }: { icon: string; label: string; value: string; filled: boolean }) {
  return <div className={`profile-item ${filled ? "filled" : ""}`}><span>{icon}</span><div><small>{label}</small><p>{value}</p></div>{filled && <i>✓</i>}</div>;
}

function Lesson({ number, title, state }: { number: string; title: string; state: "completed" | "current" | "locked" }) {
  return <div className={`lesson-nav ${state}`}><span>{state === "completed" ? "✓" : number}</span><p>{title}</p>{state === "current" && <i>→</i>}</div>;
}

function Metric({ value, label, trend, accent = "ink" }: { value: string; label: string; trend: string; accent?: string }) {
  const colors = {
    ink: { tint: "#5b45ff", muted: "#6b7280" },
    orange: { tint: "#d97706", muted: "#b45309" },
    blue: { tint: "#2563eb", muted: "#1d4ed8" },
    green: { tint: "#15803d", muted: "#166534" },
  }[accent as "ink" | "orange" | "blue" | "green"];

  return (
    <div className={`metric ${accent}`} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <b style={{ fontSize: "1.5rem", color: "#111827" }}>{value}</b>
      <span style={{ fontWeight: 700, color: "#334155" }}>{label}</span>
      <small style={{ color: colors.tint }}>{trend}</small>
    </div>
  );
}

function LeadRow({ selected = false, name, initials, type, priority, score, activity, time }: { selected?: boolean; name: string; initials: string; type: string; priority: string; score: string; activity: string; time: string }) {
  return (
    <article
      className={`lead-row ${selected ? "selected" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: "44px minmax(0, 1.2fr) 76px 44px minmax(0, 1fr) 38px",
        gap: "10px",
        alignItems: "center",
        background: selected ? "#f5f3ff" : "#fff",
        border: selected ? "1px solid #dcd4ff" : "1px solid #eef2f7",
        borderRadius: "16px",
        padding: "12px 14px",
        boxShadow: selected ? "0 10px 24px rgba(91,69,255,0.08)" : "none",
      }}
    >
      <span className="avatar" style={{ background: "#ede9fe", color: "#5b45ff", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{initials}</span>
      <div className="lead-main"><b style={{ display: "block", color: "#111827" }}>{name}</b><small style={{ color: "#6b7280" }}>{type}</small></div>
      <span className={`priority-pill ${priority === "Alta" ? "high" : "medium"}`} style={{ textAlign: "center", borderRadius: "999px", padding: "5px 8px", fontSize: "0.8rem", fontWeight: 700 }}>{priority}</span>
      <span className="lead-score" style={{ color: "#5b45ff", fontWeight: 700, textAlign: "center" }}>{score}</span>
      <div className="activity"><span style={{ display: "block", color: "#374151" }}>{activity}</span><small style={{ color: "#9ca3af" }}>{time}</small></div>
      <button aria-label={`Abrir ${name}`} style={{ border: "none", background: "#f8fafc", borderRadius: "999px", width: "34px", height: "34px", cursor: "pointer", color: "#5b45ff" }}>→</button>
    </article>
  );
}

function Timeline({ time, text, active = false }: { time: string; text: string; active?: boolean }) {
  return (
    <div className="timeline-row" style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <time style={{ minWidth: "44px", color: "#6b7280", fontWeight: 700 }}>{time}</time>
      <span className={active ? "active" : ""} style={{ width: "8px", height: "8px", borderRadius: "999px", background: active ? "#5b45ff" : "#cbd5e1", marginTop: "6px" }} />
      <p style={{ margin: 0, color: "#374151" }}>{text}</p>
    </div>
  );
}


