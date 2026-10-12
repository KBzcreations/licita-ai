import crypto from 'crypto';
import { deterministicQuoteAnalysis, hashAccessToken, normaliseAiAnalysis, publicPreview, redactSensitive } from './_quote-engine.js';
import { analyzeTenderPages } from './_tender-document.js';

const PRICE_CENTS = 990;
const MAX_PDF_BYTES = 3_000_000;
const MAX_PAGES = 35;
const dbConfig = () => ({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY });

async function insertEvent(tipo, metadata) {
  const { url, key } = dbConfig();
  if (!url || !key) throw new Error('Almacenamiento no configurado');
  const response = await fetch(`${url}/rest/v1/eventos`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ tipo, pagina: 'negociador', metadata }),
  });
  if (!response.ok) throw new Error('No se pudo guardar el análisis');
}

async function findAnalysis(id) {
  const { url, key } = dbConfig();
  if (!url || !key) throw new Error('Almacenamiento no configurado');
  const query = new URLSearchParams({ tipo: 'eq.quote_analysis_created', pagina: 'eq.negociador', 'metadata->>analysis_id': `eq.${id}`, select: 'metadata', limit: '1' });
  const response = await fetch(`${url}/rest/v1/eventos?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error('No se pudo recuperar el análisis');
  const rows = await response.json();
  return rows?.[0]?.metadata || null;
}

async function findPaid(id) {
  const { url, key } = dbConfig();
  if (!url || !key) throw new Error('Almacenamiento no configurado');
  const query = new URLSearchParams({ tipo: 'eq.quote_analysis_paid', pagina: 'eq.stripe-webhook', 'metadata->>analysis_id': `eq.${id}`, select: 'metadata', limit: '1' });
  const response = await fetch(`${url}/rest/v1/eventos?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error('No se pudo comprobar el pago');
  const rows = await response.json();
  return Boolean(rows?.length);
}

async function extractPdf(encoded) {
  const bytes = Buffer.from(String(encoded || ''), 'base64');
  if (bytes.length < 5 || bytes.length > MAX_PDF_BYTES || bytes.subarray(0, 4).toString() !== '%PDF') throw new Error('Adjunta un PDF válido de hasta 3 MB');
  const canvas = await import('@napi-rs/canvas');
  globalThis.DOMMatrix ||= canvas.DOMMatrix;
  globalThis.ImageData ||= canvas.ImageData;
  globalThis.Path2D ||= canvas.Path2D;
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
  const pages = [];
  for (let number = 1; number <= Math.min(pdf.numPages, MAX_PAGES); number += 1) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }
  const text = pages.join('\n');
  if (!text.trim()) throw new Error('El PDF no contiene texto seleccionable. Pega el texto del presupuesto en el formulario.');
  return { text, truncated: pdf.numPages > MAX_PAGES };
}

async function improveWithGroq(text, fallback) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return fallback;
  const prompt = `Analiza este presupuesto comercial en español. No inventes precios de mercado, leyes ni datos ausentes. Devuelve SOLO JSON con summary, risks (severity alta/media/baja, title, detail, action), questions, negotiation_points y negotiation_message. Protege la privacidad y no repitas datos personales.\n\n${redactSensitive(text)}`;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.15, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Eres un revisor riguroso de presupuestos. Señala solo lo sustentado por el texto.' }, { role: 'user', content: prompt }] }),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    return normaliseAiAnalysis(JSON.parse(data.choices?.[0]?.message?.content || '{}'), fallback);
  } catch { return fallback; }
}

