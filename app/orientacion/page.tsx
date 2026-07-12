import Link from "next/link";

import { ProspectChat } from "@/components/prospect-chat";

export const metadata = {
  title: "Orientación | Nexo Futuro",
  description: "Conversa con Nexo y prepara una orientación con contexto.",
};

export default function OrientationPage() {
  return (
    <main>
      <nav className="topbar" aria-label="Navegación principal">
        <Link className="brand" href="/" aria-label="Ir al inicio de Nexo Futuro">
          <span className="brand-mark">N</span>
          <span>Nexo <b>Futuro</b></span>
        </Link>
        <div className="nav-links">
          <Link href="/">Inicio</Link>
          <Link className="active" href="/orientacion">Orientación</Link>
          <Link href="/?screen=academy">Academy</Link>
        </div>
        <Link className="small-cta" href="/?screen=crm">Acceso ejecutivo</Link>
      </nav>

      <section className="orientation-screen">
        <header className="orientation-intro">
          <div>
            <p className="eyebrow">VISTA DEL PROSPECTO</p>
            <h1>Encuentra una ruta para comenzar</h1>
            <p>Cuéntanos lo que buscas. Prepararemos el contexto para orientarte mejor.</p>
          </div>
          <span className="orientation-secure"><i /> Sesión segura</span>
        </header>
        <ProspectChat />
      </section>
    </main>
  );
}
