"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { QualificationSettings } from "@/components/qualification-settings";
import { supabase } from "@/lib/supabase";

type Access = { id: string; fullName: string; role: "administrador" | "executive" };
type LeadStatus = "nuevo" | "calificado" | "en_seguimiento" | "interesado" | "cliente" | "descartado";
type Action = { actionType: string | null; description: string | null; executedAt: string | null };
type DashboardLead = {
  id: string;
  assigned_user_id: string | null;
  full_name: string | null;
  email: string | null;
  company: string | null;
  company_size: string | null;
  decision_role: string | null;
  lead_type: "b2b" | "b2c" | null;
  objective: string | null;
  experience: string | null;
  budget: number | null;
  urgency_label: string | null;
  lead_score: number | null;
  status: LeadStatus | null;
  created_at: string | null;
  summary: string;
  academy: { topic: string | null; quizScore: number | null; completedAt: string | null } | null;
  actions: Action[];
  recommendedAction: string;
};
type Metrics = {
  totalLeads: number;
  highPriority: number;
  inFollowUp: number;
  newLeads: number;
  academyCompleted: number;
  academyRate: number;
  activeExecutives: number;
};
type PotentialUser = {
  id: string;
  leadId: string;
  email: string;
  accountStatus: "pending_verification" | "active" | "disabled";
  leadName: string | null;
  leadStatus: string | null;
  advisorName: string | null;
};

const statusLabels: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  calificado: "Calificado",
  en_seguimiento: "En seguimiento",
  interesado: "Interesado",
  cliente: "Cliente",
  descartado: "Descartado",
};

function initials(value: string | null) {
  return (value || "Lead")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short" }).format(new Date(value))
    : "Sin fecha";
}

function priority(score: number | null) {
  if ((score ?? 0) >= 70) return "Alta";
  if ((score ?? 0) >= 40) return "Media";
  return "Baja";
}

