export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const key = process.env.STRIPE_SECRET_KEY, { sessionId } = req.body || {};
  if (!key || !sessionId || !String(sessionId).startsWith('cs_')) return res.status(400).json({ error: 'Pago no válido' });
  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${key}` } });
    const session = await response.json();
    const paid = response.ok && session.metadata?.scope === 'licitacion_dossier' && session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status);
    return paid ? res.status(200).json({ ok: true }) : res.status(402).json({ error: 'Pago no confirmado' });
  } catch { return res.status(502).json({ error: 'No se pudo verificar el pago' }); }
}
