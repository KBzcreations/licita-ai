import crypto from "node:crypto";
import { cleanText, fallbackIntent, normaliseAiIntent, publicTextIsSafe } from "./_intent-engine.js";
import { handleOffers } from "./_offers-handler.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

async function structureWithAi(text, region) {
  const fallback = fallbackIntent(text, region);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallback;
  const prompt = `Turn this buying need into a neutral, structured purchase brief. Do not recommend brands, invent facts, or promise savings. Keep the user's language. Return ONLY valid JSON with: title, summary, category, budget {amount,currency} or null, region, must_haves (array), open_questions (array, max 3).\n\nNEED: ${text}\nREGION: ${region || "not specified"}`;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });
    if (!response.ok) return fallback;
    const raw = await response.json();
    return normaliseAiIntent(JSON.parse(raw.choices?.[0]?.message?.content || "null"), fallback);
  } catch {
    return fallback;
  }
}

function dbConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? { url, key } : null;
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

async function insertEvent(config, event) {
  const response = await fetch(`${config.url}/rest/v1/eventos`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error("No se pudo guardar la petición");
}

async function listIntents(config) {
  if (!config) return [];
  const fields = encodeURIComponent("metadata,created_at");
  const response = await fetch(`${config.url}/rest/v1/eventos?tipo=eq.market_intent_created&select=${fields}&order=created_at.desc&limit=24`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) return [];
  const rows = await response.json();
  return rows.map((row) => ({
    id: row.metadata?.id,
    title: row.metadata?.title,
    summary: row.metadata?.summary,
    category: row.metadata?.category,
    budget: row.metadata?.budget || null,
    region: row.metadata?.region || "Sin limitar",
    created_at: row.created_at,
  })).filter((item) => item.id && item.title);
}

export default async function handler(req, res) {
  if (req.query?.market === "offers") return handleOffers(req, res);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  const config = dbConfig();

  if (req.method === "GET") {
    return res.status(200).json({ intents: await listIntents(config), live: Boolean(config) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const body = req.body || {};
  const action = cleanText(body.action, 20) || "create";
  if (action === "join") {
    const intentId = cleanText(body.intent_id, 80);
    if (!intentId) return res.status(400).json({ error: "Falta la petición" });
    if (config) {
      await insertEvent(config, {
        tipo: "market_intent_joined",
        pagina: "demand-network",
        session_id: cleanText(body.session_id, 80) || crypto.randomUUID(),
        metadata: { intent_id: intentId, joined_at: new Date().toISOString() },
      });
    }
    return res.status(200).json({ ok: true, saved: Boolean(config) });
  }

  const text = cleanText(body.text);
  const region = cleanText(body.region, 80);
  if (text.length < 12) return res.status(400).json({ error: "Describe un poco mejor lo que quieres comprar" });
  if (!publicTextIsSafe(text) || !publicTextIsSafe(region)) {
    return res.status(400).json({ error: "No incluyas datos de contacto, enlaces ni artículos restringidos en una petición pública" });
  }
  const intent = await structureWithAi(text, region);
  const id = `req_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const buyerToken = crypto.randomBytes(32).toString("base64url");
  const record = { id, ...intent };

  if (config) {
    await insertEvent(config, {
      tipo: "market_intent_created",
      pagina: "demand-network",
      session_id: cleanText(body.session_id, 80) || crypto.randomUUID(),
      metadata: { ...record, buyer_token_hash: hashToken(buyerToken), created_at: new Date().toISOString() },
    });
  }
  return res.status(200).json({ intent: record, buyer_token: buyerToken, saved: Boolean(config) });
}
