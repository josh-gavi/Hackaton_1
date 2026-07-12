import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "La conexión de base de datos `DB` no está disponible. Configura una base de datos antes de usarla."
    );
  }

  return drizzle(env.DB, { schema });
}
