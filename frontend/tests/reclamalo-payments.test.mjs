import test from 'node:test';
import assert from 'node:assert/strict';
import checkoutHandler from '../api/create-checkout-session.js';
import webhookHandler from '../api/stripe-webhook.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('el endpoint de checkout rechaza siempre los cobros', () => {
  const res = responseRecorder();
  checkoutHandler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'PAYMENTS_DISABLED');
});

test('el webhook no procesa pagos sin autorización específica de Reclámalo', async () => {
  const previous = process.env.RECLAMALO_PAYMENTS_AUTHORIZED;
  delete process.env.RECLAMALO_PAYMENTS_AUTHORIZED;
  const res = responseRecorder();
  await webhookHandler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'PAYMENTS_DISABLED');
  if (previous === undefined) delete process.env.RECLAMALO_PAYMENTS_AUTHORIZED;
  else process.env.RECLAMALO_PAYMENTS_AUTHORIZED = previous;
});
