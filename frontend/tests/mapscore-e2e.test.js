import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import analysis from '../api/mapscore-analysis.js';
import business from '../api/mapscore-business.js';
import deliver from '../api/mapscore-deliver.js';
import privateAccess from '../api/mapscore-private-access.js';

const originalFetch=global.fetch;
const response=(data,status=200)=>new Response(typeof data==='string'?data:JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
function res(){return{statusCode:200,body:null,status(n){this.statusCode=n;return this},json(v){this.body=v;return this}}}
function token(){const payload=Buffer.from(JSON.stringify({scope:'mapscore',exp:Date.now()+60000})).toString('base64url');return`${payload}.${crypto.createHmac('sha256','sk_test').update(payload).digest('hex')}`}

test.afterEach(()=>{global.fetch=originalFetch;delete process.env.GROQ_API_KEY;delete process.env.GOOGLE_MAPS_API_KEY;delete process.env.RESEND_API_KEY;delete process.env.STRIPE_SECRET_KEY});

test('flujo DEOGA: búsqueda Google, análisis con Groq parcial y correo Resend',async()=>{
  process.env.STRIPE_SECRET_KEY='sk_test';process.env.GOOGLE_MAPS_API_KEY='maps';process.env.GROQ_API_KEY='groq';process.env.RESEND_API_KEY='resend';let sent;
  global.fetch=async(url,options={})=>{
    if(String(url).endsWith('places:searchText'))return response({places:[{id:'deoga-id',displayName:{text:'Deoga Desarrollo Y Ejecucion de Obra SL'},formattedAddress:'El Charcón, 110, Loc, Genil, 18008 Granada',primaryTypeDisplayName:{text:'Contratista general'},rating:4.4,userRatingCount:10,websiteUri:'http://www.deoga.es/',nationalPhoneNumber:'958 22 52 51',businessStatus:'OPERATIONAL',photos:Array.from({length:10},(_,i)=>({name:`photo-${i}`}))}]});
    if(String(url).includes('/v1/places/deoga-id'))return response({rating:4.4,userRatingCount:10,websiteUri:'http://www.deoga.es/',nationalPhoneNumber:'958 22 52 51',businessStatus:'OPERATIONAL',photos:Array.from({length:10},(_,i)=>({name:`photo-${i}`})),reviews:[{rating:5,text:{text:'Buen trabajo'}}]});
    if(String(url)==='http://www.deoga.es/')return new Response('<title>DEOGA Granada</title><meta name="description" content="Construcción"><h1>DEOGA</h1>',{status:200});
    if(String(url).includes('api.groq.com'))return response({choices:[{message:{content:'{"resumen_ejecutivo":"","hallazgos":[]}'}}]});
    if(String(url).includes('api.resend.com')){sent=JSON.parse(options.body);return response({id:'email_123'})}
    throw new Error(`URL inesperada ${url}`);
  };
  let r=res();await business({method:'POST',body:{business:'DEOGA Desarrollo y Ejecución de Obra SL',city:'Granada'}},r);assert.equal(r.statusCode,200);const place=r.body.places[0];assert.equal(place.rating,4.4);assert.equal(place.reviews,10);assert.equal(place.has_photos,true);assert.equal(place.photo_sample_count,10);
  r=res();await analysis({method:'POST',body:{business_data:place,access_token:token()}},r);assert.equal(r.statusCode,200);assert.equal(r.body.datos_verificados.telefono,'958 22 52 51');assert.match(r.body.datos_verificados.fotos,/10/);assert.ok(r.body.hallazgos.length>=6);assert.ok(r.body.kpis.length>=5);
  const report=r.body;r=res();await deliver({method:'POST',body:{email:'cliente@example.com',business:place.name,result:report,access_token:token()}},r);assert.deepEqual(r.body,{ok:true,id:'email_123'});assert.equal(sent.to[0],'cliente@example.com');assert.match(sent.html,/DEOGA/);assert.match(sent.html,/KPIs/);
});

test('código privado existente sigue desbloqueando el flujo',async()=>{process.env.STRIPE_SECRET_KEY='sk_test';let r=res();await privateAccess({method:'POST',body:{code:'NEXUS7K'}},r);assert.equal(r.statusCode,200);assert.equal(r.body.ok,true);assert.match(r.body.token,/\./);});

test('Resend no confirmado no se marca como enviado',async()=>{process.env.STRIPE_SECRET_KEY='sk_test';process.env.RESEND_API_KEY='resend';global.fetch=async()=>response({},200);const {deterministicReport}=await import('../api/_mapscore-report.js');let r=res();await deliver({method:'POST',body:{email:'cliente@example.com',business:'DEOGA',result:deterministicReport({name:'DEOGA',address:'Granada',hours:[]},{}),access_token:token()}},r);assert.equal(r.statusCode,502);assert.equal(r.body.error,'Resend no confirmó el envío');});
