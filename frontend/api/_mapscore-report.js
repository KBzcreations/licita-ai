const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const text=(v,fallback='')=>typeof v==='string'&&v.trim()?v.trim():fallback;
const array=v=>Array.isArray(v)?v.filter(Boolean):[];

export function deterministicScores(b,web={}){
  const profile=clamp(20+(b.address?15:0)+(b.category?15:0)+(b.phone?15:0)+(b.website?15:0)+(b.hours?.length?10:0)+(b.status==='OPERATIONAL'?10:0));
  const relevance=clamp(35+(b.category?25:0)+(b.address?15:0)+(b.website?15:0)+(b.phone?10:0));
  let reputation=50;
  if(Number.isFinite(b.rating)) reputation=clamp((b.rating/5)*70+Math.min(Math.log10((b.reviews||0)+1)/2,1)*30);
  const visual=b.has_photos===true?75:50;
  const conversion=clamp(35+(b.phone?30:0)+(b.website?30:0)+(b.address?5:0));
  const webLocal=!b.website?45:clamp(55+(web.reachable?10:0)+(web.title?5:0)+(web.meta_description?5:0)+(web.has_h1?5:0)+(web.has_localbusiness_schema?10:0));
  const values=[profile,relevance,reputation,visual,conversion,webLocal];
  return {perfil:profile,relevancia:relevance,reputacion:reputation,contenido_visual:visual,conversion,web_local:webLocal,mapscore:clamp(values.reduce((a,v)=>a+v,0)/values.length)};
}

function evidenceData(b){
  return {
    nombre:b.name,direccion:b.address,categoria:b.category||'No devuelta por Google Places',
    web:b.website||'No devuelta por Google Places',telefono:b.phone||'No devuelto por Google Places',
    valoracion:b.rating??'No devuelta por Google Places',resenas:b.reviews??'No devueltas por Google Places',
    horarios:b.hours?.length?b.hours.join(' | '):'No devueltos por Google Places; no implica que no existan',
    fotos:b.has_photos===true?`Sí; Google devolvió ${b.photo_sample_count||'varias'} referencias de fotos`:b.has_photos===false?'Google no devolvió referencias en esta consulta; no confirma que no existan':'No verificable con la fuente utilizada'
  };
}

