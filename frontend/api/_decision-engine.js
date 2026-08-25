const text = (value) => String(value ?? "").trim();
const list = (value) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

function normalizedWords(values) {
  return list(values)
    .flatMap((value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9+#.]+/))
    .filter((word) => word.length > 2);
}

export function deterministicDecision(licitacion = {}, perfil = {}, now = new Date()) {
  const tenderWords = new Set(normalizedWords([licitacion.titulo, licitacion.resumen_comercial, ...(licitacion.tecnologias || [])]));
  const companyTerms = [...(perfil.tecnologias_interes || []), ...(perfil.palabras_clave || []), perfil.sector_actividad, perfil.sector_actividad_desc];
  const companyWords = [...new Set(normalizedWords(companyTerms))];
  const matches = companyWords.filter((word) => tenderWords.has(word));
  const budget = number(licitacion.presupuesto);
  const maxContract = number(perfil.contrato_maximo);
  const deadline = licitacion.fecha_limite ? new Date(licitacion.fecha_limite) : null;
  const daysLeft = deadline && !Number.isNaN(deadline.valueOf()) ? Math.ceil((deadline.valueOf() - now.valueOf()) / 86400000) : null;

  const blockers = [];
  if (daysLeft !== null && daysLeft < 0) blockers.push({ code: "deadline", label: "El plazo de presentación ha finalizado", evidence: licitacion.fecha_limite });
  if (budget !== null && maxContract !== null && budget > maxContract * 2) blockers.push({ code: "capacity", label: "El presupuesto supera ampliamente el mayor contrato declarado", evidence: `${budget} € frente a ${maxContract} €` });

  const unknowns = [];
  if (!licitacion.fecha_limite) unknowns.push("Fecha y hora límite de presentación");
  if (!budget) unknowns.push("Presupuesto base o valor estimado");
  if (!perfil.facturacion_anual) unknowns.push("Facturación anual para comprobar solvencia económica");
  if (!perfil.referencias_similares) unknowns.push("Referencias de contratos similares y sus importes");
  if (!perfil.experiencia_publica) unknowns.push("Experiencia previa con el sector público");
  unknowns.push("Solvencia y clasificación exactas exigidas en el PCAP");
  unknowns.push("Criterios evaluables, garantías, anexos y causas de exclusión del pliego");

  const profileSignals = [perfil.empresa, perfil.sector_actividad, perfil.sector_actividad_desc, perfil.facturacion_anual, perfil.empleados, perfil.contrato_maximo, companyTerms.length].filter(Boolean).length;
  const dataSignals = [licitacion.titulo, licitacion.organismo, budget, licitacion.fecha_limite, licitacion.url_origen].filter(Boolean).length;
  const relevance = companyWords.length ? Math.min(100, Math.round((matches.length / Math.min(companyWords.length, 8)) * 100)) : 0;
  const readiness = Math.round((profileSignals / 7) * 100);
  const evidenceQuality = Math.round((dataSignals / 5) * 100);
  const score = Math.max(0, Math.min(100, Math.round(relevance * .45 + readiness * .3 + evidenceQuality * .25 - blockers.length * 35)));
  let verdict = "REVISAR";
  let verdictLabel = "Faltan comprobaciones antes de invertir tiempo";
  if (blockers.length) { verdict = "DESCARTAR"; verdictLabel = "Existe al menos un bloqueo objetivo"; }
  else if (score >= 75 && unknowns.length <= 3) { verdict = "PRESENTAR"; verdictLabel = "Encaje preliminar alto; validar el pliego antes de presentar"; }

  const verified = [
    licitacion.organismo && { label: "Órgano de contratación", value: licitacion.organismo },
    budget !== null && { label: "Presupuesto publicado", value: `${budget.toLocaleString("es-ES")} €` },
    licitacion.fecha_limite && { label: "Cierre publicado", value: licitacion.fecha_limite },
    matches.length && { label: "Coincidencias con el perfil", value: matches.slice(0, 8).join(", ") },
  ].filter(Boolean);

  return {
    version: 1, verdict, verdict_label: verdictLabel, score,
    scores: { relevancia: relevance, preparacion_empresa: readiness, calidad_evidencia: evidenceQuality },
    verified, blockers, unknowns: [...new Set(unknowns)],
    economics: { presupuesto: budget, contrato_maximo_declarado: maxContract, margen: null, note: "El margen no se calcula sin costes aportados por la empresa; mostrar uno sería inventarlo." },
    next_actions: blockers.length ? ["Confirmar si el bloqueo sigue vigente en la fuente oficial.", "Descartar el expediente si se confirma, sin dedicar horas a la oferta."] : ["Abrir el PCAP y verificar solvencia económica, técnica y clasificación.", "Extraer criterios de adjudicación, garantías, anexos y documentación de sobres.", "Introducir costes reales para calcular margen y precio mínimo sostenible.", "Tomar la decisión final únicamente cuando no queden incógnitas críticas."],
    disclaimer: "Pre-evaluación basada únicamente en los datos disponibles. No sustituye la lectura del expediente oficial.",
  };
}

export function mergeAiAdvice(base, ai) {
  if (!ai || typeof ai !== "object") return base;
  const safe = { ...base };
  if (text(ai.explanation)) safe.explanation = text(ai.explanation).slice(0, 900);
  if (list(ai.questions).length) safe.questions = list(ai.questions).slice(0, 6);
  return safe;
}
