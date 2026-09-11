import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, validEmail, validToken } from "../api/_alerts.js";

test("normaliza emails antes de guardarlos", () => {
  assert.equal(normalizeEmail("  EMPRESA@Ejemplo.COM "), "empresa@ejemplo.com");
});

test("rechaza emails y tokens inválidos", () => {
  assert.equal(validEmail("empresa@ejemplo.com"), true);
  assert.equal(validEmail("sin-arroba"), false);
  assert.equal(validToken("not-a-token"), false);
  assert.equal(validToken("13319032-5cf2-4c39-a55f-9e5ec082d496"), true);
});
