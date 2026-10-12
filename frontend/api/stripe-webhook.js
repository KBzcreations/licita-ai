// Webhook de Stripe: cuando se confirma una suscripcion (o se cancela),
// actualiza la columna "plan" del usuario en Supabase. Verifica la firma
// manualmente (sin el SDK de Stripe) usando el webhook signing secret.

import crypto from "crypto";

export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export function verifyStripeSignature(payload, sigHeader, secret, now = Date.now()) {
  const values = String(sigHeader || '').split(',').map((part) => part.split('='));
  const timestamp = values.find(([key]) => key === 't')?.[1];
  const signatures = values.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return signatures.some((signature) => {
    const actual = Buffer.from(String(signature));
    const wanted = Buffer.from(expected);
    return actual.length === wanted.length && crypto.timingSafeEqual(wanted, actual);
  });
}

async function actualizarPlan(userId, plan) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ plan }),
  });
}

async function registrarEvento(tipo, userId, metadata) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  await fetch(`${SUPABASE_URL}/rest/v1/eventos`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ tipo, pagina: "stripe-webhook", user_id: userId, metadata }),
  });
}

async function eventoExiste(tipo, sessionId) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const query = new URLSearchParams({ tipo: `eq.${tipo}`, pagina: 'eq.stripe-webhook', 'metadata->>stripe_session_id': `eq.${sessionId}`, select: 'id', limit: '1' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/eventos?${query}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!response.ok) throw new Error('No se pudo verificar la entrega');
  const rows = await response.json();
  return Boolean(rows?.length);
}

async function registrarPagoInforme(session, tipo = 'quote_analysis_paid') {
  const analysisId = session.metadata?.analysis_id;
  if (!analysisId || !session.id || await eventoExiste(tipo, session.id)) return;
  await registrarEvento(tipo, null, {
    analysis_id: analysisId,
    stripe_session_id: session.id,
    amount_total: session.amount_total,
    currency: session.currency,
    payment_status: session.payment_status,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await readRawBody(req);
  const sig = req.headers["stripe-signature"];

  if (!webhookSecret || !sig) {
    res.status(400).json({ error: "Falta firma o STRIPE_WEBHOOK_SECRET" });
    return;
  }

  let valido = false;
  try {
    valido = verifyStripeSignature(rawBody.toString("utf8"), sig, webhookSecret);
  } catch {
    valido = false;
  }
  if (!valido) {
    res.status(400).json({ error: "Firma invalida" });
    return;
  }

  const event = JSON.parse(rawBody.toString("utf8"));

  try {
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      const session = event.data.object;
      if (session.metadata?.scope === 'quote_analysis' && ['paid', 'no_payment_required'].includes(session.payment_status)) {
        await registrarPagoInforme(session);
      }
      const userId = session.client_reference_id || session.metadata?.user_id;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        await actualizarPlan(userId, plan);
        await registrarEvento("suscripcion_completada", userId, { plan });
      }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      if (session.metadata?.scope === 'quote_analysis') await registrarPagoInforme(session, 'quote_analysis_payment_failed');
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await actualizarPlan(userId, "free");
        await registrarEvento("suscripcion_cancelada", userId, {});
      }
    }

    res.status(200).json({ received: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