export function deterministicReport(b,web={},notes=''){
  const s=deterministicScores(b,web), place=b.name||'El negocio', rating=Number.isFinite(b.rating)?`${b.rating}/5 con ${b.reviews??'un número no devuelto de'} reseñas`:'valoración no devuelta';
  const findings=[
    {area:'Perfil',evidencia:'verificada',hallazgo:`La ficha identificada incluye nombre y dirección${b.category?', con la categoría '+b.category:''}.`,solucion:'Mantener estos datos idénticos en la web y en los directorios principales.'},
    {area:'Conversión',evidencia:b.phone?'verificada':'dato no devuelto',hallazgo:b.phone?`Google devuelve el teléfono ${b.phone}.`:'Google Places no devolvió teléfono; esto no demuestra que falte en la ficha.',solucion:b.phone?'Comprobar periódicamente que conecta con el canal comercial correcto.':'Verificar el teléfono directamente en el Perfil de Empresa antes de recomendar cambios.'},
    {area:'Web',evidencia:b.website?'verificada':'dato no devuelto',hallazgo:b.website?`Google enlaza a ${b.website}.`:'Google Places no devolvió una web; no se afirma que el negocio carezca de ella.',solucion:b.website?'Mantener una página de contacto clara y coherente con los datos del perfil.':'Verificar manualmente la ficha y los canales oficiales.'},
    {area:'Reputación',evidencia:'verificada',hallazgo:`La reputación disponible es ${rating}.`,solucion:'Responder de forma profesional y solicitar reseñas auténticas tras trabajos finalizados.'},
    {area:'Contenido visual',evidencia:b.has_photos===true?'verificada':'dato no concluyente',hallazgo:b.has_photos===true?`Google devolvió ${b.photo_sample_count||'varias'} referencias de fotos; el perfil sí tiene contenido visual.`:'La consulta no permite concluir que falten fotos.',solucion:b.has_photos===true?'Revisar actualidad, variedad y capacidad comercial de las imágenes, sin sustituir material que ya funciona.':'Revisar visualmente el perfil antes de proponer nuevas fotografías.'},
    {area:'Horarios',evidencia:b.hours?.length?'verificada':'dato no devuelto',hallazgo:b.hours?.length?'Google Places devolvió horarios publicados.':'Google Places no devolvió horarios; no se interpreta como ausencia.',solucion:b.hours?.length?'Comprobar festivos y excepciones.':'Verificar el perfil directamente y publicar o corregir horarios solo si realmente faltan.'},
    {area:'Web local',evidencia:web.reachable?'verificada por análisis web':b.website?'comprobación no disponible':'dato no disponible',hallazgo:web.reachable?`La web respondió correctamente${web.title?` y tiene título “${web.title}”`:''}.`:b.website?'La web figura en Google, pero no pudo analizarse en esta ejecución.':'No había URL oficial verificable para analizar.',solucion:web.reachable?(web.has_localbusiness_schema?'Conservar el marcado local y validar que los datos sigan vigentes.':'Valorar marcado LocalBusiness solo tras revisar técnicamente la página y los datos publicados.'):'Reintentar la comprobación técnica antes de afirmar carencias.'},
    {area:'Elementos no expuestos',evidencia:'por verificar',hallazgo:'Descripción, publicaciones, preguntas frecuentes, productos y posición en resultados no se deducen de los campos consultados.',solucion:'Revisarlos dentro del Perfil de Empresa y Search Console; no tratarlos como ausentes sin evidencia.'}
  ];
  const hallazgos=findings;
  const prioridades=[
    {prioridad:1,accion:'Validar coherencia de datos de contacto',por_que:'Evita fricción entre Google y la web.',como_hacerlo:'Comparar nombre, dirección, teléfono y web con los datos verificados del informe.',impacto:'alto'},
    {prioridad:2,accion:'Revisar la muestra de reseñas y responder',por_que:'La calidad de respuesta influye en la confianza del cliente.',como_hacerlo:'Responder primero a críticas recientes y agradecer las valoraciones positivas.',impacto:'alto'},
    {prioridad:3,accion:'Auditar la calidad de las fotos existentes',por_que:b.has_photos===true?'Ya hay fotos; la mejora está en su calidad y variedad, no en afirmar que faltan.':'La fuente no permite asegurar si existen.',como_hacerlo:'Revisar portada, equipo, trabajos, acceso y actualidad; añadir solo las categorías que falten.',impacto:'medio'},
    {prioridad:4,accion:'Comprobar horarios directamente',por_que:b.hours?.length?'Conviene mantener excepciones actualizadas.':'El dato no fue devuelto y requiere confirmación.',como_hacerlo:'Abrir el Perfil de Empresa y contrastarlo con la web antes de editar.',impacto:'medio'},
    {prioridad:5,accion:'Mejorar la ruta de contacto de la web',por_que:'Convierte visitas locales en llamadas o solicitudes.',como_hacerlo:'Probar en móvil teléfono, formulario y llamada a la acción, corrigiendo solo fallos observados.',impacto:'alto'},
    {prioridad:6,accion:'Medir resultados con una línea base',por_que:'Permite saber qué cambios producen consultas reales.',como_hacerlo:'Registrar llamadas, formularios, clics y reseñas al inicio y cada mes.',impacto:'medio'}
  ];
  return {mapscore:s.mapscore,nivel:s.mapscore>=80?'Presencia local sólida':s.mapscore>=60?'Buena base con mejoras concretas':'Base local mejorable',resumen_ejecutivo:`${place} tiene una base local verificable: ${b.address}${b.website?', web oficial enlazada':''}${b.phone?', teléfono publicado':''} y ${rating}. ${b.has_photos===true?'Google devolvió contenido fotográfico, por lo que no se considera ausente.':'La disponibilidad de fotos no puede concluirse con los datos recibidos.'} Los campos no devueltos se mantienen como desconocidos. El plan prioriza comprobaciones y mejoras medibles${notes?` orientadas a ${String(notes).slice(0,180)}`:''}.`,criterio_puntuacion:'Puntuación interna calculada mediante reglas fijas sobre campos verificados de Google Places y comprobaciones técnicas de la web. Los datos no devueltos reciben una valoración neutral y nunca se convierten automáticamente en ausencias.',datos_verificados:evidenceData(b),puntuaciones:{perfil:s.perfil,relevancia:s.relevancia,reputacion:s.reputacion,contenido_visual:s.contenido_visual,conversion:s.conversion,web_local:s.web_local},hallazgos,prioridades,perfil_google:{estado:'Evaluado solo con campos expuestos por Google Places'},reputacion:{estado:rating},contenido:{estado:b.has_photos===true?'Fotos confirmadas':'Por verificar'},conversion:{estado:b.phone||b.website?'Canales de contacto disponibles':'Por verificar'},seo_local_web:{estado:web.reachable?'Web analizada':'Análisis no disponible'},competencia:{estado:'No evaluada; requiere un estudio geográfico específico'},plan30:{dias_1_3:['Contrastar los datos verificados entre Google y la web.','Revisar y responder las reseñas que requieran atención.'],semana_1:['Probar teléfono, formulario y experiencia móvil.','Clasificar las fotos existentes por actualidad y utilidad comercial.'],semana_2:['Corregir únicamente las incoherencias confirmadas.','Preparar una solicitud ética de reseñas para clientes recientes.'],semana_3:['Publicar una mejora de contenido basada en servicios y zona real.','Registrar llamadas, formularios y clics como línea base.'],semana_4:['Comparar métricas con la línea base.','Documentar los siguientes cambios según impacto observado.']},checklist:['Nombre, dirección y teléfono coherentes','Web oficial accesible desde móvil','Llamadas y formulario probados','Horarios contrastados directamente','Festivos y excepciones revisados','Fotos existentes clasificadas y actualizadas','Reseñas recientes respondidas','Solicitud ética de reseñas preparada','Métricas iniciales registradas','Campos no expuestos revisados manualmente'],kpis:[{metrica:'Nuevas reseñas auténticas',objetivo:'Tendencia mensual positiva',frecuencia:'mensual'},{metrica:'Valoración media',objetivo:'Mantener o mejorar la línea base',frecuencia:'mensual'},{metrica:'Llamadas desde el perfil',objetivo:'Medir frente al mes inicial',frecuencia:'mensual'},{metrica:'Clics hacia la web',objetivo:'Medir frente al mes inicial',frecuencia:'mensual'},{metrica:'Solicitudes recibidas',objetivo:'Aumentar sobre la línea base',frecuencia:'mensual'},{metrica:'Datos incoherentes detectados',objetivo:'0',frecuencia:'mensual'}],resultado_objetivo_90_dias:'Conseguir una presencia local coherente, medible y mejor mantenida, con más señales de confianza y una ruta de contacto comprobada, sin prometer posiciones ni resultados no verificables.',datos_necesarios_para_auditoria_total:['Acceso al Perfil de Empresa','Search Console y analítica web','Datos de llamadas y formularios'],limitaciones:'Google Places no expone todos los elementos del Perfil de Empresa. Descripción, publicaciones, FAQ, productos, posición y calidad completa de fotos requieren revisión adicional. Las reseñas devueltas son solo una muestra.',source_business:b,website_audit:web};
}

