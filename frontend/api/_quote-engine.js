import crypto from 'crypto';

const tidy = (value, max = 400) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

export function hashAccessToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function redactSensitive(value) {
  return String(value || '')
    .slice(0, 18_000)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL OCULTO]')
    .replace(/\bES\d{2}(?:[ -]?\d{4}){5}\b/gi, '[IBAN OCULTO]')
    .replace(/(?<!\d)(?:\+?34[ .-]?)?(?:[6789]\d{2})(?:[ .-]?\d{3}){2}(?!\d)/g, '[TELÉFONO OCULTO]')
    .replace(/\b\d{16,24}\b/g, '[DATO BANCARIO OCULTO]');
}

export function detectAmounts(text) {
  const values = [];
  const pattern = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?)/gi;
  for (const match of String(text || '').matchAll(pattern)) {
    const raw = match[1].replace(/\s/g, '');
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
    const amount = Number(normalized);
    if (Number.isFinite(amount) && amount > 0) values.push(amount);
  }
  return [...new Set(values)].sort((a, b) => a - b);
}

const has = (text, regex) => regex.test(text);

export function deterministicQuoteAnalysis({ text, category = '', region = '' }) {
  const source = redactSensitive(text);
  const lower = source.toLowerCase();
  const amounts = detectAmounts(source);
  const total = amounts.length ? amounts.at(-1) : null;
  const vatMentioned = has(lower, /\biva\b|impuesto/);
  const vatIncluded = has(lower, /iva\s+incluido|impuestos?\s+incluidos?|incluye\s+(?:el\s+)?iva/);
  const hasScope = has(lower, /incluye|alcance|trabajos?|servicios?|unidades?|materiales?/);
  const hasDeadline = has(lower, /plazo|entrega|d[ií]as?|semanas?|meses?|fecha/);
  const hasWarranty = has(lower, /garant[ií]a|defectos?|reparaci[oó]n/);
  const hasPayment = has(lower, /pago|transferencia|anticipo|señal|factura/);
  const hasValidity = has(lower, /validez|vigencia|oferta válida|presupuesto válido/);
  const risks = [];
  const add = (severity, title, detail, action) => risks.push({ severity, title, detail, action });

  if (!total) add('alta', 'No se identifica un precio total', 'Sin un total inequívoco es difícil comparar y limitar sobrecostes.', 'Pide un precio final cerrado y un desglose por partidas.');
  if (!vatMentioned) add('alta', 'El IVA no está aclarado', 'El importe final puede variar si no se especifica si incluye impuestos.', 'Exige que indiquen base, IVA y total final.');
  else if (!vatIncluded) add('media', 'El tratamiento del IVA es ambiguo', 'Se menciona el IVA, pero no queda claro si está dentro del total.', 'Confirma por escrito el total exacto con IVA.');
  if (!hasScope) add('alta', 'El alcance está poco definido', 'No se detallan con claridad trabajos, materiales o exclusiones.', 'Solicita una lista de incluidos, excluidos y unidades.');
  if (!hasDeadline) add('media', 'No aparece un plazo comprometido', 'Sin fecha o duración, un retraso será difícil de reclamar.', 'Añade inicio, duración y fecha de entrega.');
  if (!hasWarranty) add('media', 'No se concreta la garantía', 'No queda definido quién responde ante defectos o trabajos incompletos.', 'Pide duración y procedimiento de garantía.');
  if (!hasPayment) add('media', 'No constan condiciones de pago', 'Los anticipos y vencimientos pueden generar riesgo innecesario.', 'Vincula los pagos a hitos verificables y evita anticipos excesivos.');
  if (!hasValidity) add('baja', 'No se indica la vigencia de la oferta', 'El proveedor podría cambiar el precio sin una fecha límite clara.', 'Pide una validez mínima por escrito.');
  if (!risks.length) add('baja', 'Conviene confirmar los detalles por escrito', 'El presupuesto parece completo, pero debe formar parte del acuerdo final.', 'Pide confirmación escrita antes de pagar.');

  const completeness = [total, vatMentioned, hasScope, hasDeadline, hasWarranty, hasPayment, hasValidity].filter(Boolean).length;
  const score = Math.round((completeness / 7) * 100);
  const money = total ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total) : 'no identificado';
  const categoryLabel = tidy(category, 80) || 'servicio solicitado';
  const regionLabel = tidy(region, 80) || 'tu zona';
  const questions = risks.slice(0, 6).map((risk) => risk.action);
  const negotiationPoints = [
    total ? `Confirma que ${money} es el precio final y solicita el desglose.` : 'Solicita un precio final cerrado y desglosado.',
    'Propón pagos asociados a hitos terminados y comprobables.',
    'Incluye por escrito plazos, materiales, exclusiones y garantía.',
    `Pide una segunda oferta comparable para ${categoryLabel} en ${regionLabel}.`,
  ];
  const message = `Hola. Gracias por el presupuesto. Antes de aceptarlo necesito confirmar por escrito el precio final ${total ? `de ${money}` : 'cerrado'}, con IVA, el desglose de partidas, qué está incluido y excluido, el plazo de entrega, la garantía y un calendario de pagos ligado a hitos. Si podéis aclarar estos puntos y revisar el precio o mejorar las condiciones, podré valorar la aceptación. Gracias.`;

  return {
    version: 1,
    score,
    score_label: 'Completitud del presupuesto',
    summary: score >= 75 ? 'El presupuesto contiene buena parte de la información esencial, aunque conviene cerrar varios puntos.' : score >= 45 ? 'El presupuesto necesita aclaraciones importantes antes de aceptarlo.' : 'El presupuesto deja demasiados puntos abiertos para aceptarlo con seguridad.',
    facts: { total, total_formatted: money, vat_mentioned: vatMentioned, vat_included: vatIncluded, category: categoryLabel, region: regionLabel },
    risks,
    questions,
    negotiation_points: negotiationPoints,
    negotiation_message: message,
    checklist: ['Identidad fiscal del proveedor', 'Precio total con IVA y desglose', 'Alcance, materiales y exclusiones', 'Fechas de inicio y fin', 'Pagos por hitos', 'Garantía y responsabilidad', 'Validez de la oferta'],
    disclaimer: 'Análisis informativo del contenido aportado. No verifica al proveedor, el precio de mercado ni sustituye asesoramiento legal o técnico.',
  };
}