function validAccess(record, token) {
  return Boolean(record && token && record.access_token_hash && crypto.timingSafeEqual(Buffer.from(record.access_token_hash), Buffer.from(hashAccessToken(token))));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const body = req.body || {};
  const action = String(body.action || 'analyze');
  try {
    if (action === 'analyze-document') {
      const bytes = Buffer.from(String(body.documentBase64 || ''), 'base64');
      if (bytes.length < 5 || bytes.length > MAX_PDF_BYTES || bytes.subarray(0, 4).toString() !== '%PDF') return res.status(400).json({ error: 'Adjunta un PDF válido de hasta 3 MB' });
      try {
        const canvas = await import('@napi-rs/canvas');
        globalThis.DOMMatrix ||= canvas.DOMMatrix; globalThis.ImageData ||= canvas.ImageData; globalThis.Path2D ||= canvas.Path2D;
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
        const pages = [];
        for (let number = 1; number <= Math.min(pdf.numPages, 80); number += 1) {
          const page = await pdf.getPage(number); const content = await page.getTextContent();
          pages.push({ page: number, text: content.items.map((item) => item.str || '').join(' ') });
        }
        if (!pages.some((page) => page.text.trim())) return res.status(422).json({ error: 'El PDF no contiene texto extraíble. Esta beta no dispone de OCR; adjunta un PDF con texto seleccionable.' });
        const analysis = analyzeTenderPages(pages);
        if (pdf.numPages > 80) analysis.warnings.unshift(`Lectura parcial: solo se han leído 80 de ${pdf.numPages} páginas. Revisa las restantes por separado.`);
        return res.status(200).json({ file_name: String(body.fileName || 'pliego.pdf').slice(0, 180), truncated: pdf.numPages > 80, ...analysis });
      } catch (error) { return res.status(422).json({ error: 'No se pudo leer el PDF; puede estar protegido o ser una imagen escaneada', detail: String(error?.message || error).slice(0, 240) }); }
    }

    if (action === 'analyze') {
      let source = String(body.text || '').trim();
      let truncated = false;
      if (body.documentBase64) {
        const pdf = await extractPdf(body.documentBase64);
        source = `${source}\n${pdf.text}`.trim();
        truncated = pdf.truncated;
      }
      if (source.length < 80) return res.status(400).json({ error: 'Pega al menos 80 caracteres o adjunta un PDF con texto.' });
      const redacted = redactSensitive(source);
      const deterministic = deterministicQuoteAnalysis({ text: redacted, category: body.category, region: body.region });
      const report = await improveWithGroq(redacted, deterministic);
      if (truncated) report.risks.unshift({ severity: 'media', title: 'Lectura parcial del documento', detail: `Solo se analizaron las primeras ${MAX_PAGES} páginas.`, action: 'Revisa por separado las páginas restantes.' });
      const analysisId = crypto.randomUUID();
      const accessToken = crypto.randomBytes(24).toString('base64url');
      await insertEvent('quote_analysis_created', { analysis_id: analysisId, access_token_hash: hashAccessToken(accessToken), report, created_at: new Date().toISOString() });
      return res.status(200).json({ analysis_id: analysisId, access_token: accessToken, preview: publicPreview(report), price: { amount: PRICE_CENTS, currency: 'eur', formatted: '9,90 €' } });
    }

    if (!body.analysisId || !body.accessToken) return res.status(400).json({ error: 'Falta el identificador del análisis.' });
    const record = await findAnalysis(String(body.analysisId));
    if (!validAccess(record, String(body.accessToken))) return res.status(404).json({ error: 'Análisis no encontrado.' });

    if (action === 'status') {
      const paid = await findPaid(String(body.analysisId));
      return res.status(200).json(paid ? { paid: true, report: record.report } : { paid: false, preview: publicPreview(record.report) });
    }

    if (action === 'checkout') {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(500).json({ error: 'Pago no configurado.' });
      const origin = process.env.PUBLIC_SITE_URL || `https://${req.headers.host}`;
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('line_items[0][price_data][currency]', 'eur');
      params.append('line_items[0][price_data][unit_amount]', String(PRICE_CENTS));
      params.append('line_items[0][price_data][product_data][name]', 'Informe completo · Licita Negociador');
      params.append('line_items[0][price_data][product_data][description]', 'Riesgos, preguntas y mensaje de negociación de tu presupuesto');
      params.append('line_items[0][quantity]', '1');
      params.append('success_url', `${origin}/negociador/?pago=procesando`);
      params.append('cancel_url', `${origin}/negociador/?pago=cancelado`);
      params.append('metadata[scope]', 'quote_analysis');
      params.append('metadata[analysis_id]', String(body.analysisId));
      params.append('integration_identifier', 'licita_quote_q7m2x9ka');
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2026-08-26.dahlia' }, body: params.toString() });
      const session = await response.json();
      if (!response.ok || !session.url) return res.status(response.status || 502).json({ error: 'Stripe no pudo iniciar el pago.' });
      return res.status(200).json({ url: session.url });
    }

    return res.status(400).json({ error: 'Acción no válida.' });
  } catch (error) {
    const message = String(error?.message || error).slice(0, 240);
    const clientError = /PDF|caracteres|texto seleccionable/i.test(message);
    return res.status(clientError ? 400 : 500).json({ error: clientError ? message : 'No se pudo completar la operación. Inténtalo de nuevo.' });
  }
}
