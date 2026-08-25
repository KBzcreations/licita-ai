export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Pago no configurado' });
  const { tenderId = '', title = '' } = req.body || {};
  const origin = `https://${req.headers.host}`;
  const params = new URLSearchParams();
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
  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    const session = await response.json();
    if (!response.ok || !session.url) return res.status(response.status || 502).json({ error: 'Stripe no pudo iniciar el pago' });
    return res.status(200).json({ url: session.url });
  } catch { return res.status(502).json({ error: 'No se pudo conectar con el pago' }); }
}
