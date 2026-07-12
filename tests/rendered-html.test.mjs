import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the product journey in the app source", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Encuentra una ruta para comenzar/);
  assert.match(page, /Futuro Academy/);
  assert.match(page, /Tu tablero de oportunidades/);
  assert.match(page, /Siguiente acción recomendada/i);
  assert.match(page, /Aprobar/);
  assert.match(page, /Rechazar/);
  assert.match(layout, /Nexo Futuro \| Orientación con contexto/);
  assert.match(css, /--lilac:#7467dc/);
  assert.doesNotMatch(page, /SkeletonPreview|react-loading-skeleton/);
});
