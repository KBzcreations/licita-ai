import crypto from 'crypto';
import {reportIsComplete} from './_mapscore-report.js';

function verifyToken(token){try{const secret=process.env.STRIPE_SECRET_KEY;if(!secret||!token)return false;const [payload,sig]=String(token).split('.');if(!payload||!sig)return false;const expected=crypto.createHmac('sha256',secret).update(payload).digest('hex');if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return data.scope==='mapscore'&&Number(data.exp)>Date.now()}catch{return false}}
async function verifyPayment(sessionId){const key=process.env.STRIPE_SECRET_KEY;if(!key||!sessionId)return false;try{const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,{headers:{Authorization:`Bearer ${key}`}}),s=await r.json();return r.ok&&s.status==='complete'&&['paid','no_payment_required'].includes(s.payment_status)&&s.payment_link==='plink_1U65vdDwJ53fjQyszHGTxoLM'}catch{return false}}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=a=>`<ul>${(a||[]).map(x=>`<li>${esc(typeof x==='string'?x:x.tarea||x.accion||JSON.stringify(x))}</li>`).join('')}</ul>`;

function emailHtml(business,result){
  const scores=result.puntuaciones||{};
  const priorities=(result.prioridades||[]).map(p=>`<li><b>${esc(p.accion)}</b> — ${esc(p.como_hacerlo)} <small>Impacto: ${esc(p.impacto)}</small></li>`).join('');
  const findings=(result.hallazgos||[]).map(h=>`<div style="border:1px solid #dbe3ec;border-radius:10px;padding:14px;margin:12px 0"><p><b>${esc(h.area)}</b> · ${esc(h.evidencia||h.estado)}</p><p>${esc(h.hallazgo)}</p><p><b>Solución:</b> ${esc(h.solucion)}</p></div>`).join('');
  const scoreNotes=`<ul><li><b>Perfil:</b> datos básicos verificados.</li><li><b>Relevancia:</b> categoría, ubicación y canales oficiales.</li><li><b>Reputación:</b> valoración y volumen de reseñas; los textos son solo una muestra.</li><li><b>Visual:</b> existencia de fotos, no su calidad completa.</li><li><b>Conversión:</b> canales disponibles y web accesible; formularios y llamadas requieren prueba.</li><li><b>Web local:</b> respuesta técnica y elementos observables de la página.</li></ul>`;
  return `<div style="font-family:Arial,sans-serif;max-width:820px;margin:auto;color:#172033"><h1>MAPSCORE AI — Auditoría profesional</h1><h2>${esc(business)}</h2><div style="font-size:48px;font-weight:800">${esc(result.mapscore)}/100</div><p><b>${esc(result.nivel)}</b></p><h2>Resumen ejecutivo</h2><p style="white-space:pre-line">${esc(result.resumen_ejecutivo)}</p><h2>Puntuación por áreas</h2><p>Perfil ${esc(scores.perfil)}/100 · Relevancia ${esc(scores.relevancia)}/100 · Reputación ${esc(scores.reputacion)}/100 · Visual ${esc(scores.contenido_visual)}/100 · Conversión ${esc(scores.conversion)}/100 · Web local ${esc(scores.web_local)}/100</p>${scoreNotes}<h2>Hallazgos y soluciones</h2>${findings}<h2>Prioridades</h2><ol>${priorities}</ol><h2>Plan de 30 días</h2><h3>Días 1–3</h3>${list(result.plan30?.dias_1_3)}<h3>Semana 1</h3>${list(result.plan30?.semana_1)}<h3>Semana 2</h3>${list(result.plan30?.semana_2)}<h3>Semana 3</h3>${list(result.plan30?.semana_3)}<h3>Semana 4</h3>${list(result.plan30?.semana_4)}<h2>Checklist</h2>${list(result.checklist)}<h2>KPIs</h2>${list((result.kpis||[]).map(k=>`${k.metrica}: ${k.objetivo} · ${k.frecuencia}`))}<h2>Objetivo a 90 días</h2><p>${esc(result.resultado_objetivo_90_dias)}</p><h2>Limitaciones</h2><p>${esc(result.limitaciones)}</p><hr><p style="font-size:12px;color:#667">MAPSCORE es una puntuación interna orientativa y no una métrica oficial de Google. No garantizamos posiciones concretas.</p></div>`;
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method Not Allowed'});
  const key=process.env.RESEND_API_KEY;
  const {email,business,result,session_id:sessionId,access_token:accessToken}=req.body||{};
  if(!(verifyToken(accessToken)||await verifyPayment(sessionId)))return res.status(402).json({error:'Acceso no confirmado'});
  if(!email||!business||!result)return res.status(400).json({error:'Faltan datos'});
  if(!reportIsComplete(result))return res.status(422).json({error:'El informe está incompleto y no se enviará'});
  if(!key)return res.status(500).json({error:'RESEND_API_KEY no configurada'});
  const html=emailHtml(business,result);
  const idempotencyKey=crypto.createHash('sha256').update(`${email}|${business}|${JSON.stringify(result)}`).digest('hex');
  try{
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:process.env.MAPSCORE_FROM_EMAIL||'MAPSCORE AI <alertas@licita-ai.com>',to:[email],subject:`Auditoría profesional MAPSCORE — ${business}`,html})});
    const body=await r.text();let raw;try{raw=JSON.parse(body)}catch{raw={message:body}}
    if(!r.ok)return res.status(r.status).json({error:'Error de email',detalle:raw});
    if(!raw.id)return res.status(502).json({error:'Resend no confirmó el envío',detalle:raw});
    return res.status(200).json({ok:true,id:raw.id});
  }catch(e){return res.status(500).json({error:'No se pudo enviar el informe',detalle:String(e)})}
}

