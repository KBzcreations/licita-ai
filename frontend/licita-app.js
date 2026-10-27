import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { analyzeTenderPages, makeMatrixCSV } from './tender-core.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=pdfWorker;
const $=id=>document.getElementById(id);
let files=[],report=null,working=false;
function status(msg,kind=''){$('status').textContent=msg;$('status').className='status '+kind;}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function track(tipo,metadata={}){
  try {const response=await fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo,pagina:'licita-matriz-beta',metadata})});return response.ok;}catch{return false;}
}
function selectFiles(list){
 files=Array.from(list||[]).slice(0,2);
 let error='';
 if((list?.length||0)>2)error='Se analizarán únicamente los primeros 2 PDF.';
 if(files.some(f=>!/\.pdf$/i.test(f.name)||f.size>20_000_000||!f.size)){files=[];error='Solo se admiten archivos PDF de hasta 20 MB.';}
 $('file-list').textContent=files.length?'Seleccionados: '+files.map(f=>f.name).join(' · '):'No has seleccionado documentos.';
 $('results').hidden=true;report=null;
 status(error,error?'bad':'');
 $('analyze').disabled=!files.length||working;
}
$('documents').addEventListener('change',e=>selectFiles(e.target.files));
const zone=$('drop');['dragenter','dragover'].forEach(n=>zone.addEventListener(n,e=>{e.preventDefault();zone.classList.add('drag');}));
['dragleave','drop'].forEach(n=>zone.addEventListener(n,e=>{e.preventDefault();zone.classList.remove('drag');}));
zone.addEventListener('drop',e=>selectFiles(e.dataTransfer.files));
async function readPdf(file){
 const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
 try{
   const total=doc.numPages,pages=[];
   for(let n=1;n<=Math.min(total,100);n++){
     status('Leyendo '+file.name+', página '+n+' de '+Math.min(total,100)+'…');
     const page=await doc.getPage(n);
     const content=await page.getTextContent();
     pages.push({page:n,document:file.name,text:content.items.map(item=>item.str||'').join(' ')});
   }
   return {pages,total};
 } finally{await doc.destroy();}
}
function render(result){
 $('summary').textContent=result.files_processed+' PDF · '+result.page_count+' páginas leídas · '+result.coverage.filter(c=>c.evidence_count).length+' áreas con coincidencias.';
 $('warnings').textContent=result.warnings.concat(result.extra_warnings).map(w=>'• '+w).join('\n');
 const table=$('resultrows');table.replaceChildren();
 for(const item of result.coverage){
   const tr=document.createElement('tr');
   const area=document.createElement('td');area.textContent=item.area;
   const state=document.createElement('td');state.textContent=item.evidence_count?'Encontrado ('+item.evidence_count+')':'No localizado';state.className=item.evidence_count?'found':'missing';
   const quotes=document.createElement('td'),task=document.createElement('td');task.textContent=item.action;
   const matches=result.findings.filter(f=>f.id===item.id);
   if(!matches.length)quotes.textContent='Ningún pasaje detectado. Revisar el pliego completo.';
   for(const match of matches){const wrapper=document.createElement('span');wrapper.className='evidence';const ref=document.createElement('strong');ref.textContent=match.document+' · pág. '+match.page;const text=document.createElement('span');text.textContent=match.evidence;wrapper.append(ref,text);quotes.append(wrapper);}
   tr.append(area,state,quotes,task);table.append(tr);
 }
 $('results').hidden=false;$('results').scrollIntoView({behavior:'smooth',block:'start'});
}
$('analyze').addEventListener('click',async()=>{
 if(!files.length||working)return;working=true;$('analyze').disabled=true;$('results').hidden=true;
 track('tender_analysis_started',{files:files.length});
 try{
  const pages=[],extra_warnings=[];
  for(const file of files){const x=await readPdf(file);pages.push(...x.pages);if(x.total>100)extra_warnings.push('Lectura parcial en '+file.name+': solo primeras 100 de '+x.total+' páginas.');}
  const result=analyzeTenderPages(pages);
  if(!result.pages_with_text)throw new Error('No encontramos texto seleccionable. Un PDF escaneado requiere OCR, no disponible en esta beta.');
  report={...result,files_processed:files.length,extra_warnings};
  render(report);status('Análisis completado. Descarga y comprueba los pasajes originales.','good');
  track('tender_analysis_completed',{files:files.length,pages:result.page_count,areas:result.coverage.filter(x=>x.evidence_count).length});
 }catch(e){report=null;status('No se pudo procesar el archivo. '+(e?.message||'Comprueba el PDF.'),'bad');}
 finally{working=false;$('analyze').disabled=!files.length;}
});
function download(filename,body,mime){
 const url=URL.createObjectURL(new Blob([body],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
$('csv').addEventListener('click',()=>{
 if(!report)return;
 download('licita-matriz-requisitos.csv',makeMatrixCSV(report),'text/csv;charset=utf-8');
 track('tender_export_csv',{areas:report.coverage.length});
});
$('html').addEventListener('click',()=>{
 if(!report)return;
 const entries=report.coverage.map(item=>{
 const matches=report.findings.filter(f=>f.id===item.id);
 return '<section><h2>'+escapeHTML(item.area)+'</h2><p><strong>'+escapeHTML(item.status)+'</strong> · '+escapeHTML(item.action)+'</p>'+
 (matches.map(m=>'<blockquote><strong>'+escapeHTML(m.document)+' · pág. '+m.page+'</strong><p>'+escapeHTML(m.evidence)+'</p></blockquote>').join('')||'<p>No localizado automáticamente. Debe revisarse el documento.</p>')+'</section>';
 }).join('');
 const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>LICITA · Matriz</title><style>body{font:15px/1.6 system-ui;margin:auto;max-width:850px;padding:40px;color:#183e30}h1{color:#05765b}section{border-top:1px solid #badbce;padding:18px 0}blockquote{background:#f4f9f5;border-left:3px solid #089070;padding:15px;margin:12px 0;overflow-wrap:anywhere}@media print{body{padding:0}}</style><h1>Matriz LICITA</h1><p>Documento de apoyo. No sustituye la lectura de los pliegos.</p>'+entries+'<hr><p>Los pasajes son pistas para comprobación manual. Una ausencia no acredita que no exista la obligación.</p></html>';
 download('licita-informe-revision.html',html,'text/html;charset=utf-8');
 track('tender_export_html',{areas:report.coverage.length});
});
for(const button of document.querySelectorAll('[data-interest]'))button.addEventListener('click',async()=>{
 $('survey-status').textContent='Registrando respuesta…';
 const buttons=document.querySelectorAll('[data-interest]');buttons.forEach(b=>b.disabled=true);
 const ok=await track('tender_paid_interest',{choice:button.dataset.interest});
 $('survey-status').textContent=ok?'Gracias, respuesta registrada.':'No hemos podido registrar tu respuesta. No afirmamos que se haya guardado.';
 if(!ok)buttons.forEach(b=>b.disabled=false);
});
