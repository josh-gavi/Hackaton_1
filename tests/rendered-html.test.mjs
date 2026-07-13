import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as ts from "typescript";

async function loadCalculateScore() {
  const source = await readFile(new URL("../lib/prospect/scoring.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const commonJsModule = { exports: {} };
  vm.runInNewContext(compiled, { exports: commonJsModule.exports, module: commonJsModule });
  return commonJsModule.exports.calculateScore;
}

test("keeps the product journey in the app source", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Encuentra una ruta para comenzar/);
  assert.match(page, /Futuro Academy/);
  assert.match(page, /Siguiente acción recomendada/i);
  assert.match(page, /Aprobar/);
  assert.match(page, /Rechazar/);
  assert.match(layout, /Nexo Futuro \| Orientación con contexto/);
  assert.match(css, /--lilac:#7467dc/);
  assert.doesNotMatch(page, /SkeletonPreview|react-loading-skeleton/);
});

test("keeps the prospect conversation behind a server API", async () => {
  const [orientation, component, route, scoring, groq] = await Promise.all([
    readFile(new URL("../app/orientacion/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/prospect-chat.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/prospect/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/prospect/scoring.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/prospect/groq.ts", import.meta.url), "utf8"),
  ]);

  assert.match(orientation, /VISTA DEL PROSPECTO/);
  assert.match(component, /\/api\/prospect\/chat/);
  assert.doesNotMatch(component, /SUPABASE_SERVICE_ROLE_KEY|GROQ_API_KEY/);
  assert.match(route, /persistProspect/);
  assert.match(scoring, /calculateScore/);
  assert.match(scoring, /Interés.*presupuesto.*afinidad.*urgencia/s);
  assert.match(groq, /composeAssistantMessage/);
  assert.match(groq, /No hagas preguntas/);
  assert.match(groq, /return requiredQuestion/);
  assert.match(groq, /\$\{cleanAcknowledgement\} \$\{requiredQuestion\}/);
});

test("assigns low, medium and high priority from confirmed prospect signals", async () => {
  const calculateScore = await loadCalculateScore();

  const low = calculateScore({
    leadType: "b2c",
    objective: "Solo estoy explorando por ahora",
    experience: "Soy principiante",
    budgetValue: 250,
    urgencyLabel: "Aún no lo sé",
  });
  const medium = calculateScore({
    leadType: "b2c",
    objective: "Quiero hacer crecer mis ahorros",
    experience: "Soy principiante",
    budgetValue: 600,
    urgencyLabel: "El próximo mes",
  });
  const high = calculateScore({
    leadType: "b2c",
    objective: "Quiero invertir mi dinero",
    experience: "Ya invierto actualmente",
    budgetValue: 1500,
    urgencyLabel: "Este mes",
  });

  assert.deepEqual([low.total, low.priority], [20, "Baja"]);
  assert.deepEqual([medium.total, medium.priority], [53, "Media"]);
  assert.deepEqual([high.total, high.priority], [85, "Alta"]);
});
