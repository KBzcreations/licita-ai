import crypto from "node:crypto";
import { cleanText, publicTextIsSafe } from "./_intent-engine.js";

export function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function validEmail(value) {
  const email = cleanText(value, 160).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "";
}

export function normaliseOffer(body = {}) {
  const price = Number(String(body.price || "").replace(",", "."));
  const company = cleanText(body.company, 90);
  const description = cleanText(body.description, 500);
  const delivery = cleanText(body.delivery, 100);
  const warranty = cleanText(body.warranty, 100);
  const currency = body.currency === "USD" ? "USD" : "EUR";
  if (company.length < 2) throw new Error("Indica el nombre del comercio");
  if (!Number.isFinite(price) || price <= 0 || price > 10000000) throw new Error("Indica un precio válido");
  if (description.length < 12) throw new Error("Describe mejor lo que incluye la oferta");
  if (![company, description, delivery, warranty].every(publicTextIsSafe)) {
    throw new Error("No incluyas teléfonos, correos ni enlaces en la oferta pública");
  }
  return { company, price: Math.round(price * 100) / 100, currency, description, delivery, warranty };
}

export function publicOffer(metadata, verifiedAt, acceptedOfferId) {
  return {
    id: metadata.id,
    intent_id: metadata.intent_id,
    company: metadata.company,
    price: metadata.price,
    currency: metadata.currency || "EUR",
    description: metadata.description,
    delivery: metadata.delivery || "Por confirmar",
    warranty: metadata.warranty || "Según condiciones del comercio",
    verified_at: verifiedAt,
    accepted: metadata.id === acceptedOfferId,
  };
}

export function verificationEmail({ company, verifyUrl, offerId }) {
  const safeCompany = escapeHtml(company);
  const safeUrl = escapeHtml(verifyUrl);
  const safeOfferId = escapeHtml(offerId);
  const subject = `Verifica la oferta ${offerId} en Licita`;
  const text = `Hola, ${company}.\n\nConfirma que este correo pertenece al comercio que ha enviado la oferta ${offerId}:\n${verifyUrl}\n\nEl enlace caduca en 48 horas. Si no has enviado esta oferta, ignora este mensaje o escribe a hola@licita-ai.com.`;
  const html = `<!doctype html><html lang="es" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f3f1e8;color:#111515;font-family:Arial,sans-serif"><div lang="es" dir="ltr" style="max-width:620px;margin:auto;padding:32px 20px"><h1 style="font-size:26px">Verifica tu oferta en Licita</h1><p style="font-size:16px;line-height:1.55">Hola, <strong>${safeCompany}</strong>. Confirma que este correo pertenece al comercio que ha enviado la oferta <strong>${safeOfferId}</strong>.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#111515;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:bold">Verificar la oferta</a></p><p style="font-size:14px;line-height:1.55">El enlace caduca en 48 horas. Si no has enviado esta oferta, ignora este mensaje o escribe a <a href="mailto:hola@licita-ai.com">hola@licita-ai.com</a>.</p></div></body></html>`;
  return { subject, text, html };
}
