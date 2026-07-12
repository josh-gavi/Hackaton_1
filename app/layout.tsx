import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "nexo-futuro.local";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const siteUrl = new URL(`${protocol}://${host}`);

  return {
    metadataBase: siteUrl,
    title: "Nexo Futuro | Orientación con contexto",
    description: "Una experiencia que convierte conversaciones en aprendizaje, contexto comercial y acciones humanas.",
    openGraph: {
      title: "Nexo Futuro | Orientación con contexto",
      description: "Una conversación que abre oportunidades.",
      images: [{ url: "/og.png", width: 1734, height: 908, alt: "Nexo Futuro" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Nexo Futuro",
      description: "Una conversación que abre oportunidades.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
