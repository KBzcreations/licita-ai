import { deterministicOfferPack } from './_offer-pack.js';
import { analyzeTenderPages } from './_tender-document.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { action, licitacion, perfil = {}, sessionId, tenderId = '', title = '' } = req.body || {};
  const key = process.env.STRIPE_SECRET_KEY;
  if (action === 'analyze-document') {
    const encoded = String(req.body?.documentBase64 || ''), bytes = Buffer.from(encoded, 'base64');
    if (!encoded || bytes.length < 5 || bytes.length > 4_500_000 || bytes.subarray(0, 4).toString() !== '%PDF') return res.status(400).json({ error: 'Adjunta un PDF válido de hasta 4,5 MB' });
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
      const pages = [];
      for (let n = 1; n <= Math.min(pdf.numPages, 80); n++) {
        const page = await pdf.getPage(n), content = await page.getTextContent();
        pages.push({ page: n, text: content.items.map(x => x.str || '').join(' ') });
      }
      return res.status(200).json({ file_name: String(req.body?.fileName || 'pliego.pdf').slice(0, 180), truncated: pdf.numPages > 80, ...analyzeTenderPages(pages) });
    } catch (error) { return res.status(422).json({ error: 'No se pudo leer el PDF; puede estar protegido o ser una imagen escaneada', detail: String(error?.message || error).slice(0, 240) }); }
  }
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