export function normaliseAiAnalysis(value, fallback) {
  if (!value || typeof value !== 'object') return fallback;
  const risks = Array.isArray(value.risks) ? value.risks.slice(0, 8).map((r) => ({
    severity: ['alta', 'media', 'baja'].includes(r?.severity) ? r.severity : 'media',
    title: tidy(r?.title, 120), detail: tidy(r?.detail, 300), action: tidy(r?.action, 240),
  })).filter((r) => r.title && r.detail && r.action) : [];
  const strings = (items, max = 7) => Array.isArray(items) ? items.map((x) => tidy(x, 300)).filter(Boolean).slice(0, max) : [];
  return {
    ...fallback,
    summary: tidy(value.summary, 400) || fallback.summary,
    risks: risks.length ? risks : fallback.risks,
    questions: strings(value.questions) .length ? strings(value.questions) : fallback.questions,
    negotiation_points: strings(value.negotiation_points).length ? strings(value.negotiation_points) : fallback.negotiation_points,
    negotiation_message: tidy(value.negotiation_message, 1600) || fallback.negotiation_message,
  };
}

export function publicPreview(report) {
  return {
    score: report.score,
    score_label: report.score_label,
    summary: report.summary,
    facts: report.facts,
    risks: report.risks.slice(0, 2),
    hidden_risks: Math.max(0, report.risks.length - 2),
    disclaimer: report.disclaimer,
  };
}
