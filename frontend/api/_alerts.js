import crypto from "node:crypto";

export const ALERT_EVENT_PENDING = "alerta_pendiente";
export const ALERT_EVENT_CONFIRMED = "alerta_confirmada";
export const ALERT_EVENT_UNSUBSCRIBED = "alerta_baja";

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function validToken(value) {
  return /^[0-9a-f-]{36}$/i.test(String(value || ""));
}

export function newToken() {
  return crypto.randomUUID();
}

export function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || "https://www.licita-ai.com").replace(/\/$/, "");
}

export function supabaseConfig() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
}

export async function insertEvent(tipo, metadata) {
  const { url, key } = supabaseConfig();
  if (!url || !key) throw new Error("Supabase no configurado");
  const response = await fetch(`${url}/rest/v1/eventos`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      tipo,
      pagina: "alertas",
      user_id: null,
      session_id: metadata.token,
      metadata,
    }),
  });
  if (!response.ok) throw new Error(`No se pudo guardar la solicitud (${response.status})`);
}

export async function findAlertByToken(token) {
  const { url, key } = supabaseConfig();
  if (!url || !key) throw new Error("Supabase no configurado");
  const params = new URLSearchParams({
    tipo: `in.(${ALERT_EVENT_PENDING},${ALERT_EVENT_CONFIRMED})`,
    "metadata->>token": `eq.${token}`,
    select: "tipo,metadata,created_at",
    order: "created_at.desc",
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/eventos?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`No se pudo consultar la alerta (${response.status})`);
  const rows = await response.json();
  return rows[0] || null;
}

export function htmlPage(title, message) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Licita AI</title><style>body{margin:0;background:#060811;color:#f1f5f9;font:16px/1.6 system-ui,sans-serif}.box{max-width:620px;margin:12vh auto;padding:36px;background:#0e1120;border:1px solid #273149;border-radius:16px}h1{margin-top:0}a{color:#60a5fa}</style></head><body><main class="box"><h1>${title}</h1><p>${message}</p><p><a href="/">Volver a Licita AI</a></p></main></body></html>`;
}
