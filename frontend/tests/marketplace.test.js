import test from "node:test";
import assert from "node:assert/strict";
import { hashToken, normaliseOffer, publicOffer, validEmail, verificationEmail } from "../api/_marketplace.js";

test("normaliseOffer produces a comparable public offer", () => {
  assert.deepEqual(normaliseOffer({ company: "Tienda Sur", price: "849,90", description: "Portátil nuevo con transporte incluido", delivery: "48 horas", warranty: "3 años" }), {
    company: "Tienda Sur", price: 849.9, currency: "EUR", description: "Portátil nuevo con transporte incluido", delivery: "48 horas", warranty: "3 años",
  });
});

test("normaliseOffer rejects contact details in public copy", () => {
  assert.throws(() => normaliseOffer({ company: "Tienda", price: 100, description: "Llámame en el 600 123 123 para comprar" }), /teléfonos/);
});

test("email and token helpers are deterministic", () => {
  assert.equal(validEmail(" VENTAS@EMPRESA.ES "), "ventas@empresa.es");
  assert.equal(validEmail("mal@"), "");
  assert.equal(hashToken("abc"), hashToken("abc"));
  assert.notEqual(hashToken("abc"), hashToken("abd"));
});

test("publicOffer does not leak email or verification token", () => {
  const offer = publicOffer({ id: "off_1", intent_id: "req_1", company: "Comercio", price: 200, email: "privado@example.com", verify_token_hash: "secret" }, "2026-10-12T20:00:00Z", "off_1");
  assert.equal(offer.email, undefined);
  assert.equal(offer.verify_token_hash, undefined);
  assert.equal(offer.accepted, true);
});

test("verification email is accessible and includes a plain-text alternative", () => {
  const email = verificationEmail({ company: "Comercio", verifyUrl: "https://example.com/verify", offerId: "off_1" });
  assert.match(email.html, /html lang="es" dir="ltr"/);
  assert.match(email.html, /<title>/);
  assert.match(email.text, /https:\/\/example.com\/verify/);
});

test("verification email escapes untrusted company names", () => {
  const email = verificationEmail({ company: "<img src=x>", verifyUrl: "https://example.com/?a=1&b=2", offerId: "off_1" });
  assert.doesNotMatch(email.html, /<img src=x>/);
  assert.match(email.html, /&lt;img src=x&gt;/);
  assert.match(email.html, /a=1&amp;b=2/);
});
