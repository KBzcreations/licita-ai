/**
 * LICITA: extracción determinista para revisión manual de pliegos.
 * Un pasaje encontrado NO confirma que se cumple el requisito.
 */
export const AREAS = [
  {id:'plazo',area:'Plazos y presentación',terms:['plazo de presentacion','fecha limite','presentacion de proposiciones','hora limite'],action:'Confirmar fecha, hora y medio de presentación en el anuncio y pliego oficial.'},
  {id:'economica',area:'Solvencia económica',terms:['solvencia economica','volumen anual de negocios','seguro de responsabilidad civil','patrimonio neto'],action:'Comprobar importes, ejercicios y pruebas documentales exigidas.'},
  {id:'tecnica',area:'Solvencia técnica',terms:['solvencia tecnica','relacion de los principales servicios','experiencia en trabajos','certificados de buena ejecucion','clasificacion empresarial'],action:'Verificar referencias, experiencia y medios exigidos.'},
  {id:'criterios',area:'Criterios de adjudicación',terms:['criterios de adjudicacion','criterios evaluables','juicio de valor','puntuacion maxima'],action:'Contrastar fórmulas, ponderaciones y alcance de las memorias.'},
  {id:'docs',area:'Documentación y sobres',terms:['deuc','declaracion responsable','documentacion administrativa','archivo electronico','sobre a','sobre b','sobre c','anexo i','anexo ii'],action:'Inventariar anexos, sobres y firmas antes de preparar la oferta.'},
  {id:'garantias',area:'Garantías',terms:['garantia definitiva','garantia provisional','garantia complementaria','constitucion de la garantia'],action:'Confirmar si procede garantía y su importe y forma.'},
  {id:'ejecucion',area:'Ejecución y penalidades',terms:['penalidades','subcontratacion','condiciones especiales de ejecucion','plazo de ejecucion'],action:'Revisar penalidades, plazos de ejecución y límites a subcontratar.'},
  {id:'firma',area:'Firma y formato',terms:['firma electronica','presentacion electronica','plataforma de contratacion','tamano maximo'],action:'Confirmar certificación de firma, formato y plataforma oficial.'}
];
const fold=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const flat=x=>String(x??'').replace(/\s+/g,' ').trim();
const safe=x=>/^[=+@\-\t\r]/.test(flat(x))?"'"+flat(x):flat(x);
export function analyzeTenderPages(pages=[]) {
 if(!Array.isArray(pages)) throw new TypeError('Las páginas deben ser una lista');
 const counts=new Map(AREAS.map(a=>[a.id,0])),findings=[];
 let pagesWithText=0;
 for(const p of pages){
   const text=flat(p?.text);
   if(!text)continue;
   pagesWithText++;
   const folded=fold(text);
   for(const area of AREAS){
     if(counts.get(area.id)>=5)continue;
     let match=null;
     for(const term of area.terms){
       const at=folded.indexOf(fold(term));
       if(at<0)continue;
       const before=folded[at-1]||' ',after=folded[at+fold(term).length]||' ';
       if(/[a-z0-9]/i.test(before)||/[a-z0-9]/i.test(after))continue;
       match={at,term};break;
     }
     if(!match)continue;
     const lo=Math.max(0,match.at-85),hi=Math.min(text.length,match.at+match.term.length+175);
     findings.push({id:area.id,area:area.area,page:Number(p.page)||1,document:String(p.document||'Pliego').slice(0,140),evidence:(lo?'…':'')+text.slice(lo,hi)+(hi<text.length?'…':''),status:'pendiente de revisión'});
     counts.set(area.id,counts.get(area.id)+1);
   }
 }
 const warnings=['Una coincidencia no confirma el requisito. Un área no localizada puede seguir siendo obligatoria: revisa íntegramente PCAP, PPT y anexos.'];
 if(pagesWithText<pages.length) warnings.unshift((pages.length-pagesWithText)+' páginas sin texto extraíble. Revisa los escaneos.');
 if(!pagesWithText) warnings.unshift('No hay texto extraíble.');
 const coverage=AREAS.map(a=>({id:a.id,area:a.area,action:a.action,status:counts.get(a.id)?'pasajes localizados':'no localizado automáticamente',evidence_count:counts.get(a.id)}));
 return {page_count:pages.length,pages_with_text:pagesWithText,findings,coverage,warnings};
}
export function makeMatrixCSV(data){
 const rows=[['Área','Estado','Documento','Página','Pasaje','Tarea de verificación','Responsable','Estado manual']];
 for(const area of data.coverage){
   const matching=data.findings.filter(f=>f.id===area.id);
   for(const f of matching.length?matching:[{document:'',page:'',evidence:''}])rows.push([area.area,area.status,f.document,f.page,f.evidence,area.action,'','Pendiente']);
 }
 return '\uFEFF'+rows.map(row=>row.map(v=>'"'+safe(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
}
