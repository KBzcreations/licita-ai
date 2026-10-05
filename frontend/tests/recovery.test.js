import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import handler from '../api/prepare-offer.js';
import track from '../api/track.js';
const res=()=>({code:200,body:null,status(n){this.code=n;return this},json(b){this.body=b;return this}});
function pdf(pages,text='La solvencia economica requiere volumen anual de negocios.'){
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const kids=[];
  for(let i=0;i<pages;i++){
    const id=objects.length+1;kids.push(`${id} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`);
    const stream=`BT /F1 12 Tf 40 700 Td (${text}) Tj ET`;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>`;
  let out='%PDF-1.4\n';const offsets=[0];
  objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${body}\nendobj\n`});
  const xref=Buffer.byteLength(out);out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset=>out+=`${String(offset).padStart(10,'0')} 00000 n \n`);
  out+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out).toString('base64');
}
test('PDF real: devuelve páginas y pasajes',async()=>{
  const r=res();await handler({method:'POST',body:{action:'analyze-document',documentBase64:pdf(1)}},r);
  assert.equal(r.code,200);assert.equal(r.body.page_count,1);assert.ok(r.body.findings.length);
});
test('PDF sin texto no se vende como lectura correcta',async()=>{
  const r=res();await handler({method:'POST',body:{action:'analyze-document',documentBase64:pdf(1,'')}},r);
  assert.equal(r.code,422);assert.match(r.body.error,/OCR/);
});
test('81 páginas: resultado explícitamente parcial',async()=>{
  const r=res();await handler({method:'POST',body:{action:'analyze-document',documentBase64:pdf(81)}},r);
  assert.equal(r.code,200);assert.equal(r.body.truncated,true);assert.equal(r.body.page_count,80);assert.match(r.body.warnings.join(' '),/80 de 81/);
});
test('fallo de persistencia no confirma una respuesta comercial',async()=>{
  const original=global.fetch;const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
  process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_KEY='unit';
  global.fetch=async()=>({ok:false});
  try{const r=res();await track({method:'POST',body:{tipo:'validacion_oferta'}},r);assert.equal(r.code,502);assert.equal(r.body.ok,undefined)}
  finally{global.fetch=original;if(url===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=url;if(key===undefined)delete process.env.SUPABASE_SERVICE_KEY;else process.env.SUPABASE_SERVICE_KEY=key;}
});
test('scripts de la página mantienen sintaxis válida',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!match[1].includes('ld+json'))new vm.Script(match[2]);
});
