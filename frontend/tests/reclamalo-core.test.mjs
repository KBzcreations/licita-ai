import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClaimText, evaluateCase, getAesaChecklist, LEGAL_VERSION } from '../reclamalo-core.mjs';

const base = {
  incident: 'delay', departureScope: 'eu', arrivalScope: 'eu', euOperatingCarrier: 'yes',
  distanceBand: 'short', arrivalDelayMinutes: 190, passengers: 2, extraordinary: 'no',
  rerouted: 'no', hasConnections: 'no', singleBooking: 'yes',
};

test('calcula 250 € por pasajero en retraso cubierto de más de tres horas', () => {
  const result = evaluateCase(base);
  assert.equal(result.status, 'likely');
  assert.equal(result.amountPerPassenger, 250);
  assert.equal(result.totalAmount, 500);
});

test('aplica 300 € en vuelos extracomunitarios de más de 3.500 km con retraso de 3 a 4 horas', () => {
  const result = evaluateCase({ ...base, distanceBand: 'long', arrivalDelayMinutes: 210 });
  assert.equal(result.amountPerPassenger, 300);
});

test('excluye la cancelación notificada con 14 días o más', () => {
  const result = evaluateCase({ ...base, incident: 'cancellation', noticeDays: 14 });
  assert.equal(result.status, 'unlikely');
  assert.equal(result.totalAmount, 0);
});

test('excluye una alternativa dentro de márgenes con menos de 7 días', () => {
  const result = evaluateCase({
    ...base, incident: 'cancellation', noticeDays: 2, rerouted: 'yes',
    rerouteDepartureEarlyMinutes: 45, arrivalDelayMinutes: 90,
  });
  assert.equal(result.status, 'unlikely');
});

test('reduce al 50 % cuando la alternativa llega dentro del margen', () => {
  const result = evaluateCase({
    ...base, incident: 'cancellation', noticeDays: 1, rerouted: 'yes',
    rerouteDepartureEarlyMinutes: 0, arrivalDelayMinutes: 120,
  });
  assert.equal(result.amountPerPassenger, 125);
  assert.equal(result.reduced, true);
});

test('marca para revisión una causa extraordinaria alegada', () => {
  const result = evaluateCase({ ...base, extraordinary: 'yes' });
  assert.equal(result.status, 'review');
  assert.match(result.reasons.join(' '), /debe probar/i);
});

test('detecta vuelo de llegada no cubierto cuando la operadora no es europea', () => {
  const result = evaluateCase({ ...base, departureScope: 'outside', arrivalScope: 'eu', euOperatingCarrier: 'no' });
  assert.equal(result.status, 'outside');
});

test('no aplica las reglas actuales a vuelos desde el 23 de octubre de 2027', () => {
  const result = evaluateCase({ ...base, flightDate: '2027-10-23' });
  assert.equal(result.status, 'review');
  assert.match(result.headline, /reglas futuras/i);
});

test('pide revisar beneficios del tercer país en vuelos de llegada', () => {
  const result = evaluateCase({
    ...base, departureScope: 'outside', arrivalScope: 'eu', euOperatingCarrier: 'yes', thirdCountryBenefits: 'unknown',
  });
  assert.equal(result.status, 'review');
  assert.match(result.reasons.join(' '), /país de salida/i);
});

test('la carta incluye hechos y no inventa una compensación cuando no corresponde', () => {
  const input = { ...base, incident: 'cancellation', noticeDays: 20, claimantName: 'Ana', airline: 'Aerolínea', facts: 'El vuelo fue cancelado.' };
  const result = evaluateCase(input);
  const letter = buildClaimText(input, result);
  assert.match(letter, /Ana/);
  assert.match(letter, /respuesta motivada/i);
  assert.ok(!letter.includes('Solicito el abono de 0'));
});

test('el checklist pide la reserva completa cuando hay conexión', () => {
  assert.match(getAesaChecklist({ hasConnections: 'yes' }).join(' '), /reserva completa/i);
  assert.equal(LEGAL_VERSION, '2026-11-11');
});

test('un retraso de menos de 3 horas no muestra importe aunque la causa sea desconocida', () => {
  const result = evaluateCase({ ...base, arrivalDelayMinutes: 150, extraordinary: 'unknown' });
  assert.equal(result.status, 'unlikely');
  assert.equal(result.amountPerPassenger, 0);
  assert.equal(result.totalAmount, 0);
});

test('una cancelación avisada con 14 días sigue sin importe aunque haya conexiones en reservas separadas', () => {
  const result = evaluateCase({ ...base, incident: 'cancellation', noticeDays: 20, hasConnections: 'yes', singleBooking: 'no' });
  assert.equal(result.status, 'unlikely');
  assert.equal(result.totalAmount, 0);
});

test('la carta solo recoge hechos favorables y nunca frases dirigidas al pasajero', () => {
  const cases = [
    { ...base, arrivalDelayMinutes: 150 },
    { ...base, extraordinary: 'unknown' },
    { ...base, incident: 'cancellation', noticeDays: 20 },
    { ...base, incident: 'cancellation', noticeDays: '' },
    { ...base, hasConnections: 'yes', singleBooking: 'no' },
  ];
  for (const input of cases) {
    const letter = buildClaimText({ ...input, claimantName: 'Ana', airline: 'Vueling' }, evaluateCase(input));
    assert.doesNotMatch(letter, /Falta|Hay que|No des por|inferior a 3 horas|al menos 14 días|no parece aplicable|reservas separadas/);
  }
});
