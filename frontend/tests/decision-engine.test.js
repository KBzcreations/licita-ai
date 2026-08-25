import test from "node:test";
import assert from "node:assert/strict";
import { deterministicDecision, mergeAiAdvice } from "../api/_decision-engine.js";

const tender = { titulo: "Servicio de desarrollo web y mantenimiento cloud", organismo: "Ayuntamiento de Granada", presupuesto: 120000, fecha_limite: "2026-09-30", tecnologias: ["React", "AWS"], resumen_comercial: "Desarrollo web, alojamiento cloud y soporte", url_origen: "https://contrataciondelestado.es/example" };
const company = { empresa: "Acme Tech", sector_actividad: "web", sector_actividad_desc: "Desarrollo web y cloud", tecnologias_interes: ["React", "AWS"], facturacion_anual: 500000, empleados: 12, contrato_maximo: 150000, experiencia_publica: "Sí", referencias_similares: "Portal web de 100.000 euros" };

test("no inventa margen ni requisitos ausentes", () => {
  const result = deterministicDecision(tender, company, new Date("2026-08-25T10:00:00Z"));
  assert.equal(result.economics.margen, null);
  assert.ok(result.unknowns.some((x) => x.includes("PCAP")));
  assert.ok(result.verified.some((x) => x.label === "Presupuesto publicado"));
});

test("un plazo vencido produce descarte objetivo", () => {
  const result = deterministicDecision({ ...tender, fecha_limite: "2026-01-01" }, company, new Date("2026-08-25T10:00:00Z"));
  assert.equal(result.verdict, "DESCARTAR");
  assert.equal(result.blockers[0].code, "deadline");
});

test("la IA no puede alterar la decision determinista", () => {
  const base = deterministicDecision(tender, company, new Date("2026-08-25T10:00:00Z"));
  const result = mergeAiAdvice(base, { verdict: "PRESENTAR", score: 100, blockers: [], explanation: "Comentario seguro" });
  assert.equal(result.verdict, base.verdict);
  assert.equal(result.score, base.score);
  assert.deepEqual(result.blockers, base.blockers);
  assert.equal(result.explanation, "Comentario seguro");
});
