const CATEGORY_RULES = [
  ["Tecnología", /portatil|portátil|laptop|ordenador|pc\b|movil|móvil|telefono|teléfono|tablet|televisor|tv\b|monitor|consola|auriculares|camera|cámara/i],
  ["Hogar", /sofa|sofá|colchon|colchón|mueble|lavadora|frigorifico|frigorífico|electrodomestico|electrodoméstico|cocina/i],
  ["Movilidad", /coche|moto|bicicleta|patinete|vehiculo|vehículo|neumatico|neumático/i],
  ["Viajes", /hotel|vuelo|viaje|vacaciones|alojamiento|apartamento/i],
  ["Servicios", /reparar|reparacion|reparación|instalar|instalacion|instalación|clases|profesional|servicio/i],
];

export function cleanText(value, max = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function publicTextIsSafe(value) {
  const text = cleanText(value);
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return false;
  if (/(?:\+?\d[\s().-]*){9,}/.test(text)) return false;
  if (/https?:\/\/|www\./i.test(text)) return false;
  if (/\b(arma(?:s)?|munici[oó]n|coca[ií]na|hero[ií]na|pornograf[ií]a infantil|documentos? falsos?)\b/i.test(text)) return false;
  return true;
}

export function detectCategory(text) {
  return CATEGORY_RULES.find(([, rule]) => rule.test(text))?.[0] || "Otros";
}

export function detectBudget(text) {
  const match = text.match(/(?:hasta|máximo|maximo|presupuesto|por menos de|under|budget)?\s*(\d{2,6}(?:[.,]\d{1,2})?)\s*(€|eur|euros?|\$|usd|dólares?|dolares?)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(".", "").replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  const rawCurrency = match[2].toLowerCase();
  return { amount, currency: /\$|usd|d[oó]lar/.test(rawCurrency) ? "USD" : "EUR" };
}

export function fallbackIntent(text, region = "") {
  const clean = cleanText(text);
  const budget = detectBudget(clean);
  const title = clean.length > 78 ? `${clean.slice(0, 75).trim()}…` : clean;
  return {
    title,
    summary: clean,
    category: detectCategory(clean),
    budget,
    region: cleanText(region, 80) || "Sin limitar",
    must_haves: [],
    open_questions: budget ? [] : ["¿Cuál es tu presupuesto máximo?"],
  };
}

export function normaliseAiIntent(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  const budgetAmount = Number(value?.budget?.amount);
  return {
    title: cleanText(value.title, 90) || fallback.title,
    summary: cleanText(value.summary, 400) || fallback.summary,
    category: cleanText(value.category, 40) || fallback.category,
    budget: Number.isFinite(budgetAmount) && budgetAmount > 0
      ? { amount: budgetAmount, currency: value?.budget?.currency === "USD" ? "USD" : "EUR" }
      : fallback.budget,
    region: cleanText(value.region, 80) || fallback.region,
    must_haves: Array.isArray(value.must_haves)
      ? value.must_haves.map((item) => cleanText(item, 100)).filter(Boolean).slice(0, 6)
      : fallback.must_haves,
    open_questions: Array.isArray(value.open_questions)
      ? value.open_questions.map((item) => cleanText(item, 140)).filter(Boolean).slice(0, 3)
      : fallback.open_questions,
  };
}
