import { ALERT_EVENT_PENDING, insertEvent, newToken, normalizeEmail, siteUrl, validEmail } from "./_alerts.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (process.env.ALERTS_SIGNUP_ENABLED !== "true") {
    return res.status(503).json({ error: "Las alertas todavía no están disponibles" });
  }
  const { email: rawEmail, sector: rawSector, consent, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true });
  const email = normalizeEmail(rawEmail);
  const sector = String(rawSector || "").trim().slice(0, 180);
  if (!validEmail(email)) return res.status(400).json({ error: "Introduce un email válido" });
  if (!sector) return res.status(400).json({ error: "Indica qué tipo de licitaciones buscas" });
  if (consent !== true) return res.status(400).json({ error: "Necesitamos tu consentimiento para enviarte alertas" });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "Servicio de email no configurado" });

  const token = newToken();
  const confirmUrl = `${siteUrl()}/api/confirm-alerts?token=${encodeURIComponent(token)}`;
  try {
    await insertEvent(ALERT_EVENT_PENDING, {
      token, email, sector,
      requested_at: new Date().toISOString(),
      consent_version: "alertas-v1-2026-09-11",
      source: "web-home",
    });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `alert-optin-${token}`,
      },
      body: JSON.stringify({
        from: process.env.ALERTS_FROM_EMAIL || "Lícita AI <alertas@licita-ai.com>",
        to: [email],
        subject: "Confirma tu alerta gratuita de licitaciones",
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><h1>Confirma tu alerta</h1><p>Has solicitado recibir oportunidades relacionadas con:</p><p style="padding:12px 16px;background:#f1f5f9;border-radius:8px"><strong>${escapeHtml(sector)}</strong></p><p><a href="${confirmUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Confirmar alerta</a></p><p style="font-size:13px;color:#64748b">Si no has solicitado esta alerta, ignora este mensaje. No se activará nada.</p><p style="font-size:13px;color:#64748b">Lícita AI · licita-ai.com</p></div>`,
      }),
    });
    if (!response.ok) throw new Error(`Resend rechazó el envío (${response.status})`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo enviar la confirmación", detail: String(error) });
  }
}
