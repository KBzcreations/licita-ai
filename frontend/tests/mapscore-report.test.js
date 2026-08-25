import test from 'node:test';
import assert from 'node:assert/strict';
import {deterministicReport,mergeAi,reportIsComplete} from '../api/_mapscore-report.js';

const deoga={name:'Deoga Desarrollo Y Ejecucion de Obra SL',address:'El Charcón, 110, Loc, Genil, 18008 Granada',category:'Contratista general',website:'http://www.deoga.es/',phone:'958 22 52 51',rating:4.4,reviews:10,hours:[],status:'OPERATIONAL',has_photos:true,photo_sample_count:10};
const web={available:true,reachable:true,status:200,title:'DEOGA',meta_description:'Construcción en Granada',has_h1:true,has_localbusiness_schema:false};

test('DEOGA conserva todos los datos verificados y no inventa ausencias',()=>{const r=deterministicReport(deoga,web);assert.equal(r.datos_verificados.valoracion,4.4);assert.equal(r.datos_verificados.resenas,10);assert.match(r.datos_verificados.fotos,/Sí.*10/);assert.match(r.datos_verificados.horarios,/no implica/i);assert.ok(!JSON.stringify(r).match(/no (hay|tiene) fotos/i));assert.ok(reportIsComplete(r));});
test('conversión no alcanza 100 sin probar llamadas, formulario y móvil',()=>{const r=deterministicReport(deoga,web);assert.ok(r.puntuaciones.conversion<100);});
test('las acciones reputacionales dependen de la muestra real',()=>{const r=deterministicReport({...deoga,review_samples:[{rating:1,text:'Experiencia negativa'},{rating:5,text:'Buen trabajo'}]},web);assert.match(r.hallazgos.find(x=>x.area==='Reputación').hallazgo,/1 reseña de 3 estrellas o menos/);assert.match(r.prioridades[1].accion,/críticas detectadas/);});
test('un JSON parcial de Groq nunca vacía el informe',()=>{const base=deterministicReport(deoga,web),r=mergeAi(base,{resumen_ejecutivo:'',hallazgos:[{}],prioridades:[],plan30:{semana_1:[]},checklist:[],kpis:[],resultado_objetivo_90_dias:''});assert.deepEqual(r,base);assert.ok(reportIsComplete(r));});
test('sin respuesta de Groq el fallback sigue completo',()=>{const r=mergeAi(deterministicReport(deoga,web),null);assert.equal(r.hallazgos.length,8);assert.equal(r.prioridades.length,6);assert.equal(r.checklist.length,10);assert.equal(r.kpis.length,6);assert.ok(Object.values(r.plan30).every(x=>x.length>=2));});
test('campos no devueltos quedan como desconocidos, no como ausentes',()=>{const r=deterministicReport({...deoga,website:null,phone:null,has_photos:null},{});assert.match(r.datos_verificados.web,/No devuelta/);assert.match(r.datos_verificados.fotos,/No verificable/);assert.ok(!JSON.stringify(r).match(/carece de (web|fotos)/i));});

