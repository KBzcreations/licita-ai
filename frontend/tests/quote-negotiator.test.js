import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { deterministicQuoteAnalysis, hashAccessToken, publicPreview, redactSensitive } from '../api/_quote-engine.js';
import prepareOffer from '../api/prepare-offer.js';
import { verifyStripeSignature } from '../api/stripe-webhook.js';

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('oculta contacto e IBAN antes de analizar', () => {
  const redacted = redactSensitive('Ana ana@example.com 612 345 678 ES91 2100 0418 4502 0005 1332');
  assert.doesNotMatch(redacted, /ana@example|612 345|ES91/);
  assert.match(redacted, /EMAIL OCULTO/);
  assert.match(redacted, /IBAN OCULTO/);
});

test('el diagnóstico no inventa precio y la vista previa reserva contenido', () => {
  const report = deterministicQuoteAnalysis({ text: 'Presupuesto de reforma con trabajos de pintura y materiales incluidos. El pago se realizará al finalizar el trabajo.', category: 'Reforma', region: 'Sevilla' });
  assert.equal(report.facts.total, null);
  assert.match(report.facts.total_formatted, /no identificado/);
  assert.equal(report.risks.some((risk) => /precio total/i.test(risk.title)), true);
  const preview = publicPreview(report);
  assert.equal(preview.risks.length <= 2, true);
  assert.equal(preview.negotiation_message, undefined);
});

test('checkout cobra 9,90 euros, pago único y no fuerza métodos ni impuestos', async () => {
  const old = { fetch: global.fetch, key: process.env.STRIPE_SECRET_KEY, enabled: process.env.PAYMENTS_ENABLED, url: process.env.SUPABASE_URL, service: process.env.SUPABASE_SERVICE_KEY };
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit'; process.env.PAYMENTS_ENABLED = 'true'; process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SERVICE_KEY = 'service';
  const token = 'access'; const record = { access_token_hash: hashAccessToken(token), report: deterministicQuoteAnalysis({ text: 'Presupuesto completo por 1.000 euros con IVA incluido, pago al finalizar, plazo 5 días y garantía de un año.' }) };
  let stripeRequest;
  global.fetch = async (url, options = {}) => {
    if (String(url).startsWith('https://db.test')) return { ok: true, json: async () => [{ metadata: record }] };
    stripeRequest = { url, options }; return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.test/session' }) };
  };
  const res = response();
  await prepareOffer({ method: 'POST', headers: { host: 'www.licita-ai.com' }, body: { action: 'checkout', analysisId: 'id-1', accessToken: token } }, res);
  const params = new URLSearchParams(stripeRequest.options.body);
  assert.equal(params.get('mode'), 'payment');
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '990');
  assert.equal(params.get('metadata[scope]'), 'quote_analysis');
  assert.equal(params.has('payment_method_types[0]'), false);
  assert.equal(params.has('automatic_tax[enabled]'), false);
  assert.equal(stripeRequest.options.headers['Stripe-Version'], '2026-08-26.dahlia');
  global.fetch = old.fetch;
  for (const [key, value] of [['STRIPE_SECRET_KEY', old.key], ['PAYMENTS_ENABLED', old.enabled], ['SUPABASE_URL', old.url], ['SUPABASE_SERVICE_KEY', old.service]]) value === undefined ? delete process.env[key] : process.env[key] = value;
});

test('la firma de Stripe exige una marca temporal reciente', () => {
  const secret = 'whsec_test', payload = '{"id":"evt_1"}', timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  assert.equal(verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(verifyStripeSignature(payload, `t=${timestamp - 700},v1=${signature}`, secret), false);
});
