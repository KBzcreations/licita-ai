import crypto from "node:crypto";
import { cleanText } from "./_intent-engine.js";
import { hashToken, normaliseOffer, publicOffer, validEmail, verificationEmail } from "./_marketplace.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const OFFER_TYPES = "market_offer_created,market_offer_verified,market_offer_accepted";

function dbConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? { url, key } : null;
}

async function insertEvent(config, event) {
  const response = await fetch(`${config.url}/rest/v1/eventos`, {
    method: "POST",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error("No se pudo guardar la operación");
}

async function listEvents(config, types = OFFER_TYPES, limit = 300) {
  const filter = encodeURIComponent(`(${types.split(",").map((type) => `tipo.eq.${type}`).join(",")})`);
  const fields = encodeURIComponent("tipo,metadata,created_at");
  const response = await fetch(`${config.url}/rest/v1/eventos?or=${filter}&select=${fields}&order=created_at.desc&limit=${limit}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) throw new Error("No se pudieron cargar las ofertas");
  return response.json();
}

async function sendVerificationEmail({ email, company, token, offerId }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.licita-ai.com";
  const verifyUrl = `${siteUrl}/api/intent?market=offers&action=verify&token=${encodeURIComponent(token)}`;
  const content = verificationEmail({ company, verifyUrl, offerId });
  const payload = {
    from: process.env.RESEND_FROM_EMAIL || "Licita <hola@licita-ai.com>",
    reply_to: "hola@licita-ai.com",
    to: [email],
    subject: content.subject,
    html: content.html,
    text: content.text,
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `offer-verify-${offerId}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) return true;
      if (response.status < 500 && response.status !== 429) return false;
    } catch {}
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function findIntent(config, intentId) {
  const fields = encodeURIComponent("metadata,created_at");
  const response = await fetch(`${config.url}/rest/v1/eventos?tipo=eq.market_intent_created&select=${fields}&order=created_at.desc&limit=100`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) return null;
  return (await response.json()).find((row) => row.metadata?.id === intentId) || null;
}

async function verifyOffer(req, res, config) {
  const token = cleanText(req.query?.token, 180);
  if (!token || !config) return res.status(400).send("Enlace de verificación no válido.");
  const rows = await listEvents(config, "market_offer_created", 300);
  const offer = rows.find((row) => row.metadata?.verify_token_hash === hashToken(token));
  const age = offer ? Date.now() - new Date(offer.created_at).getTime() : Infinity;
  if (!offer || age > 48 * 60 * 60 * 1000) return res.status(400).send("El enlace no es válido o ha caducado.");
  const existing = await listEvents(config, "market_offer_verified", 300);
  if (!existing.some((row) => row.metadata?.offer_id === offer.metadata.id)) {
    await insertEvent(config, { tipo: "market_offer_verified", pagina: "demand-network", session_id: "seller-verification", metadata: { offer_id: offer.metadata.id, verified_at: new Date().toISOString() } });
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width"><title>Oferta verificada</title></head><body style="font-family:system-ui;background:#f3f1e8;color:#111515;padding:40px"><main style="max-width:650px;margin:auto;background:white;padding:32px;border-radius:20px"><h1>Oferta verificada ✓</h1><p>Tu propuesta ya puede aparecer en la comparación de Licita.</p><a href="/#intent=${encodeURIComponent(offer.metadata.intent_id)}" style="color:#111515;font-weight:bold">Volver a la petición</a></main></body></html>`);
}

export async function handleOffers(req, res) {
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  const config = dbConfig();
  if (req.method === "GET" && req.query?.action === "verify") return verifyOffer(req, res, config);
  if (!config) return res.status(503).json({ error: "El mercado no está disponible ahora mismo" });

  if (req.method === "GET") {
    const intentId = cleanText(req.query?.intent_id, 80);
    if (!intentId) return res.status(400).json({ error: "Falta la petición" });
    const rows = await listEvents(config);
    const verified = new Map(rows.filter((row) => row.tipo === "market_offer_verified").map((row) => [row.metadata?.offer_id, row.metadata?.verified_at || row.created_at]));
    const accepted = rows.find((row) => row.tipo === "market_offer_accepted" && row.metadata?.intent_id === intentId)?.metadata?.offer_id;
    const offers = rows.filter((row) => row.tipo === "market_offer_created" && row.metadata?.intent_id === intentId && verified.has(row.metadata?.id)).map((row) => publicOffer(row.metadata, verified.get(row.metadata.id), accepted));
    return res.status(200).json({ offers, accepted_offer_id: accepted || null });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const body = req.body || {};
  const action = cleanText(body.action, 20) || "submit";
  const intentId = cleanText(body.intent_id, 80);
  if (!intentId || !(await findIntent(config, intentId))) return res.status(404).json({ error: "La petición no existe" });

  if (action === "accept") {
    const offerId = cleanText(body.offer_id, 80);
    const buyerToken = cleanText(body.buyer_token, 180);
    const intent = await findIntent(config, intentId);
    if (!buyerToken || hashToken(buyerToken) !== intent?.metadata?.buyer_token_hash) return res.status(403).json({ error: "Solo el creador de la petición puede aceptar una oferta" });
    const rows = await listEvents(config);
    const verifiedIds = new Set(rows.filter((row) => row.tipo === "market_offer_verified").map((row) => row.metadata?.offer_id));
    const selectedOffer = rows.find((row) => row.tipo === "market_offer_created" && row.metadata?.id === offerId && row.metadata?.intent_id === intentId);
    if (!selectedOffer || !verifiedIds.has(offerId)) return res.status(400).json({ error: "La oferta no está verificada para esta petición" });
    await insertEvent(config, { tipo: "market_offer_accepted", pagina: "demand-network", session_id: cleanText(body.session_id, 80) || crypto.randomUUID(), metadata: { intent_id: intentId, offer_id: offerId, accepted_at: new Date().toISOString() } });
    return res.status(200).json({ ok: true });
  }

  let offer;
  try { offer = normaliseOffer(body); } catch (error) { return res.status(400).json({ error: error.message }); }
  const email = validEmail(body.email);
  if (!email) return res.status(400).json({ error: "Indica un correo profesional válido" });
  const id = `off_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const token = crypto.randomBytes(32).toString("base64url");
  await insertEvent(config, {
    tipo: "market_offer_created",
    pagina: "demand-network",
    session_id: cleanText(body.session_id, 80) || crypto.randomUUID(),
    metadata: { id, intent_id: intentId, ...offer, email, verify_token_hash: hashToken(token), created_at: new Date().toISOString() },
  });
  const emailSent = await sendVerificationEmail({ email, company: offer.company, token, offerId: id });
  return res.status(200).json({ offer_id: id, pending_verification: true, email_sent: emailSent });
}
