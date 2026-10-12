import test from "node:test";
import assert from "node:assert/strict";
import { detectBudget, fallbackIntent, normaliseAiIntent, publicTextIsSafe } from "../api/_intent-engine.js";

test("detects euro budget", () => {
  assert.deepEqual(detectBudget("Busco un portátil por menos de 900 €"), { amount: 900, currency: "EUR" });
});

test("builds a safe fallback intent", () => {
  const value = fallbackIntent("Necesito un portátil ligero por menos de 900 €", "España");
  assert.equal(value.category, "Tecnología");
  assert.equal(value.region, "España");
  assert.equal(value.budget.amount, 900);
});

test("normalises untrusted model output", () => {
  const fallback = fallbackIntent("Necesito una lavadora silenciosa", "Granada");
  const value = normaliseAiIntent({ title: "  Lavadora   silenciosa ", must_haves: ["Bajo ruido", "", "Entrega"] }, fallback);
  assert.equal(value.title, "Lavadora silenciosa");
  assert.deepEqual(value.must_haves, ["Bajo ruido", "Entrega"]);
  assert.equal(value.region, "Granada");
});

test("blocks contact details from public requests", () => {
  assert.equal(publicTextIsSafe("Escríbeme a persona@example.com"), false);
  assert.equal(publicTextIsSafe("Mi teléfono es 600 123 456"), false);
  assert.equal(publicTextIsSafe("Busco un portátil ligero por menos de 900 euros"), true);
});
