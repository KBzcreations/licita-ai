import { deterministicOfferPack } from './_offer-pack.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { action, licitacion, perfil = {}, sessionId, tenderId = '', title = '' } = req.body || {};
  const key = process.env.STRIPE_SECRET_KEY;
  if (action === 'checkout') {
    if (!key) return res.status(500).json({ error: 'Pago no configurado' });
    const origin = `https://${req.headers.host}`, params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('line_items[0][price_data][currency]', 'eur');
    params.append('line_items[0][price_data][unit_amount]', '1990');
    params.append('line_items[0][price_data][product_data][name]', 'Dossier de preparación de licitación');
    params.append('line_items[0][price_data][product_data][description]', String(title || 'Expediente seleccionado').slice(0, 240));
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${origin}/?dossier=ok&dossier_session={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${origin}/?dossier=cancelado`);
    params.append('metadata[scope]', 'licitacion_dossier');
    params.append('metadata[tender_id]', String(tenderId).slice(0, 200));
    try { const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() }), s = await r.json(); return r.ok && s.url ? res.status(200).json({ url: s.url }) : res.status(r.status || 502).json({ error: 'Stripe no pudo iniciar el pago' }); }
    catch { return res.status(502).json({ error: 'No se pudo conectar con el pago' }); }
  }
  if (action === 'verify') {
    if (!key || !sessionId || !String(sessionId).startsWith('cs_')) return res.status(400).json({ error: 'Pago no válido' });
    try { const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${key}` } }), s = await r.json(), paid = r.ok && s.metadata?.scope === 'licitacion_dossier' && s.status === 'complete' && ['paid', 'no_payment_required'].includes(s.payment_status); return paid ? res.status(200).json({ ok: true }) : res.status(402).json({ error: 'Pago no confirmado' }); }
    catch { return res.status(502).json({ error: 'No se pudo verificar el pago' }); }
  }
  if (!licitacion) return res.status(400).json({ error: 'Falta la licitación' });
  return res.status(200).json(deterministicOfferPack(licitacion, perfil));
}