export function CrmDashboard({ access, onLogout }: { access: Access; onLogout: () => void }) {
  const [leads, setLeads] = useState<DashboardLead[]>([]);
  const [executives, setExecutives] = useState<Array<{ id: string; fullName: string }>>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"todos" | LeadStatus>("todos");
  const [view, setView] = useState<"leads" | "potential">("leads");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [potentialUsers, setPotentialUsers] = useState<PotentialUser[]>([]);
  const [potentialLoading, setPotentialLoading] = useState(false);
  const [potentialError, setPotentialError] = useState<string | null>(null);
  const [selectedPotentialLeadId, setSelectedPotentialLeadId] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [publishingUpdate, setPublishingUpdate] = useState(false);
  const [clientUpdateState, setClientUpdateState] = useState<string | null>(null);
  const [decisionMode, setDecisionMode] = useState<"approved" | "rejected" | "edited" | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionState, setDecisionState] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");

      const response = await fetch("/api/crm/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as {
        leads?: DashboardLead[];
        executives?: Array<{ id: string; fullName: string }>;
        metrics?: Metrics;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "No pudimos cargar el dashboard.");

      const receivedLeads = data.leads ?? [];
      setLeads(receivedLeads);
      setExecutives(data.executives ?? []);
      setMetrics(data.metrics ?? null);
      setSelectedLeadId((current) =>
        receivedLeads.some((lead) => lead.id === current) ? current : receivedLeads[0]?.id ?? null,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPotentialUsers = useCallback(async () => {
    setPotentialLoading(true);
    setPotentialError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");

      const response = await fetch("/api/crm/potential-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { accounts?: PotentialUser[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos cargar los usuarios potenciales.");

      const accounts = data.accounts ?? [];
      setPotentialUsers(accounts);
      setSelectedPotentialLeadId((current) =>
        accounts.some((account) => account.leadId === current) ? current : accounts[0]?.leadId || "",
      );
    } catch (requestError) {
      setPotentialError(
        requestError instanceof Error ? requestError.message : "No pudimos cargar los usuarios potenciales.",
      );
    } finally {
      setPotentialLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );
  const filteredLeads = useMemo(
    () => (statusFilter === "todos" ? leads : leads.filter((lead) => lead.status === statusFilter)),
    [leads, statusFilter],
  );
  const isAdmin = access.role === "administrador";
  const countByStatus = (status: LeadStatus) => leads.filter((lead) => lead.status === status).length;

  function selectLead(leadId: string) {
    setSelectedLeadId(leadId);
    setDecisionMode(null);
    setDecisionNote("");
    setDecisionState(null);
  }

  function showAllLeads() {
    setView("leads");
    setStatusFilter("todos");
  }

  function openPotentialUsers() {
    setView("potential");
    void loadPotentialUsers();
  }

  async function updateLead(payload: { status?: LeadStatus; assignedUserId?: string }) {
    if (!selectedLead || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");

      const response = await fetch("/api/crm/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leadId: selectedLead.id, ...payload }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos actualizar el lead.");

      if (payload.status) setStatusFilter("todos");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos actualizar el lead.");
    } finally {
      setSaving(false);
    }
  }

  async function publishUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = clientMessage.trim();
    if (!selectedPotentialLeadId || !message || publishingUpdate) return;

    setPublishingUpdate(true);
    setClientUpdateState(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");

      const response = await fetch("/api/crm/client-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leadId: selectedPotentialLeadId, message }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos publicar la novedad.");

      setClientMessage("");
      setClientUpdateState("Novedad publicada. El prospecto ya puede verla en Mi cuenta.");
    } catch (requestError) {
      setClientUpdateState(
        requestError instanceof Error ? requestError.message : "No pudimos publicar la novedad.",
      );
    } finally {
      setPublishingUpdate(false);
    }
  }

  async function recordDecision(decision: "approved" | "rejected" | "edited") {
    if (!selectedLead || saving) return;
    setSaving(true);
    setDecisionState(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");

      const response = await fetch("/api/crm/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leadId: selectedLead.id, decision, decisionNote }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos guardar tu decisión.");

      setDecisionState("Decisión guardada en el historial del lead.");
      setDecisionMode(null);
      setDecisionNote("");
      await loadDashboard();
    } catch (requestError) {
      setDecisionState(
        requestError instanceof Error ? requestError.message : "No pudimos guardar tu decisión.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="crm-screen">
      <header className="crm-header">
        <div>
          <p className="eyebrow">VISTA PRIVADA · CRM · {isAdmin ? "ADMINISTRADOR" : "EJECUTIVO"}</p>
          <h1>{isAdmin ? "Panel del equipo" : `Buenos días, ${access.fullName.split(" ")[0]}`}</h1>
          <p>
            {isAdmin
              ? "Supervisa la distribución, el avance y los seguimientos del equipo."
              : "Estas son tus oportunidades y seguimientos asignados."}
          </p>
        </div>
        <div className="crm-actions">
          <button className="search-button" onClick={() => void loadDashboard()} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
          <button className="search-button" onClick={onLogout}>Cerrar sesión</button>
          <span className="profile-avatar" title={access.fullName} aria-label={`Sesión de ${access.fullName}`}>
            {initials(access.fullName)}
          </span>
        </div>
      </header>

      <div className="metric-grid">
        <Metric value={loading ? "…" : String(metrics?.totalLeads ?? 0)} label={isAdmin ? "Total de leads" : "Mis leads"} trend={isAdmin ? "Cartera del equipo" : "Asignados a ti"} />
        <Metric value={loading ? "…" : String(metrics?.highPriority ?? 0)} label="Prioridad alta" trend="Requieren atención" accent="orange" />
        <Metric value={loading ? "…" : String(metrics?.inFollowUp ?? 0)} label="En seguimiento" trend="Trabajo activo" accent="blue" />
        <Metric value={loading ? "…" : `${metrics?.academyRate ?? 0}%`} label="Academy completada" trend={`${metrics?.academyCompleted ?? 0} leads con ruta`} accent="green" />
      </div>

      {isAdmin && (
        <section className="admin-control-card">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h2>Distribución del equipo</h2>
            <p>{metrics?.activeExecutives ?? 0} ejecutivos activos · {metrics?.newLeads ?? 0} leads nuevos por revisar.</p>
          </div>
          <button className="outline-button" onClick={showAllLeads}>Ver todos los leads</button>
        </section>
      )}

      <div className="crm-view-switch" aria-label="Secciones del CRM">
        <button className={view === "leads" ? "active" : ""} onClick={() => setView("leads")}>Oportunidades</button>
        <button className={view === "potential" ? "active" : ""} onClick={openPotentialUsers}>Usuarios potenciales</button>
      </div>

      {error && <p className="auth-error">{error}</p>}
      {isAdmin && <QualificationSettings />}

      {view === "potential" ? (
        <section className="potential-users-card">
          <div className="leads-heading">
            <div>
              <h2>Usuarios potenciales</h2>
              <p>Cuentas de prospectos que pueden recibir novedades del asesor.</p>
            </div>
            <button className="filter-button" onClick={() => void loadPotentialUsers()} disabled={potentialLoading}>
              {potentialLoading ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
          {potentialError && <p className="auth-error">{potentialError}</p>}
          {potentialLoading ? <p className="more-leads">Cargando cuentas de prospectos…</p> : potentialUsers.length ? (
            <>
              <form className="client-update-form" onSubmit={publishUpdate}>
                <label>
                  Destinatario
                  <select value={selectedPotentialLeadId} onChange={(event) => setSelectedPotentialLeadId(event.target.value)}>
                    {potentialUsers.map((account) => <option key={account.id} value={account.leadId}>{account.leadName || account.email}</option>)}
                  </select>
                </label>
                <label>
                  Mensaje para el prospecto
                  <textarea value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} maxLength={2000} placeholder="Escribe una novedad clara para el prospecto." required />
                </label>
                <button className="primary-button" disabled={publishingUpdate}>{publishingUpdate ? "Publicando…" : "Publicar novedad"}</button>
                {clientUpdateState && <p className={clientUpdateState.startsWith("Novedad") ? "client-update-success" : "auth-error"}>{clientUpdateState}</p>}
              </form>
              <div className="potential-user-list">
                {potentialUsers.map((account) => (
                  <article className="potential-user-row" key={account.id}>
                    <span className="avatar">{initials(account.leadName || account.email)}</span>
                    <div><b>{account.leadName || "Prospecto"}</b><small>{account.email}</small></div>
                    <span className={`account-status ${account.accountStatus}`}>{account.accountStatus === "active" ? "Cuenta activa" : "Por verificar"}</span>
                    <div><small>ASESOR</small><p>{account.advisorName || "Sin asignar"}</p></div>
                    <div><small>ESTADO</small><p>{account.leadStatus || "nuevo"}</p></div>
                  </article>
                ))}
              </div>
            </>
          ) : <p className="more-leads">No hay usuarios potenciales asignados a esta vista.</p>}
        </section>
      ) : (
        <div className="crm-layout">
          <div className="leads-area">
            <div className="leads-heading">
              <div><h2>{isAdmin ? "Oportunidades del equipo" : "Mis oportunidades"}</h2><p>Información actualizada desde Supabase.</p></div>
            </div>
            <div className="pipeline-tabs" aria-label="Filtrar leads por estado">
              <button className={statusFilter === "todos" ? "active" : ""} onClick={() => setStatusFilter("todos")}>Todos <span>{leads.length}</span></button>
              <button className={statusFilter === "nuevo" ? "active" : ""} onClick={() => setStatusFilter("nuevo")}>Nuevos <span>{countByStatus("nuevo")}</span></button>
              <button className={statusFilter === "calificado" ? "active" : ""} onClick={() => setStatusFilter("calificado")}>Calificados <span>{countByStatus("calificado")}</span></button>
              <button className={statusFilter === "en_seguimiento" ? "active" : ""} onClick={() => setStatusFilter("en_seguimiento")}>En seguimiento <span>{countByStatus("en_seguimiento")}</span></button>
            </div>
            {loading ? <p className="admin-loading">Cargando oportunidades…</p> : filteredLeads.length ? (
              <div className="lead-list">
                {filteredLeads.map((lead) => (
                  <button className={`dashboard-lead-row ${selectedLeadId === lead.id ? "selected" : ""}`} key={lead.id} onClick={() => selectLead(lead.id)} aria-pressed={selectedLeadId === lead.id}>
                    <span className="avatar">{initials(lead.full_name || lead.email)}</span>
                    <div className="lead-main"><b>{lead.full_name || lead.email || "Lead sin nombre"}</b><small>{lead.lead_type?.toUpperCase() || "Lead"} · {lead.company || "Personal"}</small></div>
                    <span className={`priority-pill ${priority(lead.lead_score) === "Alta" ? "high" : "medium"}`}>{priority(lead.lead_score)}</span>
                    <span className="lead-score">{lead.lead_score ?? 0}</span>
                    <div className="activity"><span>{lead.academy ? "Completó Academy" : statusLabels[lead.status ?? "nuevo"]}</span><small>{formatDate(lead.created_at)}</small></div>
                    <span aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            ) : <p className="more-leads">No hay leads en este filtro.</p>}
          </div>

          <aside className="lead-detail">
            {selectedLead ? (
              <>
                <div className="detail-head">
                  <div className="detail-person">
                    <span className="avatar large-avatar">{initials(selectedLead.full_name || selectedLead.email)}</span>
                    <div><h2>{selectedLead.full_name || selectedLead.email}</h2><p>Lead {selectedLead.lead_type?.toUpperCase()} · Creado {formatDate(selectedLead.created_at)}</p></div>
                  </div>
                </div>
                <div className="priority-banner"><span>✦</span><div><small>PRIORIDAD {priority(selectedLead.lead_score).toUpperCase()} · {selectedLead.lead_score ?? 0}/100</small><p>{selectedLead.recommendedAction}</p></div></div>
                <div className="detail-section"><div className="detail-label"><h3>Resumen de IA</h3><span>Generado desde la conversación</span></div><p>{selectedLead.summary}</p></div>
                <div className="detail-grid">
                  <DetailItem label="OBJETIVO" value={selectedLead.objective || "No registrado"} />
                  <DetailItem label="EXPERIENCIA" value={selectedLead.experience || "No registrada"} />
                  <DetailItem label="ACADEMY" value={selectedLead.academy ? `${selectedLead.academy.topic} · ${selectedLead.academy.quizScore}/3` : "No completada"} />
                  <DetailItem label="URGENCIA" value={selectedLead.urgency_label || "No registrada"} />
                  {selectedLead.lead_type === "b2b" && <DetailItem label="EMPRESA" value={selectedLead.company || "No registrada"} />}
                  {selectedLead.lead_type === "b2b" && <DetailItem label="TAMAÑO" value={selectedLead.company_size || "No registrado"} />}
                  {selectedLead.lead_type === "b2b" && <DetailItem label="DECISIÓN" value={selectedLead.decision_role || "No registrada"} />}
                </div>
                <div className="lead-update-panel">
                  <label>
                    Estado del seguimiento
                    <select value={selectedLead.status ?? "nuevo"} onChange={(event) => void updateLead({ status: event.target.value as LeadStatus })} disabled={saving}>
                      {(Object.keys(statusLabels) as LeadStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  </label>
                  {isAdmin && (
                    <label>
                      Ejecutivo asignado
                      <select value={selectedLead.assigned_user_id ?? ""} onChange={(event) => event.target.value && void updateLead({ assignedUserId: event.target.value })} disabled={saving}>
                        <option value="">Sin asignar</option>
                        {executives.map((executive) => <option key={executive.id} value={executive.id}>{executive.fullName}</option>)}
                      </select>
                    </label>
                  )}
                  <small>{saving ? "Guardando cambio…" : "Cada cambio se registra en el historial."}</small>
                </div>
                <ActionDecisionPanel lead={selectedLead} mode={decisionMode} note={decisionNote} saving={saving} state={decisionState} onChoose={setDecisionMode} onNote={setDecisionNote} onSave={recordDecision} />
                <div className="timeline">
                  <h3>Actividad reciente</h3>
                  <Timeline time={formatDate(selectedLead.created_at)} text="Lead registrado en el sistema" active />
                  {selectedLead.academy && <Timeline time={formatDate(selectedLead.academy.completedAt)} text="Completó Futuro Academy" />}
                  {selectedLead.actions.slice(0, 3).map((action, index) => <Timeline key={`${action.executedAt}-${index}`} time={formatDate(action.executedAt)} text={action.description || action.actionType || "Actividad registrada"} />)}
                </div>
              </>
            ) : <div className="admin-placeholder"><h3>Selecciona un lead</h3><p>Elige una oportunidad para revisar su contexto y seguimiento.</p></div>}
          </aside>
        </div>
      )}
    </section>
  );
}

function Metric({ value, label, trend, accent = "ink" }: { value: string; label: string; trend: string; accent?: string }) {
  return <div className={`metric ${accent}`}><b>{value}</b><span>{label}</span><small>{trend}</small></div>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><p>{value}</p></div>;
}

function Timeline({ time, text, active = false }: { time: string; text: string; active?: boolean }) {
  return <div className="timeline-row"><time>{time}</time><span className={active ? "active" : ""} /><p>{text}</p></div>;
}

function ActionDecisionPanel({ lead, mode, note, saving, state, onChoose, onNote, onSave }: {
  lead: DashboardLead;
  mode: "approved" | "rejected" | "edited" | null;
  note: string;
  saving: boolean;
  state: string | null;
  onChoose: (mode: "approved" | "rejected" | "edited" | null) => void;
  onNote: (value: string) => void;
  onSave: (decision: "approved" | "rejected" | "edited") => void;
}) {
  return (
    <section className="action-decision-panel">
      <div>
        <p className="eyebrow">SIGUIENTE ACCIÓN SUGERIDA</p>
        <h2>{lead.recommendedAction}</h2>
        <p>La IA propone una acción para este lead; la decisión final queda registrada a tu nombre.</p>
      </div>
      <div className="approval-actions">
        <button className="approve" type="button" onClick={() => onSave("approved")} disabled={saving}>✓ Aprobar</button>
        <button className="edit" type="button" onClick={() => onChoose("edited")} disabled={saving}>Editar</button>
        <button className="reject" type="button" onClick={() => onSave("rejected")} disabled={saving}>Rechazar</button>
      </div>
      {mode === "edited" && (
        <div className="action-edit-form">
          <label>Acción ajustada<input value={note} onChange={(event) => onNote(event.target.value)} maxLength={500} placeholder="Ej.: Enviar material y llamar la próxima semana" /></label>
          <button className="primary-button" type="button" disabled={saving || !note.trim()} onClick={() => onSave("edited")}>Guardar decisión</button>
          <button className="outline-button" type="button" onClick={() => onChoose(null)}>Cancelar</button>
        </div>
      )}
      {state && <p className={state.startsWith("Decisión") ? "client-update-success" : "auth-error"}>{state}</p>}
    </section>
  );
}
