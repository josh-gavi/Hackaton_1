import { createClient } from "@supabase/supabase-js";

/**
 * Cliente para componentes que se ejecutan en el navegador.
 * Solo utiliza la URL y la clave publicable de Supabase.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Falta configurar NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
    );
  }

  return createClient(url, publishableKey);
}
