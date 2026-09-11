import { ALERT_EVENT_CONFIRMED, findAlertByToken, htmlPage, insertEvent, siteUrl, validToken } from "./_alerts.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const token = String(req.query?.token || "");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!validToken(token)) return res.status(400).send(htmlPage("Enlace no válido", "Solicita una nueva alerta desde la web."));
  try {
    const alert = await findAlertByToken(token);
    if (!alert) return res.status(404).send(htmlPage("Alerta no encontrada", "El enlace no existe o ya no está disponible."));
    if (alert.tipo !== ALERT_EVENT_CONFIRMED) {
      await insertEvent(ALERT_EVENT_CONFIRMED, { ...alert.metadata, confirmed_at: new Date().toISOString() });
    }
    const unsubscribeUrl = `${siteUrl()}/api/unsubscribe-alerts?token=${encodeURIComponent(token)}`;
    return res.status(200).send(htmlPage("Alerta confirmada", `Recibirás únicamente oportunidades relacionadas con tus preferencias. Puedes <a href="${unsubscribeUrl}">darte de baja aquí</a> en cualquier momento.`));
  } catch {
    return res.status(500).send(htmlPage("No se pudo confirmar", "Inténtalo de nuevo dentro de unos minutos."));
  }
}
