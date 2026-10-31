import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

function syntheticPdf(){
  const stream='BT\n/F1 12 Tf\n72 720 Td\n(La solvencia economica se acreditara con volumen anual de negocios.) Tj\n0 -22 Td\n(La garantia definitiva sera del cinco por ciento.) Tj\n0 -22 Td\n(Los criterios de adjudicacion se describen en el pliego.) Tj\nET\n';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream'
  ];
  let body='%PDF-1.4\n';
  const offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(body));body+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
  const xref=Buffer.byteLength(body);
  body+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  for(const n of offsets.slice(1))body+=String(n).padStart(10,'0')+' 00000 n \n';
  body+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(body,'ascii');
}
const browser=await chromium.launch({headless:true});
const pdf=syntheticPdf();
const base=process.env.SITE_URL||'https://www.licita-ai.com';
let passed=0,matrixCsv=null;
try{
 for(const scenario of [{name:'desktop',width:1280,height:900,path:'/'},{name:'mobile',width:390,height:844,path:'/negociador/'}]){
  const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height},isMobile:scenario.name==='mobile',hasTouch:scenario.name==='mobile',acceptDownloads:true});
  const errors=[],posted=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/track',route=>{
    posted.push(route.request().postData()||'');
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
  });
  await page.goto(base+scenario.path+'?e2e='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  assert.match(await page.title(),/Revisa tus pliegos/,'La portada es la versión de licitaciones');
  // A permanent 308 previously cached by browsers must not be reintroduced.
  assert.equal(new URL(page.url()).pathname,scenario.path,'La ruta pública no debe redirigir a la portada antigua');
  if(scenario.name==='desktop'){
    assert.equal(await page.locator('script[src="/_vercel/insights/script.js"]').count(),1,'La portada debe incluir Web Analytics');
    const analytics=await page.request.get(base+'/_vercel/insights/script.js',{timeout:30000});
    assert.ok(analytics.ok(),'Vercel debe servir el script de Analytics (HTTP '+analytics.status()+')');
    const mime=analytics.headers()['content-type']||'';
    assert.match(mime,/javascript|ecmascript/i,'Analytics debe devolver JavaScript y no una página HTML: '+mime);
    console.log('PASS analytics: script servido públicamente con MIME JavaScript');
  }
  await page.locator('#documents').setInputFiles({name:'licitacion-sintetica.pdf',mimeType:'application/pdf',buffer:pdf});
  assert.equal(await page.locator('#analyze').isDisabled(),false,'El botón debe activarse al adjuntar un PDF');
  await page.locator('#analyze').click();
  await page.waitForFunction(()=>document.querySelector('#results')?.hidden===false,null,{timeout:60000});
  const table=await page.locator('#resultrows').innerText();
  assert.match(table,/Solvencia económica/);
  assert.match(table,/Garantías/);
  assert.match(table,/licitacion-sintetica\.pdf · pág\. 1/);
  assert.match(table,/criterios de adjudicacion/i);
  const download=page.waitForEvent('download',{timeout:30000});
  await page.locator('#csv').click();
  const saved=await download;
  const csv=await fs.readFile(await saved.path(),'utf8');
  if(scenario.name==='desktop')matrixCsv=csv;
  assert.match(csv,/Solvencia económica/);
  assert.match(csv,/Garantías/);
  assert.match(csv,/licitacion-sintetica\.pdf/);
  assert.match(csv,/Pendiente/);
  assert.ok(!posted.some(x=>/solvencia economica|garantia definitiva|licitacion-sintetica\.pdf/i.test(x)),'No deben enviarse contenidos ni nombres de PDF en analítica');
  const events=posted.map(x=>JSON.parse(x));
  assert.ok(events.some(e=>e.tipo==='tender_pageview'),'Debe medirse la visita sin identificar al usuario');
  assert.ok(events.some(e=>e.tipo==='tender_qualified_visit'),'Una selección válida de PDF debe medirse como visita cualificada aproximada');
  const sessions=new Set(events.map(e=>e.session_id));
  assert.equal(sessions.size,1,'Todos los eventos de la misma pestaña deben compartir sesión efímera');
  assert.match([...sessions][0],/^[0-9a-f-]{36}$/i,'La sesión debe ser un UUID aleatorio');
  assert.equal(errors.length,0,'No deben producirse errores de JavaScript: '+errors.join('; '));
  if(scenario.name==='mobile'){
    const widths=await page.evaluate(()=>({screen:innerWidth,doc:document.documentElement.scrollWidth}));
    assert.ok(widths.doc<=widths.screen+3,'La interfaz no debe desbordar en móvil: '+JSON.stringify(widths));
  }
  console.log('PASS '+scenario.name+': PDF real sintético, página, matriz, CSV, privacidad y errores JS');
  await page.close();passed++;
 }
 // Integración pública: CSV del analizador -> control de expedientes -> página, tarea, persistencia y exportación.
 assert.ok(matrixCsv,'El analizador debe producir el CSV que se importará');
 const tracker=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 const trackerErrors=[],trackerPosts=[];
 tracker.on('pageerror',e=>trackerErrors.push(e.message));
 tracker.on('request',req=>{if(req.method()==='POST')trackerPosts.push(req.url())});
 await tracker.goto(base+'/control-licitacion.html?e2e='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
 assert.match(await tracker.title(),/Control de expedientes/,'El módulo público de expedientes debe estar publicado');
 await tracker.locator('#project-name').fill('Expediente de prueba automatizada');
 await tracker.locator('#new-project button[type="submit"]').click();
 await tracker.locator('#csv-file').setInputFiles({name:'licita-matriz-requisitos.csv',mimeType:'text/csv',buffer:Buffer.from(matrixCsv,'utf8')});
 await tracker.waitForFunction(()=>document.querySelectorAll('#task-rows tr').length>=8,null,{timeout:15000});
 const imported=await tracker.locator('#task-rows').innerText();
 assert.match(imported,/licitacion-sintetica\.pdf · pág\. 1/,'La importación debe conservar documento y página');
 assert.match(imported,/Comprobar importes, ejercicios y pruebas documentales/,'La importación debe conservar la tarea de verificación');
 assert.match(imported,/solvencia economica se acreditara/i,'La importación debe conservar el pasaje');
 const owner=tracker.locator('#task-rows tr').filter({hasText:'Solvencia económica'}).locator('input[type="text"]');
 await owner.fill('Equipo de licitaciones');await owner.press('Tab');
 await tracker.reload({waitUntil:'domcontentloaded'});
 assert.equal(await tracker.locator('#task-rows tr').filter({hasText:'Solvencia económica'}).locator('input[type="text"]').inputValue(),'Equipo de licitaciones','Los cambios deben persistir localmente');
 const trackingDownload=tracker.waitForEvent('download',{timeout:30000});
 await tracker.locator('#export-csv').click();
 const exported=await trackingDownload;
 const trackingCsv=await fs.readFile(await exported.path(),'utf8');
 assert.match(trackingCsv,/licitacion-sintetica\.pdf · pág\. 1/);
 assert.match(trackingCsv,/Equipo de licitaciones/);
 const trackerWidth=await tracker.evaluate(()=>({screen:innerWidth,doc:document.documentElement.scrollWidth}));
 assert.ok(trackerWidth.doc<=trackerWidth.screen+3,'El módulo no debe desbordar en móvil: '+JSON.stringify(trackerWidth));
 assert.equal(trackerErrors.length,0,'Errores JS en control de expedientes: '+trackerErrors.join('; '));
 assert.equal(trackerPosts.length,0,'Los datos del expediente no deben enviarse al servidor: '+trackerPosts.join('; '));
 console.log('PASS tracker móvil: importación CSV nativo, pasaje, documento/página, tarea, edición, persistencia, CSV exportado, privacidad y JS.');
 await tracker.close();passed++;
}finally{await browser.close();}
console.log('Total escenarios superados: '+passed);