const validFinding=x=>x&&text(x.area)&&text(x.hallazgo)&&text(x.solucion);
const validPriority=x=>x&&text(x.accion)&&text(x.como_hacerlo)&&text(x.por_que);
export function mergeAi(base,ai){
  if(!ai||typeof ai!=='object') return base;
  const out={...base};
  out.resumen_ejecutivo=text(ai.resumen_ejecutivo,base.resumen_ejecutivo);
  const hs=array(ai.hallazgos).filter(validFinding); if(hs.length>=6) out.hallazgos=hs.slice(0,10);
  const ps=array(ai.prioridades).filter(validPriority); if(ps.length>=5) out.prioridades=ps.slice(0,8).map((p,i)=>({...p,prioridad:i+1}));
  for(const k of Object.keys(base.plan30)){const v=array(ai.plan30?.[k]).filter(x=>text(typeof x==='string'?x:x?.tarea));if(v.length>=2)out.plan30={...out.plan30,[k]:v};}
  const checklist=array(ai.checklist).filter(x=>text(typeof x==='string'?x:x?.tarea));if(checklist.length>=8)out.checklist=checklist.slice(0,12);
  const kpis=array(ai.kpis).filter(x=>x&&text(x.metrica)&&text(x.objetivo)&&text(x.frecuencia));if(kpis.length>=5)out.kpis=kpis.slice(0,6);
  out.resultado_objetivo_90_dias=text(ai.resultado_objetivo_90_dias,base.resultado_objetivo_90_dias);
  return out;
}

export function reportIsComplete(r){return Boolean(r&&text(r.resumen_ejecutivo)&&r.hallazgos?.length>=6&&r.prioridades?.length>=5&&Object.values(r.plan30||{}).every(v=>v?.length>=2)&&r.checklist?.length>=8&&r.kpis?.length>=5&&text(r.resultado_objetivo_90_dias));}
