import test from 'node:test';
import assert from 'node:assert/strict';
import { deterministicOfferPack } from '../api/_offer-pack.js';

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
