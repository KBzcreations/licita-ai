import { ALERT_EVENT_UNSUBSCRIBED, findAlertByToken, htmlPage, insertEvent, validToken } from "./_alerts.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const token = String(req.query?.token || "");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!validToken(token)) return res.status(400).send(htmlPage("Enlace no válido", "No se ha realizado ningún cambio."));
  try {
    const alert = await findAlertByToken(token);
    if (!alert) return res.status(404).send(htmlPage("Alerta no encontrada", "El enlace no existe o ya no está disponible."));
    await insertEvent(ALERT_EVENT_UNSUBSCRIBED, { ...alert.metadata, unsubscribed_at: new Date().toISOString() });
    return res.status(200).send(htmlPage("Baja completada", "No recibirás más alertas de Lícita AI."));
  } catch {
    return res.status(500).send(htmlPage("No se pudo completar la baja", "Inténtalo de nuevo dentro de unos minutos."));
  }
}
