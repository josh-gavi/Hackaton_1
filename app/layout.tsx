import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexo Futuro | Orientación con contexto",
  description: "Una experiencia que convierte conversaciones en aprendizaje, contexto comercial y acciones humanas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
