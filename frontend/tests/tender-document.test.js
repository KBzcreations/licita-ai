import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTenderPages } from '../api/_tender-document.js';

test('localiza requisitos y conserva la página como evidencia', () => {
  const result = analyzeTenderPages([{ page: 7, text: 'La solvencia económica se acreditará mediante un volumen anual de negocios de 300.000 euros. La garantía definitiva será del 5 por ciento.' }]);
  assert.equal(result.findings.some(x => x.area === 'Solvencia económica' && x.page === 7), true);
  assert.equal(result.findings.some(x => x.area === 'Garantías' && x.page === 7), true);
});

test('no convierte un área no localizada en ausencia contractual', () => {
  const result = analyzeTenderPages([{ page: 1, text: 'Objeto del contrato para servicios informáticos.' }]);
  assert.equal(result.coverage.find(x => x.area === 'Solvencia técnica').status, 'no localizado automáticamente');
  assert.match(result.warnings.join(' '), /No se localizó automáticamente/);
});
