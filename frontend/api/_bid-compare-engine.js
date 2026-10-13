import { detectAmounts, redactSensitive } from './_quote-engine.js';

const tidy = (value, max = 500) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const fold = (value) => tidy(value, 400).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const money = (value) => Number.isFinite(value)
  ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  : 'No identificado';

function parseMoney(raw) {
  const clean = String(raw || '').replace(/\s/g, '');
  const normalized = clean.includes(',')
    ? clean.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(?:\.\d{3})+$/.test(clean) ? clean.replace(/\./g, '') : clean;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function amountMatches(line) {
  const results = [];
  const pattern = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?)/gi;
  for (const match of String(line || '').matchAll(pattern)) {
    const value = parseMoney(match[1]);
    if (value !== null) results.push({ value, raw: match[0], index: match.index || 0 });
  }
  return results;
}

const TOTAL_WORDS = /\b(total(?:\s+presupuesto)?|importe\s+final|total\s+oferta|presupuesto\s+total)\b/i;
const NON_ITEM = /\b(total|subtotal|base\s+imponible|iva|impuestos?|retenci[oó]n|descuento)\b/i;
const STOP = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'con', 'sin', 'para', 'por', 'en', 'un', 'una', 'ud', 'uds', 'unidad', 'unidades', 'm2', 'm3', 'ml', 'kg', 'h', 'hora', 'horas']);

function tokens(value) {
  return fold(value).replace(/[^a-z0-9áéíóúñ]+/g, ' ').split(/\s+/)
    .map((token) => token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function conceptFromLine(line, match) {
  const without = `${line.slice(0, match.index)} ${line.slice(match.index + match.raw.length)}`
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ud|uds|unidades?|m2|m²|m3|m³|ml|kg|h|horas?)\b/gi, ' ')
    .replace(/[|:;·]+/g, ' ');
  return tidy(without, 160).replace(/^[-–—.\s]+|[-–—.\s]+$/g, '');
}

function explicitTotal(lines, allAmounts) {
  for (const line of [...lines].reverse()) {
    if (!TOTAL_WORDS.test(line)) continue;
    const matches = amountMatches(line);
    if (matches.length) return matches.at(-1).value;
  }
  return allAmounts.length ? Math.max(...allAmounts) : null;
}

export function parseBidOffer({ name, text }, index = 0) {
  const source = redactSensitive(text).slice(0, 18_000);
  const lines = source.split(/\r?\n|(?<=€)\s*[;•]\s*/).map((line) => tidy(line, 500)).filter(Boolean);
  const amounts = detectAmounts(source);
  const total = explicitTotal(lines, amounts);
  const lower = fold(source);
  const items = [];

  for (const line of lines) {
    if (NON_ITEM.test(line)) continue;
    const matches = amountMatches(line);
    if (!matches.length) continue;
    const match = matches.at(-1);
    const label = conceptFromLine(line, match);
    const itemTokens = tokens(label);
    if (!label || !itemTokens.length) continue;
    items.push({ label, amount: match.value, tokens: itemTokens });
  }

  const vatMentioned = /\biva\b|impuesto/.test(lower);
  const vatIncluded = /iva\s+incluido|impuestos?\s+incluidos?|incluye\s+(?:el\s+)?iva/.test(lower);
  const deadline = /\b(plazo|entrega|inicio|finalizaci[oó]n|\d+\s*(?:d[ií]as?|semanas?|meses?))\b/.test(lower);
  const warranty = /\b(garant[ií]a|defectos?|vicios)\b/.test(lower);
  const payment = /\b(pago|anticipo|señal|vencimiento|transferencia|certificaci[oó]n)\b/.test(lower);
  const exclusions = /\b(no incluye|excluido|exclusiones?|aparte|por cuenta de)\b/.test(lower);
  const score = Math.round(([total !== null, items.length >= 2, vatMentioned, deadline, warranty, payment].filter(Boolean).length / 6) * 100);

  return {
    id: `offer_${index + 1}`,
    name: tidy(name, 80) || `Oferta ${index + 1}`,
    total,
    total_formatted: money(total),
    items: items.slice(0, 80),
    conditions: { vat_mentioned: vatMentioned, vat_included: vatIncluded, deadline, warranty, payment, exclusions },
    completeness: score,
  };
}

