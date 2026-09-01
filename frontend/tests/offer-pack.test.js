import test from 'node:test';
import assert from 'node:assert/strict';
import { deterministicOfferPack } from '../api/_offer-pack.js';
import prepareOffer from '../api/prepare-offer.js';

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('genera un dossier completo sin inventar requisitos del pliego', () => {
  const pack = deterministicOfferPack({ titulo: 'Servicio web', organismo: 'Ayuntamiento', presupuesto: 120000, url_origen: 'https://contrataciondelestado.es/x' });
  assert.equal(pack.facts.some(x => x.label === 'Presupuesto publicado'), true);
  assert.equal(pack.checklist.length, 7);
  assert.equal(pack.checklist.find(x => x.area === 'Técnica').status, 'pendiente');
  assert.match(pack.limitations, /verificarse en PCAP\/PPT/);
  assert.equal(pack.folder_structure.length, 7);
});

test('señala un bloqueo de capacidad solo cuando existen ambas cifras', () => {
  const unknown = deterministicOfferPack({ presupuesto: 300000 }, {});
  const blocked = deterministicOfferPack({ presupuesto: 300000 }, { contrato_maximo: 100000 });
  assert.equal(unknown.blockers.length, 0);
  assert.equal(blocked.blockers.length, 1);
});

test('incorpora evidencias del PDF a la matriz sin inventar cumplimiento', () => {
  const pack = deterministicOfferPack(
    { titulo: 'Servicio cloud' },
    {},
    { file_name: 'PCAP.pdf', page_count: 42, findings: [{ area: 'Solvencia técnica', page: 18, evidence: 'Los licitadores acreditarán tres servicios similares.' }], coverage: [], warnings: [] },
  );
  const technical = pack.checklist.find(x => x.area === 'Técnica');
  assert.equal(technical.status, 'localizado');
  assert.match(technical.evidence, /Página 18/);
  assert.equal(pack.document_analysis.page_count, 42);
  assert.equal(pack.final_control.length, 6);
});

test('checkout cobra 49 euros, pago único y conserva el alcance del expediente', async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousFetch = global.fetch;
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
  let request;
  global.fetch = async (url, options) => { request = { url, options }; return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.test/session' }) }; };
  const res = response();
  await prepareOffer({ method: 'POST', headers: { host: 'www.licita-ai.com' }, body: { action: 'checkout', tenderId: 'EXP-1', title: 'Servicio cloud' } }, res);
  const params = new URLSearchParams(request.options.body);
  assert.equal(params.get('mode'), 'payment');
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '4900');
  assert.equal(params.get('metadata[scope]'), 'licitacion_dossier');
  assert.equal(request.options.headers['Stripe-Version'], '2026-07-29.dahlia');
  global.fetch = previousFetch;
  if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previousKey;
});
