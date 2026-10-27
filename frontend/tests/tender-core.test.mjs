import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTenderPages,makeMatrixCSV} from '../tender-core.mjs';
test('localiza solvencia y garantía con evidencia de página',()=>{
 const r=analyzeTenderPages([{page:7,document:'PCAP.pdf',text:'La solvencia económica se acredita con volumen anual de negocios. Se exigirá garantía definitiva.'}]);
 assert.ok(r.findings.some(f=>f.area==='Solvencia económica'&&f.page===7));
 assert.ok(r.findings.some(f=>f.area==='Garantías'&&f.document==='PCAP.pdf'));
});
test('un apartado no detectado no equivale a obligación inexistente',()=>{
 const r=analyzeTenderPages([{page:1,text:'Objeto del contrato de obras.'}]);
 assert.equal(r.coverage.find(x=>x.id==='tecnica').status,'no localizado automáticamente');
 assert.match(r.warnings.join(' '),/puede seguir siendo obligatoria/);
});
test('avisa sobre páginas sin texto',()=>{
 const r=analyzeTenderPages([{page:1,text:'Solvencia técnica.'},{page:2,text:''}]);
 assert.equal(r.pages_with_text,1);
 assert.match(r.warnings.join(' '),/1 páginas sin texto/);
});
test('exporta CSV de Excel, incluyendo tareas',()=>{
 const r=analyzeTenderPages([{page:1,document:'contrato.pdf',text:'La fecha límite de presentación se establece el lunes.'}]);
 const csv=makeMatrixCSV(r);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/Plazos y presentación/);
 assert.match(csv,/Pendiente/);
});