function similarity(a, b) {
  const left = new Set(a.tokens);
  const right = new Set(b.tokens);
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function buildMatrix(offers) {
  const groups = [];
  for (const offer of offers) {
    for (const item of offer.items) {
      let best = null;
      let bestScore = 0;
      for (const group of groups) {
        const score = similarity(item, group.reference);
        if (score > bestScore) { best = group; bestScore = score; }
      }
      if (!best || bestScore < 0.42) {
        best = { key: `item_${groups.length + 1}`, label: item.label, reference: item, values: {} };
        groups.push(best);
      }
      if (best.values[offer.id] === undefined) best.values[offer.id] = item.amount;
    }
  }
  return groups.map((group) => ({
    key: group.key,
    label: group.label,
    values: group.values,
    missing_in: offers.filter((offer) => group.values[offer.id] === undefined).map((offer) => offer.name),
  })).slice(0, 60);
}

export function deterministicBidComparison({ offers: rawOffers, project = '', region = '' }) {
  const offers = rawOffers.map(parseBidOffer);
  const withTotals = offers.filter((offer) => offer.total !== null).sort((a, b) => a.total - b.total);
  const lowest = withTotals[0] || null;
  const highest = withTotals.at(-1) || null;
  const spread = lowest && highest && highest.total > lowest.total ? highest.total - lowest.total : 0;
  const spreadPct = lowest && spread ? Math.round((spread / lowest.total) * 100) : 0;
  const matrix = buildMatrix(offers);
  const findings = [];
  const add = (severity, title, detail, action) => findings.push({ severity, title, detail, action });

  if (withTotals.length !== offers.length) {
    add('alta', 'Hay ofertas sin un total inequívoco', 'No es posible ordenar todas las propuestas económicamente con seguridad.', 'Solicita un total final cerrado, con base imponible e IVA.');
  }
  if (spread > 0) {
    add(spreadPct >= 20 ? 'alta' : 'media', `Diferencia total de ${money(spread)} (${spreadPct} %)`, `${lowest.name} presenta el menor total y ${highest.name} el mayor. La diferencia no implica ahorro si el alcance no coincide.`, 'Compara las partidas ausentes antes de elegir la oferta más barata.');
  }
  for (const offer of offers) {
    if (!offer.conditions.vat_mentioned) add('alta', `${offer.name}: IVA sin aclarar`, 'El total puede no ser final.', 'Pide base imponible, porcentaje de IVA y total con impuestos.');
    if (!offer.conditions.deadline) add('media', `${offer.name}: sin plazo comprometido`, 'No consta una duración o fecha verificable.', 'Solicita fechas de inicio y terminación.');
    if (!offer.conditions.payment) add('media', `${offer.name}: pagos sin definir`, 'No aparecen hitos, anticipos o vencimientos.', 'Vincula pagos a trabajos ejecutados y comprobados.');
  }
  const meaningfulGaps = matrix.filter((row) => row.missing_in.length && Object.keys(row.values).length >= 1).slice(0, 8);
  for (const row of meaningfulGaps.slice(0, 4)) {
    add('alta', `Partida no comparable: ${row.label}`, `No aparece expresamente en: ${row.missing_in.join(', ')}.`, 'Confirma si está incluida, excluida o presupuestada con otro nombre.');
  }

  const recommendable = lowest && lowest.completeness >= 50;
  const recommendation = recommendable
    ? `${lowest.name} es la referencia económica con ${money(lowest.total)}, pero solo debe considerarse la opción preferente después de cerrar las partidas y condiciones señaladas.`
    : 'Todavía no hay una oferta ganadora defendible: faltan datos suficientes para comparar precio, alcance y condiciones con seguridad.';
  const questions = findings.slice(0, 10).map((item) => `${item.title}: ${item.action}`);
  const offerNames = offers.map((offer) => offer.name).join(', ');
  const negotiationMessage = `Hola. Hemos comparado las ofertas recibidas para ${tidy(project, 100) || 'este trabajo'} (${offerNames}). Antes de adjudicar necesitamos que confirméis por escrito el total con IVA, el desglose de partidas, las exclusiones, el plazo, la garantía y el calendario de pagos. También necesitamos aclarar las partidas que no aparecen de forma equivalente en todas las propuestas. Rogamos enviéis una versión revisada y cerrada para poder comparar en igualdad de condiciones. Gracias.`;

  return {
    type: 'bid_comparison',
    version: 1,
    project: tidy(project, 120) || 'Comparativa de ofertas',
    region: tidy(region, 80),
    offers,
    matrix,
    economics: { lowest_offer: lowest?.name || null, lowest_total: lowest?.total ?? null, highest_offer: highest?.name || null, highest_total: highest?.total ?? null, spread, spread_formatted: money(spread), spread_pct: spreadPct },
    recommendation,
    findings: findings.slice(0, 16),
    questions,
    negotiation_message: negotiationMessage,
    disclaimer: 'Comparación basada exclusivamente en los documentos aportados. No verifica mediciones, solvencia del proveedor ni precios externos de mercado. Las partidas no equivalentes requieren confirmación profesional.',
  };
}

export function normaliseComparisonNarrative(value, fallback) {
  if (!value || typeof value !== 'object') return fallback;
  const questions = Array.isArray(value.questions) ? value.questions.map((item) => tidy(item, 320)).filter(Boolean).slice(0, 12) : [];
  return {
    ...fallback,
    questions: questions.length ? questions : fallback.questions,
    negotiation_message: tidy(value.negotiation_message, 1800) || fallback.negotiation_message,
  };
}

export function publicComparisonPreview(report) {
  return {
    type: report.type,
    project: report.project,
    offers: report.offers.map(({ id, name, total, total_formatted, completeness }) => ({ id, name, total, total_formatted, completeness })),
    economics: report.economics,
    recommendation: report.recommendation,
    findings: report.findings.slice(0, 2),
    hidden_findings: Math.max(0, report.findings.length - 2),
    matrix_rows: report.matrix.length,
    disclaimer: report.disclaimer,
  };
}
