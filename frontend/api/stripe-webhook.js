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

function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.split("="))
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.user_id;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        await actualizarPlan(userId, plan);
        await registrarEvento("suscripcion_completada", userId, { plan });
      }
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
