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
let passed=0;
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
  assert.match(csv,/Solvencia económica/);
  assert.match(csv,/Garantías/);
  assert.match(csv,/licitacion-sintetica\.pdf/);
  assert.match(csv,/Pendiente/);
  assert.ok(!posted.some(x=>/solvencia economica|garantia definitiva|licitacion-sintetica\.pdf/i.test(x)),'No deben enviarse contenidos ni nombres de PDF en analítica');
  assert.equal(errors.length,0,'No deben producirse errores de JavaScript: '+errors.join('; '));
  if(scenario.name==='mobile'){
    const widths=await page.evaluate(()=>({screen:innerWidth,doc:document.documentElement.scrollWidth}));
    assert.ok(widths.doc<=widths.screen+3,'La interfaz no debe desbordar en móvil: '+JSON.stringify(widths));
  }
  console.log('PASS '+scenario.name+': PDF real sintético, página, matriz, CSV, privacidad y errores JS');
  await page.close();passed++;
 }
}finally{await browser.close();}
console.log('Total escenarios superados: '+passed);
